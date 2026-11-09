"""Tool call routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from backend.services.tool_call import tool_call_service
from backend.api.routes.auth import get_current_user
import structlog

logger = structlog.get_logger()

router = APIRouter()


class ToolCallResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: Optional[UUID]
    user_id: UUID
    tool_name: str
    operation_type: str
    input_params: dict
    output_result: Optional[dict]
    status: str
    permission_result: Optional[str]
    approval_id: Optional[UUID]
    execution_duration_ms: Optional[int]
    error_code: Optional[str]
    error_message: Optional[str]
    created_at: str
    completed_at: Optional[str]


class ToolCallFilterRequest(BaseModel):
    tool_name: Optional[str] = None
    operation_type: Optional[str] = None
    status: Optional[str] = None
    project_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


@router.get("/{workspace_id}", response_model=List[ToolCallResponse])
async def get_tool_calls(
    workspace_id: UUID,
    tool_name: Optional[str] = Query(None),
    operation_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    project_id: Optional[UUID] = Query(None),
    user_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get tool calls with optional filters."""
    user_id_param = UUID(current_user["sub"])
    calls = await tool_call_service.get_tool_calls(
        workspace_id, user_id_param,
        tool_name=tool_name,
        operation_type=operation_type,
        status=status,
        project_id=project_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    return [ToolCallResponse(**c.model_dump()) for c in calls]


@router.get("/{workspace_id}/{call_id}", response_model=ToolCallResponse)
async def get_tool_call(workspace_id: UUID, call_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get a specific tool call by ID."""
    user_id = UUID(current_user["sub"])
    call = await tool_call_service.get_tool_call(call_id, user_id)
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool call not found")
    return ToolCallResponse(**call.model_dump())