"use client";

import { useState } from "react";
import { useWorkspaceTools, useWorkspaceServers } from "@/hooks/use-workspace-tools";
import { ToolCard } from "./ToolCard";
import { ToolTable } from "./ToolTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Grid, List, Server, Wifi, WifiOff, AlertTriangle, Loader2, Eye, Edit3, AlertTriangle as AlertTriangleIcon, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryTypeDisplay } from "@/hooks/use-permissions";
import type { ToolWithCategory, ToolCategoryType } from "@/lib/api/permissions";

export function ToolList({ workspaceId }: { workspaceId: string }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ToolCategoryType | "all">("all");
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [enabledFilter, setEnabledFilter] = useState<boolean | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "category" | "server" | "status" | "enabled" | "discovered_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { getCategoryLabel, getCategoryColor } = useCategoryTypeDisplay();

  const { data: toolsData, isLoading, error, refetch } = useWorkspaceTools(workspaceId, {
    search: searchQuery || undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    serverId: serverFilter === "all" ? undefined : serverFilter,
    enabled: enabledFilter === "all" ? undefined : enabledFilter,
  });

  const { data: serversData } = useWorkspaceServers(workspaceId);

  const tools = toolsData || [];
  const servers = serversData || [];

  if (isLoading && !tools.length) {
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
          <p className="text-destructive">Failed to load tools</p>
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

  // Filter and sort tools (client-side as backup, but API does it too)
  const filteredTools: ToolWithCategory[] = tools.filter((tool: ToolWithCategory) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.server_name.toLowerCase().includes(searchQuery.toLowerCase());
    const category = tool.permission_category || tool.category?.default_category;
    const matchesCategory = categoryFilter === "all" || category === categoryFilter;
    const matchesServer = serverFilter === "all" || tool.server_id === serverFilter;
    const matchesEnabled = enabledFilter === "all" || tool.is_enabled === enabledFilter;
    return matchesSearch && matchesCategory && matchesServer && matchesEnabled;
  }).sort((a: ToolWithCategory, b: ToolWithCategory) => {
    let comparison = 0;
    const categoryA = a.permission_category || a.category?.default_category;
    const categoryB = b.permission_category || b.category?.default_category;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "category":
        comparison = (categoryA || "").localeCompare(categoryB || "");
        break;
      case "server":
        comparison = a.server_name.localeCompare(b.server_name);
        break;
      case "status":
        comparison = a.server_status.localeCompare(b.server_status);
        break;
      case "enabled":
        comparison = Number(a.is_enabled) - Number(b.is_enabled);
        break;
      case "discovered_at":
        comparison = new Date(a.discovered_at).getTime() - new Date(b.discovered_at).getTime();
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const categoryOptions: { value: ToolCategoryType | "all"; label: string; icon: typeof Eye }[] = [
    { value: "all", label: "All Categories", icon: HelpCircle },
    { value: "read", label: "Read", icon: Eye },
    { value: "write", label: "Write", icon: Edit3 },
    { value: "destructive", label: "Destructive", icon: AlertTriangleIcon },
    { value: "unknown", label: "Unknown", icon: HelpCircle },
  ];

  const statusOptions = [
    { value: "all", label: "All Status", icon: Server },
    { value: "connected", label: "Connected", icon: Wifi },
    { value: "disconnected", label: "Disconnected", icon: WifiOff },
    { value: "error", label: "Error", icon: AlertTriangle },
    { value: "connecting", label: "Connecting", icon: Loader2 },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(value: ToolCategoryType | "all") => setCategoryFilter(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serverFilter} onValueChange={(value: string) => setServerFilter(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Servers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Servers</SelectItem>
              {servers.map((server) => (
                <SelectItem key={server.id} value={server.id}>
                  {server.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={enabledFilter} onValueChange={(value: boolean | "all") => setEnabledFilter(value)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Enabled" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value={true}>Enabled</SelectItem>
              <SelectItem value={false}>Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: "name" | "category" | "server" | "status" | "enabled" | "discovered_at") => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="status">Server Status</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="discovered_at">Discovered</SelectItem>
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

      {/* Tool List */}
      {filteredTools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tools found</h3>
            <p className="text-muted-foreground">
              {searchQuery || categoryFilter !== "all" || serverFilter !== "all" || enabledFilter !== "all"
                ? "Try adjusting your filters"
                : "No tools discovered yet. Connect an MCP server to discover available tools."}
            </p>
          </CardContent>
        </Card>
      ) : (
        viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <ToolTable tools={filteredTools} />
        )
      )}
    </div>
  );
}