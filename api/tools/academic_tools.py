import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from api.models.schemas import (
    StudentSession,
    ToolExecutionResult,
    CourseAttendance,
    CourseMarks,
    ExamScheduleItem
)
from api.nlu.resolver import (
    resolve_course,
    resolve_component,
    resolve_exam_type,
    resolve_semester,
    is_lab_query,
    is_theory_query,
    CAMPUS_ALIASES
)


def get_attendance_analysis(
    session: StudentSession,
    course_query: str = "ALL",
    target_pct: float = 75.0,
    sort_lowest: bool = False
) -> Dict[str, Any]:
    courses_to_analyze = []
    
    if course_query.strip().upper() == "ALL" or not course_query.strip():
        courses_to_analyze = list(session.attendance)
    else:
        # Check lab/theory flag in query
        is_lab = True if is_lab_query(course_query) else (False if is_theory_query(course_query) else None)
        matched = resolve_course(course_query, session, is_lab=is_lab)
        if matched:
            # If top match has strong score, take it and its counterpart if query was ambiguous
            top_score = matched[0][1]
            if top_score >= 60.0:
                courses_to_analyze = [m[0] for m in matched if m[1] >= top_score - 15.0]
        if not courses_to_analyze:
            courses_to_analyze = list(session.attendance)

    analyzed = []
    for att in courses_to_analyze:
        a = att.attended_classes
        t = att.total_classes
        pct = (a / t * 100.0) if t > 0 else 100.0
        
        # Exact mathematical formulas
        # Skip buffer: floor((A - 0.75 * T) / 0.75)
        # Classes needed: ceil((0.75 * T - A) / 0.25)
        if pct >= target_pct:
            # Even if pct == 75.0, (15 - 0.75*20) / 0.75 = 0
            buf = math.floor((a - (target_pct / 100.0) * t) / (target_pct / 100.0))
            skip_buffer = max(0, int(buf))
            classes_needed = 0
            if abs(pct - target_pct) < 0.001:
                status = "BORDERLINE_SAFE"
                status_msg = f"Borderline at exactly {pct:.1f}%. Attend next class; skipping 1 drops you to <75%."
            else:
                status = "SAFE"
                status_msg = f"Safe! You can skip {skip_buffer} class{'es' if skip_buffer != 1 else ''} while staying >= {target_pct:.0f}%."
        else:
            skip_buffer = 0
            needed = math.ceil(((target_pct / 100.0) * t - a) / (1.0 - (target_pct / 100.0)))
            classes_needed = max(1, int(needed))
            
            if pct < 60.0:
                status = "DEBARMENT_RISK"
                status_msg = f"Critical! Attendance is {pct:.1f}% (below 60% debarment threshold). Need {classes_needed} classes without absence."
            elif classes_needed > att.remaining_scheduled_classes and att.remaining_scheduled_classes > 0:
                status = "UNREACHABLE_WITHOUT_OD"
                status_msg = f"Unreachable! Needs {classes_needed} classes, but only {att.remaining_scheduled_classes} classes remain. Apply for On-Duty (OD) / Medical."
            else:
                status = "WARNING"
                status_msg = f"Below criteria ({pct:.1f}%). Must attend next {classes_needed} consecutive class{'es' if classes_needed != 1 else ''} to reach {target_pct:.0f}%."

        analyzed.append({
            "course_code": att.course_code,
            "course_title": att.course_title,
            "course_type": att.course_type,
            "slot": att.slot,
            "attended": a,
            "total": t,
            "percentage": round(pct, 2),
            "skip_buffer": skip_buffer,
            "classes_needed": classes_needed,
            "status": status,
            "status_message": status_msg,
            "remaining_classes": att.remaining_scheduled_classes
        })

    if sort_lowest:
        analyzed.sort(key=lambda x: x["percentage"])

    chips = ["Check CN marks", "When is my next exam?", "Trip bunk simulator"]
    if analyzed:
        lowest_course = min(analyzed, key=lambda x: x["percentage"])
        chips.insert(0, f"Simulate skipping {lowest_course['course_code']}")

    return {
        "summary_data": {
            "total_courses": len(analyzed),
            "safe_count": sum(1 for c in analyzed if c["status"] in ("SAFE", "BORDERLINE_SAFE")),
            "warning_count": sum(1 for c in analyzed if c["status"] in ("WARNING", "DEBARMENT_RISK", "UNREACHABLE_WITHOUT_OD"))
        },
        "ui_card_type": "attendance_gauge",
        "card_payload": {
            "target_pct": target_pct,
            "courses": analyzed
        },
        "suggested_chips": chips[:3]
    }


def simulate_multi_day_leave(
    session: StudentSession,
    start_date: str,
    end_date: str,
    include_pending_od: bool = False
) -> Dict[str, Any]:
    # Parse dates
    try:
        dt_start = datetime.strptime(start_date.strip(), "%Y-%m-%d")
        dt_end = datetime.strptime(end_date.strip(), "%Y-%m-%d")
    except Exception:
        # Fallback to next 2 days
        dt_start = datetime.now()
        dt_end = dt_start + timedelta(days=2)

    if dt_end < dt_start:
        dt_start, dt_end = dt_end, dt_start

    # Build holiday set
    holidays = {h.date for h in session.academic_calendar.holidays}

    # Day-wise class mapping from timetable
    day_name_map = {
        0: "Monday",
        1: "Tuesday",
        2: "Wednesday",
        3: "Thursday",
        4: "Friday",
        5: "Saturday",
        6: "Sunday"
    }

    # Calculate missed classes per course
    missed_counts: Dict[Tuple[str, str], int] = {}
    total_dates_checked = []
    
    curr = dt_start
    while curr <= dt_end:
        date_str = curr.strftime("%Y-%m-%d")
        day_of_week = curr.weekday()
        day_name = day_name_map.get(day_of_week, "")

        # Skip Sundays and holidays
        if day_of_week == 6 or date_str in holidays:
            curr += timedelta(days=1)
            continue

        total_dates_checked.append((date_str, day_name))

        for tc in session.timetable:
            for sc in tc.schedule:
                if sc.day.lower() == day_name.lower():
                    key = (tc.course_code, tc.course_type)
                    missed_counts[key] = missed_counts.get(key, 0) + 1

        curr += timedelta(days=1)

    # Project attendance impacts
    projections = []
    for att in session.attendance:
        key = (att.course_code, att.course_type)
        missed = missed_counts.get(key, 0)

        current_pct = (att.attended_classes / att.total_classes * 100.0) if att.total_classes > 0 else 100.0
        
        if include_pending_od:
            # With approved OD, missed classes are counted as attended
            new_attended = att.attended_classes + missed
            new_total = att.total_classes + missed
        else:
            new_attended = att.attended_classes
            new_total = att.total_classes + missed

        projected_pct = (new_attended / new_total * 100.0) if new_total > 0 else 100.0
        drop_delta = current_pct - projected_pct

        projections.append({
            "course_code": att.course_code,
            "course_title": att.course_title,
            "course_type": att.course_type,
            "missed_classes": missed,
            "current_attended": att.attended_classes,
            "current_total": att.total_classes,
            "current_pct": round(current_pct, 2),
            "projected_attended": new_attended,
            "projected_total": new_total,
            "projected_pct": round(projected_pct, 2),
            "drop_delta": round(drop_delta, 2),
            "below_75": projected_pct < 75.0,
            "below_60": projected_pct < 60.0
        })

    projections.sort(key=lambda x: x["projected_pct"])

    return {
        "summary_data": {
            "start_date": dt_start.strftime("%Y-%m-%d"),
            "end_date": dt_end.strftime("%Y-%m-%d"),
            "od_included": include_pending_od,
            "courses_falling_below_75": sum(1 for p in projections if p["below_75"] and not p["current_pct"] < 75.0),
            "courses_critical": sum(1 for p in projections if p["below_60"])
        },
        "ui_card_type": "multi_day_leave",
        "card_payload": {
            "start_date": dt_start.strftime("%Y-%m-%d"),
            "end_date": dt_end.strftime("%Y-%m-%d"),
            "include_pending_od": include_pending_od,
            "projections": projections
        },
        "suggested_chips": [
            "Enable OD Exemption" if not include_pending_od else "Disable OD Exemption",
            "75% attendance criteria",
            "View upcoming exams"
        ]
    }


def get_subject_marks(
    session: StudentSession,
    course_query: str,
    component_query: Optional[str] = None,
    is_lab: Optional[bool] = None
) -> Dict[str, Any]:
    norm_query = course_query.lower() if course_query else ""
    if is_lab is None:
        if is_lab_query(norm_query):
            is_lab = True
        elif is_theory_query(norm_query):
            is_lab = False

    target_marks_list = []
    if not course_query or course_query.strip().upper() == "ALL":
        for m in session.marks:
            if is_lab is True and m.course_type not in ("ELA", "LO"):
                continue
            if is_lab is False and m.course_type in ("ELA", "LO"):
                continue
            target_marks_list.append(m)
    else:
        matched = resolve_course(course_query, session, is_lab=is_lab)
        if matched:
            top_code = matched[0][0].course_code
            for m in session.marks:
                if m.course_code == top_code:
                    if is_lab is True and m.course_type not in ("ELA", "LO"):
                        continue
                    if is_lab is False and m.course_type in ("ELA", "LO"):
                        continue
                    target_marks_list.append(m)

    if not target_marks_list:
        target_marks_list = session.marks[:2]

    # Filter component if requested
    target_comp_name = resolve_component(component_query) if component_query else resolve_component(course_query)

    results = []
    for m in target_marks_list:
        comps = []
        for c in m.components:
            if target_comp_name:
                if target_comp_name.lower() in c.name.lower() or c.name.lower() in target_comp_name.lower():
                    comps.append(c.model_dump())
            else:
                comps.append(c.model_dump())

        results.append({
            "course_code": m.course_code,
            "course_title": m.course_title,
            "course_type": m.course_type,
            "current_internal_total": m.current_internal_total,
            "current_internal_max": m.current_internal_max,
            "components": comps if comps else [c.model_dump() for c in m.components]
        })

    chips = [f"Predict FAT score for {results[0]['course_code']}", "View Class Average", "75% check"]
    return {
        "summary_data": {
            "courses_found": len(results),
            "matched_component": target_comp_name
        },
        "ui_card_type": "marks_fat",
        "card_payload": {
            "results": results,
            "filter_component": target_comp_name
        },
        "suggested_chips": chips
    }


def predict_fat_grade(
    session: StudentSession,
    course_query: str,
    target_grade: str = "A",
    assumed_mean: Optional[float] = None,
    assumed_sd: Optional[float] = None
) -> Dict[str, Any]:
    matched = resolve_course(course_query, session, is_lab=False)
    target_course = matched[0][0] if matched else session.attendance[0]
    
    # Find matching marks
    marks_rec = next((m for m in session.marks if m.course_code == target_course.course_code and m.course_type in ("ETH", "TH")), None)
    if not marks_rec:
        marks_rec = session.marks[0]

    internal = marks_rec.current_internal_total  # out of 50
    fat_weightage = 50.0  # FAT contributes 50%

    # Grade thresholds (Absolute/Relative boundaries)
    grade_thresholds = {
        "S": 90.0,
        "A": 80.0,
        "B": 70.0,
        "C": 60.0,
        "D": 50.0,
        "E": 40.0
    }
    
    target_total = grade_thresholds.get(target_grade.upper(), 80.0)
    needed_from_fat = target_total - internal
    
    # Required raw mark in FAT (out of 100)
    # raw_fat * (fat_weightage / 100) = needed_from_fat
    raw_fat_needed = (needed_from_fat / fat_weightage) * 100.0

    # NON-NEGOTIABLE FAT PASS RULE: Minimum 40/100 required in FAT
    pass_rule_enforced = False
    fail_risk = False
    status_note = ""

    if raw_fat_needed < 40.0:
        pass_rule_enforced = True
        status_note = f"Although you need only {max(0.0, raw_fat_needed):.1f}/100 mathematically for {target_grade}, VIT-AP rules require a STRICT MINIMUM of 40/100 in FAT to pass the course."
        effective_min_fat = 40.0
    elif raw_fat_needed > 100.0:
        fail_risk = True
        effective_min_fat = 100.0
        status_note = f"Grade {target_grade} requires {raw_fat_needed:.1f}/100, which exceeds maximum possible 100 marks. Target a lower grade bracket."
    else:
        effective_min_fat = raw_fat_needed
        status_note = f"Score at least {raw_fat_needed:.1f}/100 in FAT to secure an '{target_grade}' grade."

    all_brackets = []
    for g, thresh in grade_thresholds.items():
        needed_w = thresh - internal
        raw_n = (needed_w / fat_weightage) * 100.0
        all_brackets.append({
            "grade": g,
            "threshold_total": thresh,
            "raw_fat_needed": round(raw_n, 1),
            "strictly_achievable": raw_n <= 100.0,
            "requires_min_40_rule": raw_n < 40.0
        })

    return {
        "summary_data": {
            "course_code": marks_rec.course_code,
            "course_title": marks_rec.course_title,
            "current_internal": internal,
            "target_grade": target_grade.upper(),
            "effective_min_fat": round(effective_min_fat, 1),
            "pass_rule_enforced": pass_rule_enforced,
            "fail_risk": fail_risk
        },
        "ui_card_type": "marks_fat",
        "card_payload": {
            "course_code": marks_rec.course_code,
            "course_title": marks_rec.course_title,
            "current_internal": internal,
            "target_grade": target_grade.upper(),
            "raw_fat_needed": round(raw_fat_needed, 1),
            "effective_min_fat": round(effective_min_fat, 1),
            "status_note": status_note,
            "pass_rule_enforced": pass_rule_enforced,
            "all_brackets": all_brackets
        },
        "suggested_chips": [
            f"Target S grade in {marks_rec.course_code}",
            f"Target B grade in {marks_rec.course_code}",
            "View Exam Seating"
        ]
    }


def get_exam_schedule(
    session: StudentSession,
    course_query: Optional[str] = None,
    exam_type: Optional[str] = None,
    next_only: bool = False
) -> Dict[str, Any]:
    exams = list(session.exam_schedule)

    if exam_type:
        e_type = resolve_exam_type(exam_type) or exam_type.upper()
        exams = [e for e in exams if e.exam_type.upper() == e_type.upper()]

    if course_query:
        matched = resolve_course(course_query, session)
        if matched and matched[0][1] >= 60.0:
            target_code = matched[0][0].course_code
            exams = [e for e in exams if e.course_code == target_code]

    # Sort chronologically by date
    exams.sort(key=lambda x: (x.date, x.session))

    if next_only and exams:
        exams = [exams[0]]

    chips = ["Download PNG Pass", "Today's classes", "Attendance criteria"]
    return {
        "summary_data": {
            "exam_count": len(exams),
            "next_exam": exams[0].model_dump() if exams else None
        },
        "ui_card_type": "exam_pass",
        "card_payload": {
            "exams": [e.model_dump() for e in exams]
        },
        "suggested_chips": chips
    }


def get_semester_gpa(
    session: StudentSession,
    semester_query: Optional[str] = None,
    what_if_grades: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    record = resolve_semester(semester_query, session) if semester_query else (session.grade_history[-1] if session.grade_history else None)

    if not record:
        return {
            "summary_data": {"message": "No historical grade records found."},
            "ui_card_type": "credit_audit",
            "card_payload": {"error": "No records"},
            "suggested_chips": ["Credit distribution", "Placement eligibility"]
        }

    grade_points = {"S": 10.0, "A": 9.0, "B": 8.0, "C": 7.0, "D": 6.0, "E": 5.0, "F": 0.0}
    
    courses_info = []
    tot_credits = 0.0
    tot_points = 0.0

    for c in record.courses:
        g = what_if_grades.get(c.course_code, c.grade) if what_if_grades else c.grade
        pts = grade_points.get(g.upper(), 0.0)
        courses_info.append({
            "course_code": c.course_code,
            "course_title": c.course_title,
            "credits": c.credits,
            "grade": g.upper(),
            "points": pts
        })
        tot_credits += c.credits
        tot_points += pts * c.credits

    if what_if_grades:
        sgpa = (tot_points / tot_credits) if tot_credits > 0 else record.sgpa
    else:
        sgpa = record.sgpa

    return {
        "summary_data": {
            "semester": record.semester,
            "sgpa": round(sgpa, 2),
            "credits_earned": tot_credits,
            "current_cgpa": session.credit_distribution.cgpa
        },
        "ui_card_type": "credit_audit",
        "card_payload": {
            "semester": record.semester,
            "sgpa": round(sgpa, 2),
            "credits_earned": tot_credits,
            "current_cgpa": session.credit_distribution.cgpa,
            "courses": courses_info,
            "is_projected_simulation": bool(what_if_grades)
        },
        "suggested_chips": ["What is my CGPA?", "Placement criteria check", "Credit distribution"]
    }


def get_credit_distribution(session: StudentSession) -> Dict[str, Any]:
    cd = session.credit_distribution
    p = session.profile

    # Placement cutoff calculations
    # 7/7/7: 10th >= 70, 12th >= 70, CGPA >= 7.0
    # 8/8/8: 10th >= 80, 12th >= 80, CGPA >= 8.0
    # 9/9/9: 10th >= 90, 12th >= 90, CGPA >= 9.0
    p7 = (p.tenth_marks >= 70.0) and (p.twelfth_marks >= 70.0) and (cd.cgpa >= 7.0)
    p8 = (p.tenth_marks >= 80.0) and (p.twelfth_marks >= 80.0) and (cd.cgpa >= 8.0)
    p9 = (p.tenth_marks >= 90.0) and (p.twelfth_marks >= 90.0) and (cd.cgpa >= 9.0)

    baskets_payload = {}
    for basket_name, basket_val in cd.baskets.items():
        rem = max(0.0, basket_val.required - basket_val.earned)
        pct = (basket_val.earned / basket_val.required * 100.0) if basket_val.required > 0 else 100.0
        baskets_payload[basket_name] = {
            "required": basket_val.required,
            "earned": basket_val.earned,
            "remaining": rem,
            "completion_pct": round(pct, 1)
        }

    return {
        "summary_data": {
            "total_earned": cd.total_earned,
            "total_required": cd.total_required,
            "current_cgpa": cd.cgpa,
            "eligible_9_9_9": p9,
            "eligible_8_8_8": p8,
            "eligible_7_7_7": p7
        },
        "ui_card_type": "credit_audit",
        "card_payload": {
            "cgpa": cd.cgpa,
            "total_earned": cd.total_earned,
            "total_required": cd.total_required,
            "tenth_pct": p.tenth_marks,
            "twelfth_pct": p.twelfth_marks,
            "baskets": baskets_payload,
            "placement_badges": {
                "badge_777": {"eligible": p7, "label": "7/7/7 Standard"},
                "badge_888": {"eligible": p8, "label": "8/8/8 Dream"},
                "badge_999": {"eligible": p9, "label": "9/9/9 Super Dream"}
            }
        },
        "suggested_chips": ["Last semester GPA", "Deadlines", "Today's classes"]
    }


def get_campus_life_and_deadlines(
    session: StudentSession,
    category: str = "deadlines"
) -> Dict[str, Any]:
    cat = category.lower().strip()

    if "deadline" in cat or "da" in cat or "assignment" in cat:
        today_str = datetime.now().strftime("%Y-%m-%d")
        deadlines = [d.model_dump() for d in session.deadlines]
        deadlines.sort(key=lambda x: (x["due_date"], x["due_time"]))

        return {
            "summary_data": {
                "total_deadlines": len(deadlines),
                "pending_count": sum(1 for d in deadlines if d["status"] == "Pending")
            },
            "ui_card_type": "deadline_radar",
            "card_payload": {
                "deadlines": deadlines
            },
            "suggested_chips": ["Export to Google Calendar (.ics)", "Today's classes", "CN marks"]
        }

    elif "faculty" in cat or "mentor" in cat or "proctor" in cat:
        p = session.profile
        faculty_list = []
        seen = set()
        for tc in session.timetable:
            if tc.faculty_name not in seen:
                seen.add(tc.faculty_name)
                faculty_list.append({
                    "name": tc.faculty_name,
                    "cabin": tc.faculty_cabin,
                    "email": tc.faculty_email,
                    "course": f"{tc.course_code} - {tc.course_title}"
                })

        return {
            "summary_data": {
                "mentor": p.mentor_name,
                "mentor_cabin": p.mentor_cabin,
                "faculty_count": len(faculty_list)
            },
            "ui_card_type": "campus_life",
            "card_payload": {
                "category": "faculty",
                "mentor": {
                    "name": p.mentor_name,
                    "email": p.mentor_email,
                    "cabin": p.mentor_cabin
                },
                "faculty": faculty_list
            },
            "suggested_chips": ["Hostel Outing Status", "Biometric Logs", "Today's classes"]
        }

    elif "outing" in cat or "hostel" in cat:
        return {
            "summary_data": {
                "outings_count": len(session.hostel_outings),
                "latest_status": session.hostel_outings[0].status if session.hostel_outings else "None"
            },
            "ui_card_type": "campus_life",
            "card_payload": {
                "category": "hostel_outings",
                "outings": [o.model_dump() for o in session.hostel_outings]
            },
            "suggested_chips": ["Biometric Logs", "Deadlines", "Today's classes"]
        }

    elif "biometric" in cat or "punch" in cat:
        return {
            "summary_data": {
                "logs_count": len(session.biometric_logs),
                "today_in": session.biometric_logs[0].in_time if session.biometric_logs else None
            },
            "ui_card_type": "campus_life",
            "card_payload": {
                "category": "biometric",
                "logs": [b.model_dump() for b in session.biometric_logs]
            },
            "suggested_chips": ["Hostel Outing Status", "Mentor Cabin", "Today's classes"]
        }

    else:
        # Timetable / Daily Briefing
        today_name = datetime.now().strftime("%A")
        todays_classes = []
        for tc in session.timetable:
            for sc in tc.schedule:
                if sc.day.lower() == today_name.lower():
                    todays_classes.append({
                        "course_code": tc.course_code,
                        "course_title": tc.course_title,
                        "course_type": tc.course_type,
                        "slot": tc.slot,
                        "room_no": tc.room_no,
                        "start_time": sc.start_time,
                        "end_time": sc.end_time,
                        "faculty": tc.faculty_name
                    })

        todays_classes.sort(key=lambda x: x["start_time"])

        return {
            "summary_data": {
                "day": today_name,
                "class_count": len(todays_classes)
            },
            "ui_card_type": "timetable_briefing",
            "card_payload": {
                "day": today_name,
                "classes": todays_classes
            },
            "suggested_chips": ["Any 75% alerts?", "Pending Deadlines", "Exam Seating"]
        }


def get_subject_snapshot(session: StudentSession, course_query: str) -> Dict[str, Any]:
    matched = resolve_course(course_query, session)
    if not matched:
        matched = [(session.attendance[0], 50.0)]

    top_att = matched[0][0]
    course_code = top_att.course_code

    # 1. Attendance Analysis
    att_res = get_attendance_analysis(session, course_query=course_code)
    att_payload = att_res["card_payload"]["courses"][0] if att_res["card_payload"]["courses"] else None

    # 2. Marks summary
    marks_rec = next((m for m in session.marks if m.course_code == course_code and m.course_type == top_att.course_type), None)
    marks_summary = {
        "internal_total": marks_rec.current_internal_total if marks_rec else None,
        "internal_max": marks_rec.current_internal_max if marks_rec else None,
        "components": [c.model_dump() for c in marks_rec.components] if marks_rec else []
    }

    # 3. Next class from timetable
    timetable_matches = [t for t in session.timetable if t.course_code == course_code]
    next_class = None
    if timetable_matches:
        tc = timetable_matches[0]
        if tc.schedule:
            next_class = {
                "slot": tc.slot,
                "room_no": tc.room_no,
                "faculty": tc.faculty_name,
                "schedule": [s.model_dump() for s in tc.schedule]
            }

    # 4. Next exam
    exam_match = next((e for e in session.exam_schedule if e.course_code == course_code), None)

    return {
        "summary_data": {
            "course_code": course_code,
            "course_title": top_att.course_title,
            "attendance_pct": att_payload["percentage"] if att_payload else 100.0,
            "internal_marks": marks_summary["internal_total"]
        },
        "ui_card_type": "subject_snapshot",
        "card_payload": {
            "course_code": course_code,
            "course_title": top_att.course_title,
            "course_type": top_att.course_type,
            "attendance": att_payload,
            "marks": marks_summary,
            "next_class": next_class,
            "exam": exam_match.model_dump() if exam_match else None
        },
        "suggested_chips": [
            f"Predict FAT for {course_code}",
            f"Simulate leave for {course_code}",
            "View Exam Seat Pass"
        ]
    }


def analyze_faculty_slides(
    session: StudentSession,
    course_query: str,
    question: str,
    file_ref: Optional[str] = None
) -> Dict[str, Any]:
    matched = resolve_course(course_query, session)
    target_code = matched[0][0].course_code if matched else "CSE2001"
    
    # Filter course materials
    materials = [m for m in session.course_materials if m.course_code == target_code]
    
    # Mock slide analysis response (grounded in mock summary or native gemini)
    found_summary = ""
    if materials:
        m = materials[0]
        found_summary = f"Summary for {m.course_code} - {m.title} ({m.module}): {m.summary}"
    else:
        found_summary = f"Analyzed slides for {target_code}. Key topics: Core fundamentals, architecture, and practice problems for CAT/FAT."

    return {
        "summary_data": {
            "course_code": target_code,
            "question": question,
            "materials_count": len(materials)
        },
        "ui_card_type": "slide_summary",
        "card_payload": {
            "course_code": target_code,
            "question": question,
            "answer_summary": found_summary,
            "materials": [m.model_dump() for m in materials]
        },
        "suggested_chips": [
            "Generate CAT-2 practice questions",
            "Formula sheet for this module",
            "Download all slide PDFs"
        ]
    }
