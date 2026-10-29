import os
import uuid
from pathlib import Path
from typing import Optional
from pathvalidate import sanitize_filename
from ..utils.logging import get_logger

logger = get_logger(__name__)


def generate_unique_id() -> str:
    """Generate a unique identifier"""
    return str(uuid.uuid4())


def sanitize_file_name(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """

    return sanitize_filename(filename)


def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return Path(filename).suffix.lower()


def ensure_directory_exists(directory: str):
    """Ensure directory exists, create if necessary"""
    os.makedirs(directory, exist_ok=True)


def get_file_size_mb(file_path: str) -> float:
    """Get file size in megabytes"""
    return os.path.getsize(file_path) / (1024 * 1024)


def safe_join_path(base: str, *paths) -> str:
    """
    Safely join paths preventing path traversal

    Args:
        base: Base directory
        paths: Path components

    Returns:
        Safe joined path
    """

    base_path = Path(base).resolve()

    try:
        for path in paths:
            base_path = (base_path / path).resolve()

        # Verify the final path is under the base directory
        if not str(base_path).startswith(str(Path(base).resolve())):
            raise ValueError("Path traversal detected")

        return str(base_path)
    except Exception as e:
        logger.error("Path join error", error=str(e))
        raise
