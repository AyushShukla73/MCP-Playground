"use client";

import { useState } from "react";
import { useWorkspaceSettings, useWorkspaceToolPermissions, useUpdateToolPermission } from "@/hooks/use-workspaces";
import { useRoleDisplay } from "@/hooks/use-workspaces";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label" ;
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Shield, Lock, Eye, Edit3, Trash2, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { WorkspaceRole, ToolPermissionConfig } from "@/lib/api/workspaces";

interface WorkspaceSettingsTabProps {
  workspaceId: string;
}

const PERMISSION_CATEGORIES = [
  { value: "read", label: "Read", icon: Eye, description: "View and read access", color: "text-blue-500" },
  { value: "write", label: "Write", icon: Edit3, description: "Create and modify access", color: "text-green-500" },
  { value: "destructive", label: "Destructive", icon: Trash2, description: "Delete and destructive actions", color: "text-red-500" },
];

const ROLE_OPTIONS: { value: WorkspaceRole; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "owner", label: "Owner", icon: Shield },
  { value: "admin", label: "Admin", icon: Shield },
  { value: "member", label: "Member", icon: Edit3 },
  { value: "viewer", label: "Viewer", icon: Eye },
];

const SUB_TABS = [
  { value: "general", label: "General", icon: Shield },
  { value: "permissions", label: "Tool Permissions", icon: Lock },
] as const;

type SubTabValue = typeof SUB_TABS[number]["value"];

export function WorkspaceSettingsTab({ workspaceId }: WorkspaceSettingsTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [localPermissions, setLocalPermissions] = useState<Record<string, Partial<ToolPermissionConfig>>>({});
  const [activeSubTab, setActiveSubTab] = useState<SubTabValue>("general");

  const { data: settings, isLoading: settingsLoading } = useWorkspaceSettings(workspaceId);
  const { data: permissions, isLoading: permissionsLoading, refetch } = useWorkspaceToolPermissions(workspaceId);
  const updatePermission = useUpdateToolPermission();
  const { getRoleLabel, getRoleColor } = useRoleDisplay();
  const { toast } = useToast();

  const isLoading = settingsLoading || permissionsLoading;

  // Initialize local state from fetched permissions
  if (permissions && Object.keys(localPermissions).length === 0) {
    const initial: Record<string, Partial<ToolPermissionConfig>> = {};
    permissions.forEach((p) => {
      initial[p.tool_name] = {
        enabled: p.enabled,
        requires_approval: p.requires_approval,
        allowed_roles: p.allowed_roles,
      };
    });
    setLocalPermissions(initial);
  }

  const handlePermissionChange = (toolName: string, field: keyof ToolPermissionConfig, value: unknown) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        [field]: value,
      },
    }));
  };

  const handleRoleToggle = (toolName: string, role: WorkspaceRole) => {
    const currentRoles = localPermissions[toolName]?.allowed_roles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    handlePermissionChange(toolName, "allowed_roles", newRoles);
  };

  const handleSave = async (toolName: string) => {
    const changes = localPermissions[toolName];
    if (!changes) return;

    setIsSaving(true);
    try {
      await updatePermission.mutateAsync({
        workspaceId,
        toolName,
        data: changes,
      });
      toast({
        title: "Permission updated",
        description: `${toolName} permissions have been saved.`,
      });
      // Refetch to sync with server
      await refetch();
    } catch (error) {
      toast({
        title: "Failed to update",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = (toolName: string) => {
    const local = localPermissions[toolName];
    const original = permissions?.find((p) => p.tool_name === toolName);
    if (!local || !original) return false;
    return (
      local.enabled !== original.enabled ||
      local.requires_approval !== original.requires_approval ||
      JSON.stringify(local.allowed_roles?.sort()) !== JSON.stringify(original.allowed_roles?.sort())
    );
  };

  const renderSubTabTrigger = (subTab: typeof SUB_TABS[number], isActive: boolean) => (
    <Button
      type="button"
      variant={isActive ? "default" : "ghost"}
      size="sm"
      className="w-full justify-start gap-2"
      onClick={() => setActiveSubTab(subTab.value)}
    >
      <subTab.icon className="h-4 w-4" />
      {subTab.label}
    </Button>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Settings</h2>
        <Button disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
        </Button>
      </div>
      <div className="flex gap-2 border-b pb-2">
        {SUB_TABS.map((subTab) => (
          <Button key={subTab.value} type="button" variant="ghost" size="sm" className="w-full justify-start gap-2" disabled>
            <subTab.icon className="h-4 w-4" />
            {subTab.label}
          </Button>
        ))}
      </div>
      <div className="space-y-4 mt-4">
        {activeSubTab === "general" ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-muted rounded" />
            ))}
          </>
        ) : (
          <>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-muted rounded" />
            ))}
          </>
        )}
      </div>
    </div>
  );

  const renderGeneralContent = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Information</CardTitle>
          <CardDescription>Basic settings for this workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                defaultValue={settings?.workspace_id || ""}
                disabled
              />
              <p className="text-sm text-muted-foreground">Workspace ID cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                value={settings?.workspace_id || "Current User"}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5">
            <div>
              <p className="font-medium text-destructive">Delete Workspace</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this workspace and all its data. This action cannot be undone.
              </p>
            </div>
            <Button variant="destructive" disabled>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Workspace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPermissionsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tool Permissions</h3>
          <p className="text-muted-foreground">
            Configure which tools are available to each role. Changes require explicit save.
          </p>
        </div>
      </div>

      {(permissions || []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tools configured</h3>
            <p className="text-muted-foreground">
              Tool permissions will appear here once tools are registered with the workspace
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(permissions || []).map((permission) => {
            const local = localPermissions[permission.tool_name] || {};
            const isEnabled = local.enabled ?? permission.enabled;
            const requiresApproval = local.requires_approval ?? permission.requires_approval;
            const allowedRoles = local.allowed_roles ?? permission.allowed_roles;
            const toolHasChanges = hasChanges(permission.tool_name);
            const isSavingTool = isSaving && updatePermission.variables?.toolName === permission.tool_name;

            return (
              <Card key={permission.tool_name} className={cn(toolHasChanges && "ring-2 ring-primary")}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{permission.tool_name}</h4>
                          <Badge
                            variant={isEnabled ? "default" : "outline"}
                            className={cn(isEnabled && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300")}
                          >
                            {isEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                          {requiresApproval && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Requires Approval
                            </Badge>
                          )}
                          {toolHasChanges && (
                            <Badge variant="outline" className="bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                              <Save className="mr-1 h-3 w-3" />
                              Unsaved Changes
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Category:{" "}
                          <span className="capitalize">{permission.permission_category}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant={toolHasChanges ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSave(permission.tool_name)}
                        disabled={!toolHasChanges || isSaving}
                      >
                        {isSavingTool ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Enabled Toggle */}
                    <div className="space-y-2">
                      <Label>Enabled</Label>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(permission.tool_name, "enabled", checked)
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {isEnabled ? "Tool is available" : "Tool is disabled for all roles"}
                        </span>
                      </div>
                    </div>

                    {/* Requires Approval Toggle */}
                    <div className="space-y-2">
                      <Label>Requires Approval</Label>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={requiresApproval}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(permission.tool_name, "requires_approval", checked)
                          }
                          disabled={!isEnabled}
                        />
                        <span className="text-sm text-muted-foreground">
                          {requiresApproval ? "Actions need approval" : "Actions execute directly"}
                        </span>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="space-y-2">
                      <Label>Permission Category</Label>
                      <Badge variant="outline" className={cn(
                        permission.permission_category === "destructive" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                        permission.permission_category === "write" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                        permission.permission_category === "read" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      )}>
                        {permission.permission_category.charAt(0).toUpperCase() + permission.permission_category.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Allowed Roles */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="mb-0">Allowed Roles</Label>
                      <p className="text-sm text-muted-foreground">
                        Select which roles can use this tool
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((roleOption) => {
                        const isAllowed = allowedRoles.includes(roleOption.value);
                        const RoleIcon = roleOption.icon;
                        return (
                          <Button
                            key={roleOption.value}
                            type="button"
                            variant={isAllowed ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleRoleToggle(permission.tool_name, roleOption.value)}
                            disabled={!isEnabled}
                            className={cn(
                              isAllowed && getRoleColor(roleOption.value).replace("bg-", "bg-").replace("text-", "border-")
                            )}
                          >
                            <RoleIcon className="mr-1.5 h-3.5 w-3.5" />
                            {roleOption.label}
                          </Button>
                        );
                      })}
                    </div>
                    {allowedRoles.length === 0 && isEnabled && (
                      <p className="text-sm text-destructive">
                        <AlertTriangle className="mr-1 h-3.5 w-3.5 inline" />
                        No roles selected - tool is effectively disabled
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return renderLoadingSkeleton();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-muted-foreground">Manage workspace configuration and permissions</p>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b pb-2">
        {SUB_TABS.map((subTab) => (
          <Button
            key={subTab.value}
            type="button"
            variant={activeSubTab === subTab.value ? "default" : "ghost"}
            size="sm"
            className="w-full sm:w-auto justify-start gap-2"
            onClick={() => setActiveSubTab(subTab.value)}
          >
            <subTab.icon className="h-4 w-4" />
            {subTab.label}
          </Button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="mt-4">
        {activeSubTab === "general" ? renderGeneralContent() : renderPermissionsContent()}
      </div>
    </div>
  );
}