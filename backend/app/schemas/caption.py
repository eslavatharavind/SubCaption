from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class CaptionWordBase(BaseModel):
    text: str
    start: float = Field(..., ge=0)
    end: float = Field(..., ge=0)
    highlighted: bool = False
    highlight_color: Optional[str] = None


class CaptionWordCreate(CaptionWordBase):
    pass


class CaptionWord(CaptionWordBase):
    id: str

    class Config:
        from_attributes = True


class CaptionSegmentBase(BaseModel):
    text: str
    start: float = Field(..., ge=0)
    end: float = Field(..., ge=0)


class CaptionSegmentCreate(CaptionSegmentBase):
    words: List[CaptionWordCreate] = []


class CaptionSegmentUpdate(BaseModel):
    text: Optional[str] = None
    start: Optional[float] = Field(None, ge=0)
    end: Optional[float] = Field(None, ge=0)
    words: Optional[List[CaptionWordCreate]] = None
    style_data: Optional[Dict[str, Any]] = None
    position_data: Optional[Dict[str, Any]] = None
    animation_data: Optional[Dict[str, Any]] = None


class CaptionSegment(CaptionSegmentBase):
    id: str
    project_id: str
    words: List[CaptionWord] = []
    style_data: Dict[str, Any] = {}
    position_data: Dict[str, Any] = {}
    animation_data: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CaptionSegmentList(BaseModel):
    segments: List[CaptionSegment]
    total: int


class CaptionSplitRequest(BaseModel):
    segment_id: str
    word_index: int = Field(..., ge=0)


class CaptionMergeRequest(BaseModel):
    segment_ids: List[str] = Field(..., min_length=2)
