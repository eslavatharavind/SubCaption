from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from supabase import Client
from ..core.security import supabase, get_current_user
from ..utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


# Request/Response Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInfo(BaseModel):
    id: str
    email: str


class AuthResponse(BaseModel):
    message: str
    user: Optional[UserInfo] = None
    access_token: Optional[str] = None
    token_type: str = "bearer"


class ErrorResponse(BaseModel):
    detail: str


@router.post("/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    """
    User signup with email/password using Supabase Auth

    Args:
        user_data: Email and password

    Returns:
        Auth response with user info and access token

    Raises:
        HTTPException: If signup fails
    """

    logger.info("User signup attempt", email=user_data.email)

    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )

        logger.info("User created successfully", user_id=auth_response.user.id)

        return AuthResponse(
            message="User created successfully",
            user=UserInfo(
                id=auth_response.user.id,
                email=auth_response.user.email
            ),
            access_token=auth_response.session.access_token if auth_response.session else None,
            token_type="bearer"
        )

    except Exception as e:
        logger.error("Signup failed", error=str(e), email=user_data.email)

        # Handle specific Supabase errors
        error_message = str(e)

        if "already registered" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        elif "password" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password. Password must be at least 6 characters."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )


@router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """
    User login with email/password using Supabase Auth

    Args:
        credentials: Email and password

    Returns:
        Auth response with access token

    Raises:
        HTTPException: If login fails
    """

    logger.info("User login attempt", email=credentials.email)

    try:
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid login credentials"
            )

        logger.info("User logged in successfully", user_id=auth_response.user.id)

        return AuthResponse(
            message="Login successful",
            user=UserInfo(
                id=auth_response.user.id,
                email=auth_response.user.email
            ),
            access_token=auth_response.session.access_token,
            token_type="bearer"
        )

    except Exception as e:
        logger.error("Login failed", error=str(e), email=credentials.email)

        error_message = str(e)

        if "invalid login credentials" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login failed"
            )


@router.get("/auth/me", response_model=UserInfo)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user

    Args:
        current_user: User from JWT token

    Returns:
        User info
    """

    return UserInfo(
        id=current_user["id"],
        email=current_user["email"]
    )


@router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user and invalidate session

    Args:
        current_user: User from JWT token

    Returns:
        Success message

    Note: The client should remove the token locally.
    Supabase JWT tokens are stateless and can't be server-invalidated.
    """

    logger.info("User logout", user_id=current_user["id"])

    # For JWT tokens, server-side invalidation is limited
    # The client must remove the token from local storage
    # Supabase handles this on the client side

    return {"message": "Logout successful"}


@router.post("/auth/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh access token

    Note: For Supabase JWT tokens, the client should handle refresh.
    This endpoint is provided for convenience but the primary
    token refresh should happen client-side via Supabase SDK.

    Args:
        current_user: User from JWT token

    Returns:
        Token refresh info
    """

    logger.info("Token refresh requested", user_id=current_user["id"])

    # Return info about client-side refresh
    return {
        "message": "Use Supabase client SDK to refresh tokens",
        "info": "JWT refresh should be handled client-side"
    }
