from __future__ import annotations
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Student Profile & Academic Sub-models
# -----------------------------------------------------------------------------

class StudentProfile(BaseModel):
    reg_no: str
    name: str
    program: str
    school: str
    semester: str
    tenth_marks: float = Field(..., description="10th percentage for placement cutoffs")
    twelfth_marks: float = Field(..., description="12th percentage for placement cutoffs")
    current_cgpa: float
    mentor_name: str
    mentor_email: str
    mentor_cabin: str
    hostel_block: Optional[str] = None
    room_no: Optional[str] = None
    credentials_saved: Optional[bool] = False


class AcademicHoliday(BaseModel):
    date: str  # YYYY-MM-DD
    name: str


class AcademicCalendar(BaseModel):
    semester_name: str
    start_date: str
    end_date: str
    instructional_days: List[str] = Field(default_factory=list)
    holidays: List[AcademicHoliday] = Field(default_factory=list)
    cat1_start: Optional[str] = None
    cat1_end: Optional[str] = None
    cat2_start: Optional[str] = None
    cat2_end: Optional[str] = None
    fat_start: Optional[str] = None
    fat_end: Optional[str] = None


class TimetableDaySchedule(BaseModel):
    day: str  # Monday, Tuesday, etc.
    start_time: str  # "08:30"
    end_time: str  # "10:00"


class TimetableCourse(BaseModel):
    course_code: str
    course_title: str
    course_type: str  # "ETH", "ELA", "TH", "LO"
    slot: str
    room_no: str
    faculty_name: str
    faculty_cabin: str
    faculty_email: str
    schedule: List[TimetableDaySchedule] = Field(default_factory=list)


class AttendanceDateLog(BaseModel):
    date: str  # YYYY-MM-DD
    slot: str
    status: str  # "Present", "Absent", "OD", "Holiday"


class CourseAttendance(BaseModel):
    course_code: str
    course_title: str
    course_type: str  # "ETH", "ELA", "TH", "LO"
    slot: str
    attended_classes: int
    total_classes: int
    attendance_percentage: float
    date_logs: List[AttendanceDateLog] = Field(default_factory=list)
    remaining_scheduled_classes: int = 0


class MarksComponent(BaseModel):
    name: str  # "CAT-1", "CAT-2", "DA-1", "DA-2", "Quiz", "Lab CAT", "FAT"
    max_marks: float
    scored_marks: Optional[float] = None
    weightage: float
    class_average: Optional[float] = None


class CourseMarks(BaseModel):
    course_code: str
    course_title: str
    course_type: str  # "ETH", "ELA", "TH", "LO"
    components: List[MarksComponent] = Field(default_factory=list)
    current_internal_total: float = 0.0
    current_internal_max: float = 50.0


class ExamScheduleItem(BaseModel):
    course_code: str
    course_title: str
    exam_type: str  # "CAT-1", "CAT-2", "FAT"
    date: str  # YYYY-MM-DD
    session: str  # "FN", "AN"
    reporting_time: str
    exam_time: str
    academic_block: str
    room_no: str
    seat_no: str
    seat_row: int
    seat_col: int
    total_rows: int
    total_cols: int


class SemesterCourseGrade(BaseModel):
    course_code: str
    course_title: str
    credits: float
    grade: str  # S, A, B, C, D, E, F
    course_type: str


class SemesterGradeRecord(BaseModel):
    semester: str
    sgpa: float
    credits_earned: float
    courses: List[SemesterCourseGrade] = Field(default_factory=list)


class CreditBasket(BaseModel):
    required: float
    earned: float


class CreditDistribution(BaseModel):
    baskets: Dict[str, CreditBasket]  # "UC", "PC", "PE", "UE"
    total_required: float
    total_earned: float
    cgpa: float


class DeadlineItem(BaseModel):
    course_code: str
    course_title: str
    title: str
    due_date: str  # YYYY-MM-DD
    due_time: str
    submission_type: str  # "Digital Assignment", "Project Report", "Quiz"
    status: str  # "Pending", "Submitted"


class HostelOuting(BaseModel):
    id: str
    type: str  # "Weekend", "General"
    out_date: str
    in_date: str
    place: str
    status: str  # "Approved", "Pending", "Rejected"


class BiometricLog(BaseModel):
    date: str
    in_time: Optional[str] = None
    out_time: Optional[str] = None
    location: str


class CourseMaterial(BaseModel):
    course_code: str
    course_title: str
    module: str
    title: str
    filename: str
    url: Optional[str] = None
    summary: Optional[str] = None


# -----------------------------------------------------------------------------
# Root StudentSession Schema
# -----------------------------------------------------------------------------

class StudentSession(BaseModel):
    session_id: str
    last_synced_at: str
    profile: StudentProfile
    academic_calendar: AcademicCalendar
    timetable: List[TimetableCourse] = Field(default_factory=list)
    attendance: List[CourseAttendance] = Field(default_factory=list)
    marks: List[CourseMarks] = Field(default_factory=list)
    exam_schedule: List[ExamScheduleItem] = Field(default_factory=list)
    grade_history: List[SemesterGradeRecord] = Field(default_factory=list)
    credit_distribution: CreditDistribution
    deadlines: List[DeadlineItem] = Field(default_factory=list)
    hostel_outings: List[HostelOuting] = Field(default_factory=list)
    biometric_logs: List[BiometricLog] = Field(default_factory=list)
    course_materials: List[CourseMaterial] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Tool Return & UI Card Schemas
# -----------------------------------------------------------------------------

class ToolExecutionResult(BaseModel):
    summary_data: Dict[str, Any]
    ui_card_type: str  # "exam_pass", "attendance_gauge", "marks_fat", "credit_audit", "deadline_radar", "subject_snapshot", etc.
    card_payload: Dict[str, Any]
    suggested_chips: List[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    message: str
    client_date: Optional[str] = None


class LoginInitResponse(BaseModel):
    login_flow_id: str
    captcha_image_base64: Optional[str] = None
    requires_captcha: bool = True


class LoginRequest(BaseModel):
    username: str
    password: str
    captcha: Optional[str] = None
    login_flow_id: Optional[str] = None
    otp: Optional[str] = None


class OtpVerifyRequest(BaseModel):
    login_flow_id: str
    otp: str
    username: Optional[str] = None
    password: Optional[str] = None


class AuthResponse(BaseModel):
    status: str  # "SUCCESS", "OTP_REQUIRED", "INVALID_CREDENTIALS", "ERROR"
    message: str
    session_id: Optional[str] = None
    starter_chips: List[str] = Field(default_factory=list)
    alerts: List[Dict[str, Any]] = Field(default_factory=list)
