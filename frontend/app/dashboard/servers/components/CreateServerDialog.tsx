"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Server, Globe, Zap, Terminal, Loader2, TestTube2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateServer, useTestConnection } from "@/hooks/use-servers";
import { toast } from "sonner";
import type { MCPTransportType } from "@/lib/api/servers";

const stdioSchema = z.object({
  command: z.string().min(1, "Command is required"),
  args: z.string().optional(),
  env: z.string().optional(),
  cwd: z.string().optional(),
});

const httpSchema = z.object({
  url: z.string().url("Valid URL is required"),
  headers: z.string().optional(),
  timeout: z.coerce.number().min(1).max(300).optional(),
});

const baseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  transport_type: z.enum(["stdio", "streamable_http", "sse"]),
});

const createServerSchema = baseSchema.refine(
  (data) => {
    if (data.transport_type === "stdio") {
      return true; // Additional validation in transport config
    }
    if (data.transport_type === "streamable_http" || data.transport_type === "sse") {
      return true;
    }
    return false;
  },
  { message: "Invalid transport type" }
);

type CreateServerForm = z.infer<typeof createServerSchema> & {
  transportConfig?: Record<string, unknown>;
};

const transportIcons: Record<MCPTransportType, React.ComponentType<{ className?: string }>> = {
  stdio: Terminal,
  streamable_http: Globe,
  sse: Zap,
};

const transportDescriptions: Record<MCPTransportType, string> = {
  stdio: "Run a local process via standard input/output",
  streamable_http: "Connect via HTTP with streamable responses",
  sse: "Connect via Server-Sent Events",
};

export function CreateServerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedTransport, setSelectedTransport] = useState<MCPTransportType>("stdio");
  const [isTesting, setIsTesting] = useState(false);

  const createServer = useCreateServer();
  const testConnection = useTestConnection();

  const form = useForm<CreateServerForm>({
    resolver: zodResolver(createServerSchema),
    defaultValues: {
      name: "",
      description: "",
      transport_type: "stdio",
    },
  });

  const stdioForm = useForm({
    resolver: zodResolver(stdioSchema),
    defaultValues: {
      command: "",
      args: "",
      env: "",
      cwd: "",
    },
  });

  const httpForm = useForm({
    resolver: zodResolver(httpSchema),
    defaultValues: {
      url: "",
      headers: "",
      timeout: 30,
    },
  });

  const handleSubmit = async (data: CreateServerForm) => {
    let config: Record<string, unknown> = {};

    if (selectedTransport === "stdio") {
      const stdioData = stdioForm.getValues();
      config = {
        command: stdioData.command,
        args: stdioData.args ? stdioData.args.split(" ").filter(Boolean) : [],
        env: stdioData.env ? JSON.parse(stdioData.env) : {},
        cwd: stdioData.cwd || undefined,
      };
    } else {
      const httpData = httpForm.getValues();
      config = {
        url: httpData.url,
        headers: httpData.headers ? JSON.parse(httpData.headers) : {},
        timeout: httpData.timeout || 30,
      };
    }

    try {
      await createServer.mutateAsync({
        ...data,
        config,
      });
      toast.success("Server created successfully");
      onOpenChange(false);
      form.reset();
      stdioForm.reset();
      httpForm.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create server");
    }
  };

  const handleTestConnection = async () => {
    const baseData = form.getValues();
    let config: Record<string, unknown> = {};

    if (selectedTransport === "stdio") {
      const stdioData = stdioForm.getValues();
      config = {
        command: stdioData.command,
        args: stdioData.args ? stdioData.args.split(" ").filter(Boolean) : [],
        env: stdioData.env ? JSON.parse(stdioData.env) : {},
        cwd: stdioData.cwd || undefined,
      };
    } else {
      const httpData = httpForm.getValues();
      config = {
        url: httpData.url,
        headers: httpData.headers ? JSON.parse(httpData.headers) : {},
        timeout: httpData.timeout || 30,
      };
    }

    if (!baseData.name || (selectedTransport === "stdio" && !config.command) || (selectedTransport !== "stdio" && !config.url)) {
      toast.error("Please fill in required fields first");
      return;
    }

    setIsTesting(true);
    try {
      const result = await testConnection.mutateAsync({
        serverId: "temp",
        data: { timeout_seconds: config.timeout as number || 30 },
      });
      if (result.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(`Connection failed: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      toast.error("Connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add MCP Server</DialogTitle>
          <DialogDescription>
            Register a new MCP server to connect and manage its capabilities
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Base fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., My MCP Server"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of this server"
                rows={2}
                {...form.register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label>Transport Type *</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["stdio", "streamable_http", "sse"] as MCPTransportType[]).map((transport) => (
                  <button
                    key={transport}
                    type="button"
                    onClick={() => {
                      setSelectedTransport(transport);
                      form.setValue("transport_type", transport);
                    }}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all text-left
                      ${selectedTransport === transport
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <transportIcons[transport] className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium capitalize">{transport.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground">{transportDescriptions[transport]}</p>
                      </div>
                    </div>
                    {selectedTransport === transport && (
                      <div className="absolute -top-2 -right-2 h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Transport-specific configuration */}
          <div className="space-y-4">
            <Tabs defaultValue={selectedTransport} onValueChange={setSelectedTransport} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stdio">
                  <Terminal className="h-4 w-4 mr-2" />
                  STDIO
                </TabsTrigger>
                <TabsTrigger value="streamable_http">
                  <Globe className="h-4 w-4 mr-2" />
                  Streamable HTTP
                </TabsTrigger>
                <TabsTrigger value="sse">
                  <Zap className="h-4 w-4 mr-2" />
                  SSE
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stdio" className="mt-4">
                <form onSubmit={stdioForm.handleSubmit(() => {})} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="command">Command *</Label>
                    <Input
                      id="command"
                      placeholder="e.g., npx, python, node"
                      {...stdioForm.register("command")}
                    />
                    {stdioForm.formState.errors.command && (
                      <p className="text-sm text-destructive">{stdioForm.formState.errors.command.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="args">Arguments (space-separated)</Label>
                    <Input
                      id="args"
                      placeholder="e.g., -y @modelcontextprotocol/server-filesystem /path/to/dir"
                      {...stdioForm.register("args")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Arguments passed to the command, separated by spaces
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="env">Environment Variables (JSON)</Label>
                    <Textarea
                      id="env"
                      placeholder='{"API_KEY": "value", "DEBUG": "true"}'
                      rows={3}
                      {...stdioForm.register("env")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional JSON object with environment variables
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cwd">Working Directory</Label>
                    <Input
                      id="cwd"
                      placeholder="/path/to/working/directory"
                      {...stdioForm.register("cwd")}
                    />
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="streamable_http" className="mt-4">
                <form onSubmit={httpForm.handleSubmit(() => {})} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Server URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://api.example.com/mcp"
                      {...httpForm.register("url")}
                    />
                    {httpForm.formState.errors.url && (
                      <p className="text-sm text-destructive">{httpForm.formState.errors.url.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headers">Headers (JSON)</Label>
                    <Textarea
                      id="headers"
                      placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                      rows={3}
                      {...httpForm.register("headers")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional JSON object with HTTP headers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="1"
                      max="300"
                      {...httpForm.register("timeout")}
                    />
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="sse" className="mt-4">
                <form onSubmit={httpForm.handleSubmit(() => {})} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Server URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://api.example.com/sse"
                      {...httpForm.register("url")}
                    />
                    {httpForm.formState.errors.url && (
                      <p className="text-sm text-destructive">{httpForm.formState.errors.url.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headers">Headers (JSON)</Label>
                    <Textarea
                      id="headers"
                      placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                      rows={3}
                      {...httpForm.register("headers")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional JSON object with HTTP headers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="1"
                      max="300"
                      {...httpForm.register("timeout")}
                    />
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Test Connection */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Test Connection</p>
                  <p className="text-sm text-muted-foreground">
                    Verify the server is reachable before saving
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || createServer.isPending}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube2 className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createServer.isPending}>
              {createServer.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Server"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}