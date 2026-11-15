from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
from backend.app.utils.security import decode_access_token
from backend.app.database import get_users_collection

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer)
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired or malformed access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    users_coll = get_users_collection()
    # Find user by student_id, email, or _id string
    user = await users_coll.find_one({
        "$or": [
            {"student_id": user_id},
            {"email": str(user_id).lower().strip()},
            {"email": user_id}
        ]
    })
    
    if not user:
        try:
            from bson import ObjectId
            if ObjectId.is_valid(user_id):
                user = await users_coll.find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with token not found in database",
        )
    
    user["_id"] = str(user["_id"])
    user.pop("hashed_password", None)
    user.pop("password", None)
    
    # Ensure defaults for legacy/seeded records
    if not user.get("provider"):
        user["provider"] = "local"
    if not user.get("full_name") and user.get("name"):
        user["full_name"] = user.get("name")
    if not user.get("name") and user.get("full_name"):
        user["name"] = user.get("full_name")
    if "is_active" not in user:
        user["is_active"] = True

    return user

def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{user_role}' does not have required permissions"
            )
        return current_user
    return role_checker

# Quick dependencies
get_current_student = require_roles(["student"])
get_current_admin = require_roles(["admin"])

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer)
) -> Optional[Dict[str, Any]]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        if not payload or not payload.get("sub"):
            return None
        users_coll = get_users_collection()
        user_id = payload.get("sub")
        user = await users_coll.find_one({
            "$or": [
                {"student_id": user_id},
                {"email": str(user_id).lower().strip()},
                {"email": user_id}
            ]
        })
        if user:
            user["_id"] = str(user["_id"])
            user.pop("hashed_password", None)
            user.pop("password", None)
        return user
    except Exception:
        return None

# Add this function
async def require_faculty(user: dict = Depends(get_current_user)):
    if user.get("role") != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    return user

def require_permission(permission_key: str):
    async def permission_checker(user: dict = Depends(require_faculty)) -> dict:
        permissions = user.get("permissions")
        # If user is faculty/admin and permissions is not explicitly set, grant by default
        if permissions is None or len(permissions) == 0:
            return user
        if permission_key not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission_key}' required"
            )
        return user
    return permission_checker
