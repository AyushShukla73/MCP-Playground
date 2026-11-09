"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  WorkspaceResponse,
  WorkspaceCreate,
  WorkspaceUpdate,
  WorkspaceMemberResponse,
  WorkspaceMemberCreate,
  WorkspaceMemberUpdate,
  WorkspaceActivityItem,
  WorkspaceSettings,
  ToolPermissionConfig,
  UpdateToolPermissionRequest,
  WorkspaceRole,
} from "@/lib/api/workspaces";

/**
 * React Query hooks for workspace operations
 */

// Query keys
export const workspaceKeys = {
  all: ["workspaces"] as const,
  lists: () => [...workspaceKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...workspaceKeys.lists(), params] as const,
  details: () => [...workspaceKeys.all, "detail"] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (workspaceId: string) => [...workspaceKeys.detail(workspaceId), "members"] as const,
  activity: (workspaceId: string, params?: Record<string, unknown>) =>
    [...workspaceKeys.detail(workspaceId), "activity", params] as const,
  settings: (workspaceId: string) => [...workspaceKeys.detail(workspaceId), "settings"] as const,
  toolPermissions: (workspaceId: string) => [...workspaceKeys.detail(workspaceId), "tool-permissions"] as const,
};

/**
 * Fetch all workspaces for the current user
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: () => api.getWorkspaces(),
    staleTime: 60_000,
  });
}

/**
 * Fetch a single workspace by ID
 */
export function useWorkspace(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => api.getWorkspace(workspaceId),
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Create a new workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WorkspaceCreate) => api.createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}

/**
 * Update a workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkspaceUpdate }) =>
      api.updateWorkspace(id, data),
    onSuccess: (updatedWorkspace, { id }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      queryClient.setQueryData(workspaceKeys.detail(id), updatedWorkspace);
    },
  });
}

/**
 * Delete a workspace
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}

/**
 * Fetch workspace members
 */
export function useWorkspaceMembers(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => api.getWorkspaceMembers(workspaceId),
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Add a member to workspace
 */
export function useAddWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: WorkspaceMemberCreate }) =>
      api.addWorkspaceMember(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    },
  });
}

/**
 * Update a workspace member's role
 */
export function useUpdateWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      userId,
      data,
    }: {
      workspaceId: string;
      userId: string;
      data: WorkspaceMemberUpdate;
    }) => api.updateWorkspaceMember(workspaceId, userId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    },
  });
}

/**
 * Remove a member from workspace
 */
export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      api.removeWorkspaceMember(workspaceId, userId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    },
  });
}

/**
 * Fetch workspace activity feed
 */
export function useWorkspaceActivity(workspaceId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: workspaceKeys.activity(workspaceId, params),
    queryFn: async () => {
      // This will need a new API endpoint - for now we'll use audit_logs
      const response = await api.get<WorkspaceActivityItem[]>(`/workspaces/${workspaceId}/activity`, { params });
      return response;
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Fetch workspace settings/permissions
 */
export function useWorkspaceSettings(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.settings(workspaceId),
    queryFn: async () => {
      const response = await api.get<WorkspaceSettings>(`/workspaces/${workspaceId}/settings`);
      return response;
    },
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Fetch tool permissions for a workspace
 */
export function useWorkspaceToolPermissions(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.toolPermissions(workspaceId),
    queryFn: async () => {
      const response = await api.get<ToolPermissionConfig[]>(`/workspaces/${workspaceId}/tool-permissions`);
      return response;
    },
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Update a tool permission
 */
export function useUpdateToolPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      toolName,
      data,
    }: {
      workspaceId: string;
      toolName: string;
      data: UpdateToolPermissionRequest;
    }) => api.patch(`/workspaces/${workspaceId}/tool-permissions/${toolName}`, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.toolPermissions(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.settings(workspaceId) });
    },
  });
}

/**
 * Get role display info
 */
export function useRoleDisplay() {
  return {
    getRoleLabel: (role: WorkspaceRole): string => {
      const labels: Record<WorkspaceRole, string> = {
        owner: "Owner",
        admin: "Admin",
        member: "Member",
        viewer: "Viewer",
      };
      return labels[role] || role;
    },
    getRoleColor: (role: WorkspaceRole): string => {
      const colors: Record<WorkspaceRole, string> = {
        owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        viewer: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
      return colors[role] || colors.member;
    },
    getRoleHierarchy: (role: WorkspaceRole): number => {
      const hierarchy: Record<WorkspaceRole, number> = {
        owner: 4,
        admin: 3,
        member: 2,
        viewer: 1,
      };
      return hierarchy[role] || 0;
    },
    canManageRole: (currentUserRole: WorkspaceRole, targetRole: WorkspaceRole): boolean => {
      const hierarchy: Record<WorkspaceRole, number> = {
        owner: 4,
        admin: 3,
        member: 2,
        viewer: 1,
      };
      return hierarchy[currentUserRole] > hierarchy[targetRole];
    },
  };
}