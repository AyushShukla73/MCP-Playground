"use client";

import { useState } from "react";
import { useWorkspaceActivity } from "@/hooks/use-workspaces";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Shield, AlertCircle, CheckCircle, XCircle, Loader2, Database, FileText, Users, Settings, Search } from "lucide-react";
import { cn, formatDistanceToNow } from "@/lib/utils";

interface WorkspaceActivityTabProps {
  workspaceId: string;
}

export function WorkspaceActivityTab({ workspaceId }: WorkspaceActivityTabProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const { data: activity, isLoading, error, refetch } = useWorkspaceActivity(workspaceId, {
    limit: pageSize,
    offset,
  });

  const getActionIcon = (action: string) => {
    if (action.includes("create")) return <Database className="h-4 w-4 text-green-500" />;
    if (action.includes("update") || action.includes("edit")) return <FileText className="h-4 w-4 text-blue-500" />;
    if (action.includes("delete")) return <XCircle className="h-4 w-4 text-red-500" />;
    if (action.includes("member") || action.includes("invite")) return <Users className="h-4 w-4 text-purple-500" />;
    if (action.includes("permission") || action.includes("role")) return <Shield className="h-4 w-4 text-orange-500" />;
    if (action.includes("setting")) return <Settings className="h-4 w-4 text-gray-500" />;
    return <Search className="h-4 w-4 text-gray-500" />;
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "success":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle className="mr-1 h-3 w-3" /> Success
        </Badge>;
      case "failure":
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <XCircle className="mr-1 h-3 w-3" /> Failed
        </Badge>;
      case "blocked":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          <AlertCircle className="mr-1 h-3 w-3" /> Blocked
        </Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {outcome}
        </Badge>;
    }
  };

  const getResourceLabel = (resourceType: string) => {
    const labels: Record<string, string> = {
      workspace: "Workspace",
      project: "Project",
      task: "Task",
      member: "Member",
      tool_permission: "Tool Permission",
      settings: "Settings",
    };
    return labels[resourceType] || resourceType;
  };

  const items = activity || [];
  const hasMore = items.length === pageSize;
  const isFirstPage = page === 1;

  if (isLoading && page === 1) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Activity</h2>
          <Button variant="outline" size="sm" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refresh
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-40 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-48 animate-pulse bg-muted rounded" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Activity</h2>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Loader2 className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load activity</h3>
            <p className="text-muted-foreground mb-4">
              Unable to fetch the activity feed. Please try again.
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Activity</h2>
          <p className="text-muted-foreground">Workspace activity and audit log</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <Loader2 className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No activity yet</h3>
              <p className="text-muted-foreground">
                Activity will appear here as team members interact with the workspace
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="w-36">Time</TableHead>
                      <TableHead className="w-48">User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="w-36">Resource</TableHead>
                      <TableHead className="w-32">Outcome</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(item.created_at))} ago
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {item.user_name?.charAt(0).toUpperCase() || item.user_email?.charAt(0).toUpperCase() || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-[140px]">
                                {item.user_name || item.user_email || "Unknown User"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            {getActionIcon(item.action)}
                            <span className="capitalize">{item.action.replace(/_/g, " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getResourceLabel(item.resource_type)}
                          {item.resource_id && (
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              #{item.resource_id.slice(0, 8)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getOutcomeBadge(item.outcome)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                          {item.metadata && Object.keys(item.metadata).length > 0
                            ? JSON.stringify(item.metadata)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, (page - 1) * pageSize + items.length)} of{" "}
                  {(page - 1) * pageSize + items.length + (hasMore ? "+" : "")} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={isFirstPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium">
                    Page {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore || isLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}