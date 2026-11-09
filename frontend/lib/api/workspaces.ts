/**
 * TypeScript types matching backend Pydantic models for workspaces
 * Source: backend/schemas/models.py
 */

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type ProjectStatus = "active" | "archived" | "on_hold";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface WorkspaceResponse {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  project_count: number;
}

export interface WorkspaceCreate {
  name: string;
  description?: string;
}

export interface WorkspaceUpdate {
  name?: string;
  description?: string;
}

export interface WorkspaceMemberResponse {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface WorkspaceMemberCreate {
  user_id: string;
  role: WorkspaceRole;
}

export interface WorkspaceMemberUpdate {
  role: WorkspaceRole;
}

export interface WorkspaceWithMembers extends WorkspaceResponse {
  members: WorkspaceMemberResponse[];
  current_user_role?: WorkspaceRole;
}

export interface WorkspaceListParams {
  limit?: number;
  offset?: number;
}

export interface AddMemberRequest {
  user_id: string;
  role: WorkspaceRole;
}

export interface UpdateMemberRoleRequest {
  role: WorkspaceRole;
}

export interface WorkspaceActivityItem {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  outcome: "success" | "failure" | "blocked";
  metadata?: Record<string, unknown>;
  created_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

export interface WorkspaceSettings {
  workspace_id: string;
  tool_permissions: ToolPermissionConfig[];
}

export interface ToolPermissionConfig {
  id: string;
  workspace_id: string;
  tool_name: string;
  permission_category: "read" | "write" | "destructive";
  enabled: boolean;
  requires_approval: boolean;
  allowed_roles: WorkspaceRole[];
  created_at: string;
  updated_at: string;
}

export interface UpdateToolPermissionRequest {
  enabled?: boolean;
  requires_approval?: boolean;
  allowed_roles?: WorkspaceRole[];
}