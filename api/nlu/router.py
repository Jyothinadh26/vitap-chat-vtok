import json
import re
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime
from api.models.schemas import StudentSession
from api.core.config import settings
from api.nlu.resolver import (
    normalize_text,
    resolve_course,
    resolve_component,
    resolve_exam_type,
    resolve_semester,
    is_lab_query,
    is_theory_query,
    CAMPUS_ALIASES,
    REGIONAL_INTENT_MARKERS
)
from api.tools.academic_tools import (
    get_attendance_analysis,
    simulate_multi_day_leave,
    get_subject_marks,
    predict_fat_grade,
    get_exam_schedule,
    get_semester_gpa,
    get_credit_distribution,
    get_campus_life_and_deadlines,
    get_subject_snapshot,
    analyze_faculty_slides
)


def build_session_manifest(session: StudentSession) -> str:
    today_str = datetime.now().strftime("%Y-%m-%d, %A")
    courses = ", ".join([f"{a.course_code} ({a.course_title} - {a.course_type})" for a in session.attendance])
    active_phase = "FAT Preparation & Final Review" if session.exam_schedule else "Instructional Semester"
    
    return f"""[STUDENT SESSION MANIFEST]
Date: {today_str}
Student: {session.profile.name} ({session.profile.reg_no}), Program: {session.profile.program}
Active Academic Phase: {active_phase}
Enrolled Courses: {courses}
Mentor: {session.profile.mentor_name} ({session.profile.mentor_cabin})
Hostel: {session.profile.hostel_block or 'Day Scholar'}, Room: {session.profile.room_no or 'N/A'}
Policy: Always Answer First with exact data and attach 2-3 one-tap follow-up chips. Never correct grammar.
"""


def detect_intent_deterministic(query: str, session: StudentSession) -> Dict[str, Any]:
    norm = normalize_text(query)
    tokens = set(norm.split())

    # 1. Fragmented Single Subject (e.g., "cn", "os", "dbms", "python")
    for alias in CAMPUS_ALIASES:
        if norm == alias or norm == f"{alias}?" or norm.strip() == alias:
            res = get_subject_snapshot(session, alias)
            text = f"Here is the real-time snapshot for {res['card_payload']['course_title']} ({res['card_payload']['course_code']}), including attendance, internal marks, and upcoming schedule."
            return {"text": text, "tool_result": res}

    # 2. Fragmented "seat" / "room" / "ekkada" / "kahan"
    if ("seat" in tokens or "room" in tokens or "ekkada" in tokens or "kahan" in tokens) and not ("hostel" in tokens):
        res = get_exam_schedule(session, next_only=True)
        next_exam = res["card_payload"]["exams"][0] if res["card_payload"]["exams"] else None
        if next_exam:
            text = f"Your next exam is {next_exam['course_title']} ({next_exam['course_code']}) in Room {next_exam['room_no']}, Academic Block {next_exam['academic_block']}. Seat Number: {next_exam['seat_no']}."
        else:
            text = "No upcoming exam seating records found."
        return {"text": text, "tool_result": res}

    # 3. Fragmented "75?" / "75" / "attendance" / "bunk" / "skip"
    if ("75" in norm or "bunk" in tokens or "skip" in tokens or "attendance" in tokens or "atten" in tokens):
        # Check if a specific course is mentioned
        matched_course = None
        for alias in CAMPUS_ALIASES:
            if alias in tokens or CAMPUS_ALIASES[alias].lower() in norm:
                matched_course = alias
                break
                
        # Check if multi-day dates mentioned (e.g. "thursday and friday", "repu", "kal")
        if "thursday" in norm or "friday" in norm or "repu" in tokens or "kal" in tokens or "trip" in norm:
            # Multi-day leave simulation
            res = simulate_multi_day_leave(session, start_date="2026-11-26", end_date="2026-11-27", include_pending_od=("od" in tokens))
            text = "Here is the projected impact of missing these classes. Sundays and university holidays have been automatically excluded."
            return {"text": text, "tool_result": res}
            
        res = get_attendance_analysis(session, course_query=matched_course or "ALL", sort_lowest=True)
        text = "Here is your attendance analysis. Subjects closest to or below 75% are highlighted first."
        return {"text": text, "tool_result": res}

    # 4. Marks / Score / CAT / FAT / Quiz / Lab
    if ("mark" in norm or "mrk" in norm or "score" in norm or "cat" in tokens or "cat1" in tokens or "cat2" in tokens or "da" in tokens):
        # Check if student is asking for FAT grade prediction
        if "predict" in norm or "target" in norm or ("how much" in norm and "fat" in tokens) or ("nid" in norm and "fat" in tokens):
            target_course = "SWE1004"
            for alias in CAMPUS_ALIASES:
                if alias in tokens:
                    target_course = alias
                    break
            target_g = "S" if " s " in f" {norm} " else ("A" if " a " in f" {norm} " else "B")
            res = predict_fat_grade(session, course_query=target_course, target_grade=target_g)
            text = f"For {res['card_payload']['course_code']}, you need {res['card_payload']['effective_min_fat']} in FAT for grade '{res['card_payload']['target_grade']}'. {res['card_payload']['status_note']}"
            return {"text": text, "tool_result": res}

        # Ambiguous collision: "lab marks" without subject
        is_lab = is_lab_query(norm)
        is_th = is_theory_query(norm)
        matched_course = None
        for alias in CAMPUS_ALIASES:
            if alias in tokens or CAMPUS_ALIASES[alias].lower() in norm:
                matched_course = alias
                break

        if is_lab and not matched_course:
            # Enrolled in multiple labs: show all labs
            res = get_subject_marks(session, course_query="", is_lab=True)
            text = "Here is the summary of all your registered Lab components:"
            return {"text": text, "tool_result": res}

        res = get_subject_marks(
            session,
            course_query=matched_course or "ALL",
            component_query=query,
            is_lab=True if is_lab else (False if is_th else None)
        )
        text = "Here are your component-level marks, weightages, and class averages:"
        return {"text": text, "tool_result": res}

    # 5. GPA / CGPA / SGPA / Semester Grade History
    if "gpa" in tokens or "cgpa" in tokens or "sgpa" in tokens or "cg" in tokens or "sem" in tokens or "grade" in tokens:
        if "credit" in tokens or "basket" in tokens or "placement" in tokens or "cutoff" in tokens:
            res = get_credit_distribution(session)
            text = f"Your current CGPA is {res['card_payload']['cgpa']}. Total credits earned: {res['card_payload']['total_earned']}/{res['card_payload']['total_required']}."
            return {"text": text, "tool_result": res}
        else:
            res = get_semester_gpa(session, semester_query=norm)
            text = f"In {res['card_payload']['semester']}, your SGPA was {res['card_payload']['sgpa']} with {res['card_payload']['credits_earned']} credits earned."
            return {"text": text, "tool_result": res}

    # 6. Deadlines / Digital Assignments
    if "deadline" in tokens or "due" in tokens or "da" in tokens or "assignment" in tokens:
        res = get_campus_life_and_deadlines(session, category="deadlines")
        text = "Here are your upcoming Digital Assignments and project deadlines:"
        return {"text": text, "tool_result": res}

    # 7. Today's Classes / Timetable / Tomorrow
    if "today" in tokens or "timetable" in tokens or "class" in tokens or "schedule" in tokens or "eroju" in tokens or "aaj" in tokens:
        res = get_campus_life_and_deadlines(session, category="timetable")
        text = f"Here is your timetable schedule for {res['card_payload']['day']}:"
        return {"text": text, "tool_result": res}

    # 8. Campus Life / Faculty / Mentor / Outing / Biometric
    if "mentor" in tokens or "proctor" in tokens or "cabin" in tokens or "faculty" in tokens:
        res = get_campus_life_and_deadlines(session, category="faculty")
        text = f"Your mentor is {res['card_payload']['mentor']['name']} (Cabin: {res['card_payload']['mentor']['cabin']})."
        return {"text": text, "tool_result": res}
    if "outing" in tokens or "leave" in tokens:
        res = get_campus_life_and_deadlines(session, category="outing")
        text = "Here is your hostel outing approval history:"
        return {"text": text, "tool_result": res}
    if "biometric" in tokens or "punch" in tokens:
        res = get_campus_life_and_deadlines(session, category="biometric")
        text = "Here are your recent biometric turnstile punch logs:"
        return {"text": text, "tool_result": res}

    # 9. Slides & Study Materials
    if "slide" in tokens or "notes" in tokens or "material" in tokens or "pdf" in tokens or "summary" in tokens:
        matched_course = "CSE2001"
        for alias in CAMPUS_ALIASES:
            if alias in tokens:
                matched_course = alias
                break
        res = analyze_faculty_slides(session, course_query=matched_course, question=query)
        text = f"Here is the study material summary and key concepts for {res['card_payload']['course_code']}:"
        return {"text": text, "tool_result": res}

    # Default Smart Triage: Subject Snapshot or Attendance Gauge
    res = get_attendance_analysis(session, sort_lowest=True)
    text = "Here is your academic overview with current attendance status across all enrolled subjects:"
    return {"text": text, "tool_result": res}


async def stream_chat_response(
    message: str,
    session: StudentSession,
    client_date: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Streams SSE formatted events:
    event: chunk\ndata: {"text": "..."}\n\n
    event: ui_card\ndata: {"type": "...", "payload": {...}}\n\n
    event: suggested_chips\ndata: {"chips": [...]}\n\n
    event: done\ndata: {}\n\n
    """
    # 1. Deterministic resolution first (zero latency & reliable 429 protection)
    # If Gemini API key is configured, we can attempt Gemini routing, but fallback to deterministic
    intent_data = detect_intent_deterministic(message, session)
    text_reply = intent_data["text"]
    tool_result = intent_data["tool_result"]

    # If Gemini API Key exists and user query requires reasoning
    if settings.GEMINI_API_KEY and not settings.DEMO_MODE:
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            manifest = build_session_manifest(session)
            
            # Simple fast inference call
            prompt = f"{manifest}\n\nUser Question: {message}\n\nProvide an empathetic, ultra-concise 1-2 sentence response grounded in the verified data."
            resp = client.models.generate_content(
                model=settings.GEMINI_MODEL_FAST,
                contents=prompt
            )
            if resp and resp.text:
                text_reply = resp.text.strip()
        except Exception as e:
            # Gracefully catch 429 (ResourceExhausted) or connection error and preserve text_reply
            print(f"[GeminiRouter] Falling back to deterministic output: {e}")

    # Stream text chunks
    words = text_reply.split(" ")
    buffer = ""
    for idx, word in enumerate(words):
        buffer += (word + " ")
        if idx % 3 == 0 or idx == len(words) - 1:
            chunk_event = f"event: chunk\ndata: {json.dumps({'text': buffer})}\n\n"
            yield chunk_event
            buffer = ""

    # Stream UI Card
    card_event = f"event: ui_card\ndata: {json.dumps({'type': tool_result['ui_card_type'], 'payload': tool_result['card_payload']})}\n\n"
    yield card_event

    # Stream Suggested Chips
    chips_event = f"event: suggested_chips\ndata: {json.dumps({'chips': tool_result['suggested_chips']})}\n\n"
    yield chips_event

    # Stream Done
    yield "event: done\ndata: {}\n\n"
