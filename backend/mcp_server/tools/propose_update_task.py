"""Propose update task MCP tool - requires approval for write operations."""
from typing import Dict, Any
from uuid import UUID
from datetime import datetime
from backend.services.approval import approval_service
from backend.database.connection import db_pool
from backend.schemas.models import ProposeUpdateTaskInput
import structlog

logger = structlog.get_logger()


async def propose_update_task_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Propose a task update - requires admin approval."""
    try:
        # Extract auth context if available
        auth_context = arguments.get("_auth", {})
        user_id = UUID(auth_context["user_id"]) if auth_context.get("user_id") else None

        input_data = ProposeUpdateTaskInput(**arguments)
        task_id = input_data.task_id

        # Get task details and workspace_id
        task_query = """
            SELECT t.*, p.workspace_id
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            WHERE t.id = $1
        """
        pool = await db_pool.get_pool()
        async with pool.acquire() as conn:
            task_row = await conn.fetchrow(task_query, task_id)

        if not task_row:
            return {"error": "Task not found"}

        workspace_id = task_row["workspace_id"]

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

        # Build update payload with only provided fields
        validated_payload = {"task_id": str(task_id)}
        if input_data.title is not None:
            validated_payload["title"] = input_data.title
        if input_data.description is not None:
            validated_payload["description"] = input_data.description
        if input_data.status is not None:
            validated_payload["status"] = input_data.status
        if input_data.priority is not None:
            validated_payload["priority"] = input_data.priority
        if input_data.due_date is not None:
            validated_payload["due_date"] = input_data.due_date.isoformat()

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
                query, workspace_id, requested_by, "propose_update_task", "update",
                task_id, validated_payload
            )

        return {
            "approval_id": str(approval_row["id"]),
            "status": approval_row["status"],
            "message": "Task update proposed. Awaiting admin approval.",
            "expires_at": approval_row["expires_at"].isoformat() if approval_row["expires_at"] else None,
        }

    except Exception as e:
        logger.error("propose_update_task error", error=str(e))
        return {"error": str(e)}