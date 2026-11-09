"""Analytics service for dashboard metrics and reports."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from backend.services.base import BaseService
from backend.schemas.models import (
    DashboardMetrics, ToolExecutionTrend, ToolUsageDistribution,
    LatencyTrend, ErrorDistribution, ApprovalStats, AnalyticsOverview,
)
import structlog

logger = structlog.get_logger()


class AnalyticsService(BaseService):
    """Service for analytics and dashboard metrics."""

    async def get_overview(
        self,
        workspace_id: UUID,
        user_id: UUID,
        days: int = 30,
    ) -> Optional[AnalyticsOverview]:
        """Get comprehensive analytics overview."""
        if not await self._is_member(workspace_id, user_id):
            return None

        # Get all metrics in parallel
        metrics = await self.get_metrics(workspace_id, user_id)
        tool_executions = await self.get_tool_execution_trends(workspace_id, user_id, days)
        success_failure = await self.get_success_failure_distribution(workspace_id, user_id, days)
        tool_usage = await self.get_tool_usage_distribution(workspace_id, user_id, days)
        latency_trends = await self.get_latency_trends(workspace_id, user_id, days)
        error_distribution = await self.get_error_distribution(workspace_id, user_id, days)
        approval_stats = await self.get_approval_stats(workspace_id, user_id, days)

        return AnalyticsOverview(
            metrics=metrics,
            tool_executions=tool_executions,
            success_failure=success_failure,
            tool_usage=tool_usage,
            latency_trends=latency_trends,
            error_distribution=error_distribution,
            approval_stats=approval_stats,
        )

    async def get_metrics(self, workspace_id: UUID, user_id: UUID) -> DashboardMetrics:
        """Get current dashboard metrics."""
        if not await self._is_member(workspace_id, user_id):
            return DashboardMetrics(
                total_tool_calls=0,
                successful_tool_calls=0,
                failed_tool_calls=0,
                success_rate=0.0,
                avg_execution_latency_ms=0.0,
                pending_approvals=0,
                connected_data_sources=0,
                mcp_server_status="down",
            )

        # Tool call metrics (last 24 hours)
        calls_query = """
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('completed', 'approved')) as successful,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                AVG(execution_duration_ms) as avg_latency
            FROM tool_calls
            WHERE workspace_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
        """
        calls_row = await self._fetchrow(calls_query, workspace_id)

        # Pending approvals
        approvals_query = """
            SELECT COUNT(*) as count
            FROM approvals
            WHERE workspace_id = $1 AND status = 'pending' AND expires_at > NOW()
        """
        approvals_row = await self._fetchrow(approvals_query, workspace_id)

        # Connected data sources (projects with recent activity)
        sources_query = """
            SELECT COUNT(DISTINCT project_id) as count
            FROM tool_calls
            WHERE workspace_id = $1 AND created_at > NOW() - INTERVAL '7 days'
        """
        sources_row = await self._fetchrow(sources_query, workspace_id)

        total = calls_row["total"] or 0
        successful = calls_row["successful"] or 0
        failed = calls_row["failed"] or 0

        return DashboardMetrics(
            total_tool_calls=total,
            successful_tool_calls=successful,
            failed_tool_calls=failed,
            success_rate=(successful / total * 100) if total > 0 else 0.0,
            avg_execution_latency_ms=float(calls_row["avg_latency"] or 0),
            pending_approvals=approvals_row["count"] or 0,
            connected_data_sources=sources_row["count"] or 0,
            mcp_server_status="healthy" if total > 0 else "degraded",
        )

    async def get_tool_execution_trends(
        self,
        workspace_id: UUID,
        user_id: UUID,
        days: int = 30,
    ) -> List[ToolExecutionTrend]:
        """Get daily tool execution trends."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT
                DATE(created_at) as date,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('completed', 'approved')) as successful,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM tool_calls
            WHERE workspace_id = $1 AND created_at > NOW() - INTERVAL '%s days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """ % days

        rows = await self._fetch(query, workspace_id)
        return [
            ToolExecutionTrend(
                date=str(row["date"]),
                total=row["total"],
                successful=row["successful"],
                failed=row["failed"],
            )
            for row in rows
        ]

    async def get_success_failure_distribution(
        self,
        workspace_id: UUID,
        user_id: UUID,
        days: int = 30,
    ) -> dict:
        """Get success/failure distribution."""
        if not await self._is_member(workspace_id, user_id):
            return {"success": 0, "failure": 0}

        query = """
            SELECT
                COUNT(*) FILTER (WHERE status IN ('completed', 'approved')) as success,
                COUNT(*) FILTER (WHERE status = 'failed') as failure
            FROM tool_calls
            WHERE workspace_id = $1 AND created_at > NOW() - INTERVAL '%s days'
        """ % days

        row = await self._fetchrow(query, workspace_id)
        return {
            "success": row["success"] or 0,
            "failure": row["failure"] or 0,
        }

    async def get_tool_usage_distribution(
        self,
        workspace_id: UUID,
        user_id: UUID,
        days: int = 30,
    ) -> List[ToolUsageDistribution]:
        """Get tool usage by tool name."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT
                tool_name,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE status IN ('completed', 'approved')) * 100.0 / COUNT(*) as success_rate
            FROM tool_calls
            WHERE workspace_id = $1 AND created_at > NOW() - INTERVAL '%s days'
            GROUP BY tool_name
            ORDER BY count DESC
        """ % days

        rows = await self._fetch(query, workspace_id)
        return [
            ToolUsageDistribution(
                tool_name=row["tool_name"],
                count=row["count"],
                success_rate=float(row["success_rate"] or 0),
            )
            for row in rows
        ]

    async def get_latency_trends(
        self,
        workspace_id: UUID,
        user_id: UUID,
        days: int = 30,
    ) -> List[LatencyTrend]:
        """Get latency trends (avg, p50, p95)."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT
                DATE(created_at) as date,
                AVG(execution_duration_ms) as avg_ms,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_duration_ms) as p50_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_duration_ms) as p95_ms
            FROM tool_calls
            WHERE workspace_id = $1
              AND created_at > NOW() - INTERVAL '%s days'
              AND execution_duration_ms IS NOT NULL
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """ % days

        rows = await self._fetch(query, workspace_id)
        return [
            LatencyTrend(
                date=str(row["date"]),
                avg_ms=float(row["avg_ms"] or 0),
                p50_ms=float(row["p50_ms"] or 0),
                p95_ms=float(row["p95_ms"] or 0),
            )
            for row in rows
        ]

    async def get_error_distribution(
        self,
        workspace_id: UUID,
        user_id: UUID,
        days: int = 30,
    ) -> List[ErrorDistribution]:
        """Get error distribution by error code."""
        if not await self._is_member(workspace_id, user_id):
            return []

        query = """
            SELECT
                COALESCE(error_code, 'unknown') as error_code,
                COUNT(*) as count
            FROM tool_calls
            WHERE workspace_id = $1
              AND created_at > NOW() - INTERVAL '%s days'
              AND status = 'failed'
            GROUP BY error_code
            ORDER BY count DESC
        """ % days

        rows = await self._fetch(query, workspace_id)
        return [
            ErrorDistribution(
                error_code=row["error_code"],
                count=row["count"],
            )
            for row in rows
        ]

    async def get_approval_stats(
        self,
        workspace_id: UUID,
        user_id: UUID,
        days: int = 30,
    ) -> ApprovalStats:
        """Get approval statistics."""
        if not await self._is_member(workspace_id, user_id):
            return ApprovalStats(total=0, approved=0, rejected=0, pending=0, expired=0)

        query = """
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > NOW()) as pending,
                COUNT(*) FILTER (WHERE status = 'expired') as expired
            FROM approvals
            WHERE workspace_id = $1 AND created_at > NOW() - INTERVAL '%s days'
        """ % days

        row = await self._fetchrow(query, workspace_id)
        return ApprovalStats(
            total=row["total"] or 0,
            approved=row["approved"] or 0,
            rejected=row["rejected"] or 0,
            pending=row["pending"] or 0,
            expired=row["expired"] or 0,
        )

    async def _is_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        """Check if user is member of workspace."""
        query = "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        if row:
            return True

        query = "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2"
        row = await self._fetchrow(query, workspace_id, user_id)
        return row is not None


analytics_service = AnalyticsService()