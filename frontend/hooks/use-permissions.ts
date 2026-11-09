"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ToolCategoryResponse,
  ToolCategoryCreate,
  ToolCategoryUpdate,
  ToolPermissionPolicyResponse,
  ToolPermissionPolicyCreate,
  ToolPermissionPolicyUpdate,
  ToolPermissionPolicyListParams,
  ToolRolePermissionResponse,
  ToolRolePermissionCreate,
  ToolRolePermissionUpdate,
  ToolRolePermissionListParams,
  ToolPermissionRuleResponse,
  ToolPermissionRuleCreate,
  ToolPermissionRuleUpdate,
  ToolPermissionRuleListParams,
  PermissionDecisionResponse,
  PermissionAuditLogResponse,
  PermissionAuditLogParams,
  PermissionEvaluateRequest,
  PermissionEvaluateResponse,
  ToolWithCategory,
  RoleType,
  ToolCategoryType,
  PolicyType,
  PermissionAction,
  ConditionType,
  DecisionType,
} from "@/lib/api/permissions";

/**
 * React Query hooks for Tool Permission operations
 */

// Query keys - base keys to avoid circular references
const PERMISSIONS_BASE = ["permissions"] as const;
const CATEGORIES_BASE = [...PERMISSIONS_BASE, "categories"] as const;
const POLICIES_BASE = [...PERMISSIONS_BASE, "policies"] as const;
const ROLE_PERMISSIONS_BASE = [...PERMISSIONS_BASE, "role-permissions"] as const;
const RULES_BASE = [...PERMISSIONS_BASE, "rules"] as const;
const AUDIT_LOG_BASE = [...PERMISSIONS_BASE, "audit-log"] as const;
const EVALUATE_BASE = [...PERMISSIONS_BASE, "evaluate"] as const;

export const permissionKeys = {
  all: PERMISSIONS_BASE,
  categories: {
    all: CATEGORIES_BASE,
    lists: () => [...CATEGORIES_BASE, "list"] as const,
    list: () => [...CATEGORIES_BASE, "list"] as const,
    details: () => [...CATEGORIES_BASE, "detail"] as const,
    detail: (id: string) => [...CATEGORIES_BASE, "detail", id] as const,
  },
  policies: {
    all: POLICIES_BASE,
    lists: () => [...POLICIES_BASE, "list"] as const,
    list: (params?: ToolPermissionPolicyListParams) =>
      [...POLICIES_BASE, "list", params] as const,
    details: () => [...POLICIES_BASE, "detail"] as const,
    detail: (id: string) => [...POLICIES_BASE, "detail", id] as const,
  },
  rolePermissions: {
    all: ROLE_PERMISSIONS_BASE,
    lists: () => [...ROLE_PERMISSIONS_BASE, "list"] as const,
    list: (params?: ToolRolePermissionListParams) =>
      [...ROLE_PERMISSIONS_BASE, "list", params] as const,
    details: () => [...ROLE_PERMISSIONS_BASE, "detail"] as const,
    detail: (id: string) => [...ROLE_PERMISSIONS_BASE, "detail", id] as const,
  },
  rules: {
    all: RULES_BASE,
    lists: () => [...RULES_BASE, "list"] as const,
    list: (params?: ToolPermissionRuleListParams) =>
      [...RULES_BASE, "list", params] as const,
    details: () => [...RULES_BASE, "detail"] as const,
    detail: (id: string) => [...RULES_BASE, "detail", id] as const,
  },
  auditLog: {
    all: AUDIT_LOG_BASE,
    lists: () => [...AUDIT_LOG_BASE, "list"] as const,
    list: (params?: PermissionAuditLogParams) =>
      [...AUDIT_LOG_BASE, "list", params] as const,
  },
  evaluate: {
    all: EVALUATE_BASE,
  },
};

/**
 * Fetch all tool categories
 */
export function useToolCategories() {
  return useQuery({
    queryKey: permissionKeys.categories.list(),
    queryFn: () => api.get<ToolCategoryResponse[]>("/permissions/categories"),
    staleTime: 60_000,
  });
}

/**
 * Fetch a single tool category by ID
 */
export function useToolCategory(categoryId: string, enabled = true) {
  return useQuery({
    queryKey: permissionKeys.categories.detail(categoryId),
    queryFn: () => api.get<ToolCategoryResponse>(`/permissions/categories/${categoryId}`),
    enabled: !!categoryId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Create a new tool category
 */
export function useCreateToolCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ToolCategoryCreate) =>
      api.post<ToolCategoryResponse>("/permissions/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.categories.lists() });
    },
  });
}

/**
 * Update a tool category
 */
export function useUpdateToolCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ToolCategoryUpdate }) =>
      api.patch<ToolCategoryResponse>(`/permissions/categories/${id}`, data),
    onSuccess: (updatedCategory, { id }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.categories.lists() });
      queryClient.setQueryData(permissionKeys.categories.detail(id), updatedCategory);
    },
  });
}

/**
 * Delete a tool category
 */
export function useDeleteToolCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/permissions/categories/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.categories.lists() });
      queryClient.removeQueries({ queryKey: permissionKeys.categories.detail(id) });
    },
  });
}

/**
 * Fetch permission policies for a workspace
 */
export function usePermissionPolicies(
  workspaceId: string,
  params?: Omit<ToolPermissionPolicyListParams, "workspace_id">
) {
  return useQuery({
    queryKey: permissionKeys.policies.list({ workspace_id: workspaceId, ...params }),
    queryFn: () =>
      api.get<ToolPermissionPolicyResponse[]>("/permissions/policies", {
        params: { workspace_id: workspaceId, ...params },
      }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single permission policy by ID
 */
export function usePermissionPolicy(policyId: string, enabled = true) {
  return useQuery({
    queryKey: permissionKeys.policies.detail(policyId),
    queryFn: () => api.get<ToolPermissionPolicyResponse>(`/permissions/policies/${policyId}`),
    enabled: !!policyId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Create a new permission policy
 */
export function useCreatePermissionPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ToolPermissionPolicyCreate) =>
      api.post<ToolPermissionPolicyResponse>("/permissions/policies", data),
    onSuccess: (newPolicy) => {
      queryClient.invalidateQueries({
        queryKey: permissionKeys.policies.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: permissionKeys.policies.list({ workspace_id: newPolicy.workspace_id }),
      });
    },
  });
}

/**
 * Update a permission policy
 */
export function useUpdatePermissionPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ToolPermissionPolicyUpdate }) =>
      api.patch<ToolPermissionPolicyResponse>(`/permissions/policies/${id}`, data),
    onSuccess: (updatedPolicy, { id }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.policies.lists() });
      queryClient.setQueryData(permissionKeys.policies.detail(id), updatedPolicy);
    },
  });
}

/**
 * Delete a permission policy
 */
export function useDeletePermissionPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/permissions/policies/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.policies.lists() });
      queryClient.removeQueries({ queryKey: permissionKeys.policies.detail(id) });
    },
  });
}

/**
 * Fetch role permissions for a workspace
 */
export function useRolePermissions(
  workspaceId: string,
  params?: Omit<ToolRolePermissionListParams, "workspace_id">
) {
  return useQuery({
    queryKey: permissionKeys.rolePermissions.list({ workspace_id: workspaceId, ...params }),
    queryFn: () =>
      api.get<ToolRolePermissionResponse[]>("/permissions/role-permissions", {
        params: { workspace_id: workspaceId, ...params },
      }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Create a new role permission
 */
export function useCreateRolePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ToolRolePermissionCreate) =>
      api.post<ToolRolePermissionResponse>("/permissions/role-permissions", data),
    onSuccess: (newRolePerm) => {
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rolePermissions.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rolePermissions.list({ workspace_id: newRolePerm.workspace_id }),
      });
    },
  });
}

/**
 * Update a role permission
 */
export function useUpdateRolePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ToolRolePermissionUpdate }) =>
      api.patch<ToolRolePermissionResponse>(`/permissions/role-permissions/${id}`, data),
    onSuccess: (updatedRolePerm, { id }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.rolePermissions.lists() });
      queryClient.setQueryData(permissionKeys.rolePermissions.detail(id), updatedRolePerm);
    },
  });
}

/**
 * Delete a role permission
 */
export function useDeleteRolePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/permissions/role-permissions/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.rolePermissions.lists() });
      queryClient.removeQueries({ queryKey: permissionKeys.rolePermissions.detail(id) });
    },
  });
}

/**
 * Fetch permission rules for a workspace
 */
export function usePermissionRules(
  workspaceId: string,
  params?: Omit<ToolPermissionRuleListParams, "workspace_id">
) {
  return useQuery({
    queryKey: permissionKeys.rules.list({ workspace_id: workspaceId, ...params }),
    queryFn: () =>
      api.get<ToolPermissionRuleResponse[]>("/permissions/rules", {
        params: { workspace_id: workspaceId, ...params },
      }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single permission rule by ID
 */
export function usePermissionRule(ruleId: string, enabled = true) {
  return useQuery({
    queryKey: permissionKeys.rules.detail(ruleId),
    queryFn: () => api.get<ToolPermissionRuleResponse>(`/permissions/rules/${ruleId}`),
    enabled: !!ruleId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Create a new permission rule
 */
export function useCreatePermissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ToolPermissionRuleCreate) =>
      api.post<ToolPermissionRuleResponse>("/permissions/rules", data),
    onSuccess: (newRule) => {
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rules.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rules.list({ workspace_id: newRule.workspace_id }),
      });
    },
  });
}

/**
 * Update a permission rule
 */
export function useUpdatePermissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ToolPermissionRuleUpdate }) =>
      api.patch<ToolPermissionRuleResponse>(`/permissions/rules/${id}`, data),
    onSuccess: (updatedRule, { id }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.rules.lists() });
      queryClient.setQueryData(permissionKeys.rules.detail(id), updatedRule);
    },
  });
}

/**
 * Delete a permission rule
 */
export function useDeletePermissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/permissions/rules/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.rules.lists() });
      queryClient.removeQueries({ queryKey: permissionKeys.rules.detail(id) });
    },
  });
}

/**
 * Fetch permission audit log for a workspace
 */
export function usePermissionAuditLog(
  workspaceId: string,
  params?: Omit<PermissionAuditLogParams, "workspace_id">
) {
  return useQuery({
    queryKey: permissionKeys.auditLog.list({ workspace_id: workspaceId, ...params }),
    queryFn: () =>
      api.get<PermissionAuditLogResponse>("/permissions/audit-log", {
        params: { workspace_id: workspaceId, ...params },
      }),
    enabled: !!workspaceId,
    staleTime: 15_000,
  });
}

/**
 * Evaluate permission for a tool call
 */
export function useEvaluatePermission() {
  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: PermissionEvaluateRequest;
    }) => api.post<PermissionEvaluateResponse>("/permissions/evaluate", data, {
      params: { workspace_id: workspaceId },
    }),
  });
}

/**
 * Get category type display info
 */
export function useCategoryTypeDisplay() {
  return {
    getCategoryLabel: (category: ToolCategoryType): string => {
      const labels: Record<ToolCategoryType, string> = {
        read: "Read",
        write: "Write",
        destructive: "Destructive",
        unknown: "Unknown",
      };
      return labels[category] || category;
    },
    getCategoryColor: (category: ToolCategoryType): string => {
      const colors: Record<ToolCategoryType, string> = {
        read: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        write: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        unknown: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
      return colors[category] || colors.unknown;
    },
    getCategoryIcon: (category: ToolCategoryType): string => {
      const icons: Record<ToolCategoryType, string> = {
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
 * Get policy type display info
 */
export function usePolicyTypeDisplay() {
  return {
    getPolicyLabel: (policyType: PolicyType): string => {
      const labels: Record<PolicyType, string> = {
        allow: "Allow",
        deny: "Deny",
        require_approval: "Require Approval",
      };
      return labels[policyType] || policyType;
    },
    getPolicyColor: (policyType: PolicyType): string => {
      const colors: Record<PolicyType, string> = {
        allow: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        deny: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        require_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      };
      return colors[policyType] || colors.allow;
    },
  };
}

/**
 * Get permission action display info
 */
export function usePermissionActionDisplay() {
  return {
    getActionLabel: (action: PermissionAction): string => {
      const labels: Record<PermissionAction, string> = {
        allow: "Allow",
        deny: "Deny",
        require_approval: "Require Approval",
      };
      return labels[action] || action;
    },
    getActionColor: (action: PermissionAction): string => {
      const colors: Record<PermissionAction, string> = {
        allow: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        deny: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        require_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      };
      return colors[action] || colors.allow;
    },
  };
}

/**
 * Get condition type display info
 */
export function useConditionTypeDisplay() {
  return {
    getConditionLabel: (conditionType: ConditionType): string => {
      const labels: Record<ConditionType, string> = {
        always: "Always",
        time_based: "Time Based",
        parameter_based: "Parameter Based",
        user_based: "User Based",
        resource_based: "Resource Based",
      };
      return labels[conditionType] || conditionType;
    },
    getConditionColor: (conditionType: ConditionType): string => {
      const colors: Record<ConditionType, string> = {
        always: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        time_based: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        parameter_based: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        user_based: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
        resource_based: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
      };
      return colors[conditionType] || colors.always;
    },
  };
}

/**
 * Get decision type display info
 */
export function useDecisionTypeDisplay() {
  return {
    getDecisionLabel: (decision: DecisionType): string => {
      const labels: Record<DecisionType, string> = {
        allowed: "Allowed",
        denied: "Denied",
        pending_approval: "Pending Approval",
        error: "Error",
      };
      return labels[decision] || decision;
    },
    getDecisionColor: (decision: DecisionType): string => {
      const colors: Record<DecisionType, string> = {
        allowed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        denied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        pending_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        error: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
      return colors[decision] || colors.error;
    },
    getDecisionIcon: (decision: DecisionType): string => {
      const icons: Record<DecisionType, string> = {
        allowed: "check-circle-2",
        denied: "x-circle",
        pending_approval: "clock",
        error: "alert-triangle",
      };
      return icons[decision] || "help-circle";
    },
  };
}

/**
 * Get role display info
 */
export function useRoleDisplay() {
  return {
    getRoleLabel: (role: RoleType): string => {
      const labels: Record<RoleType, string> = {
        owner: "Owner",
        admin: "Admin",
        member: "Member",
        viewer: "Viewer",
      };
      return labels[role] || role;
    },
    getRoleColor: (role: RoleType): string => {
      const colors: Record<RoleType, string> = {
        owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        viewer: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
      return colors[role] || colors.viewer;
    },
    getRoleHierarchy: (role: RoleType): number => {
      const hierarchy: Record<RoleType, number> = {
        owner: 4,
        admin: 3,
        member: 2,
        viewer: 1,
      };
      return hierarchy[role] || 0;
    },
  };
}