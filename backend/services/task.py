"""Task service for managing tasks within projects."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from backend.services.base import BaseService
from backend.schemas.models import (
    TaskCreate, TaskUpdate, TaskResponse,
)
import structlog

logger = structlog.get_logger()


class TaskService(BaseService):
    """Service for task operations."""

    async def create_task(self, workspace_id: UUID, user_id: UUID, data: TaskCreate) -> Optional[TaskResponse]:
        """Create a new task in a project (member+)."""
        if not await self._is_member(workspace_id, user_id):
            return None

        # Verify project belongs to workspace
        project_query = "SELECT 1 FROM projects WHERE id = $1 AND workspace_id = $2"
        project = await self._fetchrow(project_query, data.project_id, workspace_id)
        if not project:
            return None

        query = """
            INSERT INTO tasks (workspace_id, project_id, title, description, status, priority, due_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, workspace_id, project_id, title, description, status, priority, due_date, created_at, updated_at
        """
        row = await self._fetchrow(
            query, workspace_id, data.project_id, data.title, data.description,
            data.status, data.priority, data.due_date
        )

        await self._log_audit(
            str(workspace_id), str(user_id), "create", "task", str(row["id"]), "success"
        )

        return TaskResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            project_id=row["project_id"],
            title=row["title"],
            description=row["description"],
            status=row["status"],
            priority=row["priority"],
            due_date=row["due_date"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def get_tasks(
        self,
        workspace_id: UUID,
        user_id: UUID,
        project_id: Optional[UUID] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[TaskResponse]:
        """Get tasks with filtering."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT t.*, p.name as project_name
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            WHERE t.workspace_id = $1
        """
        params = [workspace_id]
        param_idx = 2

        if project_id:
            query += f" AND t.project_id = ${param_idx}"
            params.append(project_id)
            param_idx += 1

        if status:
            query += f" AND t.status = ${param_idx}"
            params.append(status)
            param_idx += 1

        if priority:
            query += f" AND t.priority = ${param_idx}"
            params.append(priority)
            param_idx += 1

        query += f" ORDER BY t.created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
        params.extend([limit, offset])

        rows = await self._fetch(query, *params)

        return [
            TaskResponse(
                id=row["id"],
                workspace_id=row["workspace_id"],
                project_id=row["project_id"],
                title=row["title"],
                description=row["description"],
                status=row["status"],
                priority=row["priority"],
                due_date=row["due_date"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                project_name=row["project_name"],
            )
            for row in rows
        ]

    async def get_task(self, workspace_id: UUID, user_id: UUID, task_id: UUID) -> Optional[TaskResponse]:
        """Get a task by ID if user has access to workspace."""
        if not await self._is_member(workspace_id, user_id):
            return None

        query = """
            SELECT t.*, p.name as project_name
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            WHERE t.id = $1 AND t.workspace_id = $2
        """
        row = await self._fetchrow(query, task_id, workspace_id)
        if not row:
            return None

        return TaskResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            project_id=row["project_id"],
            title=row["title"],
            description=row["description"],
            status=row["status"],
            priority=row["priority"],
            due_date=row["due_date"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            project_name=row["project_name"],
        )

    async def search_tasks(
        self,
        workspace_id: UUID,
        user_id: UUID,
        query_text: str,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[TaskResponse]:
        """Search tasks by title/description (member+)."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT t.*, p.name as project_name
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            WHERE t.workspace_id = $1
              AND (t.title ILIKE $2 OR t.description ILIKE $2)
        """
        params = [workspace_id, f"%{query_text}%"]

        if status:
            query += " AND t.status = $3"
            params.append(status)

        query += " ORDER BY t.created_at DESC LIMIT $"
        query = query.replace("$", f"${len(params) + 1}", 1)
        params.append(limit)

        rows = await self._fetch(query, *params)

        return [
            TaskResponse(
                id=row["id"],
                workspace_id=row["workspace_id"],
                project_id=row["project_id"],
                title=row["title"],
                description=row["description"],
                status=row["status"],
                priority=row["priority"],
                due_date=row["due_date"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                project_name=row["project_name"],
            )
            for row in rows
        ]

    async def update_task(self, workspace_id: UUID, user_id: UUID, task_id: UUID, data: TaskUpdate) -> Optional[TaskResponse]:
        """Update a task (member+)."""
        if not await self._is_member(workspace_id, user_id):
            return None

        # Build dynamic update
        updates = []
        params = [task_id, workspace_id]
        param_idx = 3

        if data.title is not None:
            updates.append(f"title = ${param_idx}")
            params.append(data.title)
            param_idx += 1
        if data.description is not None:
            updates.append(f"description = ${param_idx}")
            params.append(data.description)
            param_idx += 1
        if data.status is not None:
            updates.append(f"status = ${param_idx}")
            params.append(data.status)
            param_idx += 1
        if data.priority is not None:
            updates.append(f"priority = ${param_idx}")
            params.append(data.priority)
            param_idx += 1
        if data.due_date is not None:
            updates.append(f"due_date = ${param_idx}")
            params.append(data.due_date)
            param_idx += 1
        if data.project_id is not None:
            # Verify new project belongs to workspace
            project_query = "SELECT 1 FROM projects WHERE id = $1 AND workspace_id = $2"
            project = await self._fetchrow(project_query, data.project_id, workspace_id)
            if not project:
                return None
            updates.append(f"project_id = ${param_idx}")
            params.append(data.project_id)
            param_idx += 1

        if not updates:
            return await self.get_task(workspace_id, user_id, task_id)

        updates.append("updated_at = NOW()")
        query = f"""
            UPDATE tasks
            SET {', '.join(updates)}
            WHERE id = $1 AND workspace_id = $2
            RETURNING id, workspace_id, project_id, title, description, status, priority, due_date, created_at, updated_at
        """
        row = await self._fetchrow(query, *params)
        if not row:
            return None

        await self._log_audit(
            str(workspace_id), str(user_id), "update", "task", str(task_id), "success"
        )

        return TaskResponse(
            id=row["id"],
            workspace_id=row["workspace_id"],
            project_id=row["project_id"],
            title=row["title"],
            description=row["description"],
            status=row["status"],
            priority=row["priority"],
            due_date=row["due_date"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def delete_task(self, workspace_id: UUID, user_id: UUID, task_id: UUID) -> bool:
        """Delete a task (member+)."""
        if not await self._is_member(workspace_id, user_id):
            return False

        query = "DELETE FROM tasks WHERE id = $1 AND workspace_id = $2"
        result = await self._execute(query, task_id, workspace_id)

        if result != "DELETE 0":
            await self._log_audit(
                str(workspace_id), str(user_id), "delete", "task", str(task_id), "success"
            )
            return True
        return False

    async def _is_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        """Check if user is member of workspace."""
        query = "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        if row:
            return True

        query = "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        return row is not None


task_service = TaskService()