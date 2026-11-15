import os
from typing import List
from pydantic_settings import BaseSettings
from pathlib import Path
from dotenv import load_dotenv

# Always load backend/.env no matter where uvicorn is launched from
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Westbridge University CCRS"
    API_V1_STR: str = "/api"

    # Database
    MONGO_URL: str = os.getenv("MONGO_URL", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    MONGO_URI: str = os.getenv("MONGO_URI", os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    DB_NAME: str = os.getenv("DB_NAME", "westbridge_ccrs")

    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        os.getenv("JWT_SECRET", "supersecret_westbridge_ccrs_jwt_key_2026_9318667735786627530")
    )
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET",
        os.getenv("JWT_SECRET_KEY", "supersecret_westbridge_ccrs_jwt_key_2026_9318667735786627530")
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    MAX_CREDITS_PER_STUDENT: int = int(os.getenv("MAX_CREDITS_PER_STUDENT", "24"))

    # OAuth - Google
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

    # OAuth - GitHub
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    GITHUB_REDIRECT_URI: str = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/auth/github/callback")

    # URLs & Sessions
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    SESSION_SECRET_KEY: str = os.getenv("SESSION_SECRET_KEY", "supersecret_session_key_ccrs_2026")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")

    # SMTP Configuration
    SMTP_EMAIL: str = os.getenv("SMTP_EMAIL", "your_email@gmail.com")
    SMTP_APP_PASSWORD: str = os.getenv("SMTP_APP_PASSWORD", "your_16_char_app_password")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))

    RESEND_API_KEY: str = ""
    MAIL_FROM: str = "Westbridge CCRS <onboarding@resend.dev>"

        # Add these inside your Settings class
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    SENDGRID_SENDER_EMAIL: str = os.getenv("SENDGRID_SENDER_EMAIL", "your_verified_email@gmail.com")
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()
