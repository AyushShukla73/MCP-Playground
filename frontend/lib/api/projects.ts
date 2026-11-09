/**
 * TypeScript types matching backend Pydantic models for projects
 * Source: backend/schemas/models.py
 */

export type ProjectStatus = "active" | "archived" | "on_hold";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface ProjectResponse {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  task_count: number;
  member_count: number;
  created_by: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  status?: ProjectStatus;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface ProjectWithDetails extends ProjectResponse {
  members: ProjectMemberResponse[];
  current_user_role?: ProjectRole;
}

export interface ProjectListParams {
  workspace_id: string;
  status?: ProjectStatus;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: "name" | "created_at" | "updated_at" | "task_count";
  sort_order?: "asc" | "desc";
}

export interface ProjectMemberResponse {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface ProjectMemberCreate {
  user_id: string;
  role: ProjectRole;
}

export interface ProjectMemberUpdate {
  role: ProjectRole;
}

export type ProjectRole = "owner" | "admin" | "member" | "viewer";

export interface ProjectActivityItem {
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

export interface ProjectSettings {
  project_id: string;
  default_task_status: TaskStatus;
  default_task_priority: TaskPriority;
  auto_assign_creator: boolean;
  require_review: boolean;
}

export interface TaskResponse {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  reporter_id: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  assignee_email?: string;
  assignee_name?: string;
  reporter_email?: string;
  reporter_name?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  due_date?: string;
}

export interface TaskListParams {
  project_id: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: "title" | "created_at" | "updated_at" | "priority" | "due_date";
  sort_order?: "asc" | "desc";
}