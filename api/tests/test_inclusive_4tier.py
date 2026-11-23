import json
import os
import pytest
from api.models.schemas import StudentSession
from api.nlu.router import detect_intent_deterministic
from api.nlu.resolver import resolve_course, resolve_component, is_lab_query

@pytest.fixture
def mock_session():
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "mock_session.json")
    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return StudentSession.model_validate(data)


# -----------------------------------------------------------------------------
# Suite B: 4-Tier Inclusive NLU & Code-Mixed Queries (12 Tests)
# -----------------------------------------------------------------------------

def test_b1_clear_multiday_leave_theory(mock_session):
    q = "If I skip Thursday and Friday OS theory classes, will I stay above 75%?"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "multi_day_leave"
    projections = tool_res["card_payload"]["projections"]
    os_proj = next(p for p in projections if p["course_code"] == "CSE3002" and p["course_type"] == "ETH")
    assert os_proj["missed_classes"] >= 1
    assert "drop_delta" in os_proj


def test_b2_clear_semester_gpa(mock_session):
    q = "What is my GPA in 2024-25 fall sem?"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "credit_audit"
    assert "2024-25 Fall" in tool_res["card_payload"]["semester"]
    assert tool_res["card_payload"]["sgpa"] == 8.92


def test_b3_clear_python_fat_score(mock_session):
    q = "What is my score in python in fat?"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "marks_fat"
    results = tool_res["card_payload"]["results"]
    assert any(r["course_code"] == "SWE1004" for r in results)


def test_b4_clear_lab_marks_computer_network(mock_session):
    q = "What is my lab marks in computer network?"
    assert is_lab_query(q) is True
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "marks_fat"
    for r in tool_res["card_payload"]["results"]:
        assert r["course_type"] in ("ELA", "LO")


def test_b5_partial_python_marks(mock_session):
    q = "my python marks"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "marks_fat"
    results = tool_res["card_payload"]["results"]
    assert results[0]["course_code"] == "SWE1004"
    # Should include all components (CAT-1, CAT-2, DA-1, etc.)
    assert len(results[0]["components"]) >= 3


def test_b6_partial_java_cat1(mock_session):
    q = "java cat1"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "marks_fat"
    assert tool_res["card_payload"]["filter_component"] == "CAT-1"


def test_b7_fragmented_75_attendance(mock_session):
    q = "75?"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "attendance_gauge"
    courses = tool_res["card_payload"]["courses"]
    # Lowest should be sorted first
    assert courses[0]["percentage"] <= courses[-1]["percentage"]


def test_b8_fragmented_seat_or_room(mock_session):
    q = "seat"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "exam_pass"
    next_exam = tool_res["card_payload"]["exams"][0]
    assert "room_no" in next_exam
    assert "seat_no" in next_exam


def test_b9_fragmented_cn_snapshot(mock_session):
    q = "cn"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "subject_snapshot"
    assert tool_res["card_payload"]["course_code"] == "CSE2001"
    assert "attendance" in tool_res["card_payload"]
    assert "marks" in tool_res["card_payload"]


def test_b10_typos_and_broken_english(mock_session):
    q = "wht my jva cat1 mrk"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "marks_fat"
    assert tool_res["card_payload"]["filter_component"] == "CAT-1"


def test_b11_tenglish_and_hinglish(mock_session):
    q_tel = "repu xam room ekkada?"
    res_tel = detect_intent_deterministic(q_tel, mock_session)
    assert res_tel["tool_result"]["ui_card_type"] == "exam_pass"

    q_hin = "kal class bunk karu?"
    res_hin = detect_intent_deterministic(q_hin, mock_session)
    assert res_hin["tool_result"]["ui_card_type"] in ("attendance_gauge", "multi_day_leave")


def test_b12_ambiguous_collision_lab_marks(mock_session):
    # Enrolled in multiple labs (CSE2001 ELA, CSE3002 ELA, SWE1004 ELA, CSE2004 ELA)
    q = "lab marks"
    res = detect_intent_deterministic(q, mock_session)
    tool_res = res["tool_result"]
    
    assert tool_res["ui_card_type"] == "marks_fat"
    results = tool_res["card_payload"]["results"]
    assert len(results) >= 2
    for r in results:
        assert r["course_type"] in ("ELA", "LO")


def test_b13_exam_phrasings(mock_session):
    for q in ["When is my next exam?", "what is my next exam", "exam", "exams"]:
        res = detect_intent_deterministic(q, mock_session)
        assert res["tool_result"]["ui_card_type"] == "exam_pass"
        assert len(res["tool_result"]["card_payload"]["exams"]) >= 1


def test_b14_current_semester_and_labs(mock_session):
    res_sem = detect_intent_deterministic("fall semester 202627", mock_session)
    assert res_sem["tool_result"]["ui_card_type"] == "marks_fat"

    res_lab = detect_intent_deterministic("frontend lab", mock_session)
    assert res_lab["tool_result"]["ui_card_type"] == "marks_fat"
