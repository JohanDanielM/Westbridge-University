import re
import secrets
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
import logging

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
from backend.app.database import get_users_collection, get_academic_records_collection
from backend.app.utils.security import verify_password, hash_password, create_access_token
from backend.app.utils.logger import log_activity
from backend.app.utils.email import send_otp_email, send_verification_email
from backend.app.services.ids import next_student_id
from backend.app.services.roll_numbers import next_roll_number
from backend.app.constants import STREAMS, CURRENT_TERM, ADMISSION_YEAR

logger = logging.getLogger("ccrs.auth")


async def login_user(login_data: LoginRequest) -> TokenResponse:
    users_coll = get_users_collection()
    identifier = login_data.identifier.strip()
    
    # Query identifier by student_id, faculty_id, roll_number, or email
    user = await users_coll.find_one({
        "$or": [
            {"student_id": identifier},
            {"faculty_id": identifier},
            {"faculty_id": identifier.upper()},
            {"roll_number": identifier.upper()},
            {"roll_number": identifier},
            {"email": identifier.lower()},
            {"email": identifier}
        ]
    })
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Student ID, roll number, or email not found."
        )
    
    hashed_pwd = user.get("hashed_password", "")
    if not verify_password(login_data.password, hashed_pwd):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Incorrect password."
        )
        
    # Check email verification: if email_verified is explicitly False, block login
    if user.get("email_verified", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email before signing in."
        )
    
    # Generate token
    sub_val = user.get("student_id") or user.get("email")
    token_payload = {
        "sub": sub_val,
        "email": user.get("email"),
        "role": user.get("role", "student"),
        "name": user.get("name") or user.get("full_name")
    }
    access_token = create_access_token(token_payload)
    
    # Log login activity
    await log_activity(
        action="LOGIN",
        user_id=sub_val,
        user_role=user.get("role"),
        details={"ip": "127.0.0.1", "identifier": identifier}
    )
    
    user_resp = UserResponse(
        id=str(user.get("_id")),
        student_id=user.get("student_id"),
        faculty_id=user.get("faculty_id"),
        roll_number=user.get("roll_number"),
        stream=user.get("stream"),
        semester=user.get("semester") or user.get("current_semester"),
        current_semester=user.get("current_semester") or user.get("semester"),
        current_year=user.get("current_year"),
        email=user.get("email"),
        name=user.get("name") or user.get("full_name") or "Student",
        full_name=user.get("full_name") or user.get("name"),
        role=user.get("role", "student"),
        department=user.get("department"),
        program=user.get("program"),
        term=user.get("term", CURRENT_TERM),
        status=user.get("status", "Active Priority Enrollment"),
        avatar=user.get("avatar"),
        provider=user.get("provider", "local"),
        provider_id=user.get("provider_id"),
        is_active=user.get("is_active", True),
        must_change_password=user.get("must_change_password", False),
        email_verified=user.get("email_verified", True),
        permissions=user.get("permissions"),
        created_at=user.get("created_at"),
        updated_at=user.get("updated_at")
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )


async def register_user(register_data: RegisterRequest, current_user: Optional[Dict[str, Any]] = None) -> RegisterResponse:
    # ... (Keep the exact same register_user logic you already have) ...
    users_coll = get_users_collection()
    records_coll = get_academic_records_collection()
    email_clean = register_data.email.lower().strip()

    if register_data.password and register_data.confirm_password and register_data.password != register_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password confirmation does not match."
        )

    existing_user = None
    if current_user and current_user.get("_id"):
        from bson import ObjectId
        try:
            existing_user = await users_coll.find_one({"_id": ObjectId(current_user["_id"])})
        except Exception:
            pass
    if not existing_user:
        existing_user = await users_coll.find_one({
            "$or": [
                {"email": email_clean},
                {"email": register_data.email}
            ]
        })

    stream_code = register_data.stream.upper().strip()
    stream_name_map = {s["code"]: s["name"] for s in STREAMS}
    stream_name = stream_name_map.get(stream_code, "Computer Science")
    now = datetime.now(timezone.utc)
    dob_val = (
        register_data.date_of_birth.isoformat()
        if hasattr(register_data.date_of_birth, "isoformat")
        else str(register_data.date_of_birth)
    )

    if existing_user and (existing_user.get("is_onboarded") is False or existing_user.get("provider") in ["google", "github"]):
        student_id = existing_user.get("student_id") or await next_student_id(ADMISSION_YEAR)
        roll_number = existing_user.get("roll_number") or await next_roll_number(stream_code, ADMISSION_YEAR)
        
        update_fields = {
            "full_name": register_data.full_name.strip(),
            "name": register_data.full_name.strip(),
            "email": email_clean,
            "student_id": student_id,
            "roll_number": roll_number,
            "stream": stream_code,
            "admission_year": ADMISSION_YEAR,
            "current_year": register_data.current_year,
            "current_semester": register_data.current_semester,
            "entry_type": register_data.entry_type,
            "date_of_birth": dob_val,
            "gender": register_data.gender,
            "phone": register_data.phone.strip(),
            "address": register_data.address.strip(),
            "guardian_name": register_data.guardian_name.strip(),
            "guardian_phone": register_data.guardian_phone.strip(),
            "department": stream_name,
            "program": f"B.Sc. {stream_name}",
            "term": CURRENT_TERM,
            "status": "Active Priority Enrollment",
            "is_active": True,
            "is_onboarded": True,
            "email_verified": True,
            "updated_at": now,
        }
        if register_data.photo_data_url:
            update_fields["photo_data_url"] = register_data.photo_data_url
            update_fields["avatar"] = register_data.photo_data_url
        if register_data.password:
            update_fields["hashed_password"] = hash_password(register_data.password)

        await users_coll.update_one({"_id": existing_user["_id"]}, {"$set": update_fields})

        rec = await records_coll.find_one({"student_id": student_id})
        if not rec:
            await records_coll.insert_one({
                "student_id": student_id,
                "student_name": register_data.full_name.strip(),
                "cgpa": 0.0,
                "total_credits_earned": 0.0,
                "major_credits_earned": 0.0,
                "core_credits_completed": 0.0,
                "standing": "Good Standing",
                "terms": []
            })

        sub_val = student_id or email_clean
        token_payload = {
            "sub": sub_val,
            "email": email_clean,
            "role": "student",
            "name": register_data.full_name.strip()
        }
        access_token = create_access_token(token_payload)

        await log_activity(
            action="ONBOARD_OAUTH_USER",
            user_id=student_id,
            user_role="student",
            details={
                "email": email_clean,
                "roll_number": roll_number,
                "stream": stream_code,
                "provider": existing_user.get("provider", "oauth")
            }
        )

        return RegisterResponse(
            ok=True,
            email_sent=False,
            student_id=student_id,
            roll_number=roll_number,
            stream=stream_code,
            requires_verification=False,
            access_token=access_token,
            is_onboarded=True
        )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    student_id = await next_student_id(ADMISSION_YEAR)
    roll_number = await next_roll_number(stream_code, ADMISSION_YEAR)

    plain_code = f"{secrets.randbelow(900000) + 100000}"
    code_hash = hashlib.sha256(plain_code.encode("utf-8")).hexdigest()

    hashed_pwd = hash_password(register_data.password)

    new_user = {
        "full_name": register_data.full_name.strip(),
        "name": register_data.full_name.strip(),
        "email": email_clean,
        "student_id": student_id,
        "roll_number": roll_number,
        "stream": stream_code,
        "admission_year": ADMISSION_YEAR,
        "current_year": register_data.current_year,
        "current_semester": register_data.current_semester,
        "entry_type": register_data.entry_type,
        "date_of_birth": dob_val,
        "gender": register_data.gender,
        "phone": register_data.phone.strip(),
        "address": register_data.address.strip(),
        "guardian_name": register_data.guardian_name.strip(),
        "guardian_phone": register_data.guardian_phone.strip(),
        "photo_data_url": register_data.photo_data_url,
        "hashed_password": hashed_pwd,
        "role": "student",
        "provider": "local",
        "provider_id": None,
        "avatar": register_data.photo_data_url,
        "department": stream_name,
        "program": f"B.Sc. {stream_name}",
        "term": CURRENT_TERM,
        "status": "Active Priority Enrollment",
        "is_active": True,
        "email_verified": False,
        "email_verification_hash": code_hash,
        "email_verification_expires_at": now + timedelta(minutes=10),
        "email_verification_attempts": 0,
        "email_verification_sent_at": now,
        "created_at": now,
        "updated_at": now,
    }

    res = await users_coll.insert_one(new_user)

    await records_coll.insert_one({
        "student_id": student_id,
        "student_name": register_data.full_name.strip(),
        "cgpa": 0.0,
        "total_credits_earned": 0.0,
        "major_credits_earned": 0.0,
        "core_credits_completed": 0.0,
        "standing": "Good Standing",
        "terms": []
    })

    try:
        sent, mailer_msg = await send_verification_email(
            email_clean, plain_code, register_data.full_name.strip()
        )
        if not sent:
            logger.warning(f"Verification email failed: {mailer_msg}")
    except Exception as e:
        logger.warning(f"SMTP Error: {e}")
        logger.info(f"====== TESTING ONLY (REGISTRATION) ======")
        logger.info(f"REGISTRATION OTP FOR {email_clean} IS: {plain_code}")
        logger.info(f"=========================================")

    await log_activity(
        action="REGISTER_USER",
        user_id=student_id,
        user_role="student",
        details={
            "email": email_clean,
            "roll_number": roll_number,
            "stream": stream_code
        }
    )

    return RegisterResponse(
        ok=True,
        email_sent=True,
        student_id=student_id,
        roll_number=roll_number,
        stream=stream_code,
        requires_verification=True
    )


async def verify_user_email(payload: VerifyEmailRequest) -> Dict[str, bool]:
    # (Keep the exact same verify_user_email logic you already have)
    users_coll = get_users_collection()
    email_clean = payload.email.lower().strip()
    code_clean = payload.code.strip()

    user = await users_coll.find_one({"email": email_clean})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found."
        )

    if user.get("email_verified") is True:
        return {"ok": True}

    now = datetime.now(timezone.utc)
    attempts = user.get("email_verification_attempts", 0)

    if attempts >= 5:
        await users_coll.update_one(
            {"_id": user["_id"]},
            {"$unset": {"email_verification_hash": "", "email_verification_expires_at": ""}}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum verification attempts exceeded. Please request a new code."
        )

    expires_at = user.get("email_verification_expires_at")
    if not expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new code."
        )

    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code."
            )

    incoming_hash = hashlib.sha256(code_clean.encode("utf-8")).hexdigest()
    if incoming_hash != user.get("email_verification_hash"):
        await users_coll.update_one(
            {"_id": user["_id"]},
            {"$inc": {"email_verification_attempts": 1}}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code."
        )

    await users_coll.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"email_verified": True, "updated_at": now},
            "$unset": {
                "email_verification_hash": "",
                "email_verification_expires_at": "",
                "email_verification_attempts": "",
                "email_verification_sent_at": ""
            }
        }
    )

    await log_activity(
        action="EMAIL_VERIFIED",
        user_id=user.get("student_id") or email_clean,
        user_role="student",
        details={"email": email_clean}
    )

    return {"ok": True}


async def resend_email_verification(payload: ResendVerificationRequest) -> Dict[str, Any]:
    # (Keep the exact same resend_email_verification logic you already have)
    users_coll = get_users_collection()
    email_clean = payload.email.lower().strip()
    generic_response = {
        "ok": True,
        "message": "If the account exists and is unverified, a new verification code has been dispatched."
    }

    user = await users_coll.find_one({"email": email_clean})
    if not user or user.get("email_verified") is True:
        return generic_response

    now = datetime.now(timezone.utc)
    sent_at = user.get("email_verification_sent_at")
    if sent_at and isinstance(sent_at, datetime):
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        if (now - sent_at).total_seconds() < 60:
            return generic_response

    plain_code = f"{secrets.randbelow(900000) + 100000}"
    code_hash = hashlib.sha256(plain_code.encode("utf-8")).hexdigest()

    await users_coll.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "email_verification_hash": code_hash,
                "email_verification_expires_at": now + timedelta(minutes=10),
                "email_verification_attempts": 0,
                "email_verification_sent_at": now,
                "updated_at": now
            }
        }
    )

    try:
        await send_verification_email(email_clean, plain_code, user.get("full_name") or "Student")
    except Exception as e:
        logger.warning(f"SMTP Error on resend: {e}")
        logger.info(f"====== TESTING ONLY (RESEND) ======")
        logger.info(f"RESEND OTP FOR {email_clean} IS: {plain_code}")
        logger.info(f"===================================")

    return generic_response


async def request_forgot_password(request_data: ForgotPasswordRequest) -> MessageResponse:
    users_coll = get_users_collection()
    email_clean = request_data.email.strip().lower()

    user = await users_coll.find_one({"email": email_clean})
    if not user:
        user = await users_coll.find_one({
            "email": {"$regex": f"^{re.escape(email_clean)}$", "$options": "i"}
        })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered account found with this email address."
        )

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await users_coll.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_otp": otp_code,
                "reset_otp_expires_at": expires_at,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    recipient_name = user.get("full_name") or user.get("name") or "Student"
    sent = False
    try:
        sent = await send_otp_email(email_clean, otp_code, recipient_name)
    except Exception as e:
        logger.warning(f"SMTP Error: {e}")
        logger.info(f"====== TESTING ONLY (FORGOT PASSWORD) ======")
        logger.info(f"PASSWORD RESET OTP FOR {email_clean} IS: {otp_code}")
        logger.info(f"============================================")

    await log_activity(
        action="FORGOT_PASSWORD_REQUEST",
        user_id=user.get("student_id") or email_clean,
        user_role=user.get("role", "student"),
        details={"email": email_clean, "dispatched": sent}
    )

    return MessageResponse(
        message="A 6-digit verification code has been sent to your email address.",
        success=True
    )


async def reset_user_password(request_data: ResetPasswordRequest) -> MessageResponse:
    # (Keep the exact same reset_user_password logic you already have)
    users_coll = get_users_collection()
    email_clean = request_data.email.strip().lower()
    otp_clean = request_data.otp.strip()

    if request_data.confirm_password and request_data.new_password != request_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and password confirmation do not match."
        )

    if len(request_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    user = await users_coll.find_one({"email": email_clean})
    if not user:
        user = await users_coll.find_one({
            "email": {"$regex": f"^{re.escape(email_clean)}$", "$options": "i"}
        })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered account found with this email address."
        )

    saved_otp = user.get("reset_otp")
    expires_at = user.get("reset_otp_expires_at")

    if not saved_otp or not expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active password reset request found. Please request a new verification code."
        )

    now = datetime.now(timezone.utc)
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The verification code has expired (valid for 10 minutes). Please request a new code."
            )

    if str(saved_otp).strip() != otp_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check the 6-digit code and try again."
        )

    hashed_pwd = hash_password(request_data.new_password)

    await users_coll.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "hashed_password": hashed_pwd,
                "must_change_password": False,
                "updated_at": now
            },
            "$unset": {
                "reset_otp": "",
                "reset_otp_expires_at": ""
            }
        }
    )

    await log_activity(
        action="RESET_PASSWORD_SUCCESS",
        user_id=user.get("student_id") or email_clean,
        user_role=user.get("role", "student"),
        details={"email": email_clean}
    )

    return MessageResponse(
        message="Your password has been reset successfully. You can now log in with your new credentials.",
        success=True
    )


async def send_otp_for_email(payload: SendOTPRequest) -> MessageResponse:
    email_clean = payload.email.lower().strip()
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    users_coll = get_users_collection()
    user = await users_coll.find_one({
        "$or": [
            {"email": email_clean},
            {"email": payload.email}
        ]
    })
    if user:
        await users_coll.update_one(
            {"_id": user["_id"]},
            {"$set": {"reset_otp": otp_code, "reset_otp_expires_at": expires_at}}
        )

    recipient_name = (user.get("full_name") or user.get("name")) if user else "Student"
    
    try:
        await send_otp_email(email_clean, otp_code, recipient_name)
        logger.info("Verification code dispatched to %s", email_clean)
    except Exception as e:
        logger.warning(f"[SMTP Error] Could not send email to {email_clean}. Error: {e}")
        logger.info(f"====== TESTING ONLY (ONBOARDING) ======")
        logger.info(f"ONBOARDING OTP FOR {email_clean} IS: {otp_code}")
        logger.info(f"=======================================")

    return MessageResponse(
        message=f"A 6-digit verification code has been dispatched to {email_clean}.",
        success=True
    )


async def verify_otp_for_email(payload: VerifyOTPRequest) -> MessageResponse:
    email_clean = payload.email.lower().strip()
    otp_clean = payload.otp.strip()
    now = datetime.now(timezone.utc)
    
    users_coll = get_users_collection()
    user = await users_coll.find_one({"email": email_clean})
    
    if not user or not user.get("reset_otp"):
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check and try again.")

    expires_at = user.get("reset_otp_expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    if str(user.get("reset_otp")).strip() == otp_clean:
        await users_coll.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"email_verified": True, "updated_at": now},
                "$unset": {"reset_otp": "", "reset_otp_expires_at": ""}
            }
        )
        return MessageResponse(message="Email verified successfully.", success=True)

    raise HTTPException(status_code=400, detail="Invalid verification code. Please check and try again.")