"""Tool call service for tracking MCP tool executions."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from backend.services.base import BaseService
from backend.schemas.models import ToolCallResponse
import structlog

logger = structlog.get_logger()


class ToolCallService(BaseService):
    """Service for tool call operations."""

    async def create_tool_call(
        self,
        workspace_id: UUID,
        user_id: UUID,
        request_id: str,
        tool_name: str,
        input_summary: Optional[dict] = None,
    ) -> ToolCallResponse:
        """Record a new tool call."""
        query = """
            INSERT INTO tool_calls (workspace_id, user_id, request_id, tool_name, input_summary, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING id, workspace_id, user_id, request_id, tool_name, input_summary, status,
                      permission_result, records_returned, execution_duration_ms,
                      error_code, error_message, created_at, completed_at
        """
        row = await self._fetchrow(query, workspace_id, user_id, request_id, tool_name, input_summary)

        await self._log_audit(
            str(workspace_id), str(user_id), "tool_call", "tool_call", str(row["id"]), "started",
            {"tool_name": tool_name, "request_id": request_id}
        )

        return self._row_to_response(row)

    async def update_tool_call_status(
        self,
        request_id: str,
        status: str,
        permission_result: Optional[str] = None,
        records_returned: int = 0,
        execution_duration_ms: Optional[int] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[ToolCallResponse]:
        """Update tool call status."""
        updates = ["status = $2"]
        params = [request_id, status]
        param_idx = 3

        if permission_result is not None:
            updates.append(f"permission_result = ${param_idx}")
            params.append(permission_result)
            param_idx += 1

        if records_returned is not None:
            updates.append(f"records_returned = ${param_idx}")
            params.append(records_returned)
            param_idx += 1

        if execution_duration_ms is not None:
            updates.append(f"execution_duration_ms = ${param_idx}")
            params.append(execution_duration_ms)
            param_idx += 1

        if error_code is not None:
            updates.append(f"error_code = ${param_idx}")
            params.append(error_code)
            param_idx += 1

        if error_message is not None:
            updates.append(f"error_message = ${param_idx}")
            params.append(error_message)
            param_idx += 1

        if status in ("completed", "failed", "approved", "rejected"):
            updates.append("completed_at = NOW()")

        query = f"""
            UPDATE tool_calls
            SET {', '.join(updates)}
            WHERE request_id = $1
            RETURNING id, workspace_id, user_id, request_id, tool_name, input_summary, status,
                      permission_result, records_returned, execution_duration_ms,
                      error_code, error_message, created_at, completed_at
        """
        row = await self._fetchrow(query, *params)
        if not row:
            return None

        return self._row_to_response(row)

    async def get_tool_calls(
        self,
        workspace_id: UUID,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
        tool_name: Optional[str] = None,
    ) -> List[ToolCallResponse]:
        """Get tool calls for a workspace."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT tc.*, u.email as user_email
            FROM tool_calls tc
            JOIN auth.users u ON u.id = tc.user_id
            WHERE tc.workspace_id = $1
        """
        params = [workspace_id]
        param_idx = 2

        if status:
            query += f" AND tc.status = ${param_idx}"
            params.append(status)
            param_idx += 1

        if tool_name:
            query += f" AND tc.tool_name = ${param_idx}"
            params.append(tool_name)
            param_idx += 1

        query += f" ORDER BY tc.created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
        params.extend([limit, offset])

        rows = await self._fetch(query, *params)
        return [self._row_to_response(row) for row in rows]

    async def get_tool_call(self, workspace_id: UUID, user_id: UUID, request_id: str) -> Optional[ToolCallResponse]:
        """Get a specific tool call."""
        if not await self._is_member(workspace_id, user_id):
            return None

        query = """
            SELECT tc.*, u.email as user_email
            FROM tool_calls tc
            JOIN auth.users u ON u.id = tc.user_id
            WHERE tc.request_id = $1 AND tc.workspace_id = $2
        """
        row = await self._fetchrow(query, request_id, workspace_id)
        if not row:
            return None

        return self._row_to_response(row)

    async def _is_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        """Check if user is member of workspace."""
        query = "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        if row:
            return True

        query = "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        return row is not None

    def _row_to_response(self, row) -> ToolCallResponse:
        """Convert database row to response model."""
        return ToolCallResponse(
            id=row["id"],
            request_id=row["request_id"],
            workspace_id=row["workspace_id"],
            user_id=row["user_id"],
            tool_name=row["tool_name"],
            input_summary=row["input_summary"],
            status=row["status"],
            permission_result=row["permission_result"],
            records_returned=row["records_returned"] or 0,
            execution_duration_ms=row["execution_duration_ms"],
            error_code=row["error_code"],
            error_message=row["error_message"],
            created_at=row["created_at"],
            completed_at=row["completed_at"],
        )


tool_call_service = ToolCallService()