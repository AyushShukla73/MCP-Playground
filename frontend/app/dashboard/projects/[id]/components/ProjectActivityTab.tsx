"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, User, Plus, Edit, Trash2, Archive, CheckCircle, AlertCircle } from "lucide-react";
import { useProjectActivity } from "@/hooks/use-projects";
import type { ProjectActivityItem } from "@/lib/api/projects";

interface ProjectActivityTabProps {
  projectId: string;
}

type ActivityType =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_status_changed"
  | "member_added"
  | "member_removed"
  | "member_role_changed"
  | "project_updated"
  | "project_archived"
  | "project_status_changed";

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  task_created: Plus,
  task_updated: Edit,
  task_deleted: Trash2,
  task_status_changed: CheckCircle,
  member_added: User,
  member_removed: User,
  member_role_changed: User,
  project_updated: Edit,
  project_archived: Archive,
  project_status_changed: AlertCircle,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  task_created: "Task Created",
  task_updated: "Task Updated",
  task_deleted: "Task Deleted",
  task_status_changed: "Task Status Changed",
  member_added: "Member Added",
  member_removed: "Member Removed",
  member_role_changed: "Member Role Changed",
  project_updated: "Project Updated",
  project_archived: "Project Archived",
  project_status_changed: "Project Status Changed",
};

export function ProjectActivityTab({ projectId }: ProjectActivityTabProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, refetch } = useProjectActivity(projectId, {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const activities = data || [];
  const totalCount = activities.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActivityDescription = (activity: ProjectActivityItem) => {
    const actor = activity.user_name || activity.user_id;
    const target = activity.resource_id || "unknown";

    switch (activity.action) {
      case "task_created":
        return `${actor} created task "${target}"`;
      case "task_updated":
        return `${actor} updated task "${target}"`;
      case "task_deleted":
        return `${actor} deleted task "${target}"`;
      case "task_status_changed":
        return `${actor} changed task "${target}" status to ${activity.metadata?.new_status || "unknown"}`;
      case "member_added":
        return `${actor} added ${target} as ${activity.metadata?.role || "member"}`;
      case "member_removed":
        return `${actor} removed ${target} from the project`;
      case "member_role_changed":
        return `${actor} changed ${target}'s role to ${activity.metadata?.new_role || "unknown"}`;
      case "project_updated":
        return `${actor} updated project details`;
      case "project_archived":
        return `${actor} archived the project`;
      case "project_status_changed":
        return `${actor} changed project status to ${activity.metadata?.new_status || "unknown"}`;
      default:
        return `${actor} performed ${activity.action}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Activity Feed</h2>
          <p className="text-muted-foreground">Recent activity in this project</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Clock className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse px-6 py-4">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-64 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No activity yet</h3>
              <p className="text-muted-foreground">Activity will appear here as team members work on the project.</p>
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => {
                const Icon = ACTIVITY_ICONS[activity.action as ActivityType] || Clock;
                const label = ACTIVITY_LABELS[activity.action as ActivityType] || activity.action;

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-muted/50"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(activity.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{getActivityDescription(activity)}</p>
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View details
                          </summary>
                          <pre className="mt-1 text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {activity.user_name && (
                        <p>{activity.user_name}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Button } from "@/components/ui/button";