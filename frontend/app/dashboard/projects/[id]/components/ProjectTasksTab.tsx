"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Search, Filter, MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useProjectTasks, useCreateTask, useUpdateTask, useDeleteTask, useTaskStatusDisplay, useTaskPriorityDisplay } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import type { TaskResponse, TaskStatus, TaskPriority } from "@/lib/api/projects";
import { CreateTaskDialog } from "./CreateTaskDialog";

interface ProjectTasksTabProps {
  projectId: string;
  project: { id: string; workspace_id: string; name: string };
}

export function ProjectTasksTab({ projectId, project }: ProjectTasksTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { getStatusLabel, getStatusColor } = useTaskStatusDisplay();
  const { getPriorityLabel, getPriorityColor } = useTaskPriorityDisplay();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [sortBy, setSortBy] = useState<"title" | "created_at" | "updated_at" | "due_date" | "priority">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleStatusFilterChange = (value: TaskStatus | "all") => {
    setStatusFilter(value);
  };

  const handlePriorityFilterChange = (value: TaskPriority | "all") => {
    setPriorityFilter(value);
  };

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch tasks
  const { data: tasksData, isLoading, refetch } = useProjectTasks(projectId, {
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    limit: 50,
  });

  const tasks = tasksData?.data || [];

  // Mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreateTask = async (data: { title: string; description?: string; status?: TaskStatus; priority?: TaskPriority; assignee_id?: string; due_date?: string }) => {
    await createTask.mutateAsync({ projectId, data });
    toast({ title: "Task created", description: `${data.title} has been created.` });
    refetch();
  };

  const handleUpdateTask = async (taskId: string, data: Partial<TaskResponse>) => {
    await updateTask.mutateAsync({ id: taskId, data });
    toast({ title: "Task updated", description: "Task has been updated." });
    refetch();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return;
    }
    await deleteTask.mutateAsync(taskId);
    toast({ title: "Task deleted", description: "The task has been deleted." });
    refetch();
  };

  const handleStatusChange = async (task: TaskResponse, newStatus: TaskStatus) => {
    await handleUpdateTask(task.id, { status: newStatus });
  };

  const handlePriorityChange = async (task: TaskResponse, newPriority: TaskPriority) => {
    await handleUpdateTask(task.id, { priority: newPriority });
  };

  const handleSortChange = (field: typeof sortBy, order?: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order || (sortBy === field && sortOrder === "asc" ? "desc" : "asc"));
  };

  const handleViewTask = (taskId: string) => {
    router.push(`/dashboard/tasks/${taskId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-muted-foreground">Manage tasks for {project.name}</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={handlePriorityFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Sort
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleSortChange("title")}
                className="flex items-center justify-between"
              >
                Title
                {sortBy === "title" && sortOrder === "asc" && <ChevronUp className="h-4 w-4" />}
                {sortBy === "title" && sortOrder === "desc" && <ChevronDown className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("created_at")}
                className="flex items-center justify-between"
              >
                Created
                {sortBy === "created_at" && sortOrder === "asc" && <ChevronUp className="h-4 w-4" />}
                {sortBy === "created_at" && sortOrder === "desc" && <ChevronDown className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("updated_at")}
                className="flex items-center justify-between"
              >
                Updated
                {sortBy === "updated_at" && sortOrder === "asc" && <ChevronUp className="h-4 w-4" />}
                {sortBy === "updated_at" && sortOrder === "desc" && <ChevronDown className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("due_date")}
                className="flex items-center justify-between"
              >
                Due Date
                {sortBy === "due_date" && sortOrder === "asc" && <ChevronUp className="h-4 w-4" />}
                {sortBy === "due_date" && sortOrder === "desc" && <ChevronDown className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("priority")}
                className="flex items-center justify-between"
              >
                Priority
                {sortBy === "priority" && sortOrder === "asc" && <ChevronUp className="h-4 w-4" />}
                {sortBy === "priority" && sortOrder === "desc" && <ChevronDown className="h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="rounded-md border">
        {isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-3/4 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-8 w-8 animate-pulse bg-muted rounded" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Get started by creating your first task."}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task: TaskResponse) => (
                <TableRow
                  key={(task as TaskResponse).id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewTask(task.id)}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn(getStatusColor(task.status), "capitalize cursor-pointer")}
                        >
                          {getStatusLabel(task.status)}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        {(["todo", "in_progress", "review", "done"] as TaskStatus[]).map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(task, status as TaskStatus);
                            }}
                            className={cn(
                              "flex items-center gap-2",
                              task.status === status && "font-medium"
                            )}
                          >
                            {task.status === status && <ChevronUp className="h-4 w-4 text-primary" />}
                            {getStatusLabel(status)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn(getPriorityColor(task.priority), "capitalize cursor-pointer")}
                        >
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                        {(["low", "medium", "high", "critical"] as TaskPriority[]).map((priority) => (
                          <DropdownMenuItem
                            key={priority}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePriorityChange(task, priority as TaskPriority);
                            }}
                            className={cn(
                              "flex items-center gap-2",
                              task.priority === priority && "font-medium"
                            )}
                          >
                            {task.priority === priority && <ChevronUp className="h-4 w-4 text-primary" />}
                            {getPriorityLabel(priority)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {task.assignee_name || "Unassigned"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
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
                          onClick={() => handleViewTask(task.id)}
                          className="flex items-center gap-2"
                        >
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // Edit task - could open a dialog
                          }}
                          className="flex items-center gap-2"
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateTask}
        isPending={createTask.isPending}
        projectId={projectId}
      />
    </div>
  );
}