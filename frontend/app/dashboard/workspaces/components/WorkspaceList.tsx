"use client";

import { useState } from "react";
import { useWorkspaces, useDeleteWorkspace } from "@/hooks/use-workspaces";
import { WorkspaceCard } from "./WorkspaceCard";
import { WorkspaceTable } from "./WorkspaceTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Grid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceResponse } from "@/lib/api/workspaces";

export function WorkspaceList() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "members" | "created">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: workspaces, isLoading, error } = useWorkspaces();
  const deleteWorkspace = useDeleteWorkspace();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load workspaces</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn-secondary"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  // Filter and sort workspaces
  const filteredWorkspaces: WorkspaceResponse[] = (workspaces || []).filter((workspace: WorkspaceResponse) => {
    const matchesSearch = workspace.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || true; // We'd need current user role for this
    return matchesSearch && matchesRole;
  }).sort((a: WorkspaceResponse, b: WorkspaceResponse) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "members":
        comparison = a.member_count - b.member_count;
        break;
      case "created":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value: string) => setRoleFilter(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: "name" | "members" | "created") => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="members">Members</SelectItem>
              <SelectItem value="created">Created</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className={cn(sortOrder === "desc" && "rotate-180")}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h13M3 12h13M3 16h13" />
            </svg>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Workspace List */}
      {filteredWorkspaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workspaces found</h3>
            <p className="text-muted-foreground">
              {searchQuery || roleFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first workspace to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onDelete={(id) => deleteWorkspace.mutate(id)}
                isDeleting={deleteWorkspace.isPending && deleteWorkspace.variables === workspace.id}
              />
            ))}
          </div>
        ) : (
          <WorkspaceTable
            workspaces={filteredWorkspaces}
            onDelete={(id) => deleteWorkspace.mutate(id)}
            isDeleting={deleteWorkspace.isPending}
          />
        )
      )}
    </div>
  );
}