import os
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional
import json


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    APP_NAME: str = "AI Video Captioning"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # API Configuration
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    API_PREFIX: str = "/api"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # ElevenLabs
    ELEVENLABS_API_KEY: str
    ELEVENLABS_API_URL: str = "https://api.elevenlabs.io/v1"

    # Groq (Future AI Features)
    GROQ_API_KEY: Optional[str] = None
    GROQ_API_URL: str = "https://api.groq.com/openai/v1"

    # File Storage
    TEMP_DIR: str = "./temp"
    MAX_FILE_SIZE_MB: int = 500
    ALLOWED_VIDEO_FORMATS: List[str] = [".mp4", ".mov", ".webm"]

    @field_validator("ALLOWED_VIDEO_FORMATS", mode="before")
    @classmethod
    def parse_video_formats(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # FFmpeg
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"

    # Remotion
    REMOTION_RENDER_DIR: str = "./renders"

    # Supported Languages
    SUPPORTED_LANGUAGES: List[str] = ["en", "hi", "te"]

    @field_validator("SUPPORTED_LANGUAGES", mode="before")
    @classmethod
    def parse_languages(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()
