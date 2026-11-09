"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, Archive, UserCheck, Shield, Trash2, Copy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProject, useUpdateProject, useDeleteProject, useProjectRoleDisplay } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import type { ProjectResponse, ProjectStatus } from "@/lib/api/projects";

const settingsSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  status: z.enum(["active", "archived", "on_hold"] as [ProjectStatus, ...ProjectStatus[]]).default("active"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface ProjectSettingsTabProps {
  project: ProjectResponse;
  onClose: () => void;
}

export function ProjectSettingsTab({ project, onClose }: ProjectSettingsTabProps) {
  const { toast } = useToast();
  const { getRoleLabel, getRoleColor, getRoleHierarchy, canManageRole } = useProjectRoleDisplay();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  const updateSettings = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createProject = useCreateProject();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      status: project.status,
    },
  });

  const handleSubmit = async (data: SettingsFormData) => {
    const hasNameOrDescriptionChange = data.name !== project.name || data.description !== project.description;
    const hasStatusChange = data.status !== project.status;

    if (hasNameOrDescriptionChange) {
      await updateSettings.mutateAsync({
        id: project.id,
        data: { name: data.name, description: data.description },
      });
    }
    if (hasStatusChange) {
      await updateSettings.mutateAsync({
        id: project.id,
        data: { status: data.status },
      });
    }

    toast({
      title: "Settings saved",
      description: "Project settings have been updated.",
    });
    onClose();
  };

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id);
    toast({ title: "Project deleted", description: "The project has been deleted." });
    onClose();
  };

  const handleDuplicate = async () => {
    await createProject.mutateAsync({
      workspaceId: project.workspace_id,
      data: { name: `${project.name} (Copy)`, description: project.description, status: "active" },
    });
    toast({ title: "Project duplicated", description: `${project.name} has been duplicated.` });
    setIsDuplicateDialogOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* General Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">General</h2>
        <div className="rounded-lg border p-6 space-y-6">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Website Redesign"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
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
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select {...form.register("status")}>
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
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Project Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Project Information</h2>
        <div className="rounded-lg border p-6 space-y-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Project ID</dt>
              <dd className="font-mono text-sm break-all">{project.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Workspace ID</dt>
              <dd className="font-mono text-sm break-all">{project.workspace_id}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge variant="outline" className={cn(
                  project.status === "active" && "bg-green-50 text-green-700 border-green-200",
                  project.status === "on_hold" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                  project.status === "archived" && "bg-gray-50 text-gray-700 border-gray-200"
                )}>
                  {project.status.replace("_", " ")}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm">{new Date(project.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Last Updated</dt>
              <dd className="text-sm">{new Date(project.updated_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Danger Zone
        </h2>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-6">
          {/* Duplicate Project */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg bg-background">
            <div>
              <h3 className="font-medium">Duplicate Project</h3>
              <p className="text-sm text-muted-foreground">
                Create a copy of this project with all its tasks and settings. Members will not be copied.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsDuplicateDialogOpen(true)}
              disabled={updateSettings.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
          </div>

          {/* Delete Project */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div>
              <h3 className="font-medium text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Project
              </h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all its tasks. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={deleteProject.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </Button>
          </div>
        </div>
      </section>

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Project</DialogTitle>
            <DialogDescription>
              This will create a new project called "{project.name} (Copy)" with all tasks and settings.
              Members will not be copied to the new project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Duplicating..." : "Duplicate Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.name}"? This will permanently remove the project
              and all its tasks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}