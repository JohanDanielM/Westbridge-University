from fastapi import APIRouter, Depends, status
from backend.app.schemas.schemas import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    SendOTPRequest,
    VerifyOTPRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    TokenResponse,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse
)
from backend.app.controllers.auth_controller import (
    login_user,
    register_user,
    send_otp_for_email,
    verify_otp_for_email,
    verify_user_email,
    resend_email_verification,
    request_forgot_password,
    reset_user_password
)
from backend.app.middleware.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: RegisterRequest,
    current_user: dict = Depends(get_optional_user)
):
    return await register_user(register_data, current_user)

@router.post("/send-otp", response_model=MessageResponse)
async def send_otp_endpoint(payload: SendOTPRequest):
    return await send_otp_for_email(payload)

@router.post("/verify-otp", response_model=MessageResponse)
async def verify_otp_endpoint(payload: VerifyOTPRequest):
    return await verify_otp_for_email(payload)

@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest):
    return await verify_user_email(payload)

@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest):
    return await resend_email_verification(payload)

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    return await login_user(login_data)

@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request_data: ForgotPasswordRequest):
    return await request_forgot_password(request_data)

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request_data: ResetPasswordRequest):
    return await reset_user_password(request_data)

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.get("_id")),
        student_id=current_user.get("student_id"),
        faculty_id=current_user.get("faculty_id"),
        roll_number=current_user.get("roll_number"),
        stream=current_user.get("stream"),
        semester=current_user.get("semester") or current_user.get("current_semester"),
        current_semester=current_user.get("current_semester") or current_user.get("semester"),
        current_year=current_user.get("current_year"),
        email=current_user.get("email"),
        name=current_user.get("name") or current_user.get("full_name") or "Student",
        full_name=current_user.get("full_name") or current_user.get("name"),
        role=current_user.get("role", "student"),
        department=current_user.get("department"),
        program=current_user.get("program"),
        term=current_user.get("term", "Fall 2026"),
        status=current_user.get("status", "Active Priority Enrollment"),
        avatar=current_user.get("avatar"),
        provider=current_user.get("provider", "local"),
        provider_id=current_user.get("provider_id"),
        is_active=current_user.get("is_active", True),
        must_change_password=current_user.get("must_change_password", False),
        email_verified=current_user.get("email_verified", True),
        permissions=current_user.get("permissions"),
        is_onboarded=current_user.get("is_onboarded", True),
        created_at=current_user.get("created_at"),
        updated_at=current_user.get("updated_at")
    )

