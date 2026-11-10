-- MCP Control Room Advanced Permissions Schema
-- This migration adds the advanced permission tables for the 5-tier evaluation pipeline

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tool Categories table
CREATE TABLE tool_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    default_category TEXT NOT NULL DEFAULT 'unknown' CHECK (default_category IN ('read', 'write', 'destructive', 'unknown')),
    default_requires_approval BOOLEAN NOT NULL DEFAULT false,
    default_allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['owner', 'admin', 'member'],
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tool Permission Policies table (workspace-level policies)
CREATE TABLE tool_permission_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    policy_type TEXT NOT NULL CHECK (policy_type IN ('allow', 'deny', 'require_approval')),
    priority INTEGER NOT NULL DEFAULT 100,
    tool_pattern TEXT, -- regex pattern for tool name matching
    server_id UUID, -- optional server filter
    category_filter TEXT, -- optional category filter
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tool Role Permissions table
CREATE TABLE tool_role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    server_id UUID, -- optional server filter
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permission TEXT NOT NULL CHECK (permission IN ('allow', 'deny', 'require_approval')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, tool_name, server_id, role)
);

-- Tool Permission Rules table (fine-grained rules with conditions)
CREATE TABLE tool_permission_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    tool_name TEXT NOT NULL,
    server_id UUID, -- optional server filter
    condition_type TEXT NOT NULL CHECK (condition_type IN ('time_based', 'parameter_based', 'user_based', 'resource_based', 'always')),
    condition_config JSONB NOT NULL DEFAULT '{}',
    action TEXT NOT NULL CHECK (action IN ('allow', 'deny', 'require_approval')),
    priority INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permission Decisions audit table
CREATE TABLE permission_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    server_id UUID,
    decision TEXT NOT NULL CHECK (decision IN ('allowed', 'denied', 'pending_approval', 'error')),
    matched_policy_id UUID REFERENCES tool_permission_policies(id) ON DELETE SET NULL,
    matched_rule_id UUID REFERENCES tool_permission_rules(id) ON DELETE SET NULL,
    matched_role_permission_id UUID REFERENCES tool_role_permissions(id) ON DELETE SET NULL,
    input_parameters JSONB,
    evaluation_duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tool_categories_name ON tool_categories(name);
CREATE INDEX idx_tool_categories_created_by ON tool_categories(created_by);

CREATE INDEX idx_tool_permission_policies_workspace_id ON tool_permission_policies(workspace_id);
CREATE INDEX idx_tool_permission_policies_enabled ON tool_permission_policies(enabled);
CREATE INDEX idx_tool_permission_policies_priority ON tool_permission_policies(priority);
CREATE INDEX idx_tool_permission_policies_tool_pattern ON tool_permission_policies(tool_pattern);
CREATE INDEX idx_tool_permission_policies_server_id ON tool_permission_policies(server_id);

CREATE INDEX idx_tool_role_permissions_workspace_id ON tool_role_permissions(workspace_id);
CREATE INDEX idx_tool_role_permissions_tool_name ON tool_role_permissions(tool_name);
CREATE INDEX idx_tool_role_permissions_server_id ON tool_role_permissions(server_id);
CREATE INDEX idx_tool_role_permissions_role ON tool_role_permissions(role);

CREATE INDEX idx_tool_permission_rules_workspace_id ON tool_permission_rules(workspace_id);
CREATE INDEX idx_tool_permission_rules_tool_name ON tool_permission_rules(tool_name);
CREATE INDEX idx_tool_permission_rules_server_id ON tool_permission_rules(server_id);
CREATE INDEX idx_tool_permission_rules_enabled ON tool_permission_rules(enabled);
CREATE INDEX idx_tool_permission_rules_priority ON tool_permission_rules(priority);
CREATE INDEX idx_tool_permission_rules_condition_type ON tool_permission_rules(condition_type);

CREATE INDEX idx_permission_decisions_workspace_id ON permission_decisions(workspace_id);
CREATE INDEX idx_permission_decisions_user_id ON permission_decisions(user_id);
CREATE INDEX idx_permission_decisions_tool_name ON permission_decisions(tool_name);
CREATE INDEX idx_permission_decisions_decision ON permission_decisions(decision);
CREATE INDEX idx_permission_decisions_created_at ON permission_decisions(created_at);
CREATE INDEX idx_permission_decisions_matched_policy_id ON permission_decisions(matched_policy_id);
CREATE INDEX idx_permission_decisions_matched_rule_id ON permission_decisions(matched_rule_id);
CREATE INDEX idx_permission_decisions_matched_role_permission_id ON permission_decisions(matched_role_permission_id);

-- Updated at triggers
CREATE TRIGGER update_tool_categories_updated_at BEFORE UPDATE ON tool_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_permission_policies_updated_at BEFORE UPDATE ON tool_permission_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_role_permissions_updated_at BEFORE UPDATE ON tool_role_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_permission_rules_updated_at BEFORE UPDATE ON tool_permission_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_permission_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_permission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_decisions ENABLE ROW LEVEL SECURITY;

-- Tool Categories: Users can view categories they created or that are in their workspaces
CREATE POLICY "Users can view their tool categories" ON tool_categories
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
            AND wm.workspace_id IN (
                SELECT DISTINCT workspace_id FROM tool_permission_policies WHERE tool_permission_policies.id IS NOT NULL
            )
        )
    );

CREATE POLICY "Admins can create tool categories" ON tool_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update tool categories" ON tool_categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

-- Tool Permission Policies: Workspace admins can manage, members can view
CREATE POLICY "Workspace admins can manage permission policies" ON tool_permission_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = tool_permission_policies.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace members can view permission policies" ON tool_permission_policies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = tool_permission_policies.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Tool Role Permissions: Workspace admins can manage, members can view
CREATE POLICY "Workspace admins can manage role permissions" ON tool_role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = tool_role_permissions.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace members can view role permissions" ON tool_role_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = tool_role_permissions.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Tool Permission Rules: Workspace admins can manage, members can view
CREATE POLICY "Workspace admins can manage permission rules" ON tool_permission_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = tool_permission_rules.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace members can view permission rules" ON tool_permission_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = tool_permission_rules.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Permission Decisions: Users can see their own decisions, workspace admins can see all
CREATE POLICY "Users can view their permission decisions" ON permission_decisions
    FOR SELECT USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = permission_decisions.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace admins can view all permission decisions" ON permission_decisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = permission_decisions.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "System can insert permission decisions" ON permission_decisions
    FOR INSERT WITH CHECK (true);

-- Seed default tool categories
INSERT INTO tool_categories (name, display_name, description, default_category, default_requires_approval, default_allowed_roles, created_by)
VALUES
    ('read', 'Read Operations', 'Tools that only read data without modifying it', 'read', false, ARRAY['owner', 'admin', 'member', 'viewer'], '00000000-0000-0000-0000-000000000000'),
    ('write', 'Write Operations', 'Tools that create or modify data', 'write', false, ARRAY['owner', 'admin', 'member'], '00000000-0000-0000-0000-000000000000'),
    ('destructive', 'Destructive Operations', 'Tools that delete or irreversibly modify data', 'destructive', true, ARRAY['owner', 'admin'], '00000000-0000-0000-0000-000000000000'),
    ('unknown', 'Unknown Operations', 'Tools with unknown or unclassified behavior', 'unknown', true, ARRAY['owner', 'admin'], '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;