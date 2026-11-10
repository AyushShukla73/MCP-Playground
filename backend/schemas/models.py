"""Pydantic models for API requests/responses and database records."""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal, Any, Dict
from datetime import datetime
from uuid import UUID
import json


# Auth models
class UserBase(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime


class UserResponse(UserBase):
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# Workspace models
class WorkspaceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(WorkspaceBase):
    pass


class WorkspaceResponse(WorkspaceBase):
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    project_count: int = 0

    class Config:
        from_attributes = True


class WorkspaceMemberBase(BaseModel):
    user_id: UUID
    role: Literal["owner", "admin", "member", "viewer"] = "member"


class WorkspaceMemberCreate(WorkspaceMemberBase):
    pass


class WorkspaceMemberUpdate(BaseModel):
    role: Literal["owner", "admin", "member", "viewer"]


class WorkspaceMemberResponse(WorkspaceMemberBase):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


# Project models
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: Literal["active", "archived", "on_hold"] = "active"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[Literal["active", "archived", "on_hold"]] = None


class ProjectResponse(ProjectBase):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime
    task_count: int = 0
    completed_task_count: int = 0

    class Config:
        from_attributes = True


class ProjectSummaryResponse(ProjectResponse):
    task_stats: dict = Field(default_factory=dict)


# Task models
class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    status: Literal["todo", "in_progress", "review", "done", "blocked"] = "todo"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    project_id: UUID


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[Literal["todo", "in_progress", "review", "done", "blocked"]] = None
    priority: Optional[Literal["low", "medium", "high", "critical"]] = None
    due_date: Optional[datetime] = None
    project_id: Optional[UUID] = None


class TaskResponse(TaskBase):
    id: UUID
    workspace_id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


# Tool call models
class ToolCallResponse(BaseModel):
    id: UUID
    request_id: str
    workspace_id: UUID
    user_id: UUID
    tool_name: str
    input_summary: Optional[dict] = None
    status: Literal["pending", "running", "completed", "failed", "approved", "rejected"]
    permission_result: Optional[Literal["allowed", "denied", "pending_approval"]] = None
    records_returned: int = 0
    execution_duration_ms: Optional[int] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Approval models
class ApprovalBase(BaseModel):
    tool_name: str
    operation_type: Literal["create", "update", "delete"]
    target_record_id: Optional[UUID] = None
    validated_payload: dict


class ApprovalCreate(ApprovalBase):
    workspace_id: UUID


class ApprovalResponse(ApprovalBase):
    id: UUID
    workspace_id: UUID
    requested_by: UUID
    status: Literal["pending", "approved", "rejected", "executed", "expired"]
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    created_at: datetime
    expires_at: datetime
    requester_email: Optional[str] = None
    reviewer_email: Optional[str] = None

    class Config:
        from_attributes = True


# MCP Server models
class MCPServerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    transport_type: str = Field(..., pattern="^(stdio|streamable_http|sse)$")
    config: Dict[str, Any] = Field(default_factory=dict)


class MCPServerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[str] = Field(None, pattern="^(connected|disconnected|error|connecting)$")


class MCPServerResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    transport_type: str
    config: Dict[str, Any]
    status: str
    last_connected_at: Optional[str]
    last_error: Optional[str]
    created_by: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MCPServerToolResponse(BaseModel):
    id: UUID
    server_id: UUID
    name: str
    description: Optional[str]
    input_schema: Dict[str, Any]
    output_schema: Optional[Dict[str, Any]]
    annotations: Optional[Dict[str, Any]]
    is_enabled: bool
    discovered_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MCPServerResourceResponse(BaseModel):
    id: UUID
    server_id: UUID
    uri: str
    name: str
    description: Optional[str]
    mime_type: Optional[str]
    annotations: Optional[Dict[str, Any]]
    is_enabled: bool
    discovered_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MCPServerPromptResponse(BaseModel):
    id: UUID
    server_id: UUID
    name: str
    description: Optional[str]
    arguments: List[Dict[str, Any]]
    is_enabled: bool
    discovered_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MCPServerActivityResponse(BaseModel):
    id: UUID
    server_id: UUID
    workspace_id: UUID
    user_id: Optional[UUID]
    action: str
    status: str
    details: Optional[Dict[str, Any]]
    duration_ms: Optional[int]
    error_message: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class MCPServerHealthResponse(BaseModel):
    status: str
    latency_ms: Optional[int]
    details: Dict[str, Any]

    class Config:
        from_attributes = True


class MCPServerTestConnectionResponse(BaseModel):
    success: bool
    status: str
    details: Dict[str, Any]
    duration_ms: int
    error_message: Optional[str]

    class Config:
        from_attributes = True


class MCPServerDiscoveryResponse(BaseModel):
    success: bool
    tools_count: int
    resources_count: int
    prompts_count: int
    duration_ms: int
    error_message: Optional[str]

    class Config:
        from_attributes = True


# Tool permission category type
ToolPermissionCategory = Literal["read", "write", "destructive", "unknown"]


# Tool permission models
class ToolPermissionBase(BaseModel):
    tool_name: str
    permission_category: ToolPermissionCategory
    enabled: bool = True
    requires_approval: bool = False
    allowed_roles: List[Literal["owner", "admin", "member", "viewer"]] = ["owner", "admin", "member"]


class ToolPermissionUpdate(BaseModel):
    enabled: Optional[bool] = None
    requires_approval: Optional[bool] = None
    allowed_roles: Optional[List[Literal["owner", "admin", "member", "viewer"]]] = None


class ToolPermissionResponse(ToolPermissionBase):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Tool Category models
class ToolCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    default_category: Literal["read", "write", "destructive", "unknown"] = "unknown"
    default_requires_approval: bool = False
    default_allowed_roles: List[Literal["owner", "admin", "member", "viewer"]] = ["owner", "admin", "member"]


class ToolCategoryCreate(ToolCategoryBase):
    pass


class ToolCategoryUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    default_category: Optional[Literal["read", "write", "destructive", "unknown"]] = None
    default_requires_approval: Optional[bool] = None
    default_allowed_roles: Optional[List[Literal["owner", "admin", "member", "viewer"]]] = None


class ToolCategoryResponse(ToolCategoryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Tool Permission Policy models
class ToolPermissionPolicyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    policy_type: Literal["allow", "deny", "require_approval"] = "allow"
    priority: int = Field(default=100, ge=1)
    tool_pattern: Optional[str] = None
    server_id: Optional[UUID] = None
    category_filter: List[str] = Field(default_factory=list)
    enabled: bool = True


class ToolPermissionPolicyCreate(ToolPermissionPolicyBase):
    workspace_id: UUID


class ToolPermissionPolicyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    policy_type: Optional[Literal["allow", "deny", "require_approval"]] = None
    priority: Optional[int] = Field(None, ge=1)
    tool_pattern: Optional[str] = None
    server_id: Optional[UUID] = None
    category_filter: Optional[List[str]] = None
    enabled: Optional[bool] = None


class ToolPermissionPolicyResponse(ToolPermissionPolicyBase):
    id: UUID
    workspace_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Tool Role Permission models
class ToolRolePermissionBase(BaseModel):
    tool_name: str
    server_id: Optional[UUID] = None
    role: Literal["owner", "admin", "member", "viewer"]
    permission: Literal["allow", "deny", "require_approval"]


class ToolRolePermissionCreate(ToolRolePermissionBase):
    workspace_id: UUID


class ToolRolePermissionUpdate(BaseModel):
    permission: Optional[Literal["allow", "deny", "require_approval"]] = None


class ToolRolePermissionResponse(ToolRolePermissionBase):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Tool Permission Rule models
class ToolPermissionRuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    tool_name: str
    server_id: Optional[UUID] = None
    condition_type: Literal["always", "time_based", "parameter_based", "user_based", "resource_based"]
    condition_config: dict = Field(default_factory=dict)
    action: Literal["allow", "deny", "require_approval"]
    priority: int = Field(default=100, ge=1)
    enabled: bool = True


class ToolPermissionRuleCreate(ToolPermissionRuleBase):
    workspace_id: UUID


class ToolPermissionRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    condition_type: Optional[Literal["always", "time_based", "parameter_based", "user_based", "resource_based"]] = None
    condition_config: Optional[dict] = None
    action: Optional[Literal["allow", "deny", "require_approval"]] = None
    priority: Optional[int] = Field(None, ge=1)
    enabled: Optional[bool] = None


class ToolPermissionRuleResponse(ToolPermissionRuleBase):
    id: UUID
    workspace_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Permission Decision (Audit Log) models
class PermissionDecisionResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    tool_name: str
    server_id: Optional[UUID]
    decision: Literal["allowed", "denied", "pending_approval", "error"]
    matched_policy_id: Optional[UUID]
    matched_rule_id: Optional[UUID]
    matched_role_permission_id: Optional[UUID]
    user_role: Literal["owner", "admin", "member", "viewer"]
    input_parameters: Optional[dict]
    evaluation_duration_ms: int
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PermissionAuditLogResponse(BaseModel):
    decisions: List[PermissionDecisionResponse]
    total: int
    limit: int
    offset: int


# Permission Evaluation models
class PermissionEvaluateRequest(BaseModel):
    tool_name: str
    server_id: Optional[UUID] = None
    input_parameters: Optional[dict] = None


class PermissionEvaluateResponse(BaseModel):
    decision: Literal["allowed", "denied", "pending_approval", "error"]
    user_role: str
    tool_name: str
    server_id: Optional[str]
    input_parameters: Optional[dict]
    matched_policy_id: Optional[str]
    matched_rule_id: Optional[str]
    matched_role_permission_id: Optional[str]
    error_message: Optional[str]
    evaluation_duration_ms: int


# Analytics models
class DashboardMetrics(BaseModel):
    total_tool_calls: int
    successful_tool_calls: int
    failed_tool_calls: int
    success_rate: float
    avg_execution_latency_ms: float
    pending_approvals: int
    connected_data_sources: int
    mcp_server_status: Literal["healthy", "degraded", "down"]


class ToolExecutionTrend(BaseModel):
    date: str
    total: int
    successful: int
    failed: int


class ToolUsageDistribution(BaseModel):
    tool_name: str
    count: int
    success_rate: float


class LatencyTrend(BaseModel):
    date: str
    avg_ms: float
    p50_ms: float
    p95_ms: float


class ErrorDistribution(BaseModel):
    error_code: str
    count: int


class ApprovalStats(BaseModel):
    total: int
    approved: int
    rejected: int
    pending: int
    expired: int


class AnalyticsOverview(BaseModel):
    metrics: DashboardMetrics
    tool_executions: List[ToolExecutionTrend]
    success_failure: dict
    tool_usage: List[ToolUsageDistribution]
    latency_trends: List[LatencyTrend]
    error_distribution: List[ErrorDistribution]
    approval_stats: ApprovalStats


# MCP Tool input/output models
class ListTasksInput(BaseModel):
    status: Optional[Literal["todo", "in_progress", "review", "done", "blocked"]] = None
    project_id: Optional[UUID] = None
    limit: int = Field(default=50, ge=1, le=200)


class GetTaskInput(BaseModel):
    task_id: UUID


class SearchTasksInput(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    status: Optional[Literal["todo", "in_progress", "review", "done", "blocked"]] = None
    limit: int = Field(default=50, ge=1, le=200)


class GetProjectSummaryInput(BaseModel):
    project_id: UUID


class ProposeCreateTaskInput(BaseModel):
    project_id: UUID
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    due_date: Optional[datetime] = None


class ProposeUpdateTaskInput(BaseModel):
    task_id: UUID
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[Literal["todo", "in_progress", "review", "done", "blocked"]] = None
    priority: Optional[Literal["low", "medium", "high", "critical"]] = None
    due_date: Optional[datetime] = None


# MCP Response models
class MCPToolResult(BaseModel):
    content: List[dict] = Field(default_factory=list)
    is_error: bool = False
    structured_content: Optional[dict] = None


class MCPErrorResponse(BaseModel):
    code: int
    message: str
    data: Optional[dict] = None