"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, Users, CheckCircle, Clock, AlertCircle, Archive } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useProjectStatusDisplay } from "@/hooks/use-projects";
import type { ProjectResponse } from "@/lib/api/projects";
import { useRouter } from "next/navigation";

interface ProjectCardProps {
  project: ProjectResponse;
  onView?: (projectId: string) => void;
  onEdit?: (project: ProjectResponse) => void;
  onDelete?: (projectId: string) => void;
  onDuplicate?: (project: ProjectResponse) => void;
  onArchive?: (projectId: string) => void;
}

export function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
}: ProjectCardProps) {
  const router = useRouter();
  const { getStatusLabel, getStatusColor } = useProjectStatusDisplay();

  const handleView = () => {
    if (onView) onView(project.id);
    else router.push(`/dashboard/projects/${project.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(project.id);
  };

  const handleDuplicate = () => {
    if (onDuplicate) onDuplicate(project);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onArchive) onArchive(project.id);
  };

  return (
    <div
      className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md cursor-pointer"
      onClick={handleView}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{project.name}</h3>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {project.member_count} members
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              {project.task_count} tasks
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(getStatusColor(project.status), "capitalize")}
          >
            {getStatusLabel(project.status)}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDuplicate}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {project.status !== "archived" && (
                <DropdownMenuItem
                  onClick={handleArchive}
                  className="flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <AlertCircle className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
        <span>Created by {project.created_by}</span>
      </div>
    </div>
  );
}