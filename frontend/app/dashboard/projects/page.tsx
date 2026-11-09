"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Filter, Grid, List, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ProjectCard } from "./components/ProjectCard";
import { ProjectTable } from "./components/ProjectTable";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import type { ProjectResponse, ProjectListParams, ProjectCreate, ProjectUpdate, ProjectStatus } from "@/lib/api/projects";
import { Suspense } from "react";

function ProjectsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Get workspace ID from URL or use a default
  const workspaceId = searchParams.get("workspace_id") || "1";

  // View mode state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">(
    (searchParams.get("status") as ProjectStatus) || "all"
  );
  const [sortBy, setSortBy] = useState<ProjectListParams["sort_by"]>(
    (searchParams.get("sort_by") as ProjectListParams["sort_by"]) || "updated_at"
  );
  const [sortOrder, setSortOrder] = useState<ProjectListParams["sort_order"]>(
    (searchParams.get("sort_order") as ProjectListParams["sort_order"]) || "desc"
  );

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);

  // Fetch projects
  const { data: projectsData, isLoading, refetch } = useProjects(workspaceId, {
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    limit: 50,
  });

  const projects: ProjectResponse[] = projectsData?.data || [];

  // Mutations
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const handleCreateProject = async (data: ProjectCreate) => {
    await createProject.mutateAsync({ workspaceId, data });
    toast({ title: "Project created", description: `${data.name} has been created.` });
    refetch();
  };

  const handleUpdateProject = async (data: Partial<ProjectUpdate>) => {
    if (!editingProject) return;
    await updateProject.mutateAsync({ id: editingProject.id, data });
    toast({ title: "Project updated", description: `${editingProject.name} has been updated.` });
    setEditingProject(null);
    refetch();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
    await deleteProject.mutateAsync(projectId);
    toast({ title: "Project deleted", description: "The project has been deleted." });
    refetch();
  };

  const handleArchiveProject = async (projectId: string) => {
    const project = projects.find((p: ProjectResponse) => p.id === projectId);
    if (!project) return;

    const newStatus: ProjectStatus = project.status === "archived" ? "active" : "archived";
    await updateProject.mutateAsync({ id: projectId, data: { status: newStatus } });
    toast({
      title: newStatus === "archived" ? "Project archived" : "Project restored",
      description: `${project.name} has been ${newStatus === "archived" ? "archived" : "restored"}.`,
    });
    refetch();
  };

  const handleDuplicateProject = async (project: ProjectResponse) => {
    const duplicateData: ProjectCreate = {
      name: `${project.name} (Copy)`,
      description: project.description,
      status: "active",
    };
    await createProject.mutateAsync({ workspaceId, data: duplicateData });
    toast({ title: "Project duplicated", description: `${project.name} has been duplicated.` });
    refetch();
  };

  const handleEditClick = (project: ProjectResponse) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };

  // Apply filters by updating URL
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sortBy) params.set("sort_by", sortBy);
    if (sortOrder) params.set("sort_order", sortOrder);
    router.push(`/dashboard/projects?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleStatusChange = (value: ProjectStatus | "all") => {
    setStatusFilter(value);
    applyFilters();
  };

  const handleSortChange = (field: ProjectListParams["sort_by"], order?: ProjectListParams["sort_order"]) => {
    setSortBy(field);
    setSortOrder(order || (sortBy === field && sortOrder === "asc" ? "desc" : "asc"));
    applyFilters();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track all your projects in one place
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </form>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
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
                onClick={() => handleSortChange("name")}
                className="flex items-center justify-between"
              >
                Name
                {sortBy === "name" && sortOrder === "asc" && <ChevronUp className="h-4 w-4" />}
                {sortBy === "name" && sortOrder === "desc" && <ChevronDown className="h-4 w-4" />}
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
                onClick={() => handleSortChange("task_count")}
                className="flex items-center justify-between"
              >
                Task Count
                {sortBy === "task_count" && sortOrder === "asc" && <ChevronUp className="h-4 w-4" />}
                {sortBy === "task_count" && sortOrder === "desc" && <ChevronDown className="h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center border-l pl-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-4"}>
        {viewMode === "grid" ? (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEditClick}
              onDelete={handleDeleteProject}
              onDuplicate={handleDuplicateProject}
              onArchive={handleArchiveProject}
            />
          ))
        ) : (
          <ProjectTable
            projects={projects}
            isLoading={isLoading}
            onEdit={handleEditClick}
            onDelete={handleDeleteProject}
            onDuplicate={handleDuplicateProject}
            onArchive={handleArchiveProject}
          />
        )}
      </div>

      {projects.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Get started by creating your first project."}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateProject}
        isPending={createProject.isPending}
      />

      {/* Edit Project Dialog */}
      <CreateProjectDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleUpdateProject}
        isPending={updateProject.isPending}
        initialData={editingProject ? { name: editingProject.name, description: editingProject.description, status: editingProject.status } : undefined}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-4">Loading projects...</div>}>
      <ProjectsPageContent />
    </Suspense>
  );
}