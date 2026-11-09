"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wifi, Cpu, Database, MessageSquare, Activity, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerResponse, MCPServerStatus } from "@/lib/api/servers";

interface ServerTabsProps {
  server: MCPServerResponse;
  defaultTab?: string;
}

export function ServerTabs({ server, defaultTab = "overview" }: ServerTabsProps) {
  const getStatusColor = (status: MCPServerStatus) => {
    switch (status) {
      case "connected":
        return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      case "connecting":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "disconnected":
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400";
      case "error":
        return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: MCPServerStatus) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Wifi, description: "Connection status and health" },
    { id: "tools", label: "Tools", icon: Cpu, description: "Available tools and testing" },
    { id: "resources", label: "Resources", icon: Database, description: "Available resources" },
    { id: "prompts", label: "Prompts", icon: MessageSquare, description: "Available prompts" },
    { id: "activity", label: "Activity", icon: Activity, description: "Operation logs" },
    { id: "settings", label: "Settings", icon: Settings, description: "Server configuration" },
  ];

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:shadow-sm",
              "flex flex-col items-center gap-1 py-3 px-2 text-sm"
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span className="font-medium">{tab.label}</span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              {tab.description}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Connection status indicator */}
      <div className="mb-4 flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(server.status))}>
            {server.status === "connecting" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                {getStatusLabel(server.status)}
              </>
            ) : (
              getStatusLabel(server.status)
            )}
          </span>
        </div>
        <div className="flex-1" />
        <div className="text-sm text-muted-foreground">
          Transport: <span className="font-mono capitalize">{server.transport_type.replace("_", " ")}</span>
        </div>
        {server.last_connected_at && (
          <div className="text-sm text-muted-foreground">
            Last connected:{" "}
            <span className="font-mono">
              {new Date(server.last_connected_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-4">
          <div id={tab.id} />
        </TabsContent>
      ))}
    </Tabs>
  );
}