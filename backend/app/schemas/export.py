from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ExportStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Resolution(str, Enum):
    SD_480P = "480p"
    HD_720P = "720p"
    FULL_HD_1080P = "1080p"
    FOUR_K = "4k"


from typing import Optional, List, Dict, Any, Union

class ExportRequest(BaseModel):
    project_id: Optional[str] = None
    output_format: str = "mp4"
    resolution: Optional[Union[Resolution, str]] = Resolution.FULL_HD_1080P
    text_layers: Optional[List[Dict[str, Any]]] = None
    segments: Optional[List[Dict[str, Any]]] = None
    template_config: Optional[Dict[str, Any]] = None
    aspect_ratio: Optional[str] = "9:16"


class ExportJob(BaseModel):
    id: str
    project_id: str
    status: ExportStatus
    output_format: str
    resolution: str
    download_url: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExportProgress(BaseModel):
    export_id: str
    status: ExportStatus
    progress: float = Field(..., ge=0, le=100)
    message: str
    download_url: Optional[str] = None
