"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, ChevronUp, ChevronDown, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useTasks, useUpdateTask, useDeleteTask, useTaskStatusDisplay, useTaskPriorityDisplay } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import type { TaskResponse, TaskStatus, TaskPriority } from "@/lib/api/projects";

interface TasksTableProps {
  workspaceId: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const SORT_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "created_at", label: "Created" },
  { value: "updated_at", label: "Updated" },
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due Date" },
];

export function TasksTable({
  workspaceId,
  projectId,
  status,
  priority,
  assigneeId,
  search,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onPageChange,
  onSortChange,
}: TasksTableProps) {
  const { toast } = useToast();
  const { getStatusLabel, getStatusColor } = useTaskStatusDisplay();
  const { getPriorityLabel, getPriorityColor } = useTaskPriorityDisplay();

  const { data, isLoading, refetch } = useTasks(workspaceId, {
    projectId,
    status,
    priority,
    assigneeId,
    search,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    sortBy,
    sortOrder,
  });

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { status: newStatus } });
      toast({ title: "Status updated", description: `Task status changed to ${getStatusLabel(newStatus)}` });
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task status", variant: "destructive" });
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: TaskPriority) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { priority: newPriority } });
      toast({ title: "Priority updated", description: `Task priority changed to ${getPriorityLabel(newPriority)}` });
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task priority", variant: "destructive" });
    }
  };

  const handleDelete = async (taskId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteTask.mutateAsync(taskId);
      toast({ title: "Task deleted", description: `"${title}" has been deleted` });
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    }
  };

  const renderSortableHeader = (column: string, label: string) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 select-none">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {sortBy === column && (
          sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-64 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
              <div className="h-8 w-24 bg-muted rounded" />
              <div className="h-8 w-24 bg-muted rounded" />
              <div className="h-8 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tasks found</h3>
          <p className="text-muted-foreground mb-6">
            {search || status || priority || assigneeId
              ? "Try adjusting your search or filters."
              : "Create your first task to get started."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {renderSortableHeader("title", "Task")}
              {renderSortableHeader("status", "Status")}
              {renderSortableHeader("priority", "Priority")}
              {renderSortableHeader("assignee_id", "Assignee")}
              {renderSortableHeader("due_date", "Due Date")}
              {renderSortableHeader("updated_at", "Last Updated")}
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {tasks.map((task: TaskResponse) => (
              <tr key={task.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium truncate max-w-xs">{task.title}</p>
                    {task.project_id && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {task.project_id}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(getStatusColor(task.status), "capitalize", "cursor-pointer")}
                      >
                        {getStatusLabel(task.status)}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {STATUS_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => handleStatusChange(task.id, option.value)}
                          className={cn(
                            "flex items-center gap-2",
                            task.status === option.value && "font-medium"
                          )}
                          disabled={updateTask.isPending}
                        >
                          {task.status === option.value && (
                            <span className="h-4 w-4 text-primary">✓</span>
                          )}
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(getPriorityColor(task.priority), "capitalize", "cursor-pointer")}
                      >
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {PRIORITY_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => handlePriorityChange(task.id, option.value)}
                          className={cn(
                            "flex items-center gap-2",
                            task.priority === option.value && "font-medium"
                          )}
                          disabled={updateTask.isPending}
                        >
                          {task.priority === option.value && (
                            <span className="h-4 w-4 text-primary">✓</span>
                          )}
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
                <td className="px-4 py-3">
                  {task.assignee_name ? (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {task.assignee_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm">{task.assignee_name}</span>
                    </div>
                  ) : task.assignee_id ? (
                    <span className="text-sm text-muted-foreground">{task.assignee_id}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {task.due_date ? (
                    <span className={cn(
                      new Date(task.due_date) < new Date() && task.status !== "done"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}>
                      {format(new Date(task.due_date), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {format(new Date(task.updated_at), "MMM d, yyyy HH:mm")}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDelete(task.id, task.title)}
                        className="flex items-center gap-2 text-destructive focus:text-destructive"
                        disabled={deleteTask.isPending}
                      >
                        <X className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}