"use client";

import { useRoleDisplay } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Users, FolderOpen, Settings, Trash2, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceResponse } from "@/lib/api/workspaces";

interface WorkspaceCardProps {
  workspace: WorkspaceResponse;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function WorkspaceCard({ workspace, onDelete, isDeleting }: WorkspaceCardProps) {
  const { getRoleLabel, getRoleColor } = useRoleDisplay();
  // TODO: Get current user's role in this workspace
  const currentUserRole = "owner"; // Placeholder - would come from workspace data

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{workspace.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {workspace.member_count} member{workspace.member_count !== 1 ? "s" : ""} • {workspace.project_count} project{workspace.project_count !== 1 ? "s" : ""}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Open Workspace
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                asChild
                onClick={() => onDelete(workspace.id)}
                disabled={isDeleting}
              >
                <Button variant="ghost" className="w-full justify-start gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{workspace.member_count} members</span>
          <Badge variant="outline" className={cn(getRoleColor(currentUserRole), "ml-auto")}>
            {getRoleLabel(currentUserRole)}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground">
            Created {new Date(workspace.created_at).toLocaleDateString()}
          </span>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/dashboard/workspaces/${workspace.id}`}>View Details</a>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}