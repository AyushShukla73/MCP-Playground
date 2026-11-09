"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskStatus, TaskPriority } from "@/lib/api/projects";

interface TasksFiltersProps {
  workspaceId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onFiltersChange: (filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    search?: string;
  }) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
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

export function TasksFilters({
  workspaceId,
  status,
  priority,
  assigneeId,
  search,
  sortBy,
  sortOrder,
  onFiltersChange,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
}: TasksFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusChange = (value: TaskStatus | "") => {
    onFiltersChange({ ...{ status, priority, assigneeId, search }, status: value || undefined });
  };

  const handlePriorityChange = (value: TaskPriority | "") => {
    onFiltersChange({ ...{ status, priority, assigneeId, search }, priority: value || undefined });
  };

  const handleAssigneeChange = (value: string) => {
    onFiltersChange({ ...{ status, priority, assigneeId, search }, assigneeId: value || undefined });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...{ status, priority, assigneeId, search }, search: value || undefined });
  };

  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      onSortChange(column, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(column, "asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={status || ""} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn("w-full sm:w-[160px]", status && "bg-primary/5 border-primary/20")}>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={priority || ""} onValueChange={handlePriorityChange}>
          <SelectTrigger className={cn("w-full sm:w-[160px]", priority && "bg-primary/5 border-primary/20")}>
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee Filter */}
        <div className="relative w-full sm:w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Assignee ID"
            value={assigneeId || ""}
            onChange={(e) => handleAssigneeChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="whitespace-nowrap">
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Advanced Filters - Collapsible */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full sm:w-auto justify-start gap-2"
      >
        <Filter className="h-4 w-4" />
        <span>Advanced Filters</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </Button>

      {isExpanded && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={(v) => handleSortChange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort Order</label>
              <Select value={sortOrder} onValueChange={(v) => handleSortChange(sortBy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Use URL parameters to share filtered views with team members.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}