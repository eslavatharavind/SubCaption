from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


class Language(str, Enum):
    ENGLISH = "en"
    HINDI = "hi"
    TELUGU = "te"
    TELUGU_ENGLISH = "te_en"
    TELUGU_ROMAN = "te_roman"


class ProjectStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    EXTRACTING_AUDIO = "extracting_audio"
    TRANSCRIBING = "transcribing"
    GENERATING_CAPTIONS = "generating_captions"
    READY = "ready"
    RENDERING = "rendering"
    COMPLETED = "completed"
    FAILED = "failed"


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    language: Language


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: str
    user_id: str
    status: ProjectStatus
    duration: Optional[float] = None
    filename: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectList(BaseModel):
    projects: List[Project]
    total: int
