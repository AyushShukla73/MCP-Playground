"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TasksFilters } from "./components/TasksFilters";
import { TasksTable } from "./components/TasksTable";
import { TaskDetailDialog } from "./components/TaskDetailDialog";
import { CreateTaskDialog } from "./components/CreateTaskDialog";
import { useTasks, useCreateTask } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import type { TaskResponse, TaskStatus, TaskPriority } from "@/lib/api/projects";

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_BY = "updated_at";
const DEFAULT_SORT_ORDER = "desc" as const;

function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Parse URL params for state
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10);
  const status = (searchParams.get("status") as TaskStatus) || undefined;
  const priority = (searchParams.get("priority") as TaskPriority) || undefined;
  const assigneeId = searchParams.get("assigneeId") || undefined;
  const search = searchParams.get("search") || undefined;
  const sortBy = searchParams.get("sortBy") || DEFAULT_SORT_BY;
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || DEFAULT_SORT_ORDER;

  // Local state for detail dialog
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Use workspace ID from URL or default - for now using a default
  // In a real app, this would come from context or the workspace switcher
  const workspaceId = searchParams.get("workspaceId") || "default-workspace";

  // Fetch tasks with current filters
  const { data, isLoading, refetch } = useTasks(workspaceId, {
    status,
    priority,
    assigneeId,
    search,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    sortBy,
    sortOrder,
  });

  // Create task mutation
  const createTask = useCreateTask();

  const tasks = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Check if any filters are active
  const hasActiveFilters = Boolean(status || priority || assigneeId || search);

  // Update URL with new params
  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      router.push(`/dashboard/tasks?${newParams.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (filters: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      search?: string;
    }) => {
      updateUrl({
        page: "1", // Reset to first page on filter change
        status: filters.status,
        priority: filters.priority,
        assigneeId: filters.assigneeId,
        search: filters.search,
      });
    },
    [updateUrl]
  );

  // Handle sort changes
  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      updateUrl({
        sortBy: newSortBy,
        sortOrder: newSortOrder,
      });
    },
    [updateUrl]
  );

  // Handle page changes
  const handlePageChange = useCallback(
    (newPage: number) => {
      updateUrl({ page: String(newPage) });
    },
    [updateUrl]
  );

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    updateUrl({
      page: "1",
      status: undefined,
      priority: undefined,
      assigneeId: undefined,
      search: undefined,
    });
  }, [updateUrl]);

  // Handle task creation
  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignee_id?: string;
    due_date?: string;
    project_id?: string;
  }) => {
    try {
      await createTask.mutateAsync({
        projectId: data.project_id || workspaceId,
        data,
      });
      toast({ title: "Task created", description: "The task has been created successfully." });
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    }
  };

  // Handle task selection for detail view
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleTaskClose = () => {
    setSelectedTaskId(null);
  };

  // Find selected task for detail dialog
  const selectedTask = tasks.find((t: TaskResponse) => t.id === selectedTaskId) || null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track tasks across all projects
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <TasksFilters
        workspaceId={workspaceId}
        status={status}
        priority={priority}
        assigneeId={assigneeId}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onFiltersChange={handleFiltersChange}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Tasks Table */}
      <TasksTable
        workspaceId={workspaceId}
        status={status}
        priority={priority}
        assigneeId={assigneeId}
        search={search}
        page={page}
        pageSize={pageSize}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={!!selectedTaskId}
        onOpenChange={handleTaskClose}
        task={selectedTask}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        workspaceId={workspaceId}
        onCreate={handleCreateTask}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-4">Loading tasks...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}