"""Backend configuration management."""
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_anon_key: str = Field(..., description="Supabase anonymous key")
    supabase_service_role_key: str = Field(..., description="Supabase service role key")
    supabase_jwt_secret: str = Field(..., description="Supabase JWT secret")
    database_url: str = Field(..., description="PostgreSQL connection URL")

    # Backend
    backend_host: str = Field(default="0.0.0.0", description="Backend host")
    backend_port: int = Field(default=8000, description="Backend port")
    mcp_server_port: int = Field(default=8001, description="MCP server port")
    mcp_transport: str = Field(default="stdio", description="MCP transport (stdio or http)")
    environment: str = Field(default="development", description="Environment")

    # Security
    secret_key: str = Field(..., description="Secret key for sessions")
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiry")

    # Rate limiting
    rate_limit_requests: int = Field(default=100, description="Rate limit requests")
    rate_limit_window_seconds: int = Field(default=60, description="Rate limit window")

    # CORS
    allowed_origins: str = Field(default="http://localhost:3000", description="Allowed CORS origins")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()