"use client";

import { useParams } from "next/navigation";
import { ServerTabs } from "./components/ServerTabs";
import { ServerOverviewTab } from "./components/ServerOverviewTab";
import { ServerToolsTab } from "./components/ServerToolsTab";
import { ServerResourcesTab } from "./components/ServerResourcesTab";
import { ServerPromptsTab } from "./components/ServerPromptsTab";
import { ServerActivityTab } from "./components/ServerActivityTab";
import { ServerSettingsTab } from "./components/ServerSettingsTab";
import { useServer } from "@/hooks/use-servers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ServerDetailPage() {
  const params = useParams<{ serverId: string }>();
  const serverId = params.serverId;
  const { data: server, isLoading, error, refetch } = useServer(serverId);

  if (error) {
    toast.error(`Failed to load server: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/dashboard/servers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Servers
            </a>
          </Button>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="h-6 animate-pulse bg-muted rounded w-1/2 mx-auto mb-4" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 animate-pulse bg-muted rounded" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/dashboard/servers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Servers
            </a>
          </Button>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">Server not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="/dashboard/servers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Servers
          </a>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <ServerTabs server={server} />

      <div className="space-y-6">
        <ServerOverviewTab serverId={serverId} />
        <ServerToolsTab serverId={serverId} workspaceId="default" />
        <ServerResourcesTab serverId={serverId} />
        <ServerPromptsTab serverId={serverId} />
        <ServerActivityTab serverId={serverId} />
        <ServerSettingsTab serverId={serverId} />
      </div>
    </div>
  );
}