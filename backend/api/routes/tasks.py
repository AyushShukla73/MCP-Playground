"""Task routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from backend.services.task import task_service
from backend.api.routes.auth import get_current_user
import structlog

logger = structlog.get_logger()

router = APIRouter()


class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    assignee_id: Optional[UUID] = None


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[UUID] = None


class TaskResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: Optional[str]
    status: str
    priority: str
    assignee_id: Optional[UUID]
    created_by: UUID
    created_at: str
    updated_at: str


class TaskSearchRequest(BaseModel):
    query: str
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[UUID] = None


@router.post("/{workspace_id}/{project_id}", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    workspace_id: UUID,
    project_id: UUID,
    request: TaskCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new task in a project."""
    user_id = UUID(current_user["sub"])
    task = await task_service.create_task(
        project_id, user_id, request.title, request.description,
        request.status, request.priority, request.assignee_id
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or project not found")
    return TaskResponse(**task.model_dump())


@router.get("/{workspace_id}/{project_id}", response_model=List[TaskResponse])
async def get_tasks(
    workspace_id: UUID,
    project_id: UUID,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get tasks in a project with optional filters."""
    user_id = UUID(current_user["sub"])
    tasks = await task_service.get_tasks(
        project_id, user_id, status=status, priority=priority,
        assignee_id=assignee_id, limit=limit, offset=offset
    )
    return [TaskResponse(**t.model_dump()) for t in tasks]


@router.get("/{workspace_id}/{project_id}/{task_id}", response_model=TaskResponse)
async def get_task(workspace_id: UUID, project_id: UUID, task_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get a task by ID."""
    user_id = UUID(current_user["sub"])
    task = await task_service.get_task(task_id, user_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return TaskResponse(**task.model_dump())


@router.patch("/{workspace_id}/{project_id}/{task_id}", response_model=TaskResponse)
async def update_task(
    workspace_id: UUID,
    project_id: UUID,
    task_id: UUID,
    request: TaskUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a task."""
    user_id = UUID(current_user["sub"])
    # Build update fields dynamically
    update_data = request.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    task = await task_service.update_task(task_id, user_id, **update_data)
    if not task:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or task not found")
    return TaskResponse(**task.model_dump())


@router.delete("/{workspace_id}/{project_id}/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(workspace_id: UUID, project_id: UUID, task_id: UUID, current_user: dict = Depends(get_current_user)):
    """Delete a task."""
    user_id = UUID(current_user["sub"])
    success = await task_service.delete_task(task_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or task not found")


@router.post("/{workspace_id}/{project_id}/search", response_model=List[TaskResponse])
async def search_tasks(
    workspace_id: UUID,
    project_id: UUID,
    request: TaskSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search tasks by title/description with optional filters."""
    user_id = UUID(current_user["sub"])
    tasks = await task_service.search_tasks(
        project_id, user_id, request.query,
        status=request.status,
        priority=request.priority,
        assignee_id=request.assignee_id
    )
    return [TaskResponse(**t.model_dump()) for t in tasks]