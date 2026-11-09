"""Database connection and session management."""
import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from backend.config import settings
import structlog

logger = structlog.get_logger()


class DatabasePool:
    """AsyncPG connection pool manager."""

    def __init__(self):
        self._pool: asyncpg.Pool | None = None

    async def initialize(self) -> None:
        """Initialize the connection pool."""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=5,
                max_size=20,
                command_timeout=60,
            )
            logger.info("Database pool initialized", min_size=5, max_size=20)

    async def close(self) -> None:
        """Close the connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("Database pool closed")

    @asynccontextmanager
    async def acquire(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Acquire a connection from the pool."""
        if not self._pool:
            await self.initialize()
        async with self._pool.acquire() as conn:
            yield conn

    async def execute(self, query: str, *args) -> str:
        """Execute a query and return status."""
        async with self.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args) -> list[asyncpg.Record]:
        """Fetch multiple rows."""
        async with self.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args) -> asyncpg.Record | None:
        """Fetch a single row."""
        async with self.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args) -> any:
        """Fetch a single value."""
        async with self.acquire() as conn:
            return await conn.fetchval(query, *args)


# Global database pool instance
db_pool = DatabasePool()


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """Dependency for FastAPI to get database connection."""
    async with db_pool.acquire() as conn:
        yield conn