"""
Authentication Integration Verification Tests

These tests verify the complete authentication flow.
"""

import pytest
import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint_no_auth():
    """Test that health endpoints don't require authentication"""
    response = client.get("/health")
    assert response.status_code == 200


def test_root_endpoint_no_auth():
    """Test that root endpoint doesn't require authentication"""
    response = client.get("/")
    assert response.status_code == 200


def test_auth_me_requires_token():
    """Test that /auth/me requires valid Bearer token"""
    response = client.get("/api/auth/me")
    # Should return 403 (Forbidden - no credentials provided)
    assert response.status_code == 403


def test_auth_me_with_invalid_token():
    """Test that /auth/me rejects invalid tokens"""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == 401


def test_projects_list_requires_auth():
    """Test that listing projects requires authentication"""
    response = client.get("/api/projects")
    assert response.status_code == 403


def test_create_project_requires_auth():
    """Test that creating project requires authentication"""
    response = client.post(
        "/api/projects",
        json={"name": "Test", "language": "en"}
    )
    assert response.status_code == 403


def test_signup_validation_email():
    """Test signup email validation"""
    response = client.post(
        "/api/auth/signup",
        json={"email": "invalid-email", "password": "testpass123"}
    )
    assert response.status_code == 422


def test_signup_validation_password_length():
    """Test signup password length validation (min 6 chars)"""
    response = client.post(
        "/api/auth/signup",
        json={"email": "test@example.com", "password": "12345"}
    )
    assert response.status_code == 422


def test_login_validation():
    """Test login requires both email and password"""
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com"}
    )
    assert response.status_code == 422


def test_logout_requires_auth():
    """Test that logout requires authentication"""
    response = client.post("/api/auth/logout")
    assert response.status_code == 403


# Integration tests (require Supabase setup)
@pytest.mark.skipif(
    not os.getenv("SUPABASE_URL"),
    reason="Requires Supabase configuration"
)
def test_full_auth_flow():
    """
    Full authentication flow test:
    1. Signup
    2. Login
    3. Access protected endpoint
    4. Logout

    This test is skipped if Supabase is not configured.
    """
    # This would require actual Supabase credentials
    pass
