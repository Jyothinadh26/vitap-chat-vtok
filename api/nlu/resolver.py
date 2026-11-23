import re
from typing import Optional, List, Tuple, Dict, Any
try:
    from rapidfuzz import fuzz
except ImportError:
    import difflib
    class _FallbackFuzz:
        @staticmethod
        def ratio(s1: str, s2: str) -> int:
            return int(difflib.SequenceMatcher(None, str(s1).lower(), str(s2).lower()).ratio() * 100)
        @staticmethod
        def partial_ratio(s1: str, s2: str) -> int:
            s1_l, s2_l = str(s1).lower(), str(s2).lower()
            if s1_l in s2_l or s2_l in s1_l:
                return 100
            return int(difflib.SequenceMatcher(None, s1_l, s2_l).ratio() * 100)
    fuzz = _FallbackFuzz()
from api.models.schemas import StudentSession, CourseAttendance, CourseMarks, SemesterGradeRecord

CAMPUS_ALIASES = {
    "cn": "Computer Networks",
    "networks": "Computer Networks",
    "networking": "Computer Networks",
    "os": "Operating Systems",
    "opsys": "Operating Systems",
    "dbms": "Database Management Systems",
    "database": "Database Management Systems",
    "sql": "Database Management Systems",
    "dsa": "Data Structures and Algorithms",
    "oops": "Object Oriented Programming",
    "oop": "Object Oriented Programming",
    "java": "Object Oriented Programming with Java",
    "jva": "Object Oriented Programming with Java",
    "python": "Introduction to Python",
    "py": "Introduction to Python",
    "discrete": "Discrete Mathematics and Graph Theory",
    "discrete math": "Discrete Mathematics and Graph Theory",
    "dm": "Discrete Mathematics and Graph Theory",
    "maths": "Discrete Mathematics and Graph Theory",
    "math": "Discrete Mathematics and Graph Theory",
    "english": "Professional English",
    "eng": "Professional English"
}

REGIONAL_INTENT_MARKERS = {
    "repu": "tomorrow",
    "kal": "tomorrow",
    "eroju": "today",
    "aaj": "today",
    "ninna": "yesterday",
    "kal_past": "yesterday",
    "ekkada": "room",
    "kahan": "room",
    "room": "room",
    "seat": "seat",
    "bunk": "attendance",
    "skip": "attendance",
    "chutti": "leave",
    "enni": "count",
    "kitna": "count",
    "marks": "marks",
    "mrk": "marks",
    "mrks": "marks",
    "score": "marks",
    "fat": "fat",
    "cat": "cat",
    "cat1": "cat1",
    "cat2": "cat2",
    "da": "da",
    "cgpa": "cgpa",
    "gpa": "gpa",
    "sgpa": "sgpa",
    "od": "od"
}

COMPONENT_ALIASES = {
    "cat1": "CAT-1",
    "cat-1": "CAT-1",
    "cat 1": "CAT-1",
    "cat i": "CAT-1",
    "cat2": "CAT-2",
    "cat-2": "CAT-2",
    "cat 2": "CAT-2",
    "cat ii": "CAT-2",
    "da1": "DA-1",
    "da-1": "DA-1",
    "da 1": "DA-1",
    "da2": "DA-2",
    "da-2": "DA-2",
    "da 2": "DA-2",
    "quiz": "Quiz",
    "quiz1": "Quiz-1",
    "quiz2": "Quiz-2",
    "lab cat": "Lab CAT",
    "fat": "FAT",
    "semester end": "FAT",
    "lab fat": "Lab FAT"
}

def normalize_text(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return " ".join(cleaned.split())

def is_lab_query(text: str) -> bool:
    norm = normalize_text(text)
    tokens = norm.split()
    lab_keywords = {"lab", "practical", "ela", "lo", "experiment"}
    return any(k in tokens for k in lab_keywords)

def is_theory_query(text: str) -> bool:
    norm = normalize_text(text)
    tokens = norm.split()
    theory_keywords = {"theory", "eth", "th", "lecture"}
    return any(k in tokens for k in theory_keywords)

def resolve_course(
    query: str,
    session: StudentSession,
    is_lab: Optional[bool] = None
) -> List[Tuple[Any, float]]:
    norm = normalize_text(query)
    
    # 1. Check exact campus alias dictionary match first
    tokens = norm.split()
    expanded_query = norm
    for tok in tokens:
        if tok in CAMPUS_ALIASES:
            expanded_query = expanded_query.replace(tok, CAMPUS_ALIASES[tok].lower())

    # Build candidates from timetable & attendance
    courses_map = {}
    for att in session.attendance:
        key = (att.course_code, att.course_type)
        courses_map[key] = att

    matches = []
    for (code, c_type), att in courses_map.items():
        title = att.course_title.lower()
        full_repr = f"{code.lower()} {title}"
        
        # Calculate scores
        score_direct = fuzz.WRatio(expanded_query, full_repr)
        score_code = fuzz.WRatio(norm, code.lower())
        score_title = fuzz.token_set_ratio(expanded_query, title)
        
        final_score = max(score_direct, score_code, score_title)
        
        # If alias matched title closely
        for tok in tokens:
            if tok in CAMPUS_ALIASES and CAMPUS_ALIASES[tok].lower() in title:
                final_score = max(final_score, 90.0)
                
        # Type filtering
        if is_lab is True:
            if c_type not in ("ELA", "LO"):
                final_score -= 40.0
            else:
                final_score += 10.0
        elif is_lab is False:
            if c_type in ("ELA", "LO"):
                final_score -= 40.0
            else:
                final_score += 10.0

        matches.append((att, final_score))

    matches.sort(key=lambda x: x[1], reverse=True)
    return matches

def resolve_component(query: str) -> Optional[str]:
    norm = normalize_text(query)
    for alias, canonical in COMPONENT_ALIASES.items():
        if alias in norm:
            return canonical
    return None

def resolve_exam_type(query: str) -> Optional[str]:
    norm = normalize_text(query)
    if "cat1" in norm or "cat 1" in norm or "cat-1" in norm or "cat i" in norm:
        return "CAT-1"
    if "cat2" in norm or "cat 2" in norm or "cat-2" in norm or "cat ii" in norm:
        return "CAT-2"
    if "fat" in norm or "final" in norm or "sem end" in norm:
        return "FAT"
    return None

def resolve_semester(query: str, session: StudentSession) -> Optional[SemesterGradeRecord]:
    norm = normalize_text(query)
    
    # Check for "last sem" or "previous sem"
    if "last" in norm or "previous" in norm or "recent" in norm:
        if session.grade_history:
            return session.grade_history[-1]
            
    best_record = None
    best_score = 0.0
    for record in session.grade_history:
        sem_name = record.semester.lower()
        score = fuzz.token_set_ratio(norm, sem_name)
        
        # Specific patterns: "fall 24", "2024-25 fall", etc.
        if "fall" in norm and "fall" in sem_name:
            if "24" in norm and "24" in sem_name:
                score = 98.0
            if "25" in norm and "25" in sem_name:
                score = 95.0
        if "winter" in norm and "winter" in sem_name:
            if "24" in norm and "24" in sem_name:
                score = 95.0

        if score > best_score:
            best_score = score
            best_record = record
            
    if best_score >= 60.0:
        return best_record
    return session.grade_history[-1] if session.grade_history else None
