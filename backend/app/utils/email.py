import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple
from backend.app.config import settings

logger = logging.getLogger("ccrs.email")

def _send_email_sync(to_email: str, subject: str, text_body: str, html_body: str) -> Tuple[bool, str]:
    """Synchronous SMTP email sender utilizing TLS. Returns (success, message)."""
    # Check for placeholder or unset credentials
    if not settings.SMTP_EMAIL or "your_email" in settings.SMTP_EMAIL:
        msg = f"[SMTP Dev Mode] SMTP credentials not configured. Simulated dispatch to {to_email}."
        logger.warning(msg)
        return False, msg

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Westbridge University CCRS <{settings.SMTP_EMAIL}>"
        msg["To"] = to_email

        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        msg.attach(part1)
        msg.attach(part2)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, [to_email], msg.as_string())
            success_msg = f"Email successfully dispatched to {to_email}"
            logger.info(f"[SMTP Success] {success_msg}")
            return True, success_msg
    except Exception as exc:
        err_msg = f"SMTP error dispatching email to {to_email}: {exc}"
        logger.warning(f"[SMTP Error] {err_msg}")
        return False, err_msg


async def send_otp_email(to_email: str, otp_code: str, recipient_name: Optional[str] = None) -> bool:
    """Dispatches a password reset OTP email."""
    greeting_name = recipient_name or "Student"
    subject = "Westbridge University CCRS — Password Reset Verification Code"
    text_body = f"""Hello {greeting_name},

We received a request to reset your password for the Westbridge University Course & Credit Registration System (CCRS).

Your 6-digit verification code is: {otp_code}

This code is valid for 10 minutes. If you did not request this password reset, please disregard this email.

Sincerely,
Office of the Registrar & CCRS IT Support
Westbridge University
"""
    html_body = f"""<!DOCTYPE html>
<html>
<body style="background:#0b1120;color:#e2e8f0;font-family:sans-serif;padding:30px;">
  <div style="max-width:500px;margin:auto;background:#111c34;padding:24px;border-radius:12px;border:1px solid #1e293b;">
    <h2 style="color:#2dd4bf;margin-top:0;">Password Reset Verification Code</h2>
    <p>Hello <strong>{greeting_name}</strong>,</p>
    <p>Your one-time 6-digit verification code is:</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#2dd4bf;background:#070c18;padding:16px;text-align:center;border-radius:8px;margin:20px 0;">
      {otp_code}
    </div>
    <p style="font-size:12px;color:#94a3b8;">This code expires in 10 minutes. If you did not initiate this request, disregard this notice.</p>
  </div>
</body>
</html>"""
    sent, _ = await asyncio.to_thread(_send_email_sync, to_email, subject, text_body, html_body)
    logger.info(f"[CCRS OTP] Security verification code for {to_email}: {otp_code} (Sent: {sent})")
    return sent


async def send_verification_email(to_email: str, code: str, recipient_name: Optional[str] = None) -> Tuple[bool, str]:
    """
    Dispatches the student registration email verification code.
    Subject must be exact: "Westbridge CCRS email verification"
    """
    greeting = recipient_name or "Student"
    subject = "Westbridge CCRS email verification"
    text_body = f"""Hello {greeting},

Welcome to Westbridge University Course and Credit Registration System (CCRS).

Your email verification code is: {code}

This code is valid for 10 minutes. Please enter this code in the registration portal to verify your institutional account.

Sincerely,
Office of Admissions & Student Records
Westbridge University
"""
    html_body = f"""<!DOCTYPE html>
<html>
<body style="background:#0b1120;color:#e2e8f0;font-family:sans-serif;padding:30px;">
  <div style="max-width:500px;margin:auto;background:#111c34;padding:24px;border-radius:12px;border:1px solid #1e293b;">
    <h2 style="color:#2dd4bf;margin-top:0;">Verify Your Email Address</h2>
    <p>Hello <strong>{greeting}</strong>,</p>
    <p>Welcome to Westbridge University CCRS. Your email verification code is:</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#2dd4bf;background:#070c18;padding:16px;text-align:center;border-radius:8px;margin:20px 0;">
      {code}
    </div>
    <p style="font-size:12px;color:#94a3b8;">This code expires in 10 minutes. Enter it into the verification form to activate your student credentials.</p>
  </div>
</body>
</html>"""
    sent, msg = await asyncio.to_thread(_send_email_sync, to_email, subject, text_body, html_body)
    logger.info(f"[CCRS Email Verification] Code for {to_email}: {code} (Sent: {sent})")
    return sent, msg


async def send_faculty_credentials_email(
    to_email: str,
    faculty_id: str,
    temp_password: str,
    recipient_name: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Dispatches initial login credentials to a newly created faculty member.
    Subject must be exact: "Your Westbridge CCRS faculty account"
    """
    greeting = recipient_name or "Faculty Member"
    subject = "Your Westbridge CCRS faculty account"
    text_body = f"""Hello {greeting},

An institutional faculty account has been provisioned for you in the Westbridge University Course & Credit Registration System (CCRS).

Your login credentials:
  Faculty ID: {faculty_id}
  Username / Email: {to_email}
  Temporary Password: {temp_password}

Please sign in at the Westbridge CCRS Portal and update your password immediately upon first login.

Sincerely,
Office of Academic Affairs & CCRS Administration
Westbridge University
"""
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
    <p style="font-size:12px;color:#94a3b8;">Please sign in and change your password upon your initial session.</p>
  </div>
</body>
</html>"""
    sent, msg = await asyncio.to_thread(_send_email_sync, to_email, subject, text_body, html_body)
    logger.info(f"[CCRS Faculty Credentials] Sent to {to_email} (ID: {faculty_id}) (Sent: {sent})")
    return sent, msg
