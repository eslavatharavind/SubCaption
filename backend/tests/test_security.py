import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.core.security import get_current_user


@pytest.mark.asyncio
async def test_get_current_user_valid_token():
    """Test getting current user with valid token"""

    # Mock Supabase response
    mock_user = Mock()
    mock_user.id = "test-user-id"
    mock_user.email = "test@example.com"

    mock_response = Mock()
    mock_response.user = mock_user

    # Mock credentials
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="valid-token"
    )

    # Patch supabase auth
    with patch('app.core.security.supabase.auth.get_user', return_value=mock_response):
        result = await get_current_user(credentials)

        assert result["id"] == "test-user-id"
        assert result["email"] == "test@example.com"
        assert result["token"] == "valid-token"


@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    """Test that invalid token raises 401"""

    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="invalid-token"
    )

    # Mock Supabase to return no user
    mock_response = Mock()
    mock_response.user = None

    with patch('app.core.security.supabase.auth.get_user', return_value=mock_response):
        with pytest.raises(HTTPException) as exc:
            await get_current_user(credentials)

        assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_exception():
    """Test that exceptions are handled"""

    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="token"
    )

    # Mock Supabase to raise exception
    with patch('app.core.security.supabase.auth.get_user', side_effect=Exception("Auth error")):
        with pytest.raises(HTTPException) as exc:
            await get_current_user(credentials)

        assert exc.value.status_code == 401
