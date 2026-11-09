"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  MCPServerToolResponse,
} from "@/lib/api/servers";
import { useServers } from "./use-servers";
import { useWorkspace } from "./use-workspace";

/**
 * Tool with server information for display
 */
export interface ToolWithServer extends MCPServerToolResponse {
  server_id: string;
  server_name: string;
  server_transport_type: string;
  server_status: string;
}

/**
 * React Query hooks for Tool operations (aggregated across all servers)
 */

// Query keys
export const toolKeys = {
  all: ["tools"] as const,
  lists: () => [...toolKeys.all, "list"] as const,
  list: (workspaceId: string) => [...toolKeys.lists(), workspaceId] as const,
};

/**
 * Fetch all tools across all servers in a workspace
 * This aggregates tools from each server in the workspace
 */
export function useAllTools(workspaceId: string, enabled = true) {
  // First get all servers for the workspace
  const { data: serversData, isLoading: serversLoading, error: serversError } = useServers({
    workspace_id: workspaceId,
    limit: 100, // Get all servers
  });

  const servers = serversData?.servers || [];

  // For each server, fetch tools
  const serverIds = servers.map(s => s.id);

  return useQuery<ToolWithServer[]>({
    queryKey: toolKeys.list(workspaceId),
    queryFn: async () => {
      // Fetch tools for each server in parallel
      const toolPromises = serverIds.map(async (serverId) => {
        const server = servers.find(s => s.id === serverId);
        if (!server) return [];

        try {
          const tools = await api.get<MCPServerToolResponse[]>(`/servers/${serverId}/tools`);
          return tools.map(tool => ({
            ...tool,
            server_id: server.id,
            server_name: server.name,
            server_transport_type: server.transport_type,
            server_status: server.status,
          }));
        } catch (error) {
          console.error(`Failed to fetch tools for server ${serverId}:`, error);
          return [];
        }
      });

      const results = await Promise.all(toolPromises);
      return results.flat();
    },
    enabled: !!workspaceId && enabled && !serversLoading && serverIds.length > 0,
    staleTime: 60_000,
  });
}

/**
 * Hook to fetch tools with a simpler interface for the tools page
 */
export function useToolsPage(workspaceId: string) {
  const { data: tools, isLoading, error, refetch } = useAllTools(workspaceId);

  // Get unique categories from tools
  const categories = tools
    ? Array.from(new Set(tools.map(t => t.annotations?.category || "unknown")))
    : [];

  // Get unique servers from tools
  const serverOptions = tools
    ? Array.from(
        new Map(tools.map(t => [t.server_id, { id: t.server_id, name: t.server_name }])).values()
      )
    : [];

  return {
    tools: tools || [],
    isLoading,
    error,
    refetch,
    categories,
    serverOptions,
  };
}

/**
 * Get tool category display info
 */
export function useToolCategoryDisplay() {
  return {
    getCategoryLabel: (category: string): string => {
      const labels: Record<string, string> = {
        read: "Read",
        write: "Write",
        destructive: "Destructive",
        unknown: "Unknown",
      };
      return labels[category] || category;
    },
    getCategoryColor: (category: string): string => {
      const colors: Record<string, string> = {
        read: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        write: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        unknown: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
      return colors[category] || colors.unknown;
    },
    getCategoryIcon: (category: string): string => {
      const icons: Record<string, string> = {
        read: "eye",
        write: "edit-3",
        destructive: "alert-triangle",
        unknown: "help-circle",
      };
      return icons[category] || "help-circle";
    },
  };
}

/**
 * Get tool permission category display info
 */
export function useToolPermissionCategoryDisplay() {
  return {
    getCategoryLabel: (category: string): string => {
      const labels: Record<string, string> = {
        read: "Read",
        write: "Write",
        destructive: "Destructive",
        unknown: "Unknown",
      };
      return labels[category] || category;
    },
    getCategoryColor: (category: string): string => {
      const colors: Record<string, string> = {
        read: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        write: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        unknown: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
      return colors[category] || colors.unknown;
    },
  };
}

/**
 * Get tool enabled status display info
 */
export function useToolEnabledDisplay() {
  return {
    getEnabledLabel: (enabled: boolean): string => enabled ? "Enabled" : "Disabled",
    getEnabledColor: (enabled: boolean): string =>
      enabled
        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    getEnabledIcon: (enabled: boolean): string => enabled ? "check-circle-2" : "x-circle",
  };
}