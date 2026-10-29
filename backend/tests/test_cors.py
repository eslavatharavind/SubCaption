import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import Settings
import json

client = TestClient(app)

PRODUCTION_ORIGIN = "https://sub-caption.vercel.app"
DISALLOWED_ORIGIN = "https://malicious-attacker.com"


def test_cors_preflight_projects_allowed_origin():
    """Test that OPTIONS preflight request to /api/projects succeeds for production Vercel origin"""
    headers = {
        "Origin": PRODUCTION_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    response = client.options("/api/projects", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == PRODUCTION_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"
    assert "authorization" in response.headers.get("access-control-allow-headers", "").lower()
    assert "POST" in response.headers.get("access-control-allow-methods", "")


def test_cors_preflight_upload_allowed_origin():
    """Test that OPTIONS preflight request to /api/upload succeeds for production Vercel origin"""
    headers = {
        "Origin": PRODUCTION_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    response = client.options("/api/upload", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == PRODUCTION_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"
    assert "POST" in response.headers.get("access-control-allow-methods", "")


def test_cors_preflight_disallowed_origin():
    """Test that preflight request from an unapproved origin is rejected and lacks allow-origin header"""
    headers = {
        "Origin": DISALLOWED_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    response = client.options("/api/projects", headers=headers)
    # Starlette CORSMiddleware returns 400 for disallowed CORS preflight
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_cors_actual_request_allowed_origin():
    """Test that GET request with Origin header receives Access-Control-Allow-Origin response header"""
    response = client.get("/", headers={"Origin": PRODUCTION_ORIGIN})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == PRODUCTION_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_actual_request_disallowed_origin():
    """Test that GET request with disallowed Origin does not receive Access-Control-Allow-Origin header"""
    response = client.get("/", headers={"Origin": DISALLOWED_ORIGIN})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_cors_settings_parsing_formats():
    """Verify that Settings parses JSON arrays, comma-separated lists, and strips trailing slashes"""
    # 1. JSON Array string
    origins_json = json.dumps(["https://custom-preview.vercel.app/", "http://localhost:3000"])
    parsed_json = Settings.parse_cors_origins(origins_json)
    assert "https://custom-preview.vercel.app" in parsed_json
    assert PRODUCTION_ORIGIN in parsed_json

    # 2. Comma separated string
    origins_comma = "https://staging.vercel.app/, http://localhost:3000"
    parsed_comma = Settings.parse_cors_origins(origins_comma)
    assert "https://staging.vercel.app" in parsed_comma
    assert PRODUCTION_ORIGIN in parsed_comma

    # 3. Single string
    parsed_single = Settings.parse_cors_origins("https://single-origin.vercel.app/")
    assert "https://single-origin.vercel.app" in parsed_single
    assert PRODUCTION_ORIGIN in parsed_single

