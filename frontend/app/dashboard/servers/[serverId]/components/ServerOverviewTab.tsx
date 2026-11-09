"use client";

import { useServer, useServerHealth, useRefreshDiscovery } from "@/hooks/use-servers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wifi, WifiOff, AlertTriangle, Loader2, Server, Globe, Zap, Terminal, RefreshCw, CheckCircle, XCircle, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerResponse, MCPServerStatus, MCPTransportType, HealthCheckResponse } from "@/lib/api/servers";
import { toast } from "sonner";

interface ServerOverviewTabProps {
  server: MCPServerResponse;
}

const transportIcons: Record<MCPTransportType, React.ComponentType<{ className?: string }>> = {
  stdio: Terminal,
  streamable_http: Globe,
  sse: Zap,
};

const transportLabels: Record<MCPTransportType, string> = {
  stdio: "STDIO",
  streamable_http: "Streamable HTTP",
  sse: "SSE",
};

function StatusIcon({ status }: { status: MCPServerStatus }) {
  const icons = {
    connected: CheckCircle,
    connecting: Loader2,
    disconnected: XCircle,
    error: AlertCircle,
  };
  const Icon = icons[status] || HelpCircle;
  return <Icon className="h-4 w-4" />;
}

function StatusBadge({ status }: { status: MCPServerStatus }) {
  const colors = {
    connected: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    connecting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    disconnected: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels = {
    connected: "Connected",
    connecting: "Connecting",
    disconnected: "Disconnected",
    error: "Error",
  };

  return (
    <Badge className={cn("gap-1", colors[status])}>
      <StatusIcon status={status} />
      {labels[status]}
    </Badge>
  );
}

function HealthIndicator({ health, label }: { health: HealthCheckResponse; label: string }) {
  const isHealthy = health.healthy;
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", isHealthy ? "bg-green-500" : "bg-red-500")} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">
        {isHealthy ? "Healthy" : "Unhealthy"}
      </span>
    </div>
  );
}

export function ServerOverviewTab({ server }: ServerOverviewTabProps) {
  const { data: serverData, isLoading, refetch } = useServer(server.id);
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useServerHealth(server.id);
  const refreshDiscovery = useRefreshDiscovery();

  const currentServer = serverData || server;

  const handleRefreshDiscovery = async () => {
    try {
      await refreshDiscovery.mutateAsync(server.id);
      toast.success("Capabilities refreshed successfully");
      refetch();
      refetchHealth();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh capabilities");
    }
  };

  const handleTestConnection = async () => {
    // Connection test is handled in the detail page
    toast.info("Use the test connection button in the server list or settings");
  };

  if (isLoading && !serverData) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <transportIcons[currentServer.transport_type] className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">{currentServer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {transportLabels[currentServer.transport_type]} Transport
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={currentServer.status} />
              <Button variant="outline" size="sm" onClick={() => { refetch(); refetchHealth(); }}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="text-2xl font-bold capitalize">{currentServer.status}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Transport</p>
              <p className="text-2xl font-bold">{transportLabels[currentServer.transport_type]}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Last Connected</p>
              <p className="text-2xl font-bold">
                {currentServer.last_connected_at
                  ? new Date(currentServer.last_connected_at).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p className="text-2xl font-bold">
                {new Date(currentServer.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Checks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Health Checks
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refetchHealth} disabled={healthLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", healthLoading && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : healthData ? (
            <div className="space-y-2">
              <HealthIndicator health={healthData.connection} label="Connection" />
              <HealthIndicator health={healthData.initialization} label="Initialization" />
              <HealthIndicator health={healthData.capabilities} label="Capabilities" />
              <HealthIndicator health={healthData.ping} label="Ping" />
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No health data available. Run a health check to see status.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Server Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Server ID</label>
              <code className="font-mono text-sm bg-muted px-2 py-1 rounded break-all">
                {currentServer.id}
              </code>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Workspace ID</label>
              <code className="font-mono text-sm bg-muted px-2 py-1 rounded break-all">
                {currentServer.workspace_id}
              </code>
            </div>
            {currentServer.config && (
              <div className="sm:col-span-2">
                <label className="text-sm text-muted-foreground block mb-1">Configuration</label>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto max-h-64">
                  {JSON.stringify(currentServer.config, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capabilities Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Discovered Capabilities
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshDiscovery}
            disabled={refreshDiscovery.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshDiscovery.isPending && "animate-spin")} />
            Refresh Discovery
          </Button>
        </CardHeader>
        <CardContent>
          {currentServer.tools_count !== undefined || currentServer.resources_count !== undefined || currentServer.prompts_count !== undefined ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-3xl font-bold text-primary">{currentServer.tools_count || 0}</p>
                <p className="text-sm text-muted-foreground">Tools</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-3xl font-bold text-blue-600">{currentServer.resources_count || 0}</p>
                <p className="text-sm text-muted-foreground">Resources</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-3xl font-bold text-purple-600">{currentServer.prompts_count || 0}</p>
                <p className="text-sm text-muted-foreground">Prompts</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h4 className="font-medium mb-1">No capabilities discovered</h4>
              <p className="text-muted-foreground mb-4">
                Click "Refresh Discovery" to fetch available tools, resources, and prompts from the server.
              </p>
              <Button onClick={handleRefreshDiscovery} disabled={refreshDiscovery.isPending}>
                <RefreshCw className={cn("h-4 w-4 mr-1", refreshDiscovery.isPending && "animate-spin")} />
                Refresh Discovery
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleTestConnection}>
            <Wifi className="h-4 w-4 mr-1" />
            Test Connection
          </Button>
          <Button variant="outline" onClick={handleRefreshDiscovery} disabled={refreshDiscovery.isPending}>
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshDiscovery.isPending && "animate-spin")} />
            Refresh Capabilities
          </Button>
          <Button variant="outline">
            <Terminal className="h-4 w-4 mr-1" />
            View Logs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}