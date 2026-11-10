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
        "exp": datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


from fastapi import Header

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Get current user from JWT token."""
    logger.info("get_current_user called", authorization=authorization)
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    scheme, token = authorization.split() if authorization else (None, None)
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")

    result = decode_token(token)
    logger.info("get_current_user decoded", result=result)
    return result


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login with email and password."""
    logger.info("Login attempt", email=request.email)
    try:
        # Look up user in database
        from backend.database.connection import db_pool
        from uuid import UUID

        query = "SELECT id FROM auth.users WHERE email = $1"
        user = await db_pool.fetchrow(query, request.email)

        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        user_id = str(user["id"])
        logger.info("Creating token", user_id=user_id)
        token = create_access_token(user_id, request.email)
        logger.info("Token created successfully", user_id=user_id)
        return AuthResponse(
            access_token=token,
            expires_in=settings.access_token_expire_minutes * 60,
            user={"id": user_id, "email": request.email},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login error", error=str(e), exc_info=True)
        raise


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user."""
    logger.info("Register attempt", email=request.email)
    # Demo: Create a new user
    # In production, create user in Supabase Auth
    user_id = "new-user-id"
    token = create_access_token(user_id, request.email)
    logger.info("Token created", user_id=user_id)
    return AuthResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
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