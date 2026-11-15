import logging
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import Request
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth

from backend.app.config import settings
from backend.app.database import get_users_collection
from backend.app.utils.security import create_access_token
from backend.app.utils.logger import log_activity

logger = logging.getLogger("ccrs.oauth")

# Initialize Authlib OAuth registry
oauth = OAuth()

# Register Google OAuth client
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
    access_token_url="https://oauth2.googleapis.com/token",
    userinfo_endpoint="https://openidconnect.googleapis.com/v1/userinfo",
    client_kwargs={"scope": "openid email profile"},
)

# Register GitHub OAuth client
oauth.register(
    name="github",
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    access_token_url="https://github.com/login/oauth/access_token",
    access_token_params=None,
    authorize_url="https://github.com/login/oauth/authorize",
    authorize_params=None,
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "user:email read:user"},
)

async def handle_oauth_user(
    provider: str,
    provider_id: str,
    email: str,
    full_name: str,
    avatar: Optional[str] = None
) -> RedirectResponse:
    """
    Handles user creation, linking, and JWT generation following the 4 strict linking rules:
    - Case 1: No user exists -> Create new student user (password=None, student_id=None, provider set)
    - Case 2: User exists with same email & provider is 'local' -> Safely link OAuth fields, keep local login & role intact
    - Case 3: User exists with same email & same provider -> Log in normally
    - Case 4: Matched existing account has role 'admin' -> Allow OAuth only if already an admin in DB; never auto-create admins
    """
    try:
        users_coll = get_users_collection()
        email_clean = email.lower().strip()
        now = datetime.now(timezone.utc)
        
        # Check if user already exists
        existing_user = await users_coll.find_one({
            "$or": [
                {"email": email_clean},
                {"email": email}
            ]
        })
        
        user_doc: Dict[str, Any] = {}
        is_new = False
        
        if not existing_user:
            # Case 1: Create a brand new student user via OAuth
            is_new = True
            new_user = {
                "full_name": full_name or "Westbridge Student",
                "name": full_name or "Westbridge Student",
                "email": email_clean,
                "student_id": None,
                "password": None,
                "hashed_password": None,
                "role": "student",  # OAuth accounts default to student only
                "avatar": avatar,
                "provider": provider,  # "google" or "github"
                "provider_id": str(provider_id),
                "department": "Computer Science",
                "program": "B.Sc. Computer Science",
                "term": "Fall 2026",
                "status": "Active Priority Enrollment",
                "is_active": True,
                "is_onboarded": False,
                "created_at": now,
                "updated_at": now
            }
            res = await users_coll.insert_one(new_user)
            user_doc = new_user
            user_doc["_id"] = res.inserted_id
            logger.info(f"Created new {provider} OAuth user: {email_clean}")
            
        else:
            # User already exists with this email
            is_new = not existing_user.get("is_onboarded", True)
            user_doc = existing_user
            update_fields: Dict[str, Any] = {
                "updated_at": now
            }
            
            # Case 2 & 4: If local user or existing admin, safely link without overwriting local login or password
            curr_provider = existing_user.get("provider", "local")
            if curr_provider == "local" or not curr_provider:
                if not existing_user.get("avatar") and avatar:
                    update_fields["avatar"] = avatar
                if not existing_user.get("provider_id"):
                    update_fields["provider_id"] = str(provider_id)
                if not existing_user.get("provider"):
                    update_fields["provider"] = "local"
                update_fields["oauth_provider"] = provider
                logger.info(f"Safely linked {provider} OAuth to existing local account: {email_clean}")
            elif curr_provider == provider:
                # Case 3: Same provider login
                if avatar:
                    update_fields["avatar"] = avatar
                update_fields["provider_id"] = str(provider_id)
                logger.info(f"Existing {provider} user signed in: {email_clean}")
            else:
                # Different OAuth provider already linked
                update_fields["secondary_oauth_provider"] = provider
                update_fields["secondary_provider_id"] = str(provider_id)
                if avatar and not existing_user.get("avatar"):
                    update_fields["avatar"] = avatar
            
            if not existing_user.get("full_name") and full_name:
                update_fields["full_name"] = full_name
            if "is_active" not in existing_user:
                update_fields["is_active"] = True

            await users_coll.update_one(
                {"_id": existing_user["_id"]},
                {"$set": update_fields}
            )
            user_doc = {**existing_user, **update_fields}

        # Issue standard JWT token matching existing CCRS format
        sub_val = user_doc.get("student_id") or user_doc.get("email") or str(user_doc.get("_id"))
        token_payload = {
            "sub": sub_val,
            "email": user_doc.get("email"),
            "role": user_doc.get("role", "student"),
            "name": user_doc.get("full_name") or user_doc.get("name") or "Westbridge Student"
        }
        access_token = create_access_token(token_payload)
        
        # Log activity
        await log_activity(
            action=f"LOGIN_{provider.upper()}",
            user_id=sub_val,
            user_role=user_doc.get("role", "student"),
            details={
                "provider": provider,
                "provider_id": str(provider_id),
                "email": email_clean
            }
        )
        
        # Redirect to frontend success page with token, is_new flag and prefill params
        from urllib.parse import quote
        is_new_param = "true" if is_new else "false"
        clean_name = user_doc.get("full_name") or user_doc.get("name") or full_name or ""
        success_url = (
            f"{settings.FRONTEND_URL}/oauth-success?token={access_token}"
            f"&is_new={is_new_param}"
            f"&email={quote(email_clean)}"
            f"&name={quote(clean_name)}"
            f"&provider={quote(provider)}"
        )
        return RedirectResponse(url=success_url)
        
    except Exception as e:
        logger.error(f"Error handling {provider} OAuth user: {e}", exc_info=True)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")

# ----------------- GOOGLE OAUTH HANDLERS -----------------

async def initiate_google_login(request: Request) -> RedirectResponse:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.warning("Google OAuth credentials missing in configuration.")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")
    
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)

 # Add this import at the top of the file if it's not there

async def process_google_callback(request: Request) -> RedirectResponse:
    try:
        # 1. Authlib is failing here, so we extract the code manually
        code = request.query_params.get("code")
        if not code:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")

        # 2. Manually exchange the code for an access token using httpx
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                }
            )
            token_data = token_resp.json()
            
            if "error" in token_data:
                logger.error(f"Google token exchange failed: {token_data}")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")

            access_token = token_data.get("access_token")

            # 3. Fetch user info directly from Google
            user_resp = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info = user_resp.json()

        if not user_info or not user_info.get("email"):
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")
        
        email = user_info.get("email")
        full_name = user_info.get("name") or user_info.get("given_name") or email.split("@")[0]
        avatar = user_info.get("picture")
        provider_id = user_info.get("sub") or user_info.get("id")
        
        return await handle_oauth_user("google", str(provider_id), email, full_name, avatar)

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")
# ----------------- GITHUB OAUTH HANDLERS -----------------

async def initiate_github_login(request: Request) -> RedirectResponse:
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        logger.warning("GitHub OAuth credentials missing in configuration.")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")
    
    redirect_uri = settings.GITHUB_REDIRECT_URI
    return await oauth.github.authorize_redirect(request, redirect_uri)

async def process_github_callback(request: Request) -> RedirectResponse:
    try:
        token = await oauth.github.authorize_access_token(request)
        resp = await oauth.github.get("user", token=token)
        profile = resp.json()
        
        email = profile.get("email")
        
        # If GitHub email is private, query GitHub emails API
        if not email:
            emails_resp = await oauth.github.get("user/emails", token=token)
            emails_data = emails_resp.json()
            if isinstance(emails_data, list):
                # Look for primary + verified email first
                for em in emails_data:
                    if em.get("primary") and em.get("verified"):
                        email = em.get("email")
                        break
                # Fallback to any verified email
                if not email:
                    for em in emails_data:
                        if em.get("verified"):
                            email = em.get("email")
                            break
                            
        if not email:
            logger.error("GitHub OAuth callback: No verified email could be obtained")
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")
            
        provider_id = str(profile.get("id"))
        full_name = profile.get("name") or profile.get("login") or email.split("@")[0]
        avatar = profile.get("avatar_url")
        
        return await handle_oauth_user(
            provider="github",
            provider_id=provider_id,
            email=email,
            full_name=full_name,
            avatar=avatar
        )
    except Exception as e:
        logger.error(f"GitHub OAuth callback failed: {e}", exc_info=True)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")
