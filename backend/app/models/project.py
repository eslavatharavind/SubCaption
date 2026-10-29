from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Boolean, Text, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.config import settings
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    language = Column(String(10), nullable=False)
    status = Column(String(50), default="uploaded")
    duration = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    caption_segments = relationship("CaptionSegment", back_populates="project", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="project", cascade="all, delete-orphan")


class CaptionSegment(Base):
    __tablename__ = "caption_segments"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    style_data = Column(JSON, default=dict)
    position_data = Column(JSON, default=dict)
    animation_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="caption_segments")
    words = relationship("CaptionWord", back_populates="segment", cascade="all, delete-orphan")


class CaptionWord(Base):
    __tablename__ = "caption_words"

    id = Column(String, primary_key=True, default=generate_uuid)
    segment_id = Column(String, ForeignKey("caption_segments.id", ondelete="CASCADE"), nullable=False)
    word = Column(String(500), nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    highlighted = Column(Boolean, default=False)
    highlight_color = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    segment = relationship("CaptionSegment", back_populates="words")


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    configuration_json = Column(JSON, nullable=False)
    preview_image = Column(String(500), nullable=True)
    supported_languages = Column(JSON, default=["en", "hi", "te"])
    is_free = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Font(Base):
    __tablename__ = "fonts"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    font_family = Column(String(255), nullable=False)
    font_file = Column(String(500), nullable=True)
    supported_languages = Column(JSON, default=["en"])
    category = Column(String(100), default="sans-serif")


class Export(Base):
    __tablename__ = "exports"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="pending")
    output_format = Column(String(20), default="mp4")
    resolution = Column(String(20), default="1080p")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="exports")
