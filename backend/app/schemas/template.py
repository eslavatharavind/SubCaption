from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class TemplateBase(BaseModel):
    name: str
    category: str
    configuration: Dict[str, Any]


class TemplateCreate(TemplateBase):
    preview_image: Optional[str] = None
    supported_languages: List[str] = ["en", "hi", "te"]
    is_free: bool = True


class Template(TemplateCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateList(BaseModel):
    templates: List[Template]
    total: int


class ApplyTemplateRequest(BaseModel):
    template_id: str
