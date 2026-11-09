"""Propose create task MCP tool - requires approval for write operations."""
from typing import Dict, Any
from uuid import UUID
from datetime import datetime
from backend.services.approval import approval_service
from backend.database.connection import db_pool
from backend.schemas.models import ProposeCreateTaskInput
import structlog

logger = structlog.get_logger()


async def propose_create_task_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Propose a new task creation - requires admin approval."""
    try:
        # Extract auth context if available
        auth_context = arguments.get("_auth", {})
        user_id = UUID(auth_context["user_id"]) if auth_context.get("user_id") else None

        input_data = ProposeCreateTaskInput(**arguments)
        project_id = input_data.project_id

        # Get workspace_id from project
        project_query = "SELECT workspace_id FROM projects WHERE id = $1"
        pool = await db_pool.get_pool()
        async with pool.acquire() as conn:
            project_row = await conn.fetchrow(project_query, project_id)

        if not project_row:
            return {"error": "Project not found"}

        workspace_id = project_row["workspace_id"]

        # If we have user context, verify membership
        if user_id:
            membership_query = """
                SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2
                UNION SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2
            """
            async with pool.acquire() as conn:
                is_member = await conn.fetchrow(membership_query, workspace_id, user_id)
            if not is_member:
                return {"error": "Not a member of this workspace"}

        # Prepare payload for approval
        validated_payload = {
            "project_id": str(project_id),
            "title": input_data.title,
            "description": input_data.description,
            "priority": input_data.priority,
            "due_date": input_data.due_date.isoformat() if input_data.due_date else None,
        }

        # Use user_id if available, otherwise use placeholder
        requested_by = user_id if user_id else UUID("00000000-0000-0000-0000-000000000000")

        # Create approval request
        query = """
            INSERT INTO approvals (workspace_id, requested_by, tool_name, operation_type, target_record_id, validated_payload, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '24 hours')
            RETURNING id, workspace_id, requested_by, tool_name, operation_type, target_record_id, validated_payload,
                      status, reviewed_by, reviewed_at, executed_at, created_at, expires_at
        """
        async with pool.acquire() as conn:
            approval_row = await conn.fetchrow(
                query, workspace_id, requested_by, "propose_create_task", "create",
                None, validated_payload
            )

        return {
            "approval_id": str(approval_row["id"]),
            "status": approval_row["status"],
            "message": "Task creation proposed. Awaiting admin approval.",
            "expires_at": approval_row["expires_at"].isoformat() if approval_row["expires_at"] else None,
        }

    except Exception as e:
        logger.error("propose_create_task error", error=str(e))
        return {"error": str(e)}