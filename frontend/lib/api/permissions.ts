/**
 * TypeScript types matching backend Pydantic models for Tool Permissions
 * Source: backend/schemas/models.py (Tool Category, Permission Policy, Role Permission, Rule, Decision models)
 */

export type ToolCategoryType = "read" | "write" | "destructive" | "unknown";
export type PolicyType = "allow" | "deny" | "require_approval";
export type RoleType = "owner" | "admin" | "member" | "viewer";
export type PermissionAction = "allow" | "deny" | "require_approval";
export type ConditionType = "always" | "time_based" | "parameter_based" | "user_based" | "resource_based";
export type DecisionType = "allowed" | "denied" | "pending_approval" | "error";

// Tool Category types
export interface ToolCategoryBase {
  name: string;
  display_name: string;
  description?: string;
  default_category: ToolCategoryType;
  default_requires_approval: boolean;
  default_allowed_roles: RoleType[];
}

export interface ToolCategoryCreate extends ToolCategoryBase {}

export interface ToolCategoryUpdate {
  display_name?: string;
  description?: string;
  default_category?: ToolCategoryType;
  default_requires_approval?: boolean;
  default_allowed_roles?: RoleType[];
}

export interface ToolCategoryResponse extends ToolCategoryBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Tool Permission Policy types
export interface ToolPermissionPolicyBase {
  name: string;
  description?: string;
  policy_type: PolicyType;
  priority: number;
  tool_pattern?: string;
  server_id?: string;
  category_filter: string[];
  enabled: boolean;
}

export interface ToolPermissionPolicyCreate extends ToolPermissionPolicyBase {
  workspace_id: string;
}

export interface ToolPermissionPolicyUpdate {
  name?: string;
  description?: string;
  policy_type?: PolicyType;
  priority?: number;
  tool_pattern?: string;
  server_id?: string;
  category_filter?: string[];
  enabled?: boolean;
}

export interface ToolPermissionPolicyResponse extends ToolPermissionPolicyBase {
  id: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ToolPermissionPolicyListParams {
  workspace_id: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

// Tool Role Permission types
export interface ToolRolePermissionBase {
  tool_name: string;
  server_id?: string;
  role: RoleType;
  permission: PermissionAction;
}

export interface ToolRolePermissionCreate extends ToolRolePermissionBase {
  workspace_id: string;
}

export interface ToolRolePermissionUpdate {
  permission?: PermissionAction;
}

export interface ToolRolePermissionResponse extends ToolRolePermissionBase {
  id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface ToolRolePermissionListParams {
  workspace_id: string;
  tool_name?: string;
  server_id?: string;
  role?: RoleType;
  limit?: number;
  offset?: number;
}

// Tool Permission Rule types
export interface ToolPermissionRuleBase {
  name: string;
  description?: string;
  tool_name: string;
  server_id?: string;
  condition_type: ConditionType;
  condition_config: Record<string, unknown>;
  action: PermissionAction;
  priority: number;
  enabled: boolean;
}

export interface ToolPermissionRuleCreate extends ToolPermissionRuleBase {
  workspace_id: string;
}

export interface ToolPermissionRuleUpdate {
  name?: string;
  description?: string;
  condition_type?: ConditionType;
  condition_config?: Record<string, unknown>;
  action?: PermissionAction;
  priority?: number;
  enabled?: boolean;
}

export interface ToolPermissionRuleResponse extends ToolPermissionRuleBase {
  id: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ToolPermissionRuleListParams {
  workspace_id: string;
  tool_name?: string;
  server_id?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

// Permission Decision (Audit Log) types
export interface PermissionDecisionResponse {
  id: string;
  workspace_id: string;
  user_id: string;
  tool_name: string;
  server_id?: string;
  decision: DecisionType;
  matched_policy_id?: string;
  matched_rule_id?: string;
  matched_role_permission_id?: string;
  user_role: RoleType;
  input_parameters?: Record<string, unknown>;
  evaluation_duration_ms: number;
  error_message?: string;
  created_at: string;
}

export interface PermissionAuditLogResponse {
  decisions: PermissionDecisionResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface PermissionAuditLogParams {
  workspace_id: string;
  user_id?: string;
  tool_name?: string;
  server_id?: string;
  decision?: DecisionType;
  limit?: number;
  offset?: number;
}

// Permission Evaluation types
export interface PermissionEvaluateRequest {
  tool_name: string;
  server_id?: string;
  input_parameters?: Record<string, unknown>;
}

export interface PermissionEvaluateResponse {
  decision: DecisionType;
  user_role: string;
  tool_name: string;
  server_id?: string;
  input_parameters?: Record<string, unknown>;
  matched_policy_id?: string;
  matched_rule_id?: string;
  matched_role_permission_id?: string;
  error_message?: string;
  evaluation_duration_ms: number;
}

// Condition config types for different condition types
export interface TimeBasedConditionConfig {
  allowed_hours?: { start: number; end: number }; // 0-23
  allowed_days?: number[]; // 0-6 (Sunday-Saturday)
  timezone?: string;
}

export interface ParameterBasedConditionConfig {
  parameter_filters: Record<string, {
    operator: "equals" | "not_equals" | "contains" | "not_contains" | "gt" | "lt" | "gte" | "lte";
    value: unknown;
  }>;
}

export interface UserBasedConditionConfig {
  allowed_user_ids?: string[];
  denied_user_ids?: string[];
  required_roles?: RoleType[];
  max_calls_per_hour?: number;
}

export interface ResourceBasedConditionConfig {
  resource_types?: string[];
  resource_id_patterns?: string[];
  max_resources_per_call?: number;
}

// Tool detail with category info
export interface ToolWithCategory {
  id: string;
  server_id: string;
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  is_enabled: boolean;
  discovered_at: string;
  updated_at: string;
  category?: ToolCategoryResponse;
  category_name?: string;
  permission_category?: ToolCategoryType;
  requires_approval?: boolean;
  allowed_roles?: RoleType[];
}