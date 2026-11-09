"use client";

import { ToolList } from "./components/ToolList";
import { PageHeader } from "@/components/ui/page-header";

export default function ToolsPage() {
  // In a real app, this would come from the workspace context
  const workspaceId = "default";

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Tools"
        description="Discovered tools from connected MCP servers. Tools are discovered automatically from server capabilities."
      />
      <ToolList workspaceId={workspaceId} />
    </div>
  );
}