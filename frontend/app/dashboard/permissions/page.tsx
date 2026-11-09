"use client";

import { PermissionsPageContent } from "./components/PermissionsPageContent";
import { PageHeader } from "@/components/ui/page-header";

export default function PermissionsPage() {
  // In a real app, this would come from the workspace context
  const workspaceId = "default";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Permissions"
        description="Manage permission policies, role permissions, and rules for MCP tool access control."
      />
      <PermissionsPageContent workspaceId={workspaceId} />
    </div>
  );
}