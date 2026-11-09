"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { Server, Eye, Edit3, AlertTriangle, HelpCircle, Settings, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ToolWithCategory, ToolCategoryType } from "@/lib/api/permissions";
import { useToolCategoryDisplay, useServerStatusDisplay } from "@/hooks/use-workspace-tools";
import { cn } from "@/lib/utils";

export default function ToolDetailPage() {
  const params = useParams();
  const toolId = params.toolId as string;
  const { getCategoryLabel, getCategoryColor, getCategoryIcon } = useToolCategoryDisplay();
  const { getStatusLabel, getStatusColor, getStatusIcon } = useServerStatusDisplay();

  const { data: tool, isLoading, error } = useQuery({
    queryKey: ["tool", "detail", toolId],
    queryFn: async () => {
      // Since we don't have a direct tool endpoint, we need to fetch from workspace tools
      const serversResponse = await api.get<{ servers: { id: string; name: string; status: string }[] }>(
        "/servers",
        { params: { workspace_id: "default" } }
      );

      for (const server of serversResponse.servers) {
        try {
          const tools = await api.get<any[]>(`/servers/${server.id}/tools`);
          const found = tools.find((t) => t.id === toolId || t.name === toolId);
          if (found) {
            return {
              ...found,
              server_id: server.id,
              server_name: server.name,
              server_status: server.status,
            };
          }
        } catch {
          // Continue to next server
        }
      }
      return null;
    },
    enabled: !!toolId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading..." description="Fetching tool details" />
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tool Not Found" description="The requested tool could not be found" />
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-destructive">Tool not found</p>
            <p className="text-muted-foreground mt-2">
              The tool with ID "{toolId}" does not exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const category = tool.permission_category || tool.category?.default_category;
  const statusIcon = getStatusIcon(tool.server_status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tool.name}
        description={tool.description || "No description available"}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Server Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Server Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Server Name</label>
                  <p className="font-medium">{tool.server_name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Server Status</label>
                  <Badge className={cn("gap-1 mt-1", getStatusColor(tool.server_status))}>
                    <span className="capitalize">{getStatusIcon(tool.server_status)}</span>
                    {getStatusLabel(tool.server_status)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Tool ID</label>
                  <p className="font-mono text-sm">{tool.id}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Discovered</label>
                  <p className="font-medium">
                    {tool.discovered_at
                      ? new Date(tool.discovered_at).toLocaleString()
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Category & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={cn("gap-2 text-sm px-3 py-2", getCategoryColor(category))}>
                  <span>{getCategoryIcon(category)}</span>
                  {getCategoryLabel(category)}
                </Badge>
                {tool.requires_approval && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Requires Approval
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Enabled</label>
                  <p className="font-medium">
                    <Badge
                      className={
                        tool.is_enabled
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }
                    >
                      {tool.is_enabled ? "Yes" : "No"}
                    </Badge>
                  </p>
                </div>
                {tool.allowed_roles && tool.allowed_roles.length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground">Allowed Roles</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tool.allowed_roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parameters Schema */}
          {tool.input_schema && (
            <Card>
              <CardHeader>
                <CardTitle>Input Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(tool.input_schema, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Audit Log Tab */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>
            <TabsContent value="audit">
              <Card>
                <CardContent className="pt-4">
                  <AuditLogSection toolName={tool.name} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Settings className="h-4 w-4" />
                Configure Permissions
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <ExternalLink className="h-4 w-4" />
                View on Server
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" disabled>
                <Eye className="h-4 w-4" />
                Test Execution
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Executions</span>
                <span className="font-mono">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-mono">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Duration</span>
                <span className="font-mono">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Executed</span>
                <span className="font-mono">Never</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AuditLogSection({ toolName }: { toolName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["permissions", "audit-log", { tool_name: toolName }],
    queryFn: () =>
      api.get<any>("/permissions/audit-log", {
        params: { workspace_id: "default", tool_name: toolName, limit: 50 },
      }),
    staleTime: 15_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const entries = data?.entries || [];

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <HelpCircle className="mx-auto h-8 w-8 mb-2" />
        <p>No audit log entries for this tool</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {entries.map((entry: any) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{entry.user_email || entry.user_id}</p>
            <p className="text-xs text-muted-foreground truncate">
              {entry.tool_name} — {entry.decision}
            </p>
          </div>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              entry.decision === "allowed"
                ? "bg-green-100 text-green-800"
                : entry.decision === "denied"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {entry.decision}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(entry.timestamp).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}