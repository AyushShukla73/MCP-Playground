"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRoleDisplay } from "@/hooks/use-workspaces";
import { cn } from "@/lib/utils";
import { Users, FolderOpen, Clock, TrendingUp } from "lucide-react";
import type { WorkspaceResponse } from "@/lib/api/workspaces";

interface WorkspaceOverviewTabProps {
  workspace: WorkspaceResponse;
}

export function WorkspaceOverviewTab({ workspace }: WorkspaceOverviewTabProps) {
  const { getRoleLabel, getRoleColor } = useRoleDisplay();
  const currentUserRole = "owner"; // Placeholder

  const stats = [
    {
      label: "Members",
      value: workspace.member_count.toString(),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Projects",
      value: workspace.project_count.toString(),
      icon: FolderOpen,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Your Role",
      value: getRoleLabel(currentUserRole),
      icon: null,
      color: "",
      bgColor: "",
      isBadge: true,
      badgeColor: getRoleColor(currentUserRole),
    },
    {
      label: "Created",
      value: new Date(workspace.created_at).toLocaleDateString(),
      icon: Clock,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {stat.isBadge ? (
                    <Badge variant="outline" className={cn(stat.badgeColor, "text-sm")}>
                      {stat.value}
                    </Badge>
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                </div>
                {stat.icon && (
                  <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Projects</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              Manage projects within this workspace
            </p>
            <a href={`/dashboard/workspaces/${workspace.id}?tab=projects`} className="btn-primary w-full justify-center">
              View Projects
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              Invite and manage team members
            </p>
            <a href={`/dashboard/workspaces/${workspace.id}?tab=members`} className="btn-primary w-full justify-center">
              Manage Members
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              View workspace activity and audit logs
            </p>
            <a href={`/dashboard/workspaces/${workspace.id}?tab=activity`} className="btn-primary w-full justify-center">
              View Activity
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}