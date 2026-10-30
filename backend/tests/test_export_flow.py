import pytest
import os
import shutil
from starlette.testclient import TestClient
from app.main import app
from app.api.exports import EXPORT_JOBS
from app.schemas.export import ExportStatus
from app.core.config import settings
from app.services.video.ffmpeg import ffmpeg_service

client = TestClient(app)


def test_create_export_job():
    """Test creating export jobs with 720p and 1080p resolutions"""
    project_id = "test-export-proj-1"

    # Test 720p export job creation
    res_720 = client.post(
        f"/api/projects/{project_id}/export",
        json={
            "project_id": project_id,
            "resolution": "720p",
            "output_format": "mp4",
            "aspect_ratio": "9:16",
            "segments": [
                {
                    "id": "s1",
                    "text": "Hello world",
                    "start": 0.0,
                    "end": 2.0,
                    "words": [{"word": "Hello", "start": 0.0, "end": 1.0}, {"word": "world", "start": 1.0, "end": 2.0}]
                }
            ]
        }
    )
    assert res_720.status_code == 201
    data_720 = res_720.json()
    assert data_720["project_id"] == project_id
    assert data_720["resolution"] == "720p"
    assert data_720["status"] in ["pending", "processing"]
    assert "id" in data_720

    # Test 1080p export job creation
    res_1080 = client.post(
        f"/api/projects/{project_id}/export",
        json={
            "project_id": project_id,
            "resolution": "1080p",
            "output_format": "mp4"
        }
    )
    assert res_1080.status_code == 201
    data_1080 = res_1080.json()
    assert data_1080["resolution"] == "1080p"


def test_export_status_endpoint():
    """Test getting export status for pending, processing, and completed jobs"""
    export_id = "test-status-exp-id"
    EXPORT_JOBS[export_id] = {
        "id": export_id,
        "project_id": "test-proj",
        "status": ExportStatus.COMPLETED.value,
        "progress": 100.0,
        "message": "Export completed successfully",
        "resolution": "1080p",
        "download_url": f"/api/exports/{export_id}/download"
    }

    res = client.get(f"/api/exports/{export_id}/status")
    assert res.status_code == 200
    data = res.json()
    assert data["export_id"] == export_id
    assert data["status"] == "completed"
    assert data["progress"] == 100.0
    assert data["download_url"] == f"/api/exports/{export_id}/download"


def test_latest_project_export_endpoint():
    """Test querying the latest export job for a project"""
    project_id = "test-latest-proj-id"
    export_id = "test-latest-exp-123"

    # Create dummy render output file so latest-export detects it as valid
    render_dir = os.path.abspath(settings.REMOTION_RENDER_DIR)
    os.makedirs(render_dir, exist_ok=True)
    dummy_out = os.path.join(render_dir, f"{export_id}.mp4")
    with open(dummy_out, "wb") as f:
        f.write(b"mp4dummybytes")

    try:
        EXPORT_JOBS[export_id] = {
            "id": export_id,
            "project_id": project_id,
            "status": ExportStatus.COMPLETED.value,
            "progress": 100.0,
            "message": "Export completed",
            "resolution": "720p",
            "download_url": f"/api/exports/{export_id}/download",
            "output_path": dummy_out
        }

        res = client.get(f"/api/projects/{project_id}/latest-export")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == export_id
        assert data["project_id"] == project_id
        assert data["status"] == "completed"
        assert data["download_url"] == f"/api/exports/{export_id}/download"
        assert data["resolution"] == "720p"

        # Check non-existent project
        empty_res = client.get("/api/projects/non-existent-proj/latest-export")
        assert empty_res.status_code == 200
        assert empty_res.json()["status"] == "none"
    finally:
        if os.path.exists(dummy_out):
            os.remove(dummy_out)


def test_download_export_headers_and_streaming():
    """Test GET and HEAD download endpoint with custom filename and headers"""
    export_id = "test-dl-exp-456"
    render_dir = os.path.abspath(settings.REMOTION_RENDER_DIR)
    os.makedirs(render_dir, exist_ok=True)
    video_file = os.path.join(render_dir, f"{export_id}.mp4")

    # Write test binary content
    sample_content = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42" + b"A" * 1024
    with open(video_file, "wb") as f:
        f.write(sample_content)

    try:
        EXPORT_JOBS[export_id] = {
            "id": export_id,
            "project_id": "test-p",
            "status": ExportStatus.COMPLETED.value,
            "output_path": video_file,
            "download_url": f"/api/exports/{export_id}/download"
        }

        # 1. Test GET download with custom filename
        custom_name = "my_custom_video.mp4"
        get_res = client.get(f"/api/exports/{export_id}/download?filename={custom_name}")
        assert get_res.status_code == 200
        assert get_res.headers["content-type"] == "video/mp4"
        assert "attachment" in get_res.headers["content-disposition"]
        assert custom_name in get_res.headers["content-disposition"]
        assert get_res.headers.get("accept-ranges") == "bytes"
        assert get_res.content == sample_content

        # 2. Test HEAD request (used by browsers/download managers)
        head_res = client.head(f"/api/exports/{export_id}/download")
        assert head_res.status_code == 200
        assert head_res.headers["content-type"] == "video/mp4"
        assert "content-length" in head_res.headers

        # 3. Test 404 for missing file
        res_404 = client.get("/api/exports/non-existent-export/download")
        assert res_404.status_code == 404
    finally:
        if os.path.exists(video_file):
            os.remove(video_file)


@pytest.mark.asyncio
async def test_end_to_end_render_with_resolution():
    """Test FFmpeg render service generates 720p video file correctly"""
    temp_dir = os.path.abspath(settings.TEMP_DIR)
    os.makedirs(temp_dir, exist_ok=True)

    # Use existing test input video
    src_sample = os.path.join(temp_dir, "test_proj2_input.mp4")
    if not os.path.exists(src_sample):
        pytest.skip("Test sample input video not present in temp directory")

    test_export_id = "test_e2e_720p_exp"
    segments = [
        {
            "id": "seg1",
            "text": "Testing 720p export",
            "start": 0.0,
            "end": 1.5,
            "words": [
                {"word": "Testing", "start": 0.0, "end": 0.7},
                {"word": "720p", "start": 0.7, "end": 1.2},
                {"word": "export", "start": 1.2, "end": 1.5}
            ]
        }
    ]

    render_result = await ffmpeg_service.render_burned_captions(
        project_id="test_proj2",
        input_video_path=src_sample,
        segments=segments,
        export_id=test_export_id,
        resolution="720p"
    )

    assert render_result["success"] is True
    out_path = render_result["output_path"]
    assert os.path.exists(out_path)
    assert os.path.getsize(out_path) > 1000

    # Probe output video to verify scaled dimensions
    meta = await ffmpeg_service.get_video_metadata(out_path)
    # For 720p vertical or horizontal, one dimension should be 720
    assert meta["width"] == 720 or meta["height"] == 720

    # Cleanup test render output
    if os.path.exists(out_path):
        os.remove(out_path)

