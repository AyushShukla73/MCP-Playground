"use client";

import { useState } from "react";
import { useServerActivity, useActivityActionDisplay, useActivityStatusDisplay } from "@/hooks/use-servers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Activity, Search, Filter, RefreshCw, ChevronDown, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerActivityResponse, MCPActivityAction } from "@/lib/api/servers";
import { toast } from "sonner";

const ACTIONS: MCPActivityAction[] = [
  "connection_test",
  "health_check",
  "tools_list",
  "resources_list",
  "prompts_list",
  "tool_call",
  "resource_read",
  "prompt_get",
  "discovery_refresh",
];

interface ActivityFilters {
  action: string;
  status: string;
  search: string;
}

export function ServerActivityTab({ serverId }: { serverId: string }) {
  const { data: activityData, isLoading, refetch } = useServerActivity(serverId, { limit: 50 });
  const { getActionLabel, getActionColor } = useActivityActionDisplay();
  const { getStatusLabel, getStatusColor } = useActivityStatusDisplay();
  const [filters, setFilters] = useState<ActivityFilters>({ action: "all", status: "all", search: "" });

  const activities: MCPServerActivityResponse[] = activityData?.activity || [];

  const filteredActivities = activities.filter((activity) => {
    if (filters.action !== "all" && activity.action !== filters.action) return false;
    if (filters.status !== "all" && activity.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!activity.id.toLowerCase().includes(searchLower)) return false;
    }
    return true;
  });

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (activity: MCPServerActivityResponse) => {
    switch (activity.action) {
      case "connection_test":
        return <CheckCircle className="h-4 w-4" />;
      case "health_check":
        return <AlertTriangle className="h-4 w-4" />;
      case "tool_call":
        return <Tool className="h-4 w-4" />;
      case "resource_read":
        return <BookOpen className="h-4 w-4" />;
      case "prompt_get":
        return <MessageSquare className="h-4 w-4" />;
      case "discovery_refresh":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log ({activities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.action}
                onValueChange={(v) => setFilters({ ...filters, action: v })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {getActionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters({ ...filters, status: v })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filters.action !== "all" || filters.status !== "all" || filters.search
                  ? "No activity matches your filters"
                  : "No activity recorded yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Badge
                        className={cn(
                          "mt-0.5",
                          getActionColor(activity.action)
                        )}
                      >
                        {getActionLabel(activity.action)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {activity.id}
                          </h4>
                          <Badge
                            className={cn(
                              getStatusColor(activity.status),
                              "text-xs"
                            )}
                          >
                            {getStatusLabel(activity.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>
                            <span className="font-medium">Time: </span>
                            {formatTimestamp(activity.created_at)}
                          </div>
                          <div>
                            <span className="font-medium">Duration: </span>
                            {formatDuration(activity.duration_ms)}
                          </div>
                          {activity.user_id && (
                            <div>
                              <span className="font-medium">User: </span>
                              {activity.user_id}
                            </div>
                          )}
                        </div>
                        {activity.error_message && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                            {activity.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Tool({ className }: { className?: string }) {
  return <span className={className}>🔧</span>;
}

function BookOpen({ className }: { className?: string }) {
  return <span className={className}>📖</span>;
}