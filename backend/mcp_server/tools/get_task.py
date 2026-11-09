"""Get task MCP tool."""
from typing import Dict, Any
from uuid import UUID
from backend.database.connection import db_pool
import structlog

logger = structlog.get_logger()


async def get_task_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Get a specific task by ID."""
    try:
        task_id = UUID(arguments["task_id"])

        query = """
            SELECT id, project_id, title, description, status, priority, assignee_id, created_by, created_at, updated_at
            FROM tasks
            WHERE id = $1
        """

        pool = await db_pool.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(query, task_id)

        if not row:
            return {"error": "Task not found"}

        return {
            "id": str(row["id"]),
            "project_id": str(row["project_id"]),
            "title": row["title"],
            "description": row["description"],
            "status": row["status"],
            "priority": row["priority"],
            "assignee_id": str(row["assignee_id"]) if row["assignee_id"] else None,
            "created_by": str(row["created_by"]),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }

    except Exception as e:
        logger.error("get_task error", error=str(e))
        return {"error": str(e)}