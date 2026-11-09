"""Get project summary MCP tool."""
from typing import Dict, Any
from uuid import UUID
from backend.services.project import project_service
from backend.database.connection import db_pool
import structlog

logger = structlog.get_logger()


async def get_project_summary_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Get project summary with task statistics."""
    try:
        project_id = UUID(arguments["project_id"])

        # Get project details
        project_query = """
            SELECT id, workspace_id, name, description, created_at, updated_at
            FROM projects
            WHERE id = $1
        """
        pool = await db_pool.get_pool()
        async with pool.acquire() as conn:
            project_row = await conn.fetchrow(project_query, project_id)

        if not project_row:
            return {"error": "Project not found"}

        # Get task statistics
        tasks_query = """
            SELECT
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE status = 'todo') as todo_count,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                COUNT(*) FILTER (WHERE status = 'done') as done_count,
                COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
                COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
                COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
                COUNT(*) FILTER (WHERE priority = 'critical') as critical_priority
            FROM tasks
            WHERE project_id = $1
        """
        async with pool.acquire() as conn:
            tasks_row = await conn.fetchrow(tasks_query, project_id)

        return {
            "id": str(project_row["id"]),
            "workspace_id": str(project_row["workspace_id"]),
            "name": project_row["name"],
            "description": project_row["description"],
            "created_at": project_row["created_at"].isoformat() if project_row["created_at"] else None,
            "updated_at": project_row["updated_at"].isoformat() if project_row["updated_at"] else None,
            "total_tasks": tasks_row["total_tasks"],
            "tasks_by_status": {
                "todo": tasks_row["todo_count"],
                "in_progress": tasks_row["in_progress_count"],
                "done": tasks_row["done_count"],
            },
            "tasks_by_priority": {
                "low": tasks_row["low_priority"],
                "medium": tasks_row["medium_priority"],
                "high": tasks_row["high_priority"],
                "critical": tasks_row["critical_priority"],
            },
        }

    except Exception as e:
        logger.error("get_project_summary error", error=str(e))
        return {"error": str(e)}