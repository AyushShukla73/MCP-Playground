"""Project service for managing projects within workspaces."""
from typing import Optional, List
from uuid import UUID
from backend.services.base import BaseService
from backend.schemas.models import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectSummaryResponse,
)
import structlog

logger = structlog.get_logger()


class ProjectService(BaseService):
    """Service for project operations."""

    async def create_project(self, workspace_id: UUID, user_id: UUID, data: ProjectCreate) -> Optional[ProjectResponse]:
        """Create a new project in a workspace (member+)."""
        if not await self._is_member(workspace_id, user_id):
            return None

        query = """
            INSERT INTO projects (workspace_id, name, description, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id, workspace_id, name, description, status, created_at, updated_at
        """
        row = await self._fetchrow(query, workspace_id, data.name, data.description, data.status)

        await self._log_audit(
            str(workspace_id), str(user_id), "create", "project", str(row["id"]), "success"
        )

        return ProjectResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            name=row["name"],
            description=row["description"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            task_count=0,
            completed_task_count=0,
        )

    async def get_projects(self, workspace_id: UUID, user_id: UUID, status: Optional[str] = None) -> List[ProjectResponse]:
        """Get all projects in a workspace."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT p.*,
                   (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
                   (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as completed_task_count
            FROM projects p
            WHERE p.workspace_id = $1
        """
        params = [workspace_id]
        if status:
            query += " AND p.status = $2"
            params.append(status)

        query += " ORDER BY p.created_at DESC"
        rows = await self._fetch(query, *params)

        return [
            ProjectResponse(
                id=row["id"],
                workspace_id=row["workspace_id"],
                name=row["name"],
                description=row["description"],
                status=row["status"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                task_count=row["task_count"],
                completed_task_count=row["completed_task_count"],
            )
            for row in rows
        ]

    async def get_project(self, workspace_id: UUID, user_id: UUID, project_id: UUID) -> Optional[ProjectResponse]:
        """Get a project by ID if user has access to workspace."""
        if not await self._is_member(workspace_id, user_id):
            return None

        query = """
            SELECT p.*,
                   (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
                   (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as completed_task_count
            FROM projects p
            WHERE p.id = $1 AND p.workspace_id = $2
        """
        row = await self._fetchrow(query, project_id, workspace_id)
        if not row:
            return None

        return ProjectResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            name=row["name"],
            description=row["description"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            task_count=row["task_count"],
            completed_task_count=row["completed_task_count"],
        )

    async def get_project_summary(self, workspace_id: UUID, user_id: UUID, project_id: UUID) -> Optional[ProjectSummaryResponse]:
        """Get project with detailed task statistics."""
        project = await self.get_project(workspace_id, user_id, project_id)
        if not project:
            return None

        # Get task stats by status
        stats_query = """
            SELECT status, COUNT(*) as count
            FROM tasks
            WHERE project_id = $1
            GROUP BY status
        """
        stats_rows = await self._fetch(stats_query, project_id)
        task_stats = {row["status"]: row["count"] for row in stats_rows}

        # Get task stats by priority
        priority_query = """
            SELECT priority, COUNT(*) as count
            FROM tasks
            WHERE project_id = $1
            GROUP BY priority
        """
        priority_rows = await self._fetch(priority_query, project_id)
        for row in priority_rows:
            task_stats[f"priority_{row['priority']}"] = row["count"]

        return ProjectSummaryResponse(
            **project.model_dump(),
            task_stats=task_stats,
        )

    async def update_project(self, workspace_id: UUID, user_id: UUID, project_id: UUID, data: ProjectUpdate) -> Optional[ProjectResponse]:
        """Update a project (admin+)."""
        if not await self._is_admin(workspace_id, user_id):
            return None

        query = """
            UPDATE projects
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                updated_at = NOW()
            WHERE id = $4 AND workspace_id = $5
            RETURNING id, workspace_id, name, description, status, created_at, updated_at
        """
        row = await self._fetchrow(query, data.name, data.description, data.status, project_id, workspace_id)
        if not row:
            return None

        await self._log_audit(
            str(workspace_id), str(user_id), "update", "project", str(project_id), "success"
        )

        return ProjectResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            name=row["name"],
            description=row["description"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            task_count=0,
            completed_task_count=0,
        )

    async def delete_project(self, workspace_id: UUID, user_id: UUID, project_id: UUID) -> bool:
        """Delete a project (admin+)."""
        if not await self._is_admin(workspace_id, user_id):
            return False

        query = "DELETE FROM projects WHERE id = $1 AND workspace_id = $2"
        result = await self._execute(query, project_id, workspace_id)

        if result != "DELETE 0":
            await self._log_audit(
                str(workspace_id), str(user_id), "delete", "project", str(project_id), "success"
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

        query = "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        return row is not None


project_service = ProjectService()