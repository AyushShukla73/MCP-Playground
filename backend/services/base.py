"""Base service class with common database operations."""
from abc import ABC
from typing import Any
from backend.database.connection import db_pool
import structlog

logger = structlog.get_logger()


class BaseService(ABC):
    """Base service with common database operations."""

    def __init__(self):
        self.db = db_pool

    async def _execute(self, query: str, *args) -> str:
        """Execute a query."""
        return await self.db.execute(query, *args)

    async def _fetch(self, query: str, *args) -> list[asyncpg.Record]:
        """Fetch multiple rows."""
        return await self.db.fetch(query, *args)

    async def _fetchrow(self, query: str, *args) -> asyncpg.Record | None:
        """Fetch a single row."""
        return await self.db.fetchrow(query, *args)

    async def _fetchval(self, query: str, *args) -> Any:
        """Fetch a single value."""
        return await self.db.fetchval(query, *args)

    async def _log_audit(
        self,
        workspace_id: str,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str | None,
        outcome: str,
        metadata: dict | None = None,
    ) -> None:
        """Log an audit entry."""
        query = """
            INSERT INTO audit_logs (workspace_id, user_id, action, resource_type, resource_id, outcome, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        await self._execute(
            query,
            workspace_id,
            user_id,
            action,
            resource_type,
            resource_id,
            outcome,
            metadata,
        )