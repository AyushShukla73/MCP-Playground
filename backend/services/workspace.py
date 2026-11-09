"""Workspace service for managing workspaces and members."""
from typing import Optional, List
from uuid import UUID
from backend.services.base import BaseService
from backend.schemas.models import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse,
    WorkspaceMemberCreate, WorkspaceMemberUpdate, WorkspaceMemberResponse,
)
import structlog

logger = structlog.get_logger()


class WorkspaceService(BaseService):
    """Service for workspace operations."""

    async def create_workspace(self, user_id: UUID, data: WorkspaceCreate) -> WorkspaceResponse:
        """Create a new workspace."""
        query = """
            INSERT INTO workspaces (name, owner_id)
            VALUES ($1, $2)
            RETURNING id, name, owner_id, created_at, updated_at
        """
        row = await self._fetchrow(query, data.name, user_id)

        # Add owner as member
        member_query = """
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES ($1, $2, 'owner')
        """
        await self._execute(member_query, row["id"], user_id)

        # Log audit
        await self._log_audit(
            str(row["id"]), str(user_id), "create", "workspace", str(row["id"]), "success"
        )

        return WorkspaceResponse(
            id=row["id"],
            name=row["name"],
            owner_id=row["owner_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            member_count=1,
            project_count=0,
        )

    async def get_user_workspaces(self, user_id: UUID) -> List[WorkspaceResponse]:
        """Get all workspaces for a user."""
        query = """
            SELECT w.*,
                   (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
                   (SELECT COUNT(*) FROM projects WHERE workspace_id = w.id) as project_count
            FROM workspaces w
            WHERE w.owner_id = $1
               OR EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = w.id AND user_id = $1)
            ORDER BY w.created_at DESC
        """
        rows = await self._fetch(query, user_id)
        return [
            WorkspaceResponse(
                id=row["id"],
                name=row["name"],
                owner_id=row["owner_id"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                member_count=row["member_count"],
                project_count=row["project_count"],
            )
            for row in rows
        ]

    async def get_workspace(self, workspace_id: UUID, user_id: UUID) -> Optional[WorkspaceResponse]:
        """Get a workspace by ID if user has access."""
        query = """
            SELECT w.*,
                   (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
                   (SELECT COUNT(*) FROM projects WHERE workspace_id = w.id) as project_count
            FROM workspaces w
            WHERE w.id = $1
              AND (w.owner_id = $2 OR EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = w.id AND user_id = $2))
        """
        row = await self._fetchrow(query, workspace_id, user_id)
        if not row:
            return None

        return WorkspaceResponse(
            id=row["id"],
            name=row["name"],
            owner_id=row["owner_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            member_count=row["member_count"],
            project_count=row["project_count"],
        )

    async def update_workspace(self, workspace_id: UUID, user_id: UUID, data: WorkspaceUpdate) -> Optional[WorkspaceResponse]:
        """Update a workspace (owner only)."""
        query = """
            UPDATE workspaces
            SET name = COALESCE($1, name), updated_at = NOW()
            WHERE id = $2 AND owner_id = $3
            RETURNING id, name, owner_id, created_at, updated_at
        """
        row = await self._fetchrow(query, data.name, workspace_id, user_id)
        if not row:
            return None

        await self._log_audit(
            str(workspace_id), str(user_id), "update", "workspace", str(workspace_id), "success"
        )

        return WorkspaceResponse(
            id=row["id"],
            name=row["name"],
            owner_id=row["owner_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            member_count=0,
            project_count=0,
        )

    async def delete_workspace(self, workspace_id: UUID, user_id: UUID) -> bool:
        """Delete a workspace (owner only)."""
        query = "DELETE FROM workspaces WHERE id = $1 AND owner_id = $2"
        result = await self._execute(query, workspace_id, user_id)

        if result != "DELETE 0":
            await self._log_audit(
                str(workspace_id), str(user_id), "delete", "workspace", str(workspace_id), "success"
            )
            return True
        return False

    async def add_member(self, workspace_id: UUID, user_id: UUID, data: WorkspaceMemberCreate) -> Optional[WorkspaceMemberResponse]:
        """Add a member to workspace (admin+)."""
        # Check if current user is admin+
        if not await self._is_admin(workspace_id, user_id):
            return None

        query = """
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = $3
            RETURNING id, workspace_id, user_id, role, created_at
        """
        row = await self._fetchrow(query, workspace_id, data.user_id, data.role)

        await self._log_audit(
            str(workspace_id), str(user_id), "add_member", "workspace_member", str(data.user_id), "success"
        )

        return WorkspaceMemberResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            user_id=row["user_id"],
            role=row["role"],
            created_at=row["created_at"],
        )

    async def get_members(self, workspace_id: UUID, user_id: UUID) -> List[WorkspaceMemberResponse]:
        """Get workspace members."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT wm.*, u.email
            FROM workspace_members wm
            JOIN auth.users u ON u.id = wm.user_id
            WHERE wm.workspace_id = $1
            ORDER BY wm.created_at
        """
        rows = await self._fetch(query, workspace_id)
        return [
            WorkspaceMemberResponse(
                id=row["id"],
                workspace_id=row["workspace_id"],
                user_id=row["user_id"],
                role=row["role"],
                created_at=row["created_at"],
                user_email=row["email"],
            )
            for row in rows
        ]

    async def update_member(self, workspace_id: UUID, user_id: UUID, target_user_id: UUID, data: WorkspaceMemberUpdate) -> Optional[WorkspaceMemberResponse]:
        """Update member role (admin+)."""
        if not await self._is_admin(workspace_id, user_id):
            return None

        # Can't change owner role
        owner_query = "SELECT owner_id FROM workspaces WHERE id = $1"
        owner = await self._fetchrow(owner_query, workspace_id)
        if owner and owner["owner_id"] == target_user_id:
            return None

        query = """
            UPDATE workspace_members
            SET role = $1
            WHERE workspace_id = $2 AND user_id = $3
            RETURNING id, workspace_id, user_id, role, created_at
        """
        row = await self._fetchrow(query, data.role, workspace_id, target_user_id)
        if not row:
            return None

        await self._log_audit(
            str(workspace_id), str(user_id), "update_member", "workspace_member", str(target_user_id), "success",
            {"new_role": data.role}
        )

        return WorkspaceMemberResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            user_id=row["user_id"],
            role=row["role"],
            created_at=row["created_at"],
        )

    async def remove_member(self, workspace_id: UUID, user_id: UUID, target_user_id: UUID) -> bool:
        """Remove member (admin+)."""
        if not await self._is_admin(workspace_id, user_id):
            return False

        # Can't remove owner
        owner_query = "SELECT owner_id FROM workspaces WHERE id = $1"
        owner = await self._fetchrow(owner_query, workspace_id)
        if owner and owner["owner_id"] == target_user_id:
            return False

        query = "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2"
        result = await self._execute(query, workspace_id, target_user_id)

        if result != "DELETE 0":
            await self._log_audit(
                str(workspace_id), str(user_id), "remove_member", "workspace_member", str(target_user_id), "success"
            )
            return True
        return False

    async def _is_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        """Check if user is member of workspace."""
        query = "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        if row:
            return True

        # Check if owner
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

        # Check if owner
        query = "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        return row is not None


workspace_service = WorkspaceService()