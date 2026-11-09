"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Server, Settings, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryTypeDisplay, useDecisionTypeDisplay, useRoleDisplay } from "@/hooks/use-permissions";
import type { ToolWithCategory, ToolCategoryType, DecisionType } from "@/lib/api/permissions";

interface ToolTableProps {
  tools: ToolWithCategory[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function StatusIcon({ iconName }: { iconName: string }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    "check-circle-2": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "x-circle": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "alert-triangle": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    "loader-2": ({ className }) => (
      <svg className={`${className} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  };

  const Icon = icons[iconName] || (({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ));

  return <Icon className="h-4 w-4" />;
}

function CategoryIcon({ category, getCategoryIcon }: { category: ToolCategoryType | undefined; getCategoryIcon: (category: ToolCategoryType) => string }) {
  const iconName = category ? getCategoryIcon(category) : "help-circle";
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    eye: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    "edit-3": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    "alert-triangle": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    "help-circle": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const Icon = icons[iconName] || (({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ));

  return <Icon className="h-3 w-3" />;
}

export function ToolTable({
  tools,
  onDelete,
  isDeleting,
}: ToolTableProps) {
  const { getCategoryLabel, getCategoryColor, getCategoryIcon } = useCategoryTypeDisplay();
  const { getDecisionLabel, getDecisionColor, getDecisionIcon } = useDecisionTypeDisplay();

  // Server status display helpers (not permission decisions)
  const getServerStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      connected: "Connected",
      disconnected: "Disconnected",
      connecting: "Connecting",
      error: "Error",
    };
    return labels[status] || status;
  };

  const getServerStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      connected: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      disconnected: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      connecting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return colors[status] || colors.disconnected;
  };

  const getServerStatusIcon = (status: string): string => {
    const icons: Record<string, string> = {
      connected: "check-circle-2",
      disconnected: "x-circle",
      connecting: "loader-2",
      error: "alert-triangle",
    };
    return icons[status] || "help-circle";
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-56">Name</TableHead>
            <TableHead className="w-36">Category</TableHead>
            <TableHead className="w-32">Server</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-24">Enabled</TableHead>
            <TableHead className="w-32">Discovered</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tools.map((tool) => {
            const category = tool.permission_category || tool.category?.default_category;
            const statusIcon = getServerStatusIcon(tool.server_status);
            const enabledDecision: DecisionType = tool.is_enabled ? "allowed" : "denied";
            return (
              <TableRow key={tool.id} className="hover:bg-muted/50">
                <TableCell>
                  <div>
                    <p className="font-medium truncate max-w-[250px]">{tool.name}</p>
                    {tool.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[250px]">{tool.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1", getCategoryColor(category))}>
                    <CategoryIcon category={category} getCategoryIcon={getCategoryIcon} />
                    {getCategoryLabel(category)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{tool.server_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1", getServerStatusColor(tool.server_status))}>
                    <StatusIcon iconName={statusIcon} />
                    {getServerStatusLabel(tool.server_status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1", getDecisionColor(enabledDecision))}>
                    <StatusIcon iconName={getDecisionIcon(enabledDecision)} />
                    {getDecisionLabel(enabledDecision)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {tool.discovered_at
                    ? new Date(tool.discovered_at).toLocaleDateString()
                    : "Unknown"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(tool.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}