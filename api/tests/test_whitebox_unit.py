import pytest
import os
import json
from api.models.schemas import StudentSession
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


@pytest.fixture
def session_fixture() -> StudentSession:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    fixture_path = os.path.join(current_dir, "fixtures", "mock_session.json")
    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return StudentSession.model_validate(data)


# =============================================================================
# WHITE-BOX UNIT TESTS: MATHEMATICAL FORMULAS, BOUNDARIES & BRANCH COVERAGE
# =============================================================================

def test_wb_attendance_exact_formulas_and_custom_target(session_fixture):
    """
    White-Box Unit Test: Verify exact mathematical calculations for skip buffer:
    floor((A - target*T) / target) and classes needed: ceil((target*T - A) / (1 - target)).
    """
    # Test with standard 75% target on Operating Systems (CSE3002: attended=22, total=25 -> 88.0%)
    res_75 = get_attendance_analysis(session_fixture, course_query="CSE3002", target_pct=75.0)
    assert res_75["ui_card_type"] == "attendance_gauge"
    course = res_75["card_payload"]["courses"][0]
    
    # floor((22 - 0.75*25) / 0.75) = floor((22 - 18.75) / 0.75) = floor(3.25 / 0.75) = floor(4.333) = 4
    assert course["skip_buffer"] == 4
    assert course["classes_needed"] == 0
    assert course["status"] == "SAFE"

    # Test with custom target: 85%
    # floor((22 - 0.85*25) / 0.85) = floor((22 - 21.25) / 0.85) = floor(0.75 / 0.85) = 0 skips safe
    res_85 = get_attendance_analysis(session_fixture, course_query="CSE3002", target_pct=85.0)
    course_85 = res_85["card_payload"]["courses"][0]
    assert course_85["skip_buffer"] == 0


def test_wb_attendance_zero_attended_and_debarment_boundary(session_fixture):
    """
    White-Box Unit Test: Test boundary conditions where attended=0 or percentage < 60%.
    """
    # Artificially modify a course to test 0 attendance boundary
    att_zero = session_fixture.attendance[0].model_copy()
    att_zero.course_code = "ZERO101"
    att_zero.course_title = "Zero Attendance Subject"
    att_zero.attended_classes = 0
    att_zero.total_classes = 10
    att_zero.attendance_percentage = 0.0
    session_fixture.attendance.insert(0, att_zero)

    res = get_attendance_analysis(session_fixture, course_query="ZERO101")
    course = res["card_payload"]["courses"][0]
    assert course["percentage"] == 0.0
    assert course["skip_buffer"] == 0
    assert course["status"] == "DEBARMENT_RISK"
    assert "debarment" in course["status_message"].lower()
    # ceil((0.75 * 10 - 0) / 0.25) = ceil(7.5 / 0.25) = 30 classes needed
    assert course["classes_needed"] == 30


def test_wb_attendance_unknown_course_fallback(session_fixture):
    """
    White-Box Unit Test: Test branch where a course code is not found.
    Verifies that all registered courses are returned as a fallback with helpful chips.
    """
    res = get_attendance_analysis(session_fixture, course_query="NONEXISTENT999")
    assert res["ui_card_type"] == "attendance_gauge"
    assert len(res["card_payload"]["courses"]) > 1  # Returns all registered courses
    assert len(res["suggested_chips"]) > 0


def test_wb_multiday_leave_date_validation_and_branching(session_fixture):
    """
    White-Box Unit Test: Verify date validation and leave calculations.
    """
    # 1. Reversed date range (start_date > end_date) is auto-swapped gracefully
    res_inv = simulate_multi_day_leave(
        session_fixture,
        start_date="2026-11-28",
        end_date="2026-11-20"
    )
    assert res_inv["ui_card_type"] == "multi_day_leave"
    assert len(res_inv["card_payload"]["projections"]) > 0

    # 2. Weekend only leave (e.g. 2026-11-29 Sunday)
    res_sun = simulate_multi_day_leave(
        session_fixture,
        start_date="2026-11-29",
        end_date="2026-11-29"
    )
    assert res_sun["ui_card_type"] == "multi_day_leave"
    # Sunday has zero instructional classes scheduled
    for proj in res_sun["card_payload"]["projections"]:
        assert proj["missed_classes"] == 0


def test_wb_subject_marks_theory_vs_lab_separation(session_fixture):
    """
    White-Box Unit Test: Verify that ETH (Theory) and ELA (Lab) marks for the same course code
    are never co-mingled and have distinct components and weightages.
    """
    # Query theory
    res_th = get_subject_marks(session_fixture, course_query="Computer Networks", is_lab=False)
    assert res_th["ui_card_type"] == "marks_fat"
    for r in res_th["card_payload"]["results"]:
        assert r["course_type"] in ["ETH", "TH"]
        assert r["current_internal_max"] == 50.0
        assert any(c["name"] == "CAT-1" for c in r["components"])

    # Query lab
    res_lab = get_subject_marks(session_fixture, course_query="Computer Networks", is_lab=True)
    assert res_lab["ui_card_type"] == "marks_fat"
    for r in res_lab["card_payload"]["results"]:
        assert r["course_type"] in ["ELA", "LO"]
        assert r["current_internal_max"] == 50.0
        assert any(c["name"] == "Lab CAT" for c in r["components"])


def test_wb_fat_grade_prediction_all_brackets(session_fixture):
    """
    White-Box Unit Test: Verify relative grading thresholds and strict mandatory 40/100 FAT rule.
    """
    # Predict for CSE2001
    res = predict_fat_grade(session_fixture, course_query="CSE2001", target_grade="S")
    assert res["ui_card_type"] == "marks_fat"
    payload = res["card_payload"]
    assert payload["target_grade"] == "S"
    assert "all_brackets" in payload
    assert len(payload["all_brackets"]) >= 5

    # Check that for any grade where raw FAT needed is < 40, effective_min_fat is strictly 40.0
    for b in payload["all_brackets"]:
        if b["raw_fat_needed"] < 40.0:
            assert b["requires_min_40_rule"] is True


def test_wb_semester_gpa_historical_and_whatif(session_fixture):
    """
    White-Box Unit Test: Verify SGPA lookup and hypothetical what-if grade simulation.
    """
    # 1. Official lookup without what-if
    res_official = get_semester_gpa(session_fixture, semester_query="Fall 2025")
    assert res_official["ui_card_type"] == "credit_audit"
    assert res_official["card_payload"]["sgpa"] == 8.92

    # 2. What-if simulation
    res_whatif = get_semester_gpa(
        session_fixture,
        semester_query="Fall 2025",
        what_if_grades={"MAT2001": "S"}
    )
    assert res_whatif["ui_card_type"] == "credit_audit"
    assert res_whatif["card_payload"]["is_projected_simulation"] is True
    # Upgrading MAT2001 to S increases projected SGPA
    assert res_whatif["card_payload"]["sgpa"] > 8.92


def test_wb_placement_badges_logic(session_fixture):
    """
    White-Box Unit Test: Test 7/7/7, 8/8/8, and 9/9/9 placement cutoff evaluations.
    """
    res = get_credit_distribution(session_fixture)
    assert res["ui_card_type"] == "credit_audit"
    badges = res["card_payload"]["placement_badges"]
    
    # In mock: 10th=93.5%, 12th=92.0%, CGPA=8.82
    # 7/7/7: 10th>=70, 12th>=70, CGPA>=7.0 -> True
    assert badges["badge_777"]["eligible"] is True
    # 8/8/8: 10th>=80, 12th>=80, CGPA>=8.0 -> True
    assert badges["badge_888"]["eligible"] is True
    # 9/9/9: 10th>=90, 12th>=90, CGPA>=9.0 -> False (CGPA is 8.82 < 9.0)
    assert badges["badge_999"]["eligible"] is False


def test_wb_campus_life_and_deadlines_lookups(session_fixture):
    """
    White-Box Unit Test: Test timetable, mentor cabin, hostel outing, and biometric punch queries.
    """
    # 1. Mentor cabin lookup
    res_mentor = get_campus_life_and_deadlines(session_fixture, category="mentor")
    assert res_mentor["card_payload"]["mentor"]["name"] == "Dr. K. Srinivas"
    assert res_mentor["card_payload"]["mentor"]["cabin"] == "AB1-304"

    # 2. Deadlines lookup
    res_dl = get_campus_life_and_deadlines(session_fixture, category="deadlines")
    assert res_dl["ui_card_type"] == "deadline_radar"
    assert len(res_dl["card_payload"]["deadlines"]) > 0

    # 3. Biometric lookup
    res_bio = get_campus_life_and_deadlines(session_fixture, category="biometrics")
    assert len(res_bio["card_payload"]["logs"]) > 0


def test_wb_subject_snapshot_unified_aggregation(session_fixture):
    """
    White-Box Unit Test: Test unified snapshot aggregating attendance, marks, next class, and exams.
    """
    res = get_subject_snapshot(session_fixture, course_query="CSE2001")
    assert res["ui_card_type"] == "subject_snapshot"
    payload = res["card_payload"]
    assert payload["course_code"] == "CSE2001"
    assert "attendance" in payload
    assert "marks" in payload
    assert "next_class" in payload
