"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, ArrowLeft } from "lucide-react";
import { ProjectOverviewTab } from "./components/ProjectOverviewTab";
import { ProjectTasksTab } from "./components/ProjectTasksTab";
import { ProjectMembersTab } from "./components/ProjectMembersTab";
import { ProjectActivityTab } from "./components/ProjectActivityTab";
import { ProjectSettingsTab } from "./components/ProjectSettingsTab";
import { useProject, useUpdateProject, useDeleteProject, useCreateProject } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import type { ProjectResponse, ProjectStatus } from "@/lib/api/projects";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const projectId = params.id as string;
  const initialTab = (searchParams.get("tab") as string) || "overview";

  const { data: project, isLoading, refetch } = useProject(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/dashboard/projects/${projectId}?${params.toString()}`);
  };

  const handleUpdateStatus = async (status: ProjectStatus) => {
    if (!project) return;
    await updateProject.mutateAsync({ id: projectId, data: { status } });
    toast({ title: "Project updated", description: `Status changed to ${status}.` });
    refetch();
  };

  const handleDelete = async () => {
    if (!project || !confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
    await deleteProject.mutateAsync(projectId);
    toast({ title: "Project deleted", description: "The project has been deleted." });
    router.push("/dashboard/projects");
  };

  const createProject = useCreateProject();

  const handleDuplicate = async () => {
    if (!project) return;
    await createProject.mutateAsync({
      workspaceId: project.workspace_id,
      data: { name: `${project.name} (Copy)`, description: project.description, status: "active" },
    });
    toast({ title: "Project duplicated", description: `${project.name} has been duplicated.` });
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Project not found</h2>
        <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist or has been removed.</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="sm:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">{project.description || "No description provided"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 border-r pr-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className="capitalize px-2 py-1 text-sm font-medium rounded-full bg-primary/10 text-primary">
              {project.status.replace("_", " ")}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleUpdateStatus(project.status === "active" ? "on_hold" : "active")}
                className="flex items-center gap-2"
              >
                {project.status === "active" ? "Put on Hold" : "Set Active"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUpdateStatus("archived")}
                className="flex items-center gap-2"
              >
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDuplicate}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2"
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverviewTab project={project} onStatusChange={handleUpdateStatus} />
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectTasksTab projectId={projectId} project={project} />
        </TabsContent>

        <TabsContent value="members">
          <ProjectMembersTab projectId={projectId} project={project} />
        </TabsContent>

        <TabsContent value="activity">
          <ProjectActivityTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettingsTab project={project} onClose={() => setIsSettingsOpen(false)} />
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <ProjectSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        project={project}
        onStatusChange={handleUpdateStatus}
        onDelete={handleDelete}
        updateProjectMutation={updateProject}
      />
    </div>
  );
}

// Import DropdownMenu components for the header
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Settings Dialog Component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const settingsSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  status: z.enum(["active", "archived", "on_hold"] as [ProjectStatus, ...ProjectStatus[]]).default("active"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectResponse;
  onStatusChange: (status: ProjectStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}

function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
  onStatusChange,
  onDelete,
  updateProjectMutation,
}: ProjectSettingsDialogProps & { updateProjectMutation: ReturnType<typeof useUpdateProject> }) {
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      status: project.status,
    },
  });

  const handleSubmit = async (data: SettingsFormData) => {
    if (data.name !== project.name || data.description !== project.description) {
      await updateProjectMutation.mutateAsync({ id: project.id, data: { name: data.name, description: data.description } });
    }
    if (data.status !== project.status) {
      await onStatusChange(data.status);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Manage project details and settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Website Redesign"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project..."
                rows={3}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                {...form.register("status")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-4">Danger Zone</p>
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="w-full"
              >
                Delete Project
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}