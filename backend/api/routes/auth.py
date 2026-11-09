"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from backend.services.workspace import workspace_service
from backend.config import settings
import structlog
import jwt
from datetime import datetime, timedelta

logger = structlog.get_logger()

router = APIRouter()

# Request/Response models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


# Simple in-memory user store for demo (replace with Supabase Auth in production)
# In production, integrate with Supabase Auth directly


def create_access_token(user_id: str, email: str) -> str:
    """Create JWT access token."""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_expiration_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(authorization: Optional[str] = None) -> dict:
    """Get current user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    scheme, token = authorization.split() if authorization else (None, None)
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")

    return decode_token(token)


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login with email and password."""
    # Demo: Accept any email/password and create a token
    # In production, verify against Supabase Auth
    user_id = "demo-user-id"
    token = create_access_token(user_id, request.email)
    return AuthResponse(
        access_token=token,
        expires_in=settings.jwt_expiration_minutes * 60,
        user={"id": user_id, "email": request.email},
    )


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user."""
    # Demo: Create a new user
    # In production, create user in Supabase Auth
    user_id = "new-user-id"
    token = create_access_token(user_id, request.email)
    return AuthResponse(
        access_token=token,
        expires_in=settings.jwt_expiration_minutes * 60,
        user={"id": user_id, "email": request.email, "name": request.name},
    )


@router.get("/me", response_model=AuthResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    return AuthResponse(
        access_token="",
        expires_in=0,
        user=current_user,
    )


@router.post("/logout")
async def logout():
    """Logout (client-side token removal)."""
    return {"message": "Logged out successfully"}