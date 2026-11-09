"""Approval routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from backend.services.approval import approval_service
from backend.api.routes.auth import get_current_user
import structlog

logger = structlog.get_logger()

router = APIRouter()


class ApprovalCreateRequest(BaseModel):
    tool_name: str
    operation_type: str
    target_record_id: Optional[UUID] = None
    validated_payload: dict


class ApprovalReviewRequest(BaseModel):
    approved: bool


class ApprovalResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    requested_by: UUID
    tool_name: str
    operation_type: str
    target_record_id: Optional[UUID]
    validated_payload: dict
    status: str
    reviewed_by: Optional[UUID]
    reviewed_at: Optional[str]
    executed_at: Optional[str]
    created_at: str
    expires_at: str
    requester_email: Optional[str] = None
    reviewer_email: Optional[str] = None


@router.post("/{workspace_id}", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
async def create_approval(
    workspace_id: UUID,
    request: ApprovalCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new approval request."""
    user_id = UUID(current_user["sub"])
    approval = await approval_service.create_approval(workspace_id, user_id, request)
    if not approval:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or workspace not found")
    return ApprovalResponse(**approval.model_dump())


@router.get("/{workspace_id}", response_model=List[ApprovalResponse])
async def get_approvals(
    workspace_id: UUID,
    approval_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get approvals for a workspace."""
    user_id = UUID(current_user["sub"])
    approvals = await approval_service.get_approvals(workspace_id, user_id, status=approval_status, limit=limit, offset=offset)
    return [ApprovalResponse(**a.model_dump()) for a in approvals]


@router.get("/{workspace_id}/pending", response_model=List[ApprovalResponse])
async def get_pending_approvals(workspace_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get pending approvals for review (admin+)."""
    user_id = UUID(current_user["sub"])
    approvals = await approval_service.get_pending_approvals(workspace_id, user_id)
    return [ApprovalResponse(**a.model_dump()) for a in approvals]


@router.get("/{workspace_id}/{approval_id}", response_model=ApprovalResponse)
async def get_approval(workspace_id: UUID, approval_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get a specific approval."""
    user_id = UUID(current_user["sub"])
    approval = await approval_service.get_approval(workspace_id, user_id, approval_id)
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")
    return ApprovalResponse(**approval.model_dump())


@router.post("/{workspace_id}/{approval_id}/review", response_model=ApprovalResponse)
async def review_approval(
    workspace_id: UUID,
    approval_id: UUID,
    request: ApprovalReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """Review an approval (admin+)."""
    user_id = UUID(current_user["sub"])
    approval = await approval_service.review_approval(workspace_id, user_id, approval_id, request.approved)
    if not approval:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or approval not found/not pending")
    return ApprovalResponse(**approval.model_dump())


@router.post("/{workspace_id}/{approval_id}/execute", response_model=ApprovalResponse)
async def execute_approval(workspace_id: UUID, approval_id: UUID, current_user: dict = Depends(get_current_user)):
    """Mark approval as executed."""
    user_id = UUID(current_user["sub"])
    approval = await approval_service.execute_approval(workspace_id, approval_id)
    if not approval:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or approval not approved")
    return ApprovalResponse(**approval.model_dump())


@router.post("/{workspace_id}/expire", response_model=dict)
async def expire_approvals(workspace_id: UUID, current_user: dict = Depends(get_current_user)):
    """Expire old pending approvals (admin+)."""
    user_id = UUID(current_user["sub"])
    # Check admin access
    if not await approval_service._is_admin(workspace_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    count = await approval_service.expire_approvals(workspace_id)
    return {"expired_count": count}