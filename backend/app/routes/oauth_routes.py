from fastapi import APIRouter, Request
from backend.app.controllers.oauth_controller import (
    initiate_google_login,
    process_google_callback,
    initiate_github_login,
    process_github_callback
)

router = APIRouter(tags=["OAuth Social Authentication"])

@router.get("/google/login", summary="Initiate Google OAuth login")
async def google_login(request: Request):
    return await initiate_google_login(request)

@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(request: Request):
    return await process_google_callback(request)

@router.get("/github/login", summary="Initiate GitHub OAuth login")
async def github_login(request: Request):
    return await initiate_github_login(request)

@router.get("/github/callback", summary="GitHub OAuth callback")
async def github_callback(request: Request):
    return await process_github_callback(request)

