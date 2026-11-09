"""Tool execution routes with permission enforcement."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from uuid import UUID
from backend.services.permission_evaluator import permission_evaluator
from backend.services.tool_call import tool_call_service
from backend.mcp_client import MCPClient
from backend.api.routes.auth import get_current_user
from backend.services.mcp_server import mcp_server_service
import structlog
import uuid
import time

logger = structlog.get_logger()

router = APIRouter(prefix="/tool-execution", tags=["tool_execution"])


class ToolExecuteRequest(BaseModel):
    """Request to execute a tool."""
    tool_name: str = Field(..., min_length=1, max_length=255)
    arguments: Dict[str, Any] = Field(default_factory=dict)
    server_id: UUID = Field(..., description="MCP Server ID")


class ToolExecuteResponse(BaseModel):
    """Response from tool execution."""
    request_id: str
    permission_decision: str
    permission_result: Optional[str] = None
    matched_policy_id: Optional[str] = None
    matched_rule_id: Optional[str] = None
    matched_role_permission_id: Optional[str] = None
    execution_result: Optional[Dict[str, Any]] = None
    execution_error: Optional[str] = None
    execution_duration_ms: Optional[int] = None
    status: str  # "pending", "approved", "completed", "failed", "rejected"


class ToolExecuteStatusResponse(BaseModel):
    """Status of a tool execution request."""
    request_id: str
    tool_name: str
    server_id: str
    permission_decision: str
    status: str
    execution_result: Optional[Dict[str, Any]] = None
    execution_error: Optional[str] = None
    execution_duration_ms: Optional[int] = None
    created_at: str
    completed_at: Optional[str] = None


@router.post("/execute", response_model=ToolExecuteResponse, status_code=status.HTTP_202_ACCEPTED)
async def execute_tool(
    request: ToolExecuteRequest,
    workspace_id: UUID = Query(..., description="Workspace ID"),
    current_user: dict = Depends(get_current_user),
):
    """
    Execute a tool with permission enforcement.

    This endpoint:
    1. Evaluates permission for the tool call
    2. If allowed: executes the tool via MCP client
    3. If pending_approval: returns 402 with approval info
    4. If denied: returns 403
    5. Logs all decisions for audit trail
    """
    user_id = UUID(current_user["sub"])
    request_id = str(uuid.uuid4())
    start_time = time.time()

    # Create tool call record
    tool_call = await tool_call_service.create_tool_call(
        workspace_id=workspace_id,
        user_id=user_id,
        request_id=request_id,
        tool_name=request.tool_name,
        input_summary=request.arguments,
    )

    # Evaluate permission
    permission_result = await permission_evaluator.evaluate_permission(
        workspace_id=workspace_id,
        user_id=user_id,
        tool_name=request.tool_name,
        server_id=request.server_id,
        input_parameters=request.arguments,
    )

    execution_duration_ms = int((time.time() - start_time) * 1000)

    # Log the permission decision
    await permission_evaluator.log_permission_decision(
        workspace_id=workspace_id,
        user_id=user_id,
        tool_name=request.tool_name,
        server_id=request.server_id,
        decision=permission_result.decision,
        matched_policy_id=permission_result.matched_policy_id,
        matched_rule_id=permission_result.matched_rule_id,
        matched_role_permission_id=permission_result.matched_role_permission_id,
        input_parameters=request.arguments,
        evaluation_duration_ms=execution_duration_ms,
    )

    # Update tool call with permission result
    await tool_call_service.update_tool_call_status(
        request_id=request_id,
        status="pending" if permission_result.decision == "pending_approval" else permission_result.decision,
        permission_result=permission_result.decision,
    )

    if permission_result.decision == "denied":
        await tool_call_service.update_tool_call_status(
            request_id=request_id,
            status="failed",
            permission_result="denied",
            error_code="PERMISSION_DENIED",
            error_message="Permission denied by policy",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": "Permission denied",
                "decision": permission_result.decision,
                "error_message": permission_result.error_message,
            },
        )

    if permission_result.decision == "pending_approval":
        # Return 402 Payment Required equivalent for approval needed
        return ToolExecuteResponse(
            request_id=request_id,
            permission_decision=permission_result.decision,
            permission_result=permission_result.decision,
            matched_policy_id=permission_result.matched_policy_id,
            matched_rule_id=permission_result.matched_rule_id,
            matched_role_permission_id=permission_result.matched_role_permission_id,
            status="pending",
        )

    # Permission allowed - execute the tool
    # Get server config
    server = await mcp_server_service.get_server(request.server_id, user_id)
    if not server:
        await tool_call_service.update_tool_call_status(
            request_id=request_id,
            status="failed",
            permission_result="allowed",
            error_code="SERVER_NOT_FOUND",
            error_message="MCP server not found",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP server not found",
        )

    # Create MCP client and execute
    mcp_client = MCPClient(
        config=server.config,
        transport_type=server.transport_type,
    )

    exec_start_time = time.time()
    try:
        result = await mcp_client.call_tool(request.tool_name, request.arguments)
        exec_duration_ms = int((time.time() - exec_start_time) * 1000)

        # Update tool call with success
        await tool_call_service.update_tool_call_status(
            request_id=request_id,
            status="completed",
            permission_result="allowed",
            records_returned=1,
            execution_duration_ms=exec_duration_ms,
        )

        # Convert CallToolResult to dict
        execution_result = {
            "content": [
                {
                    "type": item.type,
                    "text": getattr(item, "text", None),
                    "data": getattr(item, "data", None),
                    "mimeType": getattr(item, "mimeType", None),
                }
                for item in result.content
            ],
            "isError": result.isError,
        }

        return ToolExecuteResponse(
            request_id=request_id,
            permission_decision=permission_result.decision,
            permission_result=permission_result.decision,
            matched_policy_id=permission_result.matched_policy_id,
            matched_rule_id=permission_result.matched_rule_id,
            matched_role_permission_id=permission_result.matched_role_permission_id,
            execution_result=execution_result,
            execution_duration_ms=exec_duration_ms,
            status="completed",
        )

    except Exception as e:
        exec_duration_ms = int((time.time() - exec_start_time) * 1000)
        error_msg = str(e)

        await tool_call_service.update_tool_call_status(
            request_id=request_id,
            status="failed",
            permission_result="allowed",
            execution_duration_ms=exec_duration_ms,
            error_code="EXECUTION_ERROR",
            error_message=error_msg,
        )

        logger.error("tool_execution_failed", tool=request.tool_name, error=error_msg)

        return ToolExecuteResponse(
            request_id=request_id,
            permission_decision=permission_result.decision,
            permission_result=permission_result.decision,
            matched_policy_id=permission_result.matched_policy_id,
            matched_rule_id=permission_result.matched_rule_id,
            matched_role_permission_id=permission_result.matched_role_permission_id,
            execution_error=error_msg,
            execution_duration_ms=exec_duration_ms,
            status="failed",
        )


@router.get("/execute/{request_id}", response_model=ToolExecuteStatusResponse)
async def get_execution_status(
    request_id: str,
    workspace_id: UUID = Query(..., description="Workspace ID"),
    current_user: dict = Depends(get_current_user),
):
    """Get the status of a tool execution request."""
    user_id = UUID(current_user["sub"])

    tool_call = await tool_call_service.get_tool_call(workspace_id, user_id, request_id)
    if not tool_call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool execution not found",
        )

    return ToolExecuteStatusResponse(
        request_id=tool_call.request_id,
        tool_name=tool_call.tool_name,
        server_id="",  # Not stored in tool_call, would need to add
        permission_decision=tool_call.permission_result or "unknown",
        status=tool_call.status,
        execution_result=None,  # Would need to store this
        execution_error=tool_call.error_message,
        execution_duration_ms=tool_call.execution_duration_ms,
        created_at=tool_call.created_at,
        completed_at=tool_call.completed_at,
    )


@router.post("/execute/{request_id}/approve", response_model=ToolExecuteResponse)
async def approve_execution(
    request_id: str,
    workspace_id: UUID = Query(..., description="Workspace ID"),
    current_user: dict = Depends(get_current_user),
):
    """Approve a pending tool execution."""
    user_id = UUID(current_user["sub"])

    tool_call = await tool_call_service.get_tool_call(workspace_id, user_id, request_id)
    if not tool_call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool execution not found",
        )

    if tool_call.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tool execution is not pending approval",
        )

    # Update status to approved
    await tool_call_service.update_tool_call_status(
        request_id=request_id,
        status="approved",
        permission_result="pending_approval",
    )

    # For now, return status - in a real implementation this would trigger async execution
    return ToolExecuteResponse(
        request_id=request_id,
        permission_decision="pending_approval",
        permission_result="approved",
        status="approved",
    )


@router.post("/execute/{request_id}/reject", response_model=ToolExecuteResponse)
async def reject_execution(
    request_id: str,
    workspace_id: UUID = Query(..., description="Workspace ID"),
    current_user: dict = Depends(get_current_user),
):
    """Reject a pending tool execution."""
    user_id = UUID(current_user["sub"])

    tool_call = await tool_call_service.get_tool_call(workspace_id, user_id, request_id)
    if not tool_call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool execution not found",
        )

    if tool_call.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tool execution is not pending approval",
        )

    # Update status to rejected
    await tool_call_service.update_tool_call_status(
        request_id=request_id,
        status="rejected",
        permission_result="pending_approval",
        error_code="REJECTED",
        error_message="Execution rejected by approver",
    )

    return ToolExecuteResponse(
        request_id=request_id,
        permission_decision="pending_approval",
        permission_result="rejected",
        execution_error="Execution rejected by approver",
        status="rejected",
    )