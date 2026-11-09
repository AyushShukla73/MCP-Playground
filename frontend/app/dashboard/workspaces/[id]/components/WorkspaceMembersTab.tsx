"use client";

import { useState } from "react";
import { useWorkspaceMembers, useAddWorkspaceMember, useUpdateWorkspaceMember, useRemoveWorkspaceMember } from "@/hooks/use-workspaces";
import { useRoleDisplay } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, UserPlus, Trash2, UserCheck, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { WorkspaceRole, WorkspaceMemberResponse } from "@/lib/api/workspaces";

interface WorkspaceMembersTabProps {
  workspaceId: string;
}

const ROLE_OPTIONS: { value: WorkspaceRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

export function WorkspaceMembersTab({ workspaceId }: WorkspaceMembersTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<WorkspaceRole>("member");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<WorkspaceRole>("member");

  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const addMember = useAddWorkspaceMember();
  const updateMember = useUpdateWorkspaceMember();
  const removeMember = useRemoveWorkspaceMember();
  const { getRoleLabel, getRoleColor, getRoleHierarchy, canManageRole } = useRoleDisplay();
  const { toast } = useToast();

  const currentUserRole = "owner"; // Placeholder - would come from workspace data

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    try {
      // In a real app, we'd look up the user by email first
      // For now, we'll simulate with a placeholder user_id
      await addMember.mutateAsync({
        workspaceId,
        data: { user_id: newMemberEmail.trim(), role: newMemberRole },
      });
      toast({
        title: "Member added",
        description: `${newMemberEmail} has been added as ${getRoleLabel(newMemberRole)}.`,
      });
      setIsAddDialogOpen(false);
      setNewMemberEmail("");
    } catch (error) {
      toast({
        title: "Failed to add member",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (memberId: string, role: WorkspaceRole) => {
    if (!canManageRole(currentUserRole, role)) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to assign this role.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateMember.mutateAsync({ workspaceId, userId: memberId, data: { role } });
      toast({
        title: "Role updated",
        description: `Member role changed to ${getRoleLabel(role)}.`,
      });
      setEditingMemberId(null);
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this workspace?`)) {
      return;
    }

    try {
      await removeMember.mutateAsync({ workspaceId, userId: memberId });
      toast({
        title: "Member removed",
        description: `${memberEmail} has been removed from the workspace.`,
      });
    } catch (error) {
      toast({
        title: "Failed to remove member",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const startEditRole = (member: WorkspaceMemberResponse) => {
    if (canManageRole(currentUserRole, member.role)) {
      setEditingMemberId(member.id);
      setEditingRole(member.role);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Members</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse bg-muted rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Members</h2>
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(members || []).map((member: WorkspaceMemberResponse) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {member.user_name?.charAt(0).toUpperCase() || member.user_email?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.user_name || member.user_email || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{member.user_email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {editingMemberId === member.id ? (
                    <Select value={editingRole} onValueChange={(value: WorkspaceRole) => setEditingRole(value)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={cn(getRoleColor(member.role), "capitalize")}>
                      {getRoleLabel(member.role)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(member.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canManageRole(currentUserRole, member.role) && (
                        <>
                          <DropdownMenuItem
                            onClick={() => startEditRole(member)}
                            className="flex items-center gap-2"
                          >
                            <UserCheck className="h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id, member.user_email || "member")}
                            className="flex items-center gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </>
                      )}
                      {!canManageRole(currentUserRole, member.role) && (
                        <DropdownMenuItem className="text-muted-foreground" disabled>
                          <span className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4 opacity-50" />
                            No permission to manage
                          </span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(members || []).length === 0 && (
        <div className="text-center py-12">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No members yet</h3>
          <p className="text-muted-foreground mb-6">
            Invite team members to collaborate in this workspace
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Invite a new member to this workspace by entering their email address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  required
                  disabled={addMember.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newMemberRole} onValueChange={(value: WorkspaceRole) => setNewMemberRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={addMember.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addMember.isPending || !newMemberEmail.trim()}>
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}