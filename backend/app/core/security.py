from supabase import create_client, Client, ClientOptions
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from ..core.config import settings
from ..utils.logging import get_logger

logger = get_logger(__name__)

# Create Admin/Service-role Supabase client (used for token verification & background tasks)
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

def get_user_client(token: str) -> Client:
    """Create a Supabase client scoped to the authenticated user using their JWT token (respects RLS)"""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
    )

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify JWT token and get current user from Supabase

    Args:
        credentials: Bearer token from Authorization header

    Returns:
        User dict with id and email

    Raises:
        HTTPException: If token is invalid or user not found
    """

    try:
        token = credentials.credentials

        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "token": token
        }

    except Exception as e:
        logger.error("Authentication failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """
    Optionally get current user (doesn't raise error if not authenticated)

    Args:
        credentials: Optional bearer token

    Returns:
        User dict or None
    """

    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
