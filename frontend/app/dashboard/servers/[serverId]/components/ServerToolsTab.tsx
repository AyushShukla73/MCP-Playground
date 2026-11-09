"use client";

import { useState } from "react";
import { useServerTools, useServerHealth } from "@/hooks/use-servers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api";
import { CheckCircle, XCircle, Loader2, Search, Code, Globe, Clock, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerToolResponse } from "@/lib/api/servers";
import { toast } from "sonner";

interface ToolCallForm {
  toolName: string;
  args: string;
}

export function ServerToolsTab({ serverId, workspaceId = "default" }: { serverId: string; workspaceId?: string }) {
  const { data: toolsData, isLoading, refetch } = useServerTools(serverId);
  const { data: healthData } = useServerHealth(serverId);
  const [searchTerm, setSearchTerm] = useState("");
  const [showToolForm, setShowToolForm] = useState<string | null>(null);
  const [isCallingTool, setIsCallingTool] = useState(false);
  const [toolForm, setToolForm] = useState<ToolCallForm>({ toolName: "", args: "" });
  const [toolResult, setToolResult] = useState<{ success: boolean; data?: unknown; error?: string; pendingApproval?: boolean; requestId?: string } | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalRequestId, setApprovalRequestId] = useState<string | null>(null);

  const tools = toolsData || [];
  const filteredTools = searchTerm
    ? tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (tool.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      )
    : tools;

  const handleTestTool = async (tool: MCPServerToolResponse) => {
    setToolForm({ toolName: tool.name, args: "" });
    setShowToolForm(tool.name);
  };

  const handleCallTool = async () => {
    if (!toolForm.toolName) return;

    setIsCallingTool(true);
    setToolResult(null);

    try {
      let args = {};
      if (toolForm.args.trim()) {
        args = JSON.parse(toolForm.args);
      }

      // Use the new permission-enforced tool execution endpoint
      const result = await fetch(`/api/tool-execution/execute?workspace_id=${workspaceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool_name: toolForm.toolName,
          arguments: args,
          server_id: serverId,
        }),
      });

      if (!result.ok) {
        const error = await result.json();

        // Handle pending approval (402-like response)
        if (result.status === 403 && error.detail?.decision === "pending_approval") {
          setToolResult({
            success: false,
            error: "This tool requires approval before execution",
            pendingApproval: true,
            requestId: error.detail.request_id,
          });
          setApprovalRequestId(error.detail.request_id);
          setShowApprovalDialog(true);
          return;
        }

        // Handle denied
        if (result.status === 403 && error.detail?.decision === "denied") {
          throw new Error(`Permission denied: ${error.detail.error_message || "Access denied by policy"}`);
        }

        throw new Error(error.detail || "Failed to call tool");
      }

      const data = await result.json();

      // Check if execution was pending approval
      if (data.status === "pending") {
        setToolResult({
          success: false,
          error: "Tool execution requires approval",
          pendingApproval: true,
          requestId: data.request_id,
        });
        setApprovalRequestId(data.request_id);
        setShowApprovalDialog(true);
        return;
      }

      setToolResult({ success: true, data });
      toast.success(`Tool "${toolForm.toolName}" called successfully`);
    } catch (error) {
      setToolResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      toast.error(`Failed to call tool: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCallingTool(false);
    }
  };

  const tool = tools.find((t) => t.name === toolForm.toolName);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Available Tools ({tools.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "No tools match your search" : "No tools discovered. Refresh discovery first."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredTools.map((tool) => (
                <Card key={tool.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{tool.name}</h3>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                        )}
                        {tool.input_schema && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Input Schema:</p>
                            <pre className="bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto">
                              {JSON.stringify(tool.input_schema, null, 2)}
                            </pre>
                          </div>
                        )}
                        {tool.annotations && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Annotations:</p>
                            <Badge variant="outline" className="ml-2">
                              {JSON.stringify(tool.annotations)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant={tool.is_enabled ? "default" : "secondary"}>
                          {tool.is_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestTool(tool)}
                          disabled={!tool.is_enabled}
                        >
                          <Code className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showToolForm && tool && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Test Tool: {tool.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Arguments (JSON)</label>
              <Textarea
                placeholder='{"param1": "value1", "param2": 123}'
                rows={6}
                value={toolForm.args}
                onChange={(e) => setToolForm({ ...toolForm, args: e.target.value })}
                className="font-mono"
              />
              {tool.input_schema && (
                <p className="text-xs text-muted-foreground mt-2">
                  Expected schema: {JSON.stringify(tool.input_schema)}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCallTool} disabled={isCallingTool || !toolForm.toolName}>
                {isCallingTool ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calling...
                  </>
                ) : (
                  "Call Tool"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowToolForm(null)}>
                Cancel
              </Button>
            </div>

            {toolResult && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium mb-2 block">Result</label>
                  <div
                    className={cn(
                      "p-3 rounded-lg font-mono text-xs overflow-x-auto",
                      toolResult.success ? "bg-green-50" : toolResult.pendingApproval ? "bg-yellow-50" : "bg-red-50"
                    )}
                  >
                    <pre className="whitespace-pre-wrap break-all">
                      {toolResult.success ? JSON.stringify(toolResult.data, null, 2) : toolResult.error}
                    </pre>
                  </div>
                </div>
              </>
            )}

            {/* Approval Dialog */}
            <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <Shield className="h-6 w-6 text-yellow-500 mr-2" />
                  <AlertDialogTitle>Approval Required</AlertDialogTitle>
                  <AlertDialogDescription>
                    This tool execution requires approval before it can proceed. An administrator or approver
                    must review and approve this request.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {
                    setShowApprovalDialog(false);
                    setApprovalRequestId(null);
                  }}>
                    Dismiss
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="outline"
                    onClick={async () => {
                      if (!approvalRequestId) return;
                      try {
                        const result = await fetch(`/api/tool-execution/execute/${approvalRequestId}/approve?workspace_id=${workspaceId}`, {
                          method: "POST",
                        });
                        if (result.ok) {
                          toast.success("Execution approved");
                          // Re-fetch the result
                          handleCallTool();
                        } else {
                          toast.error("Failed to approve");
                        }
                      } catch (e) {
                        toast.error("Error approving execution");
                      }
                      setShowApprovalDialog(false);
                      setApprovalRequestId(null);
                    }}
                  >
                    Approve & Execute
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}