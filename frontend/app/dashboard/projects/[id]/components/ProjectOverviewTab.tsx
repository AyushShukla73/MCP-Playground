"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Users, CheckCircle, Clock, Calendar, AlertCircle, Archive } from "lucide-react";
import { useProjectStatusDisplay } from "@/hooks/use-projects";
import type { ProjectResponse, ProjectStatus } from "@/lib/api/projects";

interface ProjectOverviewTabProps {
  project: ProjectResponse;
  onStatusChange: (status: ProjectStatus) => Promise<void>;
}

export function ProjectOverviewTab({ project, onStatusChange }: ProjectOverviewTabProps) {
  const { getStatusLabel, getStatusColor } = useProjectStatusDisplay();

  const stats = [
    { label: "Members", value: project.member_count, icon: Users, color: "text-blue-500" },
    { label: "Total Tasks", value: project.task_count, icon: CheckCircle, color: "text-green-500" },
    { label: "Created", value: new Date(project.created_at).toLocaleDateString(), icon: Calendar, color: "text-gray-500" },
    { label: "Last Updated", value: new Date(project.updated_at).toLocaleDateString(), icon: Clock, color: "text-gray-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Status & Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="mt-1 text-lg">{project.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="mt-1 text-muted-foreground">{project.description || "No description provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1 flex items-center gap-3">
                <Badge variant="outline" className={cn(getStatusColor(project.status), "capitalize")}>
                  {getStatusLabel(project.status)}
                </Badge>
                <div className="flex gap-2">
                  {project.status !== "on_hold" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange("on_hold")}
                    >
                      <Clock className="mr-2 h-3 w-3" />
                      Put on Hold
                    </Button>
                  )}
                  {project.status === "on_hold" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange("active")}
                    >
                      <CheckCircle className="mr-2 h-3 w-3" />
                      Set Active
                    </Button>
                  )}
                  {project.status !== "archived" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange("archived")}
                    >
                      <Archive className="mr-2 h-3 w-3" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Workspace</label>
              <p className="mt-1 text-muted-foreground">{project.workspace_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created By</label>
              <p className="mt-1 text-muted-foreground">{project.created_by}</p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="relative pl-6 border-l-2 border-muted">
                <div className="absolute left-[-6px] top-0 h-3 w-3 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(project.created_at).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">by {project.created_by}</p>
              </div>
              <div className="relative pl-6 border-l-2 border-muted">
                <div className="absolute left-[-6px] top-0 h-3 w-3 rounded-full bg-green-500" />
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{new Date(project.updated_at).toLocaleString()}</p>
              </div>
              {project.status === "archived" && (
                <div className="relative pl-6 border-l-2 border-muted">
                  <div className="absolute left-[-6px] top-0 h-3 w-3 rounded-full bg-gray-500" />
                  <p className="text-sm text-muted-foreground">Archived</p>
                  <p className="font-medium">{new Date(project.updated_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button>
            <CheckCircle className="mr-2 h-4 w-4" />
            Create Task
          </Button>
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
          <Button variant="outline">
            <Archive className="mr-2 h-4 w-4" />
            Archive Project
          </Button>
          <Button variant="outline">
            <AlertCircle className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}