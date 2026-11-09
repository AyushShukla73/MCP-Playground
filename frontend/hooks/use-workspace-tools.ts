"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MCPServerToolResponse } from "@/lib/api/servers";
import type { ToolCategoryResponse, ToolWithCategory } from "@/lib/api/permissions";

/**
 * React Query hooks for workspace-wide tool operations
 */

// Query keys
export const workspaceToolKeys = {
  all: ["workspace-tools"] as const,
  lists: () => [...workspaceToolKeys.all, "list"] as const,
  list: (workspaceId: string, params?: { search?: string; category?: string; serverId?: string; enabled?: boolean }) =>
    [...workspaceToolKeys.lists(), { workspaceId, ...params }] as const,
};

/**
 * Fetch all tools across all servers in a workspace
 * This aggregates tools from each server's /tools endpoint
 */
export function useWorkspaceTools(
  workspaceId: string,
  params?: {
    search?: string;
    category?: string;
    serverId?: string;
    enabled?: boolean;
  },
  enabled = true
) {
  return useQuery({
    queryKey: workspaceToolKeys.list(workspaceId, params),
    queryFn: async () => {
      // First, get all servers in the workspace
      const serversResponse = await api.get<{ servers: { id: string; name: string; status: string }[] }>(
        "/servers",
        { params: { workspace_id: workspaceId } }
      );

      const servers = serversResponse.servers;

      // Fetch tools from each server in parallel
      const toolsPromises = servers.map(async (server) => {
        try {
          const tools = await api.get<MCPServerToolResponse[]>(`/servers/${server.id}/tools`);
          return tools.map((tool) => ({
            ...tool,
            server_id: server.id,
            server_name: server.name,
            server_status: server.status,
          }));
        } catch (error) {
          console.error(`Failed to fetch tools for server ${server.id}:`, error);
          return [];
        }
      });

      const toolsArrays = await Promise.all(toolsPromises);
      let allTools = toolsArrays.flat();

      // Apply client-side filtering
      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        allTools = allTools.filter(
          (tool) =>
            tool.name.toLowerCase().includes(searchLower) ||
            tool.description?.toLowerCase().includes(searchLower) ||
            tool.server_name.toLowerCase().includes(searchLower)
        );
      }

      if (params?.serverId) {
        allTools = allTools.filter((tool) => tool.server_id === params.serverId);
      }

      if (params?.enabled !== undefined) {
        allTools = allTools.filter((tool) => tool.is_enabled === params.enabled);
      }

      // Fetch categories to enrich tools with category info
      try {
        const categories = await api.get<ToolCategoryResponse[]>("/permissions/categories");
        const categoryMap = new Map(categories.map((c) => [c.name, c]));

        // Enrich tools with category info
        allTools = allTools.map((tool) => {
          // Try to find matching category by name pattern
          const category = categories.find(
            (c) => tool.name.toLowerCase().includes(c.name.toLowerCase()) ||
                   c.name.toLowerCase().includes(tool.name.toLowerCase())
          );

          return {
            ...tool,
            category,
            category_name: category?.display_name,
            permission_category: category?.default_category,
            requires_approval: category?.default_requires_approval,
            allowed_roles: category?.default_allowed_roles,
          } as ToolWithCategory;
        });
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }

      return allTools;
    },
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Fetch all servers in a workspace (for server filter dropdown)
 */
export function useWorkspaceServers(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: ["servers", "list", workspaceId],
    queryFn: () =>
      api.get<{ servers: { id: string; name: string; status: string }[] }>("/servers", {
        params: { workspace_id: workspaceId },
      }),
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
    select: (data) => data.servers,
  });
}

/**
 * Get tool category display info
 */
export function useToolCategoryDisplay() {
  return {
    getCategoryLabel: (category: string | undefined): string => {
      const labels: Record<string, string> = {
        read: "Read",
        write: "Write",
        destructive: "Destructive",
        unknown: "Unknown",
      };
      return category ? labels[category] || category : "Unknown";
    },
    getCategoryColor: (category: string | undefined): string => {
      const colors: Record<string, string> = {
        read: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        write: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        unknown: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
      return category ? colors[category] || colors.unknown : colors.unknown;
    },
    getCategoryIcon: (category: string | undefined): string => {
      const icons: Record<string, string> = {
        read: "eye",
        write: "edit-3",
        destructive: "alert-triangle",
        unknown: "help-circle",
      };
      return category ? icons[category] || "help-circle" : "help-circle";
    },
  };
}

/**
 * Get server status display info
 */
export function useServerStatusDisplay() {
  return {
    getStatusLabel: (status: string): string => {
      const labels: Record<string, string> = {
        connected: "Connected",
        disconnected: "Disconnected",
        error: "Error",
        connecting: "Connecting",
      };
      return labels[status] || status;
    },
    getStatusColor: (status: string): string => {
      const colors: Record<string, string> = {
        connected: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        disconnected: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        connecting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      };
      return colors[status] || colors.disconnected;
    },
    getStatusIcon: (status: string): string => {
      const icons: Record<string, string> = {
        connected: "check-circle-2",
        disconnected: "x-circle",
        error: "alert-triangle",
        connecting: "loader-2",
      };
      return icons[status] || "help-circle";
    },
  };
}