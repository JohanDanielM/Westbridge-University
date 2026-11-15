import re
from datetime import datetime, date
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator
from backend.app.constants import STREAMS, FACULTY_PERMISSIONS

# ----------------- AUTH SCHEMAS -----------------

class LoginRequest(BaseModel):
    identifier: str 
    password: str = Field(..., min_length=4)

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=8)
    confirm_password: str
    stream: str
    current_year: int = Field(..., ge=1, le=4)
    current_semester: int = Field(..., ge=1, le=2)
    entry_type: Literal["first_year", "transfer"]
    date_of_birth: date
    gender: Optional[Literal["female", "male", "non_binary", "prefer_not_to_say"]] = None
    phone: str = Field(..., min_length=7, max_length=20)
    address: str = Field(..., min_length=5, max_length=250)
    guardian_name: str = Field(..., min_length=2, max_length=120)
    guardian_phone: str = Field(..., min_length=7, max_length=20)
    photo_data_url: Optional[str] = None
    agree_terms: bool

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email format.")
        return v

    @field_validator("stream")
    @classmethod
    def validate_stream(cls, v: str) -> str:
        clean = v.upper().strip()
        valid_codes = {s["code"] for s in STREAMS}
        if clean not in valid_codes:
            raise ValueError(f"Stream must be one of {sorted(list(valid_codes))}.")
        return clean

    @field_validator("date_of_birth")
    @classmethod
    def validate_age(cls, v: date) -> date:
        today = date.today()
        # Must be at least 16 years old
        try:
            sixteen_years_ago = date(today.year - 16, today.month, today.day)
        except ValueError: # leap year edge case
            sixteen_years_ago = date(today.year - 16, today.month, today.day - 1)
        if v > sixteen_years_ago:
            raise ValueError("Student must be at least 16 years of age.")
        return v

    @field_validator("phone", "guardian_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = v.strip()
        if not re.match(r"^[0-9+\s\-]{7,20}$", cleaned):
            raise ValueError("Phone number must contain 7 to 20 digits, plus, spaces, or dashes.")
        return cleaned

    @field_validator("photo_data_url")
    @classmethod
    def validate_photo(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        if not (v.startswith("data:image/jpeg;base64,") or v.startswith("data:image/png;base64,")):
            raise ValueError("Photo must be a JPEG or PNG data URL.")
        raw_b64 = v.split(",", 1)[1] if "," in v else ""
        if len(raw_b64) * 0.75 > 2 * 1024 * 1024:
            raise ValueError("Photo data URL must be under 2 MB decoded.")
        return v

    @field_validator("agree_terms")
    @classmethod
    def validate_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must agree to the Westbridge University Terms and Honor Code.")
        return v

class RegisterResponse(BaseModel):
    ok: bool = True
    email_sent: bool = True
    student_id: str
    roll_number: str
    stream: str
    requires_verification: bool = True
    access_token: Optional[str] = None
    is_onboarded: Optional[bool] = False

class SendOTPRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str = Field(..., min_length=6, max_length=6)

class VerifyEmailRequest(BaseModel):
    email: str
    code: str = Field(..., min_length=6, max_length=6)

class ResendVerificationRequest(BaseModel):
    email: str

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    name: Optional[str] = "Student"
    role: str = "student" # "student" | "admin" | "faculty"
    student_id: Optional[str] = None
    faculty_id: Optional[str] = None
    roll_number: Optional[str] = None
    stream: Optional[str] = None
    semester: Optional[int] = None
    current_semester: Optional[int] = None
    current_year: Optional[int] = None
    department: Optional[str] = None
    program: Optional[str] = None
    term: Optional[str] = "Fall 2026"
    status: Optional[str] = "Active Priority Enrollment"
    avatar: Optional[str] = None
    provider: Optional[str] = "local" # "local" | "google" | "github"
    provider_id: Optional[str] = None
    is_active: bool = True
    must_change_password: Optional[bool] = False
    email_verified: Optional[bool] = True
    permissions: Optional[List[str]] = None
    is_onboarded: Optional[bool] = True

class UserCreate(UserBase):
    password: Optional[str] = Field(None, min_length=4)

class UserResponse(UserBase):
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, description="Registered University Email")

class ResetPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5)
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    new_password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None

class MessageResponse(BaseModel):
    message: str
    success: bool = True

# ----------------- FACULTY ACCESS CONTROL SCHEMAS -----------------

class FacultyCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str
    department: str
    permissions: List[str] = ["view_roster", "manage_course"]

class FacultyUpdateRequest(BaseModel):
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None

class FacultyResponse(BaseModel):
    id: Optional[str] = None
    faculty_id: str
    name: str
    full_name: Optional[str] = None
    email: str
    department: str
    permissions: List[str]
    is_active: bool
    courses_taught: int = 0
    last_login: Optional[str] = None

class FacultyCoursePatch(BaseModel):
    description: Optional[str] = None
    schedule: Optional[str] = None
    room: Optional[str] = None

# ----------------- COURSE SCHEMAS -----------------

class CourseBase(BaseModel):
    course_code: str
    course_name: str
    department: str
    credits: int = 4
    faculty_name: str
    description: Optional[str] = ""
    semester: str = "Fall"
    year: int = 2026
    days: List[str] = ["Mon", "Wed"]
    start_time: str = "10:00 AM"
    end_time: str = "11:30 AM"
    room: str = "Turing Hall 102"
    capacity: int = 40
    enrolled_count: int = 0
    enrolled: Optional[int] = 0
    seats_left: Optional[int] = 0
    prerequisites: List[str] = []
    status: str = "open" # "open" | "closed" | "full"

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    course_name: Optional[str] = None
    department: Optional[str] = None
    credits: Optional[int] = None
    faculty_name: Optional[str] = None
    description: Optional[str] = None
    semester: Optional[str] = None
    year: Optional[int] = None
    days: Optional[List[str]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    capacity: Optional[int] = None
    enrolled_count: Optional[int] = None
    prerequisites: Optional[List[str]] = None
    status: Optional[str] = None

class CourseResponse(CourseBase):
    id: Optional[str] = None
    waitlist_count: Optional[int] = 0

# ----------------- REGISTRATION SCHEMAS -----------------

class SingleRegisterRequest(BaseModel):
    course_code: str

class BatchRegisterRequest(BaseModel):
    course_codes: List[str]

class RegistrationItem(BaseModel):
    course_code: str
    course_name: str
    credits: int
    faculty_name: str
    schedule: str
    room: str
    registered_at: datetime
    status: str = "enrolled"

class RegistrationResultItem(BaseModel):
    course_code: str
    status: str # "registered" | "waitlisted" | "blocked"
    message: str
    waitlist_position: Optional[int] = None

class BatchRegisterResponse(BaseModel):
    results: List[RegistrationResultItem]
    reference_number: str
    timestamp: str

class DropCourseRequest(BaseModel):
    course_code: str

# ----------------- CART VALIDATION SCHEMAS -----------------

class CartCheckRequest(BaseModel):
    course_codes: List[str]

class CartItemCheckResult(BaseModel):
    course_code: str
    can_register: bool
    has_conflict: bool
    conflict_message: Optional[str] = None
    status: str # "open" | "full" | "closed"
    prereqs_met: bool
    missing_prereqs: List[str] = []

class CartCheckResponse(BaseModel):
    results: List[CartItemCheckResult]
    total_requested_credits: int
    current_enrolled_credits: int
    projected_credits: int
    credit_limit_exceeded: bool
    all_valid: bool

# ----------------- WAITLIST & SEAT OFFER SCHEMAS -----------------

class WaitlistJoinRequest(BaseModel):
    course_code: str
    selected_codes: Optional[List[str]] = None

class WaitlistEntryResponse(BaseModel):
    id: Optional[str] = None
    student_id: str
    course_code: str
    course_name: Optional[str] = None
    position: int
    joined_at: datetime
    status: str

class SeatOfferResponse(BaseModel):
    id: Optional[str] = None
    student_id: str
    course_code: str
    course_name: Optional[str] = None
    offered_at: datetime
    expires_at: datetime
    status: str # "pending" | "accepted" | "declined" | "expired"
    time_remaining_str: Optional[str] = None

class SeatOfferActionRequest(BaseModel):
    course_code: str
    action: str # "accept" | "decline"

# ----------------- ACADEMIC RECORD SCHEMAS -----------------

class AcademicCourse(BaseModel):
    code: str
    name: str
    crn: Optional[str] = ""
    instructor: Optional[str] = ""
    credits: float
    grade: str
    gradeType: str # "A" | "B" | "C" | "D" | "F"
    is_passed: bool = True

class AcademicTermRecord(BaseModel):
    termId: str
    name: str
    sub: Optional[str] = ""
    termGpa: str
    termCredits: str
    standing: str
    courses: List[AcademicCourse]

class AcademicRecordResponse(BaseModel):
    student_id: str
    student_name: str
    cgpa: float
    total_credits_earned: float
    major_credits_earned: float
    core_credits_completed: float
    standing: str
    terms: List[AcademicTermRecord]

# ----------------- DASHBOARD SCHEMAS -----------------

class StudentDashboardSummary(BaseModel):
    student_id: str
    name: str
    program: str
    term: str
    status: str
    cgpa: float
    registered_courses_count: int
    credits_used: int
    credits_max: int = 24
    credits_remaining: int
    waiting_list_count: int
    registered_courses: List[Dict[str, Any]]
    active_seat_offers: List[SeatOfferResponse]
    notifications: List[Dict[str, Any]]

class AdminDashboardSummary(BaseModel):
    registrations_today: int
    total_enrolled: int
    courses_full: int
    active_waitlist: int
    blocked_attempts: int
    high_demand_courses: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
