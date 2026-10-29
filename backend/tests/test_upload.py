import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_upload_valid_video():
    """Test uploading a valid video file to /api/upload"""
    dummy_video_content = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42"
    file_tuple = ("test_video.mp4", io.BytesIO(dummy_video_content), "video/mp4")

    response = client.post(
        "/api/upload",
        files={"file": file_tuple},
        data={"language": "en"}
    )

    assert response.status_code == 200, f"Response: {response.text}"
    data = response.json()
    assert "project_id" in data
    assert data["filename"] == "test_video.mp4"
    assert data["file_size"] == len(dummy_video_content)

    project_id = data["project_id"]
    temp_dir = os.path.abspath(settings.TEMP_DIR)
    expected_file = os.path.join(temp_dir, f"{project_id}_input.mp4")
    assert os.path.exists(expected_file), f"File should be stored in TEMP_DIR at {expected_file}"

    # Clean up temp file created during test
    if os.path.exists(expected_file):
        os.remove(expected_file)


def test_upload_invalid_file_type():
    """Test uploading an unsupported file type returns 400"""
    dummy_text_content = b"This is a text file, not a video."
    file_tuple = ("document.txt", io.BytesIO(dummy_text_content), "text/plain")

    response = client.post(
        "/api/upload",
        files={"file": file_tuple},
        data={"language": "en"}
    )

    assert response.status_code == 400
    assert "File format '.txt' not supported" in response.json()["detail"]


def test_upload_exceeds_max_size(monkeypatch):
    """Test uploading a file that exceeds MAX_FILE_SIZE_MB returns 413"""
    # Set max file size to 0.0001 MB (~100 bytes)
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_MB", 0.0001)

    large_content = b"X" * 1000  # 1 KB > 100 bytes limit
    file_tuple = ("large_video.mp4", io.BytesIO(large_content), "video/mp4")

    response = client.post(
        "/api/upload",
        files={"file": file_tuple},
        data={"language": "en"}
    )

    assert response.status_code == 413
    assert "exceeds maximum allowed limit" in response.json()["detail"]
