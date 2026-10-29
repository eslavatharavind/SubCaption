from pydantic import BaseModel, Field
from typing import Optional


class UploadResponse(BaseModel):
    message: str
    project_id: str
    filename: str
    file_size: int
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[str] = None


class UploadProgress(BaseModel):
    project_id: str
    status: str
    progress: float = Field(..., ge=0, le=100)
    message: str
