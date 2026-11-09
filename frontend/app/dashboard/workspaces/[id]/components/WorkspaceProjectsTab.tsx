"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";

interface WorkspaceProjectsTabProps {
  workspaceId: string;
}

export function WorkspaceProjectsTab({ workspaceId }: WorkspaceProjectsTabProps) {
  const router = useRouter();

  const handleNewProject = () => {
    router.push(`/dashboard/workspaces/${workspaceId}/projects/new`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Projects</h2>
          <p className="text-muted-foreground">Manage projects within this workspace</p>
        </div>
        <Button onClick={handleNewProject}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first project to start organizing work
          </p>
          <Button onClick={handleNewProject}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}