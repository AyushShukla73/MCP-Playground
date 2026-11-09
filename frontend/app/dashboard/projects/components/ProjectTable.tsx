"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, Users, CheckCircle, Clock, AlertCircle, Archive, Search, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectStatusDisplay } from "@/hooks/use-projects";
import type { ProjectResponse } from "@/lib/api/projects";
import { useRouter } from "next/navigation";

interface ProjectTableProps {
  projects: ProjectResponse[];
  isLoading?: boolean;
  onView?: (projectId: string) => void;
  onEdit?: (project: ProjectResponse) => void;
  onDelete?: (projectId: string) => void;
  onDuplicate?: (project: ProjectResponse) => void;
  onArchive?: (projectId: string) => void;
}

export function ProjectTable({
  projects,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
}: ProjectTableProps) {
  const router = useRouter();
  const { getStatusLabel, getStatusColor } = useProjectStatusDisplay();

  const handleView = (projectId: string) => {
    if (onView) onView(projectId);
    else router.push(`/dashboard/projects/${projectId}`);
  };

  const handleEdit = (e: React.MouseEvent, project: ProjectResponse) => {
    e.stopPropagation();
    if (onEdit) onEdit(project);
  };

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (onDelete) onDelete(projectId);
  };

  const handleDuplicate = (e: React.MouseEvent, project: ProjectResponse) => {
    e.stopPropagation();
    if (onDuplicate) onDuplicate(project);
  };

  const handleArchive = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (onArchive) onArchive(projectId);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead className="hidden lg:table-cell">Updated</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-3/4 animate-pulse bg-muted rounded" /></TableCell>
                <TableCell><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                <TableCell><div className="h-4 w-16 animate-pulse bg-muted rounded" /></TableCell>
                <TableCell><div className="h-4 w-16 animate-pulse bg-muted rounded" /></TableCell>
                <TableCell className="hidden lg:table-cell"><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                <TableCell><div className="h-8 w-8 animate-pulse bg-muted rounded" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center">
        <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No projects found</h3>
        <p className="text-muted-foreground">Get started by creating your first project.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow
              key={project.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleView(project.id)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(getStatusColor(project.status), "capitalize")}
                >
                  {getStatusLabel(project.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {project.member_count}
                </span>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {project.task_count}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => handleEdit(e, project)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => handleDuplicate(e, project)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {project.status !== "archived" && (
                      <DropdownMenuItem
                        onClick={(e) => handleArchive(e, project.id)}
                        className="flex items-center gap-2"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => handleDelete(e, project.id)}
                      className="flex items-center gap-2 text-destructive focus:text-destructive"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}