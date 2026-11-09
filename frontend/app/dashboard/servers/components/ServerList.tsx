"use client";

import { useState } from "react";
import { useServers, useDeleteServer, useServerStatusDisplay, useTransportDisplay } from "@/hooks/use-servers";
import { ServerCard } from "./ServerCard";
import { ServerTable } from "./ServerTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Grid, List, Server, Wifi, WifiOff, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerResponse, MCPServerStatus, MCPTransportType } from "@/lib/api/servers";

export function ServerList() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MCPServerStatus | "all">("all");
  const [transportFilter, setTransportFilter] = useState<MCPTransportType | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "status" | "transport_type" | "created_at" | "updated_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  const { getStatusLabel, getStatusColor, getStatusIcon } = useServerStatusDisplay();
  const { getTransportLabel, getTransportColor } = useTransportDisplay();

  const { data: serversData, isLoading, error, refetch } = useServers({
    workspace_id: selectedWorkspaceId,
    status: statusFilter === "all" ? undefined : statusFilter,
    transport_type: transportFilter === "all" ? undefined : transportFilter,
    search: searchQuery || undefined,
    limit: 50,
    offset: 0,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const deleteServer = useDeleteServer();

  // For now, use a placeholder workspace ID - in real app this would come from context
  // We need to show something even without a workspace selected
  const servers = serversData?.servers || [];

  if (isLoading && !servers.length) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Server className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-destructive">Failed to load servers</p>
          <button
            onClick={() => refetch()}
            className="mt-4 btn-secondary"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  // Filter and sort servers (client-side as backup, but API does it too)
  const filteredServers: MCPServerResponse[] = servers.filter((server: MCPServerResponse) => {
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || server.status === statusFilter;
    const matchesTransport = transportFilter === "all" || server.transport_type === transportFilter;
    return matchesSearch && matchesStatus && matchesTransport;
  }).sort((a: MCPServerResponse, b: MCPServerResponse) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "transport_type":
        comparison = a.transport_type.localeCompare(b.transport_type);
        break;
      case "created_at":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "updated_at":
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const statusOptions: { value: MCPServerStatus | "all"; label: string; icon: typeof Server }[] = [
    { value: "all", label: "All Status", icon: Server },
    { value: "connected", label: "Connected", icon: Wifi },
    { value: "disconnected", label: "Disconnected", icon: WifiOff },
    { value: "error", label: "Error", icon: AlertTriangle },
    { value: "connecting", label: "Connecting", icon: Loader2 },
  ];

  const transportOptions: { value: MCPTransportType | "all"; label: string }[] = [
    { value: "all", label: "All Transports" },
    { value: "stdio", label: "STDIO" },
    { value: "streamable_http", label: "Streamable HTTP" },
    { value: "sse", label: "SSE" },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: MCPServerStatus | "all") => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={transportFilter} onValueChange={(value: MCPTransportType | "all") => setTransportFilter(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Transports" />
            </SelectTrigger>
            <SelectContent>
              {transportOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: "name" | "status" | "transport_type" | "created_at" | "updated_at") => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="transport_type">Transport</SelectItem>
              <SelectItem value="created_at">Created</SelectItem>
              <SelectItem value="updated_at">Updated</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className={cn(sortOrder === "desc" && "rotate-180")}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h13M3 12h13M3 16h13" />
            </svg>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Server List */}
      {filteredServers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No servers found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" || transportFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first MCP server to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onDelete={(id) => deleteServer.mutate(id)}
                isDeleting={deleteServer.isPending && deleteServer.variables === server.id}
                getStatusLabel={getStatusLabel}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                getTransportLabel={getTransportLabel}
                getTransportColor={getTransportColor}
              />
            ))}
          </div>
        ) : (
          <ServerTable
            servers={filteredServers}
            onDelete={(id) => deleteServer.mutate(id)}
            isDeleting={deleteServer.isPending}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getTransportLabel={getTransportLabel}
            getTransportColor={getTransportColor}
          />
        )
      )}
    </div>
  );
}