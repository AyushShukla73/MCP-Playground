-- MCP Control Room Database Schema
-- Run this migration to create all tables with RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace members table
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'on_hold')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tool calls table (for telemetry)
CREATE TABLE tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id TEXT NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    input_summary JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'approved', 'rejected')),
    permission_result TEXT CHECK (permission_result IN ('allowed', 'denied', 'pending_approval')),
    records_returned INTEGER DEFAULT 0,
    execution_duration_ms INTEGER,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Approvals table
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
    target_record_id UUID,
    validated_payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'blocked')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tool permissions configuration
CREATE TABLE tool_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    permission_category TEXT NOT NULL CHECK (permission_category IN ('read', 'write', 'destructive')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['owner', 'admin', 'member'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, tool_name)
);

-- Indexes for performance
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tool_calls_workspace_id ON tool_calls(workspace_id);
CREATE INDEX idx_tool_calls_user_id ON tool_calls(user_id);
CREATE INDEX idx_tool_calls_tool_name ON tool_calls(tool_name);
CREATE INDEX idx_tool_calls_status ON tool_calls(status);
CREATE INDEX idx_tool_calls_created_at ON tool_calls(created_at);
CREATE INDEX idx_approvals_workspace_id ON approvals(workspace_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_requested_by ON approvals(requested_by);
CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_permissions_updated_at BEFORE UPDATE ON tool_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_permissions ENABLE ROW LEVEL SECURITY;

-- Workspaces: Users can see workspaces they own or are members of
CREATE POLICY "Users can view their workspaces" ON workspaces
    FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid())
    );

CREATE POLICY "Owners can update their workspaces" ON workspaces
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces" ON workspaces
    FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Workspace members: Users can see members of workspaces they belong to
CREATE POLICY "Members can view workspace members" ON workspace_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid())
    );

CREATE POLICY "Admins can manage workspace members" ON workspace_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

-- Projects: Users can see projects in their workspaces
CREATE POLICY "Workspace members can view projects" ON projects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "Workspace members can create projects" ON projects
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))
    );

CREATE POLICY "Workspace admins can update projects" ON projects
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "Workspace admins can delete projects" ON projects
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Tasks: Users can see tasks in their workspaces
CREATE POLICY "Workspace members can view tasks" ON tasks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "Workspace members can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))
    );

CREATE POLICY "Workspace members can update tasks" ON tasks
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))
    );

CREATE POLICY "Workspace admins can delete tasks" ON tasks
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Tool calls: Users can see their own tool calls in their workspaces
CREATE POLICY "Users can view their tool calls" ON tool_calls
    FOR SELECT USING (
        user_id = auth.uid() AND
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_calls.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "System can insert tool calls" ON tool_calls
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update tool calls" ON tool_calls
    FOR UPDATE USING (true);

-- Approvals: Users can see approvals in their workspaces
CREATE POLICY "Workspace members can view approvals" ON approvals
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = approvals.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can create approval requests" ON approvals
    FOR INSERT WITH CHECK (
        requested_by = auth.uid() AND
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = approvals.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can review approvals" ON approvals
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = approvals.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Audit logs: Users can see audit logs in their workspaces
CREATE POLICY "Workspace members can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = audit_logs.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Tool permissions: Admins can manage tool permissions
CREATE POLICY "Workspace admins can manage tool permissions" ON tool_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_permissions.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "Workspace members can view tool permissions" ON tool_permissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_permissions.workspace_id AND user_id = auth.uid())
    );