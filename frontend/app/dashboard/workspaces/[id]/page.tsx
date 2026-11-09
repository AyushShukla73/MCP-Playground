"use client";

import { useParams } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspaces";
import { WorkspaceTabs } from "./components/WorkspaceTabs";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Workspace not found</h1>
          <p className="text-muted-foreground mb-6">
            The workspace you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => window.location.href = "/dashboard/workspaces"}>
            Back to Workspaces
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title={workspace.name} description={workspace.description || undefined} />
      </div>

      <WorkspaceTabs workspaceId={workspaceId} workspace={workspace} />
    </div>
  );
}