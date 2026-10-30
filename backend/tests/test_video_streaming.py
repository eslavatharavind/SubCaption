import pytest
import os
from starlette.testclient import TestClient
from app.main import app
from app.api.uploads import find_project_video_file

client = TestClient(app)


def test_video_full_get_stream():
    """Verify full video GET request returns 200 with accept-ranges header"""
    res = client.get("/api/projects/test_proj2/video")
    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"
    assert res.headers.get("accept-ranges") == "bytes"
    assert int(res.headers["content-length"]) > 1000
    assert len(res.content) == int(res.headers["content-length"])


def test_video_head_request():
    """Verify HEAD request returns 200 with headers and no body"""
    res = client.head("/api/projects/test_proj2/video")
    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"
    assert res.headers.get("accept-ranges") == "bytes"
    assert int(res.headers["content-length"]) > 1000
    assert len(res.content) == 0


def test_video_direct_route_without_api_prefix():
    """Verify /projects/{id}/video works without /api prefix for proxy/client compatibility"""
    res = client.get("/projects/test_proj2/video")
    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"
    assert res.headers.get("accept-ranges") == "bytes"


def test_video_double_slash_normalization():
    """Verify double slashes in URL (/api//projects/...) are collapsed to prevent 404"""
    res = client.get("/api//projects/test_proj2/video")
    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"


def test_video_http_206_range_streaming():
    """Verify HTTP 206 Partial Content range requests for instant seek/scrubbing"""
    # 1. First 200 bytes
    res_range1 = client.get("/api/projects/test_proj2/video", headers={"Range": "bytes=0-199"})
    assert res_range1.status_code == 206
    assert res_range1.headers["content-type"] == "video/mp4"
    assert res_range1.headers.get("accept-ranges") == "bytes"
    assert res_range1.headers["content-length"] == "200"
    assert res_range1.headers["content-range"].startswith("bytes 0-199/")
    assert len(res_range1.content) == 200

    # 2. Seeking range (e.g. byte 500 to 999)
    res_range2 = client.get("/api/projects/test_proj2/video", headers={"Range": "bytes=500-999"})
    assert res_range2.status_code == 206
    assert res_range2.headers["content-length"] == "500"
    assert res_range2.headers["content-range"].startswith("bytes 500-999/")
    assert len(res_range2.content) == 500


def test_video_missing_returns_404():
    """Verify non-existent project video returns 404 cleanly"""
    res = client.get("/api/projects/non-existent-project-id-999/video")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_find_project_video_file_flexibility():
    """Verify find_project_video_file resolves various naming schemes"""
    # test_proj2 has test_proj2_input.mp4
    found = find_project_video_file("test_proj2")
    assert found is not None
    assert os.path.exists(found)

