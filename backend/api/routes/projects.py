"""Project routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from backend.services.project import project_service
from backend.api.routes.auth import get_current_user
import structlog

logger = structlog.get_logger()

router = APIRouter()


class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    created_at: str
    updated_at: str
    task_count: int = 0


class ProjectSummaryResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    created_at: str
    updated_at: str
    total_tasks: int
    tasks_by_status: dict
    tasks_by_priority: dict


@router.post("/{workspace_id}", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    workspace_id: UUID,
    request: ProjectCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new project in a workspace."""
    user_id = UUID(current_user["sub"])
    project = await project_service.create_project(workspace_id, user_id, request.name, request.description)
    if not project:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or workspace not found")
    return ProjectResponse(**project.model_dump())


@router.get("/{workspace_id}", response_model=List[ProjectResponse])
async def get_projects(workspace_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get all projects in a workspace."""
    user_id = UUID(current_user["sub"])
    projects = await project_service.get_projects(workspace_id, user_id)
    return [ProjectResponse(**p.model_dump()) for p in projects]


@router.get("/{workspace_id}/{project_id}", response_model=ProjectResponse)
async def get_project(workspace_id: UUID, project_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get a project by ID."""
    user_id = UUID(current_user["sub"])
    project = await project_service.get_project(project_id, user_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse(**project.model_dump())


@router.get("/{workspace_id}/{project_id}/summary", response_model=ProjectSummaryResponse)
async def get_project_summary(workspace_id: UUID, project_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get project summary with task statistics."""
    user_id = UUID(current_user["sub"])
    summary = await project_service.get_project_summary(project_id, user_id)
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectSummaryResponse(**summary.model_dump())


@router.patch("/{workspace_id}/{project_id}", response_model=ProjectResponse)
async def update_project(
    workspace_id: UUID,
    project_id: UUID,
    request: ProjectUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a project (member+)."""
    user_id = UUID(current_user["sub"])
    project = await project_service.update_project(project_id, user_id, request.name, request.description)
    if not project:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or project not found")
    return ProjectResponse(**project.model_dump())


@router.delete("/{workspace_id}/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(workspace_id: UUID, project_id: UUID, current_user: dict = Depends(get_current_user)):
    """Delete a project (admin+)."""
    user_id = UUID(current_user["sub"])
    success = await project_service.delete_project(project_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or project not found")