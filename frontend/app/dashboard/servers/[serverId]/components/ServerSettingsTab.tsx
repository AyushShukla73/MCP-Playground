"use client";

import { useState } from "react";
import { useServer, useUpdateServer, useTestConnection } from "@/hooks/use-servers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Copy, Save, RefreshCw, Trash2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerResponse, MCPTransportType, MCPServerUpdate, MCPServerStatus, ConnectionTestRequest, ConnectionTestResponse } from "@/lib/api/servers";
import { toast } from "sonner";

interface ServerSettingsTabProps {
  serverId: string;
}

interface EditServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: MCPServerResponse;
  onSave: (data: MCPServerUpdate) => void;
  isSaving: boolean;
}

function EditServerDialog({ open, onOpenChange, server, onSave, isSaving }: EditServerDialogProps) {
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || "");
  const [transportType, setTransportType] = useState<MCPTransportType>(server.transport_type);
  const [config, setConfig] = useState<string>(
    server.config ? JSON.stringify(server.config, null, 2) : "{}"
  );

  const handleSubmit = () => {
    let parsedConfig: Record<string, unknown>;
    try {
      parsedConfig = JSON.parse(config);
    } catch {
      toast.error("Invalid JSON in configuration");
      return;
    }

    onSave({
      name,
      description,
      config: parsedConfig,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Server: {server.name}</DialogTitle>
          <DialogDescription>
            Update server configuration. Changes to transport type or config may require reconnection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Server Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter server name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of the server"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transport">Transport Type</Label>
            <Select value={transportType} onValueChange={(v) => setTransportType(v as MCPTransportType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select transport type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">STDIO</SelectItem>
                <SelectItem value="streamable_http">Streamable HTTP</SelectItem>
                <SelectItem value="sse">SSE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="config">Configuration (JSON)</Label>
              <Button variant="ghost" size="sm" onClick={() => setConfig(JSON.stringify(server.config, null, 2))}>
                <Copy className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
            <Textarea
              id="config"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              placeholder='{"command": "/path/to/mcp-server", "args": ["--flag"]}'
              rows={8}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ServerSettingsTab({ serverId }: ServerSettingsTabProps) {
  const { data: server, isLoading } = useServer(serverId);
  const updateServerMutation = useUpdateServer();
  const testConnectionMutation = useTestConnection();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResponse | null>(null);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleSaveSettings = (data: MCPServerUpdate) => {
    updateServerMutation.mutate(
      { id: serverId, data },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          toast.success("Server settings updated");
        },
        onError: (error) => {
          toast.error(`Failed to update settings: ${error instanceof Error ? error.message : "Unknown error"}`);
        },
      }
    );
  };

  const handleTestConnection = async () => {
    if (!server) return;

    try {
      const result = await testConnectionMutation.mutateAsync({
        serverId,
        data: { timeout_seconds: 10 },
      });
      setConnectionTestResult(result);
      if (result.success) {
        toast.success("Connection test successful");
      } else {
        toast.error(`Connection test failed: ${result.error_message || "Unknown error"}`);
      }
    } catch (error) {
      setConnectionTestResult(null);
      toast.error(`Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDeleteServer = () => {
    // Placeholder for delete functionality
    toast.info("Delete server functionality not yet implemented");
  };

  const getStatusColor = (status: MCPServerStatus) => {
    switch (status) {
      case "connected":
        return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      case "connecting":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "disconnected":
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400";
      case "error":
        return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getTransportLabel = (transport: MCPTransportType) => {
    const labels: Record<MCPTransportType, string> = {
      stdio: "STDIO",
      streamable_http: "Streamable HTTP",
      sse: "SSE",
    };
    return labels[transport] || transport;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="h-6 animate-pulse bg-muted rounded w-1/2 mb-4" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 animate-pulse bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!server) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground">Server not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Server Configuration
          </CardTitle>
          <CardDescription>Manage server settings and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground block">Server Name</label>
              <p className="text-lg font-semibold">{server.name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground block">Status</label>
              <div>
                <Badge className={getStatusColor(server.status)}>
                  {server.status === "connecting" ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Connecting
                    </>
                  ) : (
                    server.status
                  )}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-muted-foreground block">Description</label>
              <p className={cn("font-medium", !server.description && "text-muted-foreground/60")}>
                {server.description || "No description provided"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground block">Transport Type</label>
              <Badge variant="outline">{getTransportLabel(server.transport_type)}</Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground block">Workspace ID</label>
              <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                {server.workspace_id}
              </code>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-muted-foreground block">Configuration</label>
              <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">
                {JSON.stringify(server.config, null, 2)}
              </pre>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Save className="h-4 w-4 mr-2" />
                Edit Server
              </Button>

              <Button variant="outline" onClick={handleTestConnection}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Connection
              </Button>

              <Button variant="outline" onClick={() => {}}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Capabilities
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {connectionTestResult && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-3 rounded-lg">
              <pre className="font-mono text-sm whitespace-pre-wrap">
                {JSON.stringify(connectionTestResult, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Last Connected</CardTitle>
        </CardHeader>
        <CardContent>
          {server.last_connected_at ? (
            <p className="text-muted-foreground">
              {new Date(server.last_connected_at).toLocaleString()}
            </p>
          ) : (
            <p className="text-muted-foreground">Never connected</p>
          )}
        </CardContent>
      </Card>

      <EditServerDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        server={server}
        onSave={handleSaveSettings}
        isSaving={updateServerMutation.isPending}
      />
    </div>
  );
}