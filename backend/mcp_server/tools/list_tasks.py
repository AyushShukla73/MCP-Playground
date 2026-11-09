"""List tasks MCP tool."""
from typing import Dict, Any, List, Optional
from uuid import UUID
from backend.services.task import task_service
from backend.database.connection import db_pool
import structlog

logger = structlog.get_logger()


async def list_tasks_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """List tasks in a project with optional filters."""
    try:
        project_id = UUID(arguments["project_id"])
        status = arguments.get("status")
        priority = arguments.get("priority")
        assignee_id = UUID(arguments["assignee_id"]) if arguments.get("assignee_id") else None
        limit = arguments.get("limit", 50)
        offset = arguments.get("offset", 0)

        # For MCP, we need to get tasks without user authentication
        # In production, this would use proper auth context
        # For now, we'll query directly
        query = """
            SELECT id, project_id, title, description, status, priority, assignee_id, created_by, created_at, updated_at
            FROM tasks
            WHERE project_id = $1
        """
        params = [project_id]
        param_idx = 2

        if status:
            query += f" AND status = ${param_idx}"
            params.append(status)
            param_idx += 1

        if priority:
            query += f" AND priority = ${param_idx}"
            params.append(priority)
            param_idx += 1

        if assignee_id:
            query += f" AND assignee_id = ${param_idx}"
            params.append(assignee_id)
            param_idx += 1

        query += f" ORDER BY created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
        params.extend([limit, offset])

        pool = await db_pool.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        tasks = []
        for row in rows:
            tasks.append({
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
            })

        return {"tasks": tasks, "count": len(tasks)}

    except Exception as e:
        logger.error("list_tasks error", error=str(e))
        return {"error": str(e), "tasks": [], "count": 0}