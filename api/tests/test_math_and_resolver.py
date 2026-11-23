import json
import os
import pytest
from api.models.schemas import StudentSession, CourseAttendance
from api.tools.academic_tools import (
    get_attendance_analysis,
    simulate_multi_day_leave,
    predict_fat_grade,
    get_credit_distribution
)
from api.nlu.resolver import (
    resolve_course,
    resolve_component,
    resolve_exam_type,
    resolve_semester,
    is_lab_query,
    is_theory_query
)

@pytest.fixture
def mock_session():
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "mock_session.json")
    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return StudentSession.model_validate(data)


# -----------------------------------------------------------------------------
# Suite C: Deterministic Academic Math Edge Cases (7 Tests)
# -----------------------------------------------------------------------------

def test_c1_exact_75_percent_borderline(mock_session):
    # CSE2001 ETH has 15 attended, 20 total = 75.0% exactly
    res = get_attendance_analysis(mock_session, course_query="CSE2001", sort_lowest=False)
    courses = res["card_payload"]["courses"]
    eth_course = next(c for c in courses if c["course_type"] == "ETH")
    
    assert eth_course["percentage"] == 75.0
    assert eth_course["skip_buffer"] == 0
    assert eth_course["classes_needed"] == 0
    assert eth_course["status"] == "BORDERLINE_SAFE"


def test_c2_rounding_trap_74_9_percent(mock_session):
    # Create test attendance: 149 attended out of 199 total = 74.874% (< 75.0%)
    mock_session.attendance.append(CourseAttendance(
        course_code="TEST101",
        course_title="Rounding Test Subject",
        course_type="ETH",
        slot="A1",
        attended_classes=149,
        total_classes=199,
        attendance_percentage=74.87,
        remaining_scheduled_classes=20
    ))
    res = get_attendance_analysis(mock_session, course_query="TEST101")
    course = res["card_payload"]["courses"][0]
    
    assert course["percentage"] < 75.0
    assert course["skip_buffer"] == 0
    assert course["classes_needed"] >= 1
    assert course["status"] in ("WARNING", "DEBARMENT_RISK")


def test_c3_unreachable_75_without_od(mock_session):
    # Create test attendance: attended 5 / 16, needs > 15 classes, but only 2 remain
    mock_session.attendance.append(CourseAttendance(
        course_code="TEST404",
        course_title="Unreachable Subject",
        course_type="ETH",
        slot="B1",
        attended_classes=5,
        total_classes=16,
        attendance_percentage=31.25,
        remaining_scheduled_classes=2
    ))
    res = get_attendance_analysis(mock_session, course_query="TEST404")
    course = res["card_payload"]["courses"][0]
    
    assert course["status"] in ("UNREACHABLE_WITHOUT_OD", "DEBARMENT_RISK")


def test_c4_below_60_debarment_risk(mock_session):
    # MAT2001 in mock_session has 13/23 = 56.52% (< 60.0%)
    res = get_attendance_analysis(mock_session, course_query="MAT2001")
    course = res["card_payload"]["courses"][0]
    
    assert course["percentage"] < 60.0
    assert course["status"] == "DEBARMENT_RISK"


def test_c5_multi_day_leave_with_holidays_and_od(mock_session):
    # 2026-11-27 (Friday) to 2026-11-30 (Monday)
    # Note: 2026-11-28 is Fourth Saturday (Holiday in mock), 2026-11-29 is Sunday
    res_normal = simulate_multi_day_leave(
        mock_session,
        start_date="2026-11-27",
        end_date="2026-11-30",
        include_pending_od=False
    )
    res_od = simulate_multi_day_leave(
        mock_session,
        start_date="2026-11-27",
        end_date="2026-11-30",
        include_pending_od=True
    )
    
    # In res_normal, percentages should drop
    # In res_od, percentages should be preserved or improved
    proj_normal = res_normal["card_payload"]["projections"][0]
    proj_od = res_od["card_payload"]["projections"][0]
    
    assert proj_od["projected_pct"] >= proj_normal["projected_pct"]


def test_c6_fat_pass_rule_minimum_40_enforced(mock_session):
    # If internal is 48/50, and student wants D grade (50 total):
    # Mathematically needs (50 - 48)/0.5 = 4/100 in FAT.
    # But mandatory pass rule requires 40/100 in FAT!
    res = predict_fat_grade(mock_session, course_query="SWE1004", target_grade="D")
    payload = res["card_payload"]
    
    assert payload["pass_rule_enforced"] is True
    assert payload["effective_min_fat"] == 40.0
    assert "MINIMUM of 40/100" in payload["status_note"]


def test_c7_credit_distribution_and_placement_cutoffs(mock_session):
    res = get_credit_distribution(mock_session)
    payload = res["card_payload"]
    summary = res["summary_data"]
    
    # Profile has 10th: 93.5%, 12th: 92.0%, CGPA: 8.82
    # 7/7/7: Yes
    # 8/8/8: Yes
    # 9/9/9: No (CGPA 8.82 < 9.0)
    assert summary["eligible_7_7_7"] is True
    assert summary["eligible_8_8_8"] is True
    assert summary["eligible_9_9_9"] is False
    assert payload["baskets"]["UC"]["earned"] == 42.0
    assert payload["baskets"]["PC"]["earned"] == 46.0


# -----------------------------------------------------------------------------
# Resolver and Campus Alias Tests
# -----------------------------------------------------------------------------

def test_resolver_campus_aliases(mock_session):
    matched = resolve_course("cn", mock_session)
    assert matched[0][0].course_code == "CSE2001"
    
    matched_os = resolve_course("os", mock_session)
    assert matched_os[0][0].course_code == "CSE3002"
    
    matched_py = resolve_course("python", mock_session)
    assert matched_py[0][0].course_code == "SWE1004"


def test_resolver_lab_vs_theory(mock_session):
    assert is_lab_query("python lab marks") is True
    assert is_theory_query("os theory classes") is True
    
    lab_matches = resolve_course("python lab", mock_session, is_lab=True)
    assert lab_matches[0][0].course_type in ("ELA", "LO")


def test_resolver_exam_and_components():
    assert resolve_component("cat1") == "CAT-1"
    assert resolve_component("da-2") == "DA-2"
    assert resolve_component("fat marks") == "FAT"
    assert resolve_exam_type("fat schedule") == "FAT"
    assert resolve_exam_type("cat 2 date") == "CAT-2"
