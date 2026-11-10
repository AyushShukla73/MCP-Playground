"""Tool Permission Management routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from uuid import UUID
from backend.services.permission_evaluator import permission_evaluator
from backend.api.routes.auth import get_current_user
from backend.schemas.models import (
    ToolCategoryCreate, ToolCategoryUpdate, ToolCategoryResponse,
    ToolPermissionPolicyCreate, ToolPermissionPolicyUpdate, ToolPermissionPolicyResponse,
    ToolRolePermissionCreate, ToolRolePermissionUpdate, ToolRolePermissionResponse,
    ToolPermissionRuleCreate, ToolPermissionRuleUpdate, ToolPermissionRuleResponse,
    PermissionDecisionResponse, PermissionAuditLogResponse,
    PermissionEvaluateRequest, PermissionEvaluateResponse,
)
import structlog

logger = structlog.get_logger()

router = APIRouter(tags=["permissions"])


# Tool Category endpoints
@router.post("/categories", response_model=ToolCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_tool_category(
    request: ToolCategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new tool category (admin only)."""
    user_id = UUID(current_user["sub"])
    category = await permission_evaluator.create_tool_category(
        created_by=user_id,
        name=request.name,
        display_name=request.display_name,
        description=request.description,
        default_category=request.default_category,
        default_requires_approval=request.default_requires_approval,
        default_allowed_roles=request.default_allowed_roles,
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create tool category")
    return ToolCategoryResponse(**category.model_dump())


@router.get("/categories", response_model=List[ToolCategoryResponse])
async def list_tool_categories(
    current_user: dict = Depends(get_current_user)
):
    """List all tool categories."""
    categories = await permission_evaluator.get_tool_categories()
    return [ToolCategoryResponse(**c.model_dump()) for c in categories]


@router.get("/categories/{category_id}", response_model=ToolCategoryResponse)
async def get_tool_category(
    category_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Get a tool category by ID."""
    category = await permission_evaluator.get_tool_category(category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool category not found")
    return ToolCategoryResponse(**category.model_dump())


@router.patch("/categories/{category_id}", response_model=ToolCategoryResponse)
async def update_tool_category(
    category_id: UUID,
    request: ToolCategoryUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a tool category (admin only)."""
    user_id = UUID(current_user["sub"])
    category = await permission_evaluator.update_tool_category(
        category_id=category_id,
        user_id=user_id,
        display_name=request.display_name,
        description=request.description,
        default_category=request.default_category,
        default_requires_approval=request.default_requires_approval,
        default_allowed_roles=request.default_allowed_roles,
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or category not found")
    return ToolCategoryResponse(**category.model_dump())


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool_category(
    category_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a tool category (admin only)."""
    user_id = UUID(current_user["sub"])
    success = await permission_evaluator.delete_tool_category(category_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or category not found")


# Tool Permission Policy endpoints
@router.post("/policies", response_model=ToolPermissionPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_permission_policy(
    request: ToolPermissionPolicyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a workspace-level permission policy (admin+)."""
    user_id = UUID(current_user["sub"])
    policy = await permission_evaluator.create_permission_policy(
        workspace_id=request.workspace_id,
        created_by=user_id,
        name=request.name,
        description=request.description,
        policy_type=request.policy_type,
        priority=request.priority,
        tool_pattern=request.tool_pattern,
        server_id=request.server_id,
        category_filter=request.category_filter,
        enabled=request.enabled,
    )
    if not policy:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create permission policy")
    return ToolPermissionPolicyResponse(**policy.model_dump())


@router.get("/policies", response_model=List[ToolPermissionPolicyResponse])
async def list_permission_policies(
    workspace_id: UUID = Query(..., description="Workspace ID"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    current_user: dict = Depends(get_current_user)
):
    """List permission policies for a workspace."""
    user_id = UUID(current_user["sub"])
    policies = await permission_evaluator.get_permission_policies(
        workspace_id=workspace_id,
        user_id=user_id,
        enabled=enabled,
    )
    return [ToolPermissionPolicyResponse(**p.model_dump()) for p in policies]


@router.get("/policies/{policy_id}", response_model=ToolPermissionPolicyResponse)
async def get_permission_policy(
    policy_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Get a permission policy by ID."""
    user_id = UUID(current_user["sub"])
    policy = await permission_evaluator.get_permission_policy(policy_id, user_id)
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission policy not found")
    return ToolPermissionPolicyResponse(**policy.model_dump())


@router.patch("/policies/{policy_id}", response_model=ToolPermissionPolicyResponse)
async def update_permission_policy(
    policy_id: UUID,
    request: ToolPermissionPolicyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a permission policy (admin+)."""
    user_id = UUID(current_user["sub"])
    policy = await permission_evaluator.update_permission_policy(
        policy_id=policy_id,
        user_id=user_id,
        name=request.name,
        description=request.description,
        policy_type=request.policy_type,
        priority=request.priority,
        tool_pattern=request.tool_pattern,
        server_id=request.server_id,
        category_filter=request.category_filter,
        enabled=request.enabled,
    )
    if not policy:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or policy not found")
    return ToolPermissionPolicyResponse(**policy.model_dump())


@router.delete("/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_permission_policy(
    policy_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a permission policy (admin+)."""
    user_id = UUID(current_user["sub"])
    success = await permission_evaluator.delete_permission_policy(policy_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or policy not found")


# Tool Role Permission endpoints
@router.post("/role-permissions", response_model=ToolRolePermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_role_permission(
    request: ToolRolePermissionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a role-based tool permission (admin+)."""
    user_id = UUID(current_user["sub"])
    role_perm = await permission_evaluator.create_role_permission(
        workspace_id=request.workspace_id,
        user_id=user_id,
        tool_name=request.tool_name,
        server_id=request.server_id,
        role=request.role,
        permission=request.permission,
    )
    if not role_perm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create role permission")
    return ToolRolePermissionResponse(**role_perm.model_dump())


@router.get("/role-permissions", response_model=List[ToolRolePermissionResponse])
async def list_role_permissions(
    workspace_id: UUID = Query(..., description="Workspace ID"),
    tool_name: Optional[str] = Query(None, description="Filter by tool name"),
    server_id: Optional[UUID] = Query(None, description="Filter by server ID"),
    role: Optional[str] = Query(None, pattern="^(owner|admin|member|viewer)$", description="Filter by role"),
    current_user: dict = Depends(get_current_user)
):
    """List role permissions for a workspace."""
    user_id = UUID(current_user["sub"])
    role_perms = await permission_evaluator.get_role_permissions(
        workspace_id=workspace_id,
        user_id=user_id,
        tool_name=tool_name,
        server_id=server_id,
        role=role,
    )
    return [ToolRolePermissionResponse(**r.model_dump()) for r in role_perms]


@router.patch("/role-permissions/{role_permission_id}", response_model=ToolRolePermissionResponse)
async def update_role_permission(
    role_permission_id: UUID,
    request: ToolRolePermissionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a role permission (admin+)."""
    user_id = UUID(current_user["sub"])
    role_perm = await permission_evaluator.update_role_permission(
        role_permission_id=role_permission_id,
        user_id=user_id,
        permission=request.permission,
    )
    if not role_perm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or role permission not found")
    return ToolRolePermissionResponse(**role_perm.model_dump())


@router.delete("/role-permissions/{role_permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role_permission(
    role_permission_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a role permission (admin+)."""
    user_id = UUID(current_user["sub"])
    success = await permission_evaluator.delete_role_permission(role_permission_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or role permission not found")


# Tool Permission Rule endpoints
@router.post("/rules", response_model=ToolPermissionRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_permission_rule(
    request: ToolPermissionRuleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a fine-grained permission rule (admin+)."""
    user_id = UUID(current_user["sub"])
    rule = await permission_evaluator.create_permission_rule(
        workspace_id=request.workspace_id,
        created_by=user_id,
        name=request.name,
        description=request.description,
        tool_name=request.tool_name,
        server_id=request.server_id,
        condition_type=request.condition_type,
        condition_config=request.condition_config,
        action=request.action,
        priority=request.priority,
        enabled=request.enabled,
    )
    if not rule:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create permission rule")
    return ToolPermissionRuleResponse(**rule.model_dump())


@router.get("/rules", response_model=List[ToolPermissionRuleResponse])
async def list_permission_rules(
    workspace_id: UUID = Query(..., description="Workspace ID"),
    tool_name: Optional[str] = Query(None, description="Filter by tool name"),
    server_id: Optional[UUID] = Query(None, description="Filter by server ID"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    current_user: dict = Depends(get_current_user)
):
    """List permission rules for a workspace."""
    user_id = UUID(current_user["sub"])
    rules = await permission_evaluator.get_permission_rules(
        workspace_id=workspace_id,
        user_id=user_id,
        tool_name=tool_name,
        server_id=server_id,
        enabled=enabled,
    )
    return [ToolPermissionRuleResponse(**r.model_dump()) for r in rules]


@router.get("/rules/{rule_id}", response_model=ToolPermissionRuleResponse)
async def get_permission_rule(
    rule_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Get a permission rule by ID."""
    user_id = UUID(current_user["sub"])
    rule = await permission_evaluator.get_permission_rule(rule_id, user_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission rule not found")
    return ToolPermissionRuleResponse(**rule.model_dump())


@router.patch("/rules/{rule_id}", response_model=ToolPermissionRuleResponse)
async def update_permission_rule(
    rule_id: UUID,
    request: ToolPermissionRuleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a permission rule (admin+)."""
    user_id = UUID(current_user["sub"])
    rule = await permission_evaluator.update_permission_rule(
        rule_id=rule_id,
        user_id=user_id,
        name=request.name,
        description=request.description,
        condition_type=request.condition_type,
        condition_config=request.condition_config,
        action=request.action,
        priority=request.priority,
        enabled=request.enabled,
    )
    if not rule:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or rule not found")
    return ToolPermissionRuleResponse(**rule.model_dump())


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_permission_rule(
    rule_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a permission rule (admin+)."""
    user_id = UUID(current_user["sub"])
    success = await permission_evaluator.delete_permission_rule(rule_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or rule not found")


# Permission Audit Log endpoints
@router.get("/audit-log", response_model=PermissionAuditLogResponse)
async def get_audit_log(
    workspace_id: UUID = Query(..., description="Workspace ID"),
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    tool_name: Optional[str] = Query(None, description="Filter by tool name"),
    server_id: Optional[UUID] = Query(None, description="Filter by server ID"),
    decision: Optional[str] = Query(None, pattern="^(allowed|denied|pending_approval|error)$", description="Filter by decision"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get permission audit log for a workspace (admin+ for all, users see their own)."""
    current_user_id = UUID(current_user["sub"])
    result = await permission_evaluator.get_audit_log(
        workspace_id=workspace_id,
        user_id=current_user_id,
        target_user_id=user_id,
        tool_name=tool_name,
        server_id=server_id,
        decision=decision,
        limit=limit,
        offset=offset,
    )
    return PermissionAuditLogResponse(**result)


# Permission Evaluation endpoint
@router.post("/evaluate", response_model=PermissionEvaluateResponse)
async def evaluate_permission(
    request: PermissionEvaluateRequest,
    workspace_id: UUID = Query(..., description="Workspace ID"),
    current_user: dict = Depends(get_current_user)
):
    """Evaluate permission for a tool call."""
    user_id = UUID(current_user["sub"])
    result = await permission_evaluator.evaluate_permission(
        workspace_id=workspace_id,
        user_id=user_id,
        tool_name=request.tool_name,
        server_id=request.server_id,
        input_parameters=request.input_parameters,
    )
    return PermissionEvaluateResponse(**result)