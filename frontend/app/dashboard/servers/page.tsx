"use client";

import { useState } from "react";
import { ServerList } from "@/app/dashboard/servers/components/ServerList";
import { CreateServerDialog } from "@/app/dashboard/servers/components/CreateServerDialog";
import { PageHeader } from "@/components/ui/page-header";

export default function ServersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Servers"
        description="Register, connect to, and manage MCP servers"
        action={
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="btn-primary"
          >
            Add Server
          </button>
        }
      />

      <ServerList />

      <CreateServerDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}