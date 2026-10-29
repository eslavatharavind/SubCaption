import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_signup_endpoint_exists():
    """Test that signup endpoint exists"""
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "test@example.com",
            "password": "testpassword123"
        }
    )
    # Should either succeed or return specific error (not 404)
    assert response.status_code != 404


def test_login_endpoint_exists():
    """Test that login endpoint exists"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123"
        }
    )
    # Should either succeed or return specific error (not 404)
    assert response.status_code != 404


def test_get_current_user_unauthorized():
    """Test that getting current user without token returns 401"""
    response = client.get("/api/auth/me")
    assert response.status_code == 403  # Forbidden (no credentials)


def test_get_current_user_invalid_token():
    """Test that invalid token returns 401"""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == 401


def test_signup_validation():
    """Test signup validation"""
    # Email validation
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "invalid-email",
            "password": "testpassword123"
        }
    )
    assert response.status_code == 422  # Validation error

    # Password validation (too short)
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "test@example.com",
            "password": "12345"
        }
    )
    assert response.status_code == 422  # Validation error


def test_projects_requires_auth():
    """Test that projects endpoint requires authentication"""
    response = client.get("/api/projects")
    assert response.status_code == 403  # Forbidden


def test_create_project_requires_auth():
    """Test that creating project requires authentication"""
    response = client.post(
        "/api/projects",
        json={
            "name": "Test Project",
            "language": "en"
        }
    )
    assert response.status_code == 403  # Forbidden
