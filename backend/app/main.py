import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.app.config import settings
from backend.app.database import connect_to_mongo, close_mongo_connection
from backend.app.routes import auth_router, student_router, admin_router, oauth_router, meta_router
from backend.app.routes import faculty_routes # import this
from backend.app.services.waitlist import expire_offers, ensure_waitlist_indexes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ccrs.main")

async def _periodic_expire_offers_task():
    while True:
        try:
            await asyncio.sleep(60)
            await expire_offers()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning(f"Error in periodic expire_offers: {exc}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: establish MongoDB connection
    logger.info("Initializing Westbridge University CCRS Backend...")
    await connect_to_mongo()
    await ensure_waitlist_indexes()
    expiry_task = asyncio.create_task(_periodic_expire_offers_task())
    yield
    # Shutdown: close MongoDB connection
    expiry_task.cancel()
    logger.info("Shutting down Westbridge University CCRS Backend...")
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI Backend for Westbridge University College Course Registration System (CCRS)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for Vite React frontend
origins = settings.cors_origins_list
if "*" not in origins:
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session middleware required by Authlib OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET_KEY or settings.JWT_SECRET or "supersecret_session_key_ccrs_2026",
    max_age=3600
)

# Register routes
# 1. Direct /auth OAuth endpoints (e.g. /auth/google/login, /auth/github/login)
app.include_router(oauth_router, prefix="/auth")
# Also mount under /api/auth for API compatibility
app.include_router(oauth_router, prefix=f"{settings.API_V1_STR}/auth")

# 2. Main API routes
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(student_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(faculty_routes.router)
app.include_router(meta_router, prefix=settings.API_V1_STR)
app.include_router(meta_router)

from backend.app.routes.student_routes import get_course_preview_slot
app.add_api_route(
    f"{settings.API_V1_STR}/courses/{{course_code}}/preview-slot",
    get_course_preview_slot,
    methods=["GET"],
    tags=["Course Preview"]
)
app.add_api_route(
    "/courses/{course_code}/preview-slot",
    get_course_preview_slot,
    methods=["GET"],
    tags=["Course Preview"]
)

@app.get("/")
async def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "online",
        "documentation": "/docs",
        "api_v1": settings.API_V1_STR,
        "oauth": {
            "google_login": "/auth/google/login",
            "github_login": "/auth/github/login"
        }
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "system": settings.PROJECT_NAME
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)