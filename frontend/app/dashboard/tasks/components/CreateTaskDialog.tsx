"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { X, Calendar } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import type { TaskStatus, TaskPriority } from "@/lib/api/projects";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  status: z.enum(["todo", "in_progress", "review", "done", "blocked"] as [TaskStatus, ...TaskStatus[]]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"] as [TaskPriority, ...TaskPriority[]]).default("medium"),
  assignee_id: z.string().optional(),
  due_date: z.string().optional(),
  project_id: z.string().optional(),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onCreate: (data: CreateTaskFormData) => Promise<void>;
}

export function CreateTaskDialog({ open, onOpenChange, workspaceId, onCreate }: CreateTaskDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignee_id: "",
      due_date: "",
      project_id: "",
    },
  });

  const handleSubmit = async (data: CreateTaskFormData) => {
    setIsSubmitting(true);
    try {
      await onCreate(data);
      form.reset({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assignee_id: "",
        due_date: "",
        project_id: "",
      });
    } catch (error) {
      // Error handled in onCreate
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignee_id: "",
      due_date: "",
      project_id: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Implement user authentication"
              {...form.register("title")}
              autoFocus
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the task in detail..."
              rows={3}
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select {...form.register("status")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select {...form.register("priority")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project (Optional)</Label>
              <Input
                id="project_id"
                placeholder="Project ID"
                {...form.register("project_id")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee_id">Assignee (Optional)</Label>
              <Input
                id="assignee_id"
                placeholder="User ID"
                {...form.register("assignee_id")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date (Optional)</Label>
            <Input
              id="due_date"
              type="date"
              {...form.register("due_date")}
            />
          </div>
        </form>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}