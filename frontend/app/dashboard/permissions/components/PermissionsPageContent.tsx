"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Filter, Loader2, Settings, Trash2, Edit3, Eye, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { useToolCategories, usePermissionPolicies, useRolePermissions, usePermissionRules, usePermissionAuditLog } from "@/hooks/use-permissions";
import { useWorkspaceTools, useWorkspaceServers } from "@/hooks/use-workspace-tools";
import { cn } from "@/lib/utils";
import type { ToolCategoryType, RoleType, PolicyType, PermissionAction, ConditionType, ToolWithCategory } from "@/lib/api/permissions";

export function PermissionsPageContent({ workspaceId }: { workspaceId: string }) {
  const [activeTab, setActiveTab] = useState<"policies" | "role-permissions" | "rules" | "audit" | "categories">("policies");
  const [searchQuery, setSearchQuery] = useState("");
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [serverFilter, setServerFilter] = useState<string>("all");

  // Fetch data
  const { data: categories, isLoading: categoriesLoading } = useToolCategories();
  const { data: toolsData, isLoading: toolsLoading } = useWorkspaceTools(workspaceId);
  const { data: serversData } = useWorkspaceServers(workspaceId);

  const tools = toolsData || [];
  const servers = serversData || [];

  // Get unique tools for filter dropdown
  const uniqueTools = [...new Map(tools.map(t => [t.name, t])).values()];

  // Policies tab
  const { data: policies, isLoading: policiesLoading, refetch: refetchPolicies } = usePermissionPolicies(workspaceId, {
    enabled: true,
    limit: 100,
  });

  // Role permissions tab
  const { data: rolePermissions, isLoading: rolePermsLoading, refetch: refetchRolePerms } = useRolePermissions(workspaceId, {
    limit: 200,
  });

  // Rules tab
  const { data: rules, isLoading: rulesLoading, refetch: refetchRules } = usePermissionRules(workspaceId, {
    limit: 200,
  });

  // Audit log tab
  const { data: auditLog, isLoading: auditLoading } = usePermissionAuditLog(workspaceId, {
    limit: 100,
    tool_name: searchQuery || undefined,
    server_id: serverFilter === "all" ? undefined : serverFilter,
  });

  const isLoading = categoriesLoading || toolsLoading || policiesLoading || rolePermsLoading || rulesLoading || auditLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Tabs defaultValue="policies" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="role-permissions">Role Permissions</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="policies">
            <Card><CardContent className="py-12"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></CardContent></Card>
          </TabsContent>
          <TabsContent value="role-permissions">
            <Card><CardContent className="py-12"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></CardContent></Card>
          </TabsContent>
          <TabsContent value="rules">
            <Card><CardContent className="py-12"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></CardContent></Card>
          </TabsContent>
          <TabsContent value="audit">
            <Card><CardContent className="py-12"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></CardContent></Card>
          </TabsContent>
          <TabsContent value="categories">
            <Card><CardContent className="py-12"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={toolFilter} onValueChange={setToolFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Tools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tools</SelectItem>
              {uniqueTools.map((tool) => (
                <SelectItem key={tool.name} value={tool.name}>
                  {tool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serverFilter} onValueChange={setServerFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Servers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Servers</SelectItem>
              {servers.map((server) => (
                <SelectItem key={server.id} value={server.id}>
                  {server.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="role-permissions">Role Permissions</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Policies Tab */}
        <TabsContent value="policies">
          <PolicyList
            policies={policies || []}
            categories={categories || []}
            tools={tools}
            servers={servers}
            workspaceId={workspaceId}
            onRefresh={refetchPolicies}
            searchQuery={searchQuery}
            toolFilter={toolFilter}
            serverFilter={serverFilter}
          />
        </TabsContent>

        {/* Role Permissions Tab */}
        <TabsContent value="role-permissions">
          <RolePermissionMatrix
            rolePermissions={rolePermissions || []}
            tools={tools}
            servers={servers}
            workspaceId={workspaceId}
            onRefresh={refetchRolePerms}
            searchQuery={searchQuery}
            toolFilter={toolFilter}
            serverFilter={serverFilter}
          />
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <RulesList
            rules={rules || []}
            tools={tools}
            servers={servers}
            workspaceId={workspaceId}
            onRefresh={refetchRules}
            searchQuery={searchQuery}
            toolFilter={toolFilter}
            serverFilter={serverFilter}
          />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <AuditLogList
            auditLog={auditLog}
            workspaceId={workspaceId}
            searchQuery={searchQuery}
            serverFilter={serverFilter}
          />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <CategoriesList
            categories={categories || []}
            workspaceId={workspaceId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Policy List Component
function PolicyList({
  policies,
  categories,
  tools,
  servers,
  workspaceId,
  onRefresh,
  searchQuery,
  toolFilter,
  serverFilter,
}: {
  policies: any[];
  categories: any[];
  tools: ToolWithCategory[];
  servers: any[];
  workspaceId: string;
  onRefresh: () => void;
  searchQuery: string;
  toolFilter: string;
  serverFilter: string;
}) {
  const { getPolicyLabel, getPolicyColor } = usePolicyTypeDisplay();

  // Filter policies
  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch = policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTool = toolFilter === "all" || policy.tool_pattern?.includes(toolFilter);
    const matchesServer = serverFilter === "all" || policy.server_id === serverFilter;
    return matchesSearch && matchesTool && matchesServer;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Permission Policies</CardTitle>
        <CreatePolicyDialog
          categories={categories}
          tools={tools}
          servers={servers}
          workspaceId={workspaceId}
          onSuccess={onRefresh}
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Policy
          </Button>
        </CreatePolicyDialog>
      </CardHeader>
      <CardContent>
        {filteredPolicies.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No policies found</h3>
            <p className="text-muted-foreground">
              {searchQuery || toolFilter !== "all" || serverFilter !== "all"
                ? "Try adjusting your filters"
                : "Create a policy to define default permissions for tools."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-20">Priority</TableHead>
                  <TableHead className="w-40">Tool Pattern</TableHead>
                  <TableHead className="w-36">Server</TableHead>
                  <TableHead className="w-48">Categories</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((policy) => (
                  <TableRow key={policy.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {policy.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPolicyColor(policy.policy_type)}>
                        {getPolicyLabel(policy.policy_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{policy.priority}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {policy.tool_pattern || "All tools"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {servers.find(s => s.id === policy.server_id)?.name || "All servers"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {policy.category_filter.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {policy.category_filter.length === 0 && (
                          <span className="text-xs text-muted-foreground">All</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.enabled ? "default" : "secondary"}>
                        {policy.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Role Permission Matrix Component
function RolePermissionMatrix({
  rolePermissions,
  tools,
  servers,
  workspaceId,
  onRefresh,
  searchQuery,
  toolFilter,
  serverFilter,
}: {
  rolePermissions: any[];
  tools: ToolWithCategory[];
  servers: any[];
  workspaceId: string;
  onRefresh: () => void;
  searchQuery: string;
  toolFilter: string;
  serverFilter: string;
}) {
  const { getActionLabel, getActionColor } = usePermissionActionDisplay();
  const { getRoleLabel, getRoleColor, getRoleHierarchy } = useRoleDisplay();

  // Filter role permissions
  const filteredRolePerms = rolePermissions.filter((rp) => {
    const matchesSearch = rp.tool_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTool = toolFilter === "all" || rp.tool_name === toolFilter;
    const matchesServer = serverFilter === "all" || rp.server_id === serverFilter;
    return matchesSearch && matchesTool && matchesServer;
  });

  // Group by tool_name + server_id
  const grouped = new Map<string, typeof filteredRolePerms>();
  filteredRolePerms.forEach((rp) => {
    const key = `${rp.tool_name}|${rp.server_id || "all"}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rp);
  });

  const roles: RoleType[] = ["owner", "admin", "member", "viewer"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Role Permission Matrix</CardTitle>
        <CreateRolePermissionDialog
          tools={tools}
          servers={servers}
          workspaceId={workspaceId}
          onSuccess={onRefresh}
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Role Permission
          </Button>
        </CreateRolePermissionDialog>
      </CardHeader>
      <CardContent>
        {grouped.size === 0 ? (
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No role permissions configured</h3>
            <p className="text-muted-foreground">
              Define which roles can access which tools.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Tool</TableHead>
                  <TableHead className="w-36">Server</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role} className="w-32 text-center">
                      <Badge variant="outline" className={getRoleColor(role)}>
                        {getRoleLabel(role)}
                      </Badge>
                    </TableHead>
                  ))}
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(grouped.entries()).map(([key, perms]) => {
                  const [toolName, serverId] = key.split("|");
                  const tool = tools.find(t => t.name === toolName);
                  const server = servers.find(s => s.id === serverId);

                  return (
                    <TableRow key={key} className="hover:bg-muted/50">
                      <TableCell className="font-medium truncate max-w-[180px]">{toolName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {server?.name || "All servers"}
                      </TableCell>
                      {roles.map((role) => {
                        const perm = perms.find(p => p.role === role);
                        return (
                          <TableCell key={role} className="text-center">
                            {perm ? (
                              <Badge className={getActionColor(perm.permission)}>
                                {getActionLabel(perm.permission)}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Inherit
                              </Badge>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Rules List Component
function RulesList({
  rules,
  tools,
  servers,
  workspaceId,
  onRefresh,
  searchQuery,
  toolFilter,
  serverFilter,
}: {
  rules: any[];
  tools: ToolWithCategory[];
  servers: any[];
  workspaceId: string;
  onRefresh: () => void;
  searchQuery: string;
  toolFilter: string;
  serverFilter: string;
}) {
  const { getConditionLabel, getConditionColor } = useConditionTypeDisplay();
  const { getActionLabel, getActionColor } = usePermissionActionDisplay();

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTool = toolFilter === "all" || rule.tool_name === toolFilter;
    const matchesServer = serverFilter === "all" || rule.server_id === serverFilter;
    return matchesSearch && matchesTool && matchesServer;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Permission Rules</CardTitle>
        <CreateRuleDialog
          tools={tools}
          servers={servers}
          workspaceId={workspaceId}
          onSuccess={onRefresh}
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </CreateRuleDialog>
      </CardHeader>
      <CardContent>
        {filteredRules.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No rules configured</h3>
            <p className="text-muted-foreground">
              Create conditional rules for fine-grained permission control.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-36">Tool</TableHead>
                  <TableHead className="w-32">Server</TableHead>
                  <TableHead className="w-36">Condition</TableHead>
                  <TableHead className="w-28">Action</TableHead>
                  <TableHead className="w-20">Priority</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {rule.description || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{rule.tool_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {servers.find(s => s.id === rule.server_id)?.name || "All servers"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getConditionColor(rule.condition_type)}>
                        {getConditionLabel(rule.condition_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(rule.action)}>
                        {getActionLabel(rule.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{rule.priority}</TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Audit Log List Component
function AuditLogList({
  auditLog,
  workspaceId,
  searchQuery,
  serverFilter,
}: {
  auditLog: any;
  workspaceId: string;
  searchQuery: string;
  serverFilter: string;
}) {
  const { getDecisionLabel, getDecisionColor, getDecisionIcon } = useDecisionTypeDisplay();

  const entries = auditLog?.decisions || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No audit log entries</h3>
            <p className="text-muted-foreground">
              {searchQuery || serverFilter !== "all"
                ? "Try adjusting your filters"
                : "Permission decisions will appear here when tools are evaluated."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead className="w-36">User</TableHead>
                  <TableHead className="w-20">Role</TableHead>
                  <TableHead className="w-40">Tool</TableHead>
                  <TableHead className="w-32">Server</TableHead>
                  <TableHead className="w-36">Decision</TableHead>
                  <TableHead>Matched By</TableHead>
                  <TableHead className="w-24">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry: any) => (
                  <TableRow key={entry.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.user_email || entry.user_id}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary">{entry.user_role}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{entry.tool_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {entry.server_id || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("gap-1", getDecisionColor(entry.decision))}>
                        {getDecisionIcon(entry.decision) && (
                          <span className="capitalize">{getDecisionIcon(entry.decision)}</span>
                        )}
                        {getDecisionLabel(entry.decision)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.matched_policy_id && `Policy: ${entry.matched_policy_id.slice(0, 8)}`}
                      {entry.matched_rule_id && `Rule: ${entry.matched_rule_id.slice(0, 8)}`}
                      {entry.matched_role_permission_id && `RolePerm: ${entry.matched_role_permission_id.slice(0, 8)}`}
                      {!entry.matched_policy_id && !entry.matched_rule_id && !entry.matched_role_permission_id && "Default"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {entry.evaluation_duration_ms}ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Categories List Component
function CategoriesList({
  categories,
  workspaceId,
}: {
  categories: any[];
  workspaceId: string;
}) {
  const { getCategoryLabel, getCategoryColor } = useCategoryTypeDisplay();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tool Categories</CardTitle>
        <CreateCategoryDialog workspaceId={workspaceId}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Button>
        </CreateCategoryDialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No categories defined</h3>
            <p className="text-muted-foreground">
              Create categories to organize tools with default permissions.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{category.display_name || category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <Badge className={cn("gap-1", getCategoryColor(category.default_category))}>
                      {getCategoryLabel(category.default_category)}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Default Approval</span>
                      <span className="font-medium">
                        {category.default_requires_approval ? "Required" : "Not Required"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allowed Roles</span>
                      <span className="font-medium">
                        {category.default_allowed_roles.length > 0
                          ? category.default_allowed_roles.join(", ")
                          : "None (inherit)"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">
                        {new Date(category.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Edit3 className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Dialog Components
function CreatePolicyDialog({
  children,
  categories,
  tools,
  servers,
  workspaceId,
  onSuccess,
}: {
  children: React.ReactNode;
  categories: any[];
  tools: ToolWithCategory[];
  servers: any[];
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    policy_type: "allow" as PolicyType,
    priority: 100,
    tool_pattern: "",
    server_id: "",
    category_filter: [] as string[],
    enabled: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/permissions/policies", {
      ...formData,
      workspace_id: workspaceId,
    });
    setOpen(false);
    onSuccess();
  };

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Permission Policy</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Allow Read Tools"
                  />
                </div>
                <div>
                  <Label htmlFor="policy_type">Policy Type *</Label>
                  <Select
                    value={formData.policy_type}
                    onValueChange={(value: PolicyType) => setFormData({ ...formData, policy_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Allow</SelectItem>
                      <SelectItem value="deny">Deny</SelectItem>
                      <SelectItem value="require_approval">Require Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Input
                    id="priority"
                    type="number"
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="tool_pattern">Tool Pattern</Label>
                  <Input
                    id="tool_pattern"
                    value={formData.tool_pattern}
                    onChange={(e) => setFormData({ ...formData, tool_pattern: e.target.value })}
                    placeholder="e.g., read_* or *"
                  />
                </div>
                <div>
                  <Label htmlFor="server_id">Server (optional)</Label>
                  <Select
                    value={formData.server_id}
                    onValueChange={(value: string) => setFormData({ ...formData, server_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All servers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All servers</SelectItem>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Category Filter</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.category_filter.includes(cat.name)}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            category_filter: checked
                              ? [...formData.category_filter, cat.name]
                              : formData.category_filter.filter((c) => c !== cat.name),
                          })
                        }
                      />
                      <span className="text-sm">{cat.display_name || cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Policy</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateRolePermissionDialog({
  children,
  tools,
  servers,
  workspaceId,
  onSuccess,
}: {
  children: React.ReactNode;
  tools: ToolWithCategory[];
  servers: any[];
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    tool_name: "",
    server_id: "",
    role: "member" as RoleType,
    permission: "allow" as PermissionAction,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/permissions/role-permissions", {
      ...formData,
      workspace_id: workspaceId,
    });
    setOpen(false);
    onSuccess();
  };

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role Permission</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tool_name">Tool *</Label>
                  <Select
                    value={formData.tool_name}
                    onValueChange={(value: string) => setFormData({ ...formData, tool_name: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tool" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Set(tools.map(t => t.name))].map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="server_id">Server (optional)</Label>
                  <Select
                    value={formData.server_id}
                    onValueChange={(value: string) => setFormData({ ...formData, server_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All servers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All servers</SelectItem>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: RoleType) => setFormData({ ...formData, role: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="permission">Permission *</Label>
                  <Select
                    value={formData.permission}
                    onValueChange={(value: PermissionAction) => setFormData({ ...formData, permission: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select permission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Allow</SelectItem>
                      <SelectItem value="deny">Deny</SelectItem>
                      <SelectItem value="require_approval">Require Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Permission</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateRuleDialog({
  children,
  tools,
  servers,
  workspaceId,
  onSuccess,
}: {
  children: React.ReactNode;
  tools: ToolWithCategory[];
  servers: any[];
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tool_name: "",
    server_id: "",
    condition_type: "always" as ConditionType,
    condition_config: {},
    action: "allow" as PermissionAction,
    priority: 100,
    enabled: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/permissions/rules", {
      ...formData,
      workspace_id: workspaceId,
    });
    setOpen(false);
    onSuccess();
  };

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Permission Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Business Hours Only"
                  />
                </div>
                <div>
                  <Label htmlFor="tool_name">Tool *</Label>
                  <Select
                    value={formData.tool_name}
                    onValueChange={(value: string) => setFormData({ ...formData, tool_name: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tool" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Set(tools.map(t => t.name))].map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="server_id">Server (optional)</Label>
                  <Select
                    value={formData.server_id}
                    onValueChange={(value: string) => setFormData({ ...formData, server_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All servers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All servers</SelectItem>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="condition_type">Condition Type *</Label>
                  <Select
                    value={formData.condition_type}
                    onValueChange={(value: ConditionType) => setFormData({ ...formData, condition_type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Always</SelectItem>
                      <SelectItem value="time_based">Time Based</SelectItem>
                      <SelectItem value="parameter_based">Parameter Based</SelectItem>
                      <SelectItem value="user_based">User Based</SelectItem>
                      <SelectItem value="resource_based">Resource Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="action">Action *</Label>
                  <Select
                    value={formData.action}
                    onValueChange={(value: PermissionAction) => setFormData({ ...formData, action: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Allow</SelectItem>
                      <SelectItem value="deny">Deny</SelectItem>
                      <SelectItem value="require_approval">Require Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Input
                    id="priority"
                    type="number"
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateCategoryDialog({
  children,
  workspaceId,
}: {
  children: React.ReactNode;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    default_category: "read" as ToolCategoryType,
    default_requires_approval: false,
    default_allowed_roles: [] as RoleType[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/permissions/categories", {
      ...formData,
      workspace_id: workspaceId,
    });
    setOpen(false);
  };

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tool Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., read_tools"
                  />
                </div>
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    required
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="e.g., Read Tools"
                  />
                </div>
                <div>
                  <Label htmlFor="default_category">Default Category *</Label>
                  <Select
                    value={formData.default_category}
                    onValueChange={(value: ToolCategoryType) => setFormData({ ...formData, default_category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="write">Write</SelectItem>
                      <SelectItem value="destructive">Destructive</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <Label>Default Allowed Roles</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["owner", "admin", "member", "viewer"].map((role) => (
                    <label key={role} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.default_allowed_roles.includes(role as RoleType)}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            default_allowed_roles: checked
                              ? [...formData.default_allowed_roles, role as RoleType]
                              : formData.default_allowed_roles.filter((r) => r !== role),
                          })
                        }
                      />
                      <span className="text-sm capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="default_requires_approval"
                  checked={formData.default_requires_approval}
                  onCheckedChange={(checked) => setFormData({ ...formData, default_requires_approval: checked })}
                />
                <Label htmlFor="default_requires_approval">Require Approval by Default</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Category</Button>
            </DialogFooter          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Import display hooks
import { usePolicyTypeDisplay } from "@/hooks/use-permissions";
import { usePermissionActionDisplay } from "@/hooks/use-permissions";
import { useConditionTypeDisplay } from "@/hooks/use-permissions";
import { useDecisionTypeDisplay } from "@/hooks/use-permissions";
import { useRoleDisplay } from "@/hooks/use-permissions";
import { useCategoryTypeDisplay } from "@/hooks/use-permissions";