-- Tool Permissions Management Tables
-- Run this migration to create advanced permission tables with RLS policies

-- Tool Categories table - defines tool categories and default behaviors
CREATE TABLE tool_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    default_category TEXT NOT NULL CHECK (default_category IN ('read', 'write', 'destructive', 'unknown')),
    default_requires_approval BOOLEAN NOT NULL DEFAULT false,
    default_allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['owner', 'admin', 'member'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tool Permission Policies table - workspace-level permission policies
CREATE TABLE tool_permission_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    policy_type TEXT NOT NULL CHECK (policy_type IN ('allow', 'deny', 'require_approval')),
    priority INTEGER NOT NULL DEFAULT 100, -- Lower number = higher priority
    tool_pattern TEXT, -- Glob pattern for tool names (e.g., "database.*", "file.*")
    server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE, -- Optional: scope to specific server
    category_filter TEXT[] DEFAULT ARRAY[]::TEXT[], -- Filter by tool categories
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tool Role Permissions table - role-based permissions per tool
CREATE TABLE tool_role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE, -- Optional: scope to specific server
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permission TEXT NOT NULL CHECK (permission IN ('allow', 'deny', 'require_approval')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, tool_name, role, server_id)
);

-- Tool Permission Rules table - fine-grained rules with conditions
CREATE TABLE tool_permission_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    tool_name TEXT NOT NULL,
    server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE, -- Optional: scope to specific server
    condition_type TEXT NOT NULL CHECK (condition_type IN ('always', 'time_based', 'parameter_based', 'user_based', 'resource_based')),
    condition_config JSONB NOT NULL DEFAULT '{}', -- Configuration for the condition
    action TEXT NOT NULL CHECK (action IN ('allow', 'deny', 'require_approval')),
    priority INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permission Decisions table - audit log of permission evaluations
CREATE TABLE permission_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    server_id UUID REFERENCES mcp_servers(id) ON DELETE SET NULL,
    decision TEXT NOT NULL CHECK (decision IN ('allowed', 'denied', 'pending_approval', 'error')),
    matched_policy_id UUID REFERENCES tool_permission_policies(id) ON DELETE SET NULL,
    matched_rule_id UUID REFERENCES tool_permission_rules(id) ON DELETE SET NULL,
    matched_role_permission_id UUID REFERENCES tool_role_permissions(id) ON DELETE SET NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('owner', 'admin', 'member', 'viewer')),
    input_parameters JSONB,
    evaluation_duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default tool categories
INSERT INTO tool_categories (name, display_name, description, default_category, default_requires_approval, default_allowed_roles) VALUES
('database', 'Database', 'Database operations (query, insert, update, delete)', 'write', true, ARRAY['owner', 'admin', 'member']),
('file', 'File System', 'File operations (read, write, delete, list)', 'write', true, ARRAY['owner', 'admin', 'member']),
('api', 'API', 'HTTP API calls and external integrations', 'read', false, ARRAY['owner', 'admin', 'member', 'viewer']),
('search', 'Search', 'Search and discovery operations', 'read', false, ARRAY['owner', 'admin', 'member', 'viewer']),
('compute', 'Compute', 'Code execution and computation', 'destructive', true, ARRAY['owner', 'admin']),
('notification', 'Notifications', 'Sending notifications and alerts', 'write', false, ARRAY['owner', 'admin', 'member']),
('auth', 'Authentication', 'Authentication and authorization operations', 'destructive', true, ARRAY['owner', 'admin']),
('admin', 'Administration', 'Administrative and system operations', 'destructive', true, ARRAY['owner', 'admin']),
('unknown', 'Unknown', 'Uncategorized or custom tools', 'unknown', true, ARRAY['owner', 'admin', 'member'])
ON CONFLICT (name) DO NOTHING;

-- Indexes for performance
CREATE INDEX idx_tool_categories_name ON tool_categories(name);
CREATE INDEX idx_tool_permission_policies_workspace_id ON tool_permission_policies(workspace_id);
CREATE INDEX idx_tool_permission_policies_server_id ON tool_permission_policies(server_id);
CREATE INDEX idx_tool_permission_policies_enabled ON tool_permission_policies(enabled);
CREATE INDEX idx_tool_role_permissions_workspace_id ON tool_role_permissions(workspace_id);
CREATE INDEX idx_tool_role_permissions_tool_name ON tool_role_permissions(tool_name);
CREATE INDEX idx_tool_role_permissions_server_id ON tool_role_permissions(server_id);
CREATE INDEX idx_tool_role_permissions_role ON tool_role_permissions(role);
CREATE INDEX idx_tool_permission_rules_workspace_id ON tool_permission_rules(workspace_id);
CREATE INDEX idx_tool_permission_rules_tool_name ON tool_permission_rules(tool_name);
CREATE INDEX idx_tool_permission_rules_server_id ON tool_permission_rules(server_id);
CREATE INDEX idx_tool_permission_rules_enabled ON tool_permission_rules(enabled);
CREATE INDEX idx_permission_decisions_workspace_id ON permission_decisions(workspace_id);
CREATE INDEX idx_permission_decisions_user_id ON permission_decisions(user_id);
CREATE INDEX idx_permission_decisions_tool_name ON permission_decisions(tool_name);
CREATE INDEX idx_permission_decisions_server_id ON permission_decisions(server_id);
CREATE INDEX idx_permission_decisions_decision ON permission_decisions(decision);
CREATE INDEX idx_permission_decisions_created_at ON permission_decisions(created_at);

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

-- Tool Categories: All authenticated users can view (for tool categorization)
CREATE POLICY "Authenticated users can view tool categories" ON tool_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Tool Permission Policies: Admins can manage, members can view
CREATE POLICY "Workspace admins can manage tool permission policies" ON tool_permission_policies
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_permission_policies.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "Workspace members can view tool permission policies" ON tool_permission_policies
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_permission_policies.workspace_id AND user_id = auth.uid())
    );

-- Tool Role Permissions: Admins can manage, members can view
CREATE POLICY "Workspace admins can manage tool role permissions" ON tool_role_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_role_permissions.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "Workspace members can view tool role permissions" ON tool_role_permissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_role_permissions.workspace_id AND user_id = auth.uid())
    );

-- Tool Permission Rules: Admins can manage, members can view
CREATE POLICY "Workspace admins can manage tool permission rules" ON tool_permission_rules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_permission_rules.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "Workspace members can view tool permission rules" ON tool_permission_rules
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tool_permission_rules.workspace_id AND user_id = auth.uid())
    );

-- Permission Decisions: Users can see their own decisions, admins can see all in workspace
CREATE POLICY "Users can view their own permission decisions" ON permission_decisions
    FOR SELECT USING (
        user_id = auth.uid() AND
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = permission_decisions.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "Workspace admins can view all permission decisions" ON permission_decisions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = permission_decisions.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "System can insert permission decisions" ON permission_decisions
    FOR INSERT WITH CHECK (true);