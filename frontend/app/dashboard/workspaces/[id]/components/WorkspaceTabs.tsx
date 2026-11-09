"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkspaceOverviewTab } from "./WorkspaceOverviewTab";
import { WorkspaceProjectsTab } from "./WorkspaceProjectsTab";
import { WorkspaceMembersTab } from "./WorkspaceMembersTab";
import { WorkspaceActivityTab } from "./WorkspaceActivityTab";
import { WorkspaceSettingsTab } from "./WorkspaceSettingsTab";
import type { WorkspaceResponse } from "@/lib/api/workspaces";

interface WorkspaceTabsProps {
  workspaceId: string;
  workspace: WorkspaceResponse;
}

export function WorkspaceTabs({ workspaceId, workspace }: WorkspaceTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <WorkspaceOverviewTab workspace={workspace} />
      </TabsContent>
      <TabsContent value="projects" className="mt-6">
        <WorkspaceProjectsTab workspaceId={workspaceId} />
      </TabsContent>
      <TabsContent value="members" className="mt-6">
        <WorkspaceMembersTab workspaceId={workspaceId} />
      </TabsContent>
      <TabsContent value="activity" className="mt-6">
        <WorkspaceActivityTab workspaceId={workspaceId} />
      </TabsContent>
      <TabsContent value="settings" className="mt-6">
        <WorkspaceSettingsTab workspaceId={workspaceId} />
      </TabsContent>
    </Tabs>
  );
}