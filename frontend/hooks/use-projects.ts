"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ProjectResponse,
  ProjectCreate,
  ProjectUpdate,
  ProjectListParams,
  ProjectMemberResponse,
  ProjectMemberCreate,
  ProjectMemberUpdate,
  ProjectActivityItem,
  ProjectSettings,
  TaskResponse,
  TaskCreate,
  TaskUpdate,
  TaskListParams,
  ProjectRole,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
} from "@/lib/api/projects";

/**
 * React Query hooks for project operations
 */

// Query keys
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params?: ProjectListParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  members: (projectId: string) => [...projectKeys.detail(projectId), "members"] as const,
  activity: (projectId: string, params?: Record<string, unknown>) =>
    [...projectKeys.detail(projectId), "activity", params] as const,
  settings: (projectId: string) => [...projectKeys.detail(projectId), "settings"] as const,
  tasks: (projectId: string, params?: Omit<TaskListParams, "project_id">) =>
    [...projectKeys.detail(projectId), "tasks", params] as const,
  taskDetail: (taskId: string) => [...projectKeys.all, "task", taskId] as const,
  workspaceTasks: (workspaceId: string, params?: Record<string, unknown>) =>
    [...projectKeys.all, "workspace-tasks", workspaceId, params] as const,
};

/**
 * Fetch all projects for a workspace
 */
export function useProjects(workspaceId: string, params?: Omit<ProjectListParams, "workspace_id">) {
  return useQuery({
    queryKey: projectKeys.list({ workspace_id: workspaceId, ...params }),
    queryFn: () => api.getProjects(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

/**
 * Fetch a single project by ID
 */
export function useProject(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => api.getProject(projectId),
    enabled: !!projectId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: ProjectCreate }) =>
      api.createProject(workspaceId, data),
    onSuccess: (newProject, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.list({ workspace_id: workspaceId }) });
    },
  });
}

/**
 * Update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectUpdate }) =>
      api.updateProject(id, data),
    onSuccess: (updatedProject, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(id), updatedProject);
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

/**
 * Fetch project members
 */
export function useProjectMembers(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => api.getProjectMembers(projectId),
    enabled: !!projectId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Add a member to project
 */
export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: ProjectMemberCreate }) =>
      api.addProjectMember(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Update a project member's role
 */
export function useUpdateProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      data,
    }: {
      projectId: string;
      userId: string;
      data: ProjectMemberUpdate;
    }) => api.updateProjectMember(projectId, userId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Remove a member from project
 */
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      api.removeProjectMember(projectId, userId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Fetch project activity feed
 */
export function useProjectActivity(projectId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: projectKeys.activity(projectId, params),
    queryFn: async () => {
      const response = await api.get<ProjectActivityItem[]>(`/projects/${projectId}/activity`, { params });
      return response;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

/**
 * Fetch project settings
 */
export function useProjectSettings(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.settings(projectId),
    queryFn: async () => {
      const response = await api.get<ProjectSettings>(`/projects/${projectId}/settings`);
      return response;
    },
    enabled: !!projectId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Fetch tasks for a project
 */
export function useProjectTasks(projectId: string, params?: Omit<TaskListParams, "project_id">) {
  return useQuery({
    queryKey: projectKeys.tasks(projectId, params),
    queryFn: () => api.getTasks(projectId, params),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

/**
 * Fetch tasks across all projects in a workspace
 */
export function useTasks(workspaceId: string, params?: {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: projectKeys.workspaceTasks(workspaceId, params),
    queryFn: () => api.getWorkspaceTasks(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.taskDetail(taskId),
    queryFn: () => api.getTask(taskId),
    enabled: !!taskId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: TaskCreate }) =>
      api.createTask(projectId, data),
    onSuccess: (newTask, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
    },
  });
}

/**
 * Update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdate }) =>
      api.updateTask(id, data),
    onSuccess: (updatedTask, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.taskDetail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.tasks(updatedTask.project_id) });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.taskDetail(id) });
    },
  });
}

/**
 * Get project role display info
 */
export function useProjectRoleDisplay() {
  return {
    getRoleLabel: (role: ProjectRole): string => {
      const labels: Record<ProjectRole, string> = {
        owner: "Owner",
        admin: "Admin",
        member: "Member",
        viewer: "Viewer",
      };
      return labels[role] || role;
    },
    getRoleColor: (role: ProjectRole): string => {
      const colors: Record<ProjectRole, string> = {
        owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        viewer: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
      return colors[role] || colors.member;
    },
    getRoleHierarchy: (role: ProjectRole): number => {
      const hierarchy: Record<ProjectRole, number> = {
        owner: 4,
        admin: 3,
        member: 2,
        viewer: 1,
      };
      return hierarchy[role] || 0;
    },
    canManageRole: (currentUserRole: ProjectRole, targetRole: ProjectRole): boolean => {
      const hierarchy: Record<ProjectRole, number> = {
        owner: 4,
        admin: 3,
        member: 2,
        viewer: 1,
      };
      return hierarchy[currentUserRole] > hierarchy[targetRole];
    },
  };
}

/**
 * Get project status display info
 */
export function useProjectStatusDisplay() {
  return {
    getStatusLabel: (status: ProjectStatus): string => {
      const labels: Record<ProjectStatus, string> = {
        active: "Active",
        archived: "Archived",
        on_hold: "On Hold",
      };
      return labels[status] || status;
    },
    getStatusColor: (status: ProjectStatus): string => {
      const colors: Record<ProjectStatus, string> = {
        active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        archived: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      };
      return colors[status] || colors.active;
    },
  };
}

/**
 * Get task status display info
 */
export function useTaskStatusDisplay() {
  return {
    getStatusLabel: (status: TaskStatus): string => {
      const labels: Record<TaskStatus, string> = {
        todo: "To Do",
        in_progress: "In Progress",
        review: "Review",
        done: "Done",
        blocked: "Blocked",
      };
      return labels[status] || status;
    },
    getStatusColor: (status: TaskStatus): string => {
      const colors: Record<TaskStatus, string> = {
        todo: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      };
      return colors[status] || colors.todo;
    },
  };
}

/**
 * Get task priority display info
 */
export function useTaskPriorityDisplay() {
  return {
    getPriorityLabel: (priority: TaskPriority): string => {
      const labels: Record<TaskPriority, string> = {
        low: "Low",
        medium: "Medium",
        high: "High",
        critical: "Critical",
      };
      return labels[priority] || priority;
    },
    getPriorityColor: (priority: TaskPriority): string => {
      const colors: Record<TaskPriority, string> = {
        low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      };
      return colors[priority] || colors.medium;
    },
  };
}