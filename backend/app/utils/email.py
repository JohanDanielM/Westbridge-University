import asyncio
import logging
from typing import Optional, Tuple

import httpx

from backend.app.config import settings

logger = logging.getLogger("ccrs.email")

RESEND_URL = "https://api.resend.com/emails"


def _send_via_resend_sync(to_email: str, subject: str, text_body: str, html_body: str) -> Tuple[bool, str]:
    """Send one email through Resend's HTTPS API. Returns (success, message).
    Never logs the message body, so codes never reach the logs."""
    if not settings.RESEND_API_KEY:
        msg = "Email service is not configured (RESEND_API_KEY missing)."
        logger.error("[Email] %s", msg)
        return False, msg

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": settings.MAIL_FROM,
                    "to": [to_email],
                    "subject": subject,
                    "text": text_body,
                    "html": html_body,
                },
            )
        if resp.status_code >= 300:
            msg = f"Resend rejected the email ({resp.status_code}): {resp.text}"
            logger.error("[Email] %s", msg)
            return False, msg

        logger.info("[Email] Sent '%s' to %s", subject, to_email)
        return True, f"Email successfully dispatched to {to_email}"
    except httpx.HTTPError as exc:
        msg = f"Email request failed: {exc}"
        logger.error("[Email] %s", msg)
        return False, msg


def _otp_html(greeting: str, heading: str, code: str, note: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<body style="background:#0b1120;color:#e2e8f0;font-family:sans-serif;padding:30px;">
  <div style="max-width:500px;margin:auto;background:#111c34;padding:24px;border-radius:12px;border:1px solid #1e293b;">
    <h2 style="color:#2dd4bf;margin-top:0;">{heading}</h2>
    <p>Hello <strong>{greeting}</strong>,</p>
    <p>Your 6-digit verification code is:</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#2dd4bf;background:#070c18;padding:16px;text-align:center;border-radius:8px;margin:20px 0;">
      {code}
    </div>
    <p style="font-size:12px;color:#94a3b8;">{note}</p>
  </div>
</body>
</html>"""


async def send_otp_email(to_email: str, otp_code: str, recipient_name: Optional[str] = None) -> bool:
    """Password reset code. Returns True if the email was accepted by Resend."""
    greeting = recipient_name or "Student"
    subject = "Westbridge University CCRS: Password Reset Verification Code"
    text_body = (
        f"Hello {greeting},\n\n"
        "We received a request to reset your password for the Westbridge University "
        "Course & Credit Registration System (CCRS).\n\n"
        f"Your 6-digit verification code is: {otp_code}\n\n"
        "This code is valid for 10 minutes. If you did not request this, ignore this email.\n\n"
        "Office of the Registrar & CCRS IT Support\nWestbridge University\n"
    )
    html_body = _otp_html(
        greeting,
        "Password Reset Verification Code",
        otp_code,
        "This code expires in 10 minutes. If you did not request a reset, ignore this email.",
    )
    sent, _ = await asyncio.to_thread(_send_via_resend_sync, to_email, subject, text_body, html_body)
    return sent


async def send_verification_email(to_email: str, code: str, recipient_name: Optional[str] = None) -> Tuple[bool, str]:
    """Registration email verification code. Returns (sent, message)."""
    greeting = recipient_name or "Student"
    subject = "Westbridge CCRS email verification"
    text_body = (
        f"Hello {greeting},\n\n"
        "Welcome to the Westbridge University Course and Credit Registration System (CCRS).\n\n"
        f"Your email verification code is: {code}\n\n"
        "This code is valid for 10 minutes. Enter it in the registration portal to verify your account.\n\n"
        "Office of Admissions & Student Records\nWestbridge University\n"
    )
    html_body = _otp_html(
        greeting,
        "Verify Your Email Address",
        code,
        "This code expires in 10 minutes. Enter it in the verification form to activate your account.",
    )
    return await asyncio.to_thread(_send_via_resend_sync, to_email, subject, text_body, html_body)


async def send_faculty_credentials_email(
    to_email: str,
    faculty_id: str,
    temp_password: str,
    recipient_name: Optional[str] = None,
) -> Tuple[bool, str]:
    """Initial credentials for a new faculty account. Returns (sent, message)."""
    greeting = recipient_name or "Faculty Member"
    subject = "Your Westbridge CCRS faculty account"
    text_body = (
        f"Hello {greeting},\n\n"
        "An institutional faculty account has been provisioned for you in the Westbridge "
        "University Course & Credit Registration System (CCRS).\n\n"
        f"Faculty ID: {faculty_id}\n"
        f"Username / Email: {to_email}\n"
        f"Temporary Password: {temp_password}\n\n"
        "Sign in at the Westbridge CCRS Portal and change your password on first login.\n\n"
        "Office of Academic Affairs & CCRS Administration\nWestbridge University\n"
    )
    html_body = f"""<!DOCTYPE html>
<html>
<body style="background:#0b1120;color:#e2e8f0;font-family:sans-serif;padding:30px;">
  <div style="max-width:520px;margin:auto;background:#111c34;padding:24px;border-radius:12px;border:1px solid #1e293b;">
    <h2 style="color:#2dd4bf;margin-top:0;">Your Faculty Account Credentials</h2>
    <p>Hello <strong>{greeting}</strong>,</p>
    <p>An institutional faculty account has been created for you on Westbridge CCRS.</p>
    <div style="background:#070c18;padding:16px;border-radius:8px;margin:20px 0;font-family:monospace;font-size:13px;line-height:1.7;">
      <div><strong style="color:#94a3b8;">Faculty ID:</strong> <span style="color:#2dd4bf;">{faculty_id}</span></div>
      <div><strong style="color:#94a3b8;">Username / Email:</strong> <span style="color:#ffffff;">{to_email}</span></div>
      <div><strong style="color:#94a3b8;">Temporary Password:</strong> <span style="color:#38bdf8;">{temp_password}</span></div>
    </div>
    <p style="font-size:12px;color:#94a3b8;">Sign in and change your password on your first session.</p>
  </div>
</body>
</html>"""
    return await asyncio.to_thread(_send_via_resend_sync, to_email, subject, text_body, html_body)