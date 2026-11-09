"""Approval service for human-in-the-loop workflow."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from backend.services.base import BaseService
from backend.schemas.models import (
    ApprovalCreate, ApprovalResponse,
)
import structlog

logger = structlog.get_logger()


class ApprovalService(BaseService):
    """Service for approval operations."""

    async def create_approval(
        self,
        workspace_id: UUID,
        user_id: UUID,
        data: ApprovalCreate,
        expires_in_hours: int = 24,
    ) -> Optional[ApprovalResponse]:
        """Create a new approval request."""
        if not await self._is_member(workspace_id, user_id):
            return None

        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)

        query = """
            INSERT INTO approvals (workspace_id, requested_by, tool_name, operation_type, target_record_id, validated_payload, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, workspace_id, requested_by, tool_name, operation_type, target_record_id, validated_payload,
                      status, reviewed_by, reviewed_at, executed_at, created_at, expires_at
        """
        row = await self._fetchrow(
            query, workspace_id, user_id, data.tool_name, data.operation_type,
            data.target_record_id, data.validated_payload, expires_at
        )

        await self._log_audit(
            str(workspace_id), str(user_id), "create_approval", "approval", str(row["id"]), "success",
            {"tool_name": data.tool_name, "operation_type": data.operation_type}
        )

        return self._row_to_response(row)

    async def get_approvals(
        self,
        workspace_id: UUID,
        user_id: UUID,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ApprovalResponse]:
        """Get approvals for a workspace."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT a.*, u1.email as requester_email, u2.email as reviewer_email
            FROM approvals a
            JOIN auth.users u1 ON u1.id = a.requested_by
            LEFT JOIN auth.users u2 ON u2.id = a.reviewed_by
            WHERE a.workspace_id = $1
        """
        params = [workspace_id]
        param_idx = 2

        if status:
            query += f" AND a.status = ${param_idx}"
            params.append(status)
            param_idx += 1

        query += f" ORDER BY a.created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
        params.extend([limit, offset])

        rows = await self._fetch(query, *params)
        return [self._row_to_response(row) for row in rows]

    async def get_pending_approvals(
        self,
        workspace_id: UUID,
        user_id: UUID,
    ) -> List[ApprovalResponse]:
        """Get pending approvals that user can review (admin+)."""
        if not await self._is_admin(workspace_id, user_id):
            return []

        query = """
            SELECT a.*, u1.email as requester_email, u2.email as reviewer_email
            FROM approvals a
            JOIN auth.users u1 ON u1.id = a.requested_by
            LEFT JOIN auth.users u2 ON u2.id = a.reviewed_by
            WHERE a.workspace_id = $1
              AND a.status = 'pending'
              AND a.expires_at > NOW()
            ORDER BY a.created_at ASC
        """
        rows = await self._fetch(query, workspace_id)
        return [self._row_to_response(row) for row in rows]

    async def get_approval(self, workspace_id: UUID, user_id: UUID, approval_id: UUID) -> Optional[ApprovalResponse]:
        """Get a specific approval."""
        if not await self._is_member(workspace_id, user_id):
            return None

        query = """
            SELECT a.*, u1.email as requester_email, u2.email as reviewer_email
            FROM approvals a
            JOIN auth.users u1 ON u1.id = a.requested_by
            LEFT JOIN auth.users u2 ON u2.id = a.reviewed_by
            WHERE a.id = $1 AND a.workspace_id = $2
        """
        row = await self._fetchrow(query, approval_id, workspace_id)
        if not row:
            return None

        return self._row_to_response(row)

    async def review_approval(
        self,
        workspace_id: UUID,
        user_id: UUID,
        approval_id: UUID,
        approved: bool,
    ) -> Optional[ApprovalResponse]:
        """Review an approval (admin+)."""
        if not await self._is_admin(workspace_id, user_id):
            return None

        status = "approved" if approved else "rejected"
        query = """
            UPDATE approvals
            SET status = $1, reviewed_by = $2, reviewed_at = NOW()
            WHERE id = $3 AND workspace_id = $4 AND status = 'pending'
            RETURNING id, workspace_id, requested_by, tool_name, operation_type, target_record_id, validated_payload,
                      status, reviewed_by, reviewed_at, executed_at, created_at, expires_at
        """
        row = await self._fetchrow(query, status, user_id, approval_id, workspace_id)
        if not row:
            return None

        await self._log_audit(
            str(workspace_id), str(user_id), "review_approval", "approval", str(approval_id), "success",
            {"approved": approved}
        )

        return self._row_to_response(row)

    async def execute_approval(
        self,
        workspace_id: UUID,
        approval_id: UUID,
    ) -> Optional[ApprovalResponse]:
        """Mark approval as executed."""
        query = """
            UPDATE approvals
            SET status = 'executed', executed_at = NOW()
            WHERE id = $1 AND workspace_id = $2 AND status = 'approved'
            RETURNING id, workspace_id, requested_by, tool_name, operation_type, target_record_id, validated_payload,
                      status, reviewed_by, reviewed_at, executed_at, created_at, expires_at
        """
        row = await self._fetchrow(query, approval_id, workspace_id)
        if not row:
            return None

        return self._row_to_response(row)

    async def expire_approvals(self, workspace_id: UUID) -> int:
        """Expire old pending approvals. Returns count expired."""
        query = """
            UPDATE approvals
            SET status = 'expired'
            WHERE workspace_id = $1 AND status = 'pending' AND expires_at < NOW()
        """
        result = await self._execute(query, workspace_id)
        # Extract count from result like "UPDATE 5"
        try:
            count = int(result.split()[-1]) if result != "UPDATE 0" else 0
        except (ValueError, IndexError):
            count = 0
        return count

    async def _is_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        """Check if user is member of workspace."""
        query = "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        if row:
            return True

        query = "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        return row is not None

    async def _is_admin(self, workspace_id: UUID, user_id: UUID) -> bool:
        """Check if user is admin or owner of workspace."""
        query = """
            SELECT 1 FROM workspace_members
            WHERE workspace_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')
        """
        row = await self._fetchrow(query, workspace_id, user_id)
        if row:
            return True

        query = "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        return row is not None

    def _row_to_response(self, row) -> ApprovalResponse:
        """Convert database row to response model."""
        return ApprovalResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            requested_by=row["requested_by"],
            tool_name=row["tool_name"],
            operation_type=row["operation_type"],
            target_record_id=row["target_record_id"],
            validated_payload=row["validated_payload"],
            status=row["status"],
            reviewed_by=row["reviewed_by"],
            reviewed_at=row["reviewed_at"],
            executed_at=row["executed_at"],
            created_at=row["created_at"],
            expires_at=row["expires_at"],
            requester_email=row.get("requester_email"),
            reviewer_email=row.get("reviewer_email"),
        )


approval_service = ApprovalService()