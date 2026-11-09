"use client";

import { useRoleDisplay } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FolderOpen, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceResponse } from "@/lib/api/workspaces";

interface WorkspaceTableProps {
  workspaces: WorkspaceResponse[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function WorkspaceTable({ workspaces, onDelete, isDeleting }: WorkspaceTableProps) {
  const { getRoleLabel, getRoleColor } = useRoleDisplay();
  const currentUserRole = "owner"; // Placeholder

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>Your workspaces</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Members</TableHead>
            <TableHead className="hidden lg:table-cell">Projects</TableHead>
            <TableHead className="hidden md:table-cell">Your Role</TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map((workspace) => (
            <TableRow key={workspace.id}>
              <TableCell className="font-medium">{workspace.name}</TableCell>
              <TableCell className="hidden md:table-cell">{workspace.member_count}</TableCell>
              <TableCell className="hidden lg:table-cell">{workspace.project_count}</TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline" className={cn(getRoleColor(currentUserRole))}>
                  {getRoleLabel(currentUserRole)}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {new Date(workspace.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Button variant="ghost" className="w-full justify-start gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Open Workspace
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Button variant="ghost" className="w-full justify-start gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}