"""Analytics routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from backend.services.analytics import analytics_service
from backend.api.routes.auth import get_current_user
from backend.schemas.models import (
    AnalyticsOverview, DashboardMetrics, ToolExecutionTrend,
    ToolUsageDistribution, LatencyTrend, ErrorDistribution, ApprovalStats
)
import structlog

logger = structlog.get_logger()

router = APIRouter()


@router.get("/{workspace_id}/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    workspace_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive analytics overview for a workspace."""
    user_id = UUID(current_user["sub"])
    overview = await analytics_service.get_overview(workspace_id, user_id, days)
    if overview is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or workspace not found")
    return overview


@router.get("/{workspace_id}/metrics", response_model=DashboardMetrics)
async def get_metrics(workspace_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get current dashboard metrics."""
    user_id = UUID(current_user["sub"])
    metrics = await analytics_service.get_metrics(workspace_id, user_id)
    return metrics


@router.get("/{workspace_id}/tool-executions", response_model=List[ToolExecutionTrend])
async def get_tool_execution_trends(
    workspace_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get daily tool execution trends."""
    user_id = UUID(current_user["sub"])
    trends = await analytics_service.get_tool_execution_trends(workspace_id, user_id, days)
    return trends


@router.get("/{workspace_id}/success-failure", response_model=dict)
async def get_success_failure_distribution(
    workspace_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get success/failure distribution."""
    user_id = UUID(current_user["sub"])
    distribution = await analytics_service.get_success_failure_distribution(workspace_id, user_id, days)
    return distribution


@router.get("/{workspace_id}/tool-usage", response_model=List[ToolUsageDistribution])
async def get_tool_usage_distribution(
    workspace_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get tool usage distribution by tool name."""
    user_id = UUID(current_user["sub"])
    usage = await analytics_service.get_tool_usage_distribution(workspace_id, user_id, days)
    return usage


@router.get("/{workspace_id}/latency", response_model=List[LatencyTrend])
async def get_latency_trends(
    workspace_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get latency trends (avg, p50, p95)."""
    user_id = UUID(current_user["sub"])
    trends = await analytics_service.get_latency_trends(workspace_id, user_id, days)
    return trends


@router.get("/{workspace_id}/errors", response_model=List[ErrorDistribution])
async def get_error_distribution(
    workspace_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get error distribution by error code."""
    user_id = UUID(current_user["sub"])
    errors = await analytics_service.get_error_distribution(workspace_id, user_id, days)
    return errors


@router.get("/{workspace_id}/approvals", response_model=ApprovalStats)
async def get_approval_stats(
    workspace_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get approval statistics."""
    user_id = UUID(current_user["sub"])
    stats = await analytics_service.get_approval_stats(workspace_id, user_id, days)
    return stats