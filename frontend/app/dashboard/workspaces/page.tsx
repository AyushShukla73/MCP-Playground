"use client";

import { useState } from "react";
import { WorkspaceList } from "@/app/dashboard/workspaces/components/WorkspaceList";
import { CreateWorkspaceDialog } from "@/app/dashboard/workspaces/components/CreateWorkspaceDialog";
import { PageHeader } from "@/components/ui/page-header";

export default function WorkspacesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        description="Manage your workspaces and collaborate with team members"
        action={
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="btn-primary"
          >
            Create Workspace
          </button>
        }
      />

      <WorkspaceList />

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}