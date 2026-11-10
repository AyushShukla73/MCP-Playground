"""Workspace routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from backend.services.workspace import workspace_service
from backend.api.routes.auth import get_current_user
from backend.schemas.models import WorkspaceResponse as WorkspaceResponseModel, WorkspaceMemberResponse as WorkspaceMemberResponseModel
import structlog

logger = structlog.get_logger()

router = APIRouter()


class WorkspaceCreateRequest(BaseModel):
    name: str


class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = None


class WorkspaceMemberAddRequest(BaseModel):
    email: str
    role: str = "member"


class WorkspaceMemberUpdateRequest(BaseModel):
    role: str


@router.post("", response_model=WorkspaceResponseModel, status_code=status.HTTP_201_CREATED)
async def create_workspace(request: WorkspaceCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new workspace."""
    user_id = UUID(current_user["sub"])
    workspace_data = await workspace_service.create_workspace(user_id, request.model_dump())
    if not workspace_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create workspace")
    return workspace_data


@router.get("", response_model=List[WorkspaceResponseModel])
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    """Get all workspaces for the current user."""
    user_id = UUID(current_user["sub"])
    workspaces = await workspace_service.get_user_workspaces(user_id)
    return workspaces


@router.get("/{workspace_id}", response_model=WorkspaceResponseModel)
async def get_workspace(workspace_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get a workspace by ID."""
    user_id = UUID(current_user["sub"])
    workspace = await workspace_service.get_workspace(workspace_id, user_id)
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceResponseModel)
async def update_workspace(workspace_id: UUID, request: WorkspaceUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update a workspace (owner/admin)."""
    user_id = UUID(current_user["sub"])
    workspace = await workspace_service.update_workspace(workspace_id, user_id, request.model_dump(exclude_unset=True))
    if not workspace:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or workspace not found")
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(workspace_id: UUID, current_user: dict = Depends(get_current_user)):
    """Delete a workspace (owner only)."""
    user_id = UUID(current_user["sub"])
    success = await workspace_service.delete_workspace(workspace_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or workspace not found")


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponseModel])
async def get_workspace_members(workspace_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get workspace members."""
    user_id = UUID(current_user["sub"])
    members = await workspace_service.get_members(workspace_id, user_id)
    return members


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponseModel, status_code=status.HTTP_201_CREATED)
async def add_workspace_member(workspace_id: UUID, request: WorkspaceMemberAddRequest, current_user: dict = Depends(get_current_user)):
    """Add a member to workspace (admin+)."""
    user_id = UUID(current_user["sub"])
    member = await workspace_service.add_member(workspace_id, user_id, request.model_dump())
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or user not found")
    return member


@router.patch("/{workspace_id}/members/{member_id}", response_model=WorkspaceMemberResponseModel)
async def update_workspace_member(workspace_id: UUID, member_id: UUID, request: WorkspaceMemberUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update member role (admin+)."""
    user_id = UUID(current_user["sub"])
    member = await workspace_service.update_member(workspace_id, user_id, member_id, request.model_dump())
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or member not found")
    return member


@router.delete("/{workspace_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_workspace_member(workspace_id: UUID, member_id: UUID, current_user: dict = Depends(get_current_user)):
    """Remove a member from workspace (admin+)."""
    user_id = UUID(current_user["sub"])
    success = await workspace_service.remove_member(workspace_id, user_id, member_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or member not found")