"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  MCPServerResponse,
  MCPServerCreate,
  MCPServerUpdate,
  MCPServerListParams,
  MCPServerListResponse,
  MCPServerToolResponse,
  MCPServerResourceResponse,
  MCPServerPromptResponse,
  MCPServerActivityResponse,
  MCPServerActivityListParams,
  MCPServerActivityListResponse,
  ConnectionTestRequest,
  ConnectionTestResponse,
  HealthCheckResponse,
  RefreshDiscoveryResponse,
  MCPTransportType,
  MCPServerStatus,
} from "@/lib/api/servers";

/**
 * React Query hooks for MCP Server operations
 */

// Query keys
export const serverKeys = {
  all: ["servers"] as const,
  lists: () => [...serverKeys.all, "list"] as const,
  list: (params?: MCPServerListParams) => [...serverKeys.lists(), params] as const,
  details: () => [...serverKeys.all, "detail"] as const,
  detail: (id: string) => [...serverKeys.details(), id] as const,
  tools: (serverId: string) => [...serverKeys.detail(serverId), "tools"] as const,
  resources: (serverId: string) => [...serverKeys.detail(serverId), "resources"] as const,
  prompts: (serverId: string) => [...serverKeys.detail(serverId), "prompts"] as const,
  activity: (serverId: string, params?: MCPServerActivityListParams) =>
    [...serverKeys.detail(serverId), "activity", params] as const,
};

/**
 * Fetch all MCP servers for a workspace
 */
export function useServers(params?: Omit<MCPServerListParams, "workspace_id"> & { workspace_id: string }) {
  return useQuery({
    queryKey: serverKeys.list({ workspace_id: params?.workspace_id, ...params }),
    queryFn: () => api.get<MCPServerListResponse>("/servers", { params: { workspace_id: params?.workspace_id, ...params } }),
    enabled: !!params?.workspace_id,
    staleTime: 60_000,
  });
}

/**
 * Fetch a single MCP server by ID
 */
export function useServer(serverId: string, enabled = true) {
  return useQuery({
    queryKey: serverKeys.detail(serverId),
    queryFn: () => api.get<MCPServerResponse>(`/servers/${serverId}`),
    enabled: !!serverId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Create a new MCP server
 */
export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MCPServerCreate) => api.post<MCPServerResponse>("/servers", data),
    onSuccess: (newServer) => {
      queryClient.invalidateQueries({ queryKey: serverKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serverKeys.list({ workspace_id: newServer.workspace_id }) });
    },
  });
}

/**
 * Update an MCP server
 */
export function useUpdateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MCPServerUpdate }) =>
      api.patch<MCPServerResponse>(`/servers/${id}`, data),
    onSuccess: (updatedServer, { id }) => {
      queryClient.invalidateQueries({ queryKey: serverKeys.lists() });
      queryClient.setQueryData(serverKeys.detail(id), updatedServer);
    },
  });
}

/**
 * Delete an MCP server
 */
export function useDeleteServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/servers/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: serverKeys.lists() });
      queryClient.removeQueries({ queryKey: serverKeys.detail(id) });
    },
  });
}

/**
 * Fetch tools for an MCP server
 */
export function useServerTools(serverId: string, enabled = true) {
  return useQuery({
    queryKey: serverKeys.tools(serverId),
    queryFn: () => api.get<MCPServerToolResponse[]>(`/servers/${serverId}/tools`),
    enabled: !!serverId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Fetch resources for an MCP server
 */
export function useServerResources(serverId: string, enabled = true) {
  return useQuery({
    queryKey: serverKeys.resources(serverId),
    queryFn: () => api.get<MCPServerResourceResponse[]>(`/servers/${serverId}/resources`),
    enabled: !!serverId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Fetch prompts for an MCP server
 */
export function useServerPrompts(serverId: string, enabled = true) {
  return useQuery({
    queryKey: serverKeys.prompts(serverId),
    queryFn: () => api.get<MCPServerPromptResponse[]>(`/servers/${serverId}/prompts`),
    enabled: !!serverId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Fetch activity log for an MCP server
 */
export function useServerActivity(serverId: string, params?: MCPServerActivityListParams, enabled = true) {
  return useQuery({
    queryKey: serverKeys.activity(serverId, params),
    queryFn: () => api.get<MCPServerActivityListResponse>(`/servers/${serverId}/activity`, { params }),
    enabled: !!serverId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Test connection to an MCP server
 */
export function useTestConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serverId, data }: { serverId: string; data: ConnectionTestRequest }) =>
      api.post<ConnectionTestResponse>(`/servers/${serverId}/test-connection`, data),
    onSuccess: (result, { serverId }) => {
      // Invalidate server detail to update status
      queryClient.invalidateQueries({ queryKey: serverKeys.detail(serverId) });
      queryClient.invalidateQueries({ queryKey: serverKeys.activity(serverId) });
    },
  });
}

/**
 * Get health status of an MCP server
 */
export function useServerHealth(serverId: string, enabled = true) {
  return useQuery({
    queryKey: [...serverKeys.detail(serverId), "health"],
    queryFn: () => api.get<HealthCheckResponse>(`/servers/${serverId}/health`),
    enabled: !!serverId && enabled,
    staleTime: 30_000,
    refetchInterval: 60_000, // Auto-refresh health every minute
  });
}

/**
 * Refresh capability discovery for an MCP server
 */
export function useRefreshDiscovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serverId: string) => api.post<RefreshDiscoveryResponse>(`/servers/${serverId}/refresh-discovery`, {}),
    onSuccess: (result, serverId) => {
      queryClient.invalidateQueries({ queryKey: serverKeys.tools(serverId) });
      queryClient.invalidateQueries({ queryKey: serverKeys.resources(serverId) });
      queryClient.invalidateQueries({ queryKey: serverKeys.prompts(serverId) });
      queryClient.invalidateQueries({ queryKey: serverKeys.activity(serverId) });
      queryClient.invalidateQueries({ queryKey: serverKeys.detail(serverId) });
    },
  });
}

/**
 * Get transport type display info
 */
export function useTransportDisplay() {
  return {
    getTransportLabel: (transport: MCPTransportType): string => {
      const labels: Record<MCPTransportType, string> = {
        stdio: "STDIO",
        streamable_http: "Streamable HTTP",
        sse: "SSE",
      };
      return labels[transport] || transport;
    },
    getTransportColor: (transport: MCPTransportType): string => {
      const colors: Record<MCPTransportType, string> = {
        stdio: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        streamable_http: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        sse: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      };
      return colors[transport] || colors.stdio;
    },
  };
}

/**
 * Get server status display info
 */
export function useServerStatusDisplay() {
  return {
    getStatusLabel: (status: MCPServerStatus): string => {
      const labels: Record<MCPServerStatus, string> = {
        connected: "Connected",
        disconnected: "Disconnected",
        error: "Error",
        connecting: "Connecting",
      };
      return labels[status] || status;
    },
    getStatusColor: (status: MCPServerStatus): string => {
      const colors: Record<MCPServerStatus, string> = {
        connected: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        disconnected: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        connecting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      };
      return colors[status] || colors.disconnected;
    },
    getStatusIcon: (status: MCPServerStatus): string => {
      const icons: Record<MCPServerStatus, string> = {
        connected: "check-circle-2",
        disconnected: "x-circle",
        error: "alert-triangle",
        connecting: "loader-2",
      };
      return icons[status] || "help-circle";
    },
  };
}

/**
 * Get activity action display info
 */
export function useActivityActionDisplay() {
  return {
    getActionLabel: (action: string): string => {
      const labels: Record<string, string> = {
        connection_test: "Connection Test",
        health_check: "Health Check",
        tools_list: "List Tools",
        resources_list: "List Resources",
        prompts_list: "List Prompts",
        tool_call: "Tool Call",
        resource_read: "Resource Read",
        prompt_get: "Prompt Get",
        discovery_refresh: "Discovery Refresh",
      };
      return labels[action] || action;
    },
    getActionColor: (action: string): string => {
      const colors: Record<string, string> = {
        connection_test: "text-blue-600 dark:text-blue-400",
        health_check: "text-green-600 dark:text-green-400",
        tools_list: "text-purple-600 dark:text-purple-400",
        resources_list: "text-orange-600 dark:text-orange-400",
        prompts_list: "text-pink-600 dark:text-pink-400",
        tool_call: "text-indigo-600 dark:text-indigo-400",
        resource_read: "text-teal-600 dark:text-teal-400",
        prompt_get: "text-cyan-600 dark:text-cyan-400",
        discovery_refresh: "text-amber-600 dark:text-amber-400",
      };
      return colors[action] || "text-gray-600 dark:text-gray-400";
    },
  };
}

/**
 * Get activity status display info
 */
export function useActivityStatusDisplay() {
  return {
    getStatusLabel: (status: string): string => {
      const labels: Record<string, string> = {
        success: "Success",
        failure: "Failed",
        pending: "Pending",
      };
      return labels[status] || status;
    },
    getStatusColor: (status: string): string => {
      const colors: Record<string, string> = {
        success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        failure: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      };
      return colors[status] || colors.pending;
    },
  };
}