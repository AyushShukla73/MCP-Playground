"""MCP Server authentication context."""
from typing import Optional, Dict, Any
from uuid import UUID
from backend.config import settings
import jwt
import structlog

logger = structlog.get_logger()


class MCPAuthContext:
    """Authentication context for MCP server operations."""

    def __init__(self):
        self.user_id: Optional[UUID] = None
        self.workspace_id: Optional[UUID] = None
        self.email: Optional[str] = None
        self.role: Optional[str] = None

    def set_from_token(self, token: str) -> bool:
        """Set auth context from Supabase JWT token."""
        try:
            # Decode Supabase JWT (using HS256 with the secret)
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated"
            )

            self.user_id = UUID(payload.get("sub"))
            self.email = payload.get("email")
            # Workspace and role would come from custom claims or separate lookup
            self.workspace_id = UUID(payload.get("workspace_id")) if payload.get("workspace_id") else None
            self.role = payload.get("role")

            logger.info("MCP auth context set", user_id=str(self.user_id), workspace_id=str(self.workspace_id))
            return True
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid MCP auth token", error=str(e))
            return False
        except Exception as e:
            logger.error("MCP auth context error", error=str(e))
            return False

    def is_authenticated(self) -> bool:
        return self.user_id is not None


# Global auth context (in production, use request-scoped context)
mcp_auth = MCPAuthContext()


async def get_user_workspace_membership(user_id: UUID, workspace_id: UUID) -> Optional[str]:
    """Get user's role in a workspace."""
    from backend.database.connection import db_pool

    query = """
        SELECT role FROM workspace_members
        WHERE workspace_id = $1 AND user_id = $2
    """
    pool = await db_pool.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, workspace_id, user_id)

    if row:
        return row["role"]

    # Check if owner
    query = "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, workspace_id, user_id)

    if row:
        return "owner"

    return None