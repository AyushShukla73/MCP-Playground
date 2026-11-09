"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Search, MoreHorizontal, Mail, UserMinus, Shield, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProjectMembers, useAddProjectMember, useUpdateProjectMember, useRemoveProjectMember, useProjectRoleDisplay } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import type { ProjectMemberResponse, ProjectRole } from "@/lib/api/projects";

const inviteSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  role: z.enum(["owner", "admin", "member", "viewer"] as [ProjectRole, ...ProjectRole[]]).default("member"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface ProjectMembersTabProps {
  projectId: string;
  project: { id: string; workspace_id: string; name: string };
}

export function ProjectMembersTab({ projectId, project }: ProjectMembersTabProps) {
  const { toast } = useToast();
  const { getRoleLabel, getRoleColor, getRoleHierarchy, canManageRole } = useProjectRoleDisplay();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<ProjectRole | "all">("all");

  const handleRoleFilterChange = (value: ProjectRole | "all") => {
    setRoleFilter(value);
  };

  // Fetch members
  const { data: membersData, isLoading, refetch } = useProjectMembers(projectId);

  const members: ProjectMemberResponse[] = membersData?.data || [];

  // Mutations
  const addMember = useAddProjectMember();
  const updateMember = useUpdateProjectMember();
  const removeMember = useRemoveProjectMember();

  const handleInviteMember = async (data: InviteFormData) => {
    await addMember.mutateAsync({ projectId, data });
    toast({ title: "Member invited", description: `${data.user_id} has been added as ${data.role}.` });
    refetch();
  };

  const handleUpdateRole = async (userId: string, newRole: ProjectRole) => {
    await updateMember.mutateAsync({ projectId, userId, data: { role: newRole } });
    toast({ title: "Role updated", description: `Member role changed to ${newRole}.` });
    refetch();
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this project?`)) {
      return;
    }
    await removeMember.mutateAsync({ projectId, userId });
    toast({ title: "Member removed", description: `${userName} has been removed from the project.` });
    refetch();
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Members</h2>
          <p className="text-muted-foreground">Manage project members and their roles</p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members List */}
      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No members found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || roleFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Invite members to start collaborating on this project."}
            </p>
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-medium text-primary">
                      {member.user_name?.charAt(0).toUpperCase() || member.user_id.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{member.user_name || member.user_id}</p>
                    <p className="text-sm text-muted-foreground">{member.user_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(getRoleColor(member.role), "capitalize")}
                  >
                    {getRoleLabel(member.role)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                      {["owner", "admin", "member", "viewer"].map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => handleUpdateRole(member.user_id, role as ProjectRole)}
                          className={cn(
                            "flex items-center gap-2",
                            member.role === role && "font-medium"
                          )}
                          disabled={!canManageRole("owner", role as ProjectRole)}
                        >
                          {member.role === role && <UserCheck className="h-4 w-4 text-primary" />}
                          {role === "owner" && <Shield className="h-4 w-4" />}
                          {getRoleLabel(role as ProjectRole)}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.user_id, member.user_name || member.user_id)}
                        className="flex items-center gap-2 text-destructive focus:text-destructive"
                      >
                        <UserMinus className="h-4 w-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Add a new member to this project by entering their user ID and selecting their role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user_id">User ID *</Label>
                <Input
                  id="user_id"
                  placeholder="Enter user ID or email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select defaultValue="member">
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                    <SelectItem value="member">Member (Can edit)</SelectItem>
                    <SelectItem value="admin">Admin (Can manage)</SelectItem>
                    <SelectItem value="owner">Owner (Full control)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={addMember.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const formData = new FormData(document.querySelector('form')!);
                  const userId = formData.get('user_id') as string;
                  const role = formData.get('role') as ProjectRole;
                  if (userId) {
                    await handleInviteMember({ user_id: userId, role });
                  }
                }}
                disabled={addMember.isPending}
              >
                {addMember.isPending ? "Inviting..." : "Invite Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}