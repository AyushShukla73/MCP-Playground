"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { X, Edit, Save, Calendar, User, Clock, AlertCircle } from "lucide-react";
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
import { useUpdateTask, useTaskStatusDisplay, useTaskPriorityDisplay } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import type { TaskResponse, TaskStatus, TaskPriority } from "@/lib/api/projects";

const taskUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  status: z.enum(["todo", "in_progress", "review", "done", "blocked"] as [TaskStatus, ...TaskStatus[]]),
  priority: z.enum(["low", "medium", "high", "critical"] as [TaskPriority, ...TaskPriority[]]),
  assignee_id: z.string().optional(),
  due_date: z.string().optional(),
});

type TaskUpdateFormData = z.infer<typeof taskUpdateSchema>;

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskResponse | null;
}

export function TaskDetailDialog({ open, onOpenChange, task }: TaskDetailDialogProps) {
  const { toast } = useToast();
  const { getStatusLabel, getStatusColor } = useTaskStatusDisplay();
  const { getPriorityLabel, getPriorityColor } = useTaskPriorityDisplay();

  const updateTask = useUpdateTask();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<TaskUpdateFormData>({
    resolver: zodResolver(taskUpdateSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignee_id: "",
      due_date: "",
    },
  });

  // Reset form when task changes
  if (task && !isEditing) {
    form.reset({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee_id || "",
      due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "",
    });
  }

  const handleSubmit = async (data: TaskUpdateFormData) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, data });
      toast({ title: "Task updated", description: "Changes have been saved." });
      setIsEditing(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false);
      if (task) {
        form.reset({
          title: task.title,
          description: task.description || "",
          status: task.status,
          priority: task.priority,
          assignee_id: task.assignee_id || "",
          due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "",
        });
      }
    } else {
      onOpenChange(false);
    }
  };

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading task...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{task.title}</DialogTitle>
              <DialogDescription>
                {task.project_id ? `Project: ${task.project_id}` : "No project assigned"}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {!isEditing ? (
          // View Mode
          <div className="grid gap-4 py-4">
            {/* Status & Priority Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn(getStatusColor(task.status), "capitalize")}>
                {getStatusLabel(task.status)}
              </Badge>
              <Badge variant="outline" className={cn(getPriorityColor(task.priority), "capitalize")}>
                {getPriorityLabel(task.priority)}
              </Badge>
            </div>

            {/* Description */}
            {task.description && (
              <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <div className="flex items-center gap-2">
                  {task.assignee_name ? (
                    <>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {task.assignee_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span>{task.assignee_name}</span>
                    </>
                  ) : task.assignee_id ? (
                    <span className="text-muted-foreground">{task.assignee_id}</span>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                {task.due_date ? (
                  <div className="flex items-center gap-2">
                    <Calendar className={cn("h-4 w-4", isOverdue && "text-destructive")} />
                    <span className={cn(isOverdue && "text-destructive font-medium")}>
                      {format(new Date(task.due_date), "MMM d, yyyy")}
                      {isOverdue && <AlertCircle className="h-4 w-4" />}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No due date</span>
                )}
              </div>

              <div className="space-y-2">
                <Label>Created</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(task.created_at), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Last Updated</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(task.updated_at), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              </div>
            </div>

            {/* Task ID */}
            <div className="pt-4 border-t">
              <Label>Task ID</Label>
              <code className="text-sm text-muted-foreground font-mono break-all">{task.id}</code>
            </div>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Implement user authentication"
                {...form.register("title")}
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
                <Label htmlFor="assignee_id">Assignee</Label>
                <Input
                  id="assignee_id"
                  placeholder="User ID (optional)"
                  {...form.register("assignee_id")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...form.register("due_date")}
                />
              </div>
            </div>
          </form>
        )}

        <DialogFooter className="border-t pt-4">
          {!isEditing ? (
            <div className="w-full flex justify-between">
              <Button variant="outline" onClick={handleCancel}>
                Close
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={updateTask.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}