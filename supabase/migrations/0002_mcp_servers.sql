-- MCP Server Management Tables
-- Run this migration to create MCP server tables with RLS policies

-- MCP Servers table
CREATE TABLE mcp_servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    transport_type TEXT NOT NULL CHECK (transport_type IN ('stdio', 'streamable_http', 'sse')),
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'connecting')),
    last_connected_at TIMESTAMPTZ,
    last_error TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MCP Server Tools table
CREATE TABLE mcp_server_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    input_schema JSONB NOT NULL DEFAULT '{}',
    output_schema JSONB,
    annotations JSONB,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(server_id, name)
);

-- MCP Server Resources table
CREATE TABLE mcp_server_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    uri TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    mime_type TEXT,
    annotations JSONB,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(server_id, uri)
);

-- MCP Server Prompts table
CREATE TABLE mcp_server_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    arguments JSONB NOT NULL DEFAULT '[]',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(server_id, name)
);

-- MCP Server Activity table
CREATE TABLE mcp_server_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('connection_test', 'health_check', 'tools_list', 'resources_list', 'prompts_list', 'tool_call', 'resource_read', 'prompt_get', 'discovery_refresh')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
    details JSONB,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mcp_servers_workspace_id ON mcp_servers(workspace_id);
CREATE INDEX idx_mcp_servers_status ON mcp_servers(status);
CREATE INDEX idx_mcp_servers_transport_type ON mcp_servers(transport_type);
CREATE INDEX idx_mcp_servers_created_by ON mcp_servers(created_by);

CREATE INDEX idx_mcp_server_tools_server_id ON mcp_server_tools(server_id);
CREATE INDEX idx_mcp_server_tools_name ON mcp_server_tools(name);
CREATE INDEX idx_mcp_server_tools_is_enabled ON mcp_server_tools(is_enabled);

CREATE INDEX idx_mcp_server_resources_server_id ON mcp_server_resources(server_id);
CREATE INDEX idx_mcp_server_resources_uri ON mcp_server_resources(uri);
CREATE INDEX idx_mcp_server_resources_is_enabled ON mcp_server_resources(is_enabled);

CREATE INDEX idx_mcp_server_prompts_server_id ON mcp_server_prompts(server_id);
CREATE INDEX idx_mcp_server_prompts_name ON mcp_server_prompts(name);
CREATE INDEX idx_mcp_server_prompts_is_enabled ON mcp_server_prompts(is_enabled);

CREATE INDEX idx_mcp_server_activity_server_id ON mcp_server_activity(server_id);
CREATE INDEX idx_mcp_server_activity_workspace_id ON mcp_server_activity(workspace_id);
CREATE INDEX idx_mcp_server_activity_user_id ON mcp_server_activity(user_id);
CREATE INDEX idx_mcp_server_activity_action ON mcp_server_activity(action);
CREATE INDEX idx_mcp_server_activity_status ON mcp_server_activity(status);
CREATE INDEX idx_mcp_server_activity_created_at ON mcp_server_activity(created_at);

-- Updated at triggers
CREATE TRIGGER update_mcp_servers_updated_at BEFORE UPDATE ON mcp_servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcp_server_tools_updated_at BEFORE UPDATE ON mcp_server_tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcp_server_resources_updated_at BEFORE UPDATE ON mcp_server_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcp_server_prompts_updated_at BEFORE UPDATE ON mcp_server_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_activity ENABLE ROW LEVEL SECURITY;

-- MCP Servers: Users can see servers in their workspaces
CREATE POLICY "Workspace members can view MCP servers" ON mcp_servers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = mcp_servers.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "Workspace members can create MCP servers" ON mcp_servers
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = mcp_servers.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))
    );

CREATE POLICY "Workspace admins can update MCP servers" ON mcp_servers
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = mcp_servers.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "Workspace admins can delete MCP servers" ON mcp_servers
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = mcp_servers.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- MCP Server Tools: Users can see tools of servers in their workspaces
CREATE POLICY "Workspace members can view MCP server tools" ON mcp_server_tools
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mcp_servers s
            JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
            WHERE s.id = mcp_server_tools.server_id AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage MCP server tools" ON mcp_server_tools
    FOR ALL USING (true);

-- MCP Server Resources: Users can see resources of servers in their workspaces
CREATE POLICY "Workspace members can view MCP server resources" ON mcp_server_resources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mcp_servers s
            JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
            WHERE s.id = mcp_server_resources.server_id AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage MCP server resources" ON mcp_server_resources
    FOR ALL USING (true);

-- MCP Server Prompts: Users can see prompts of servers in their workspaces
CREATE POLICY "Workspace members can view MCP server prompts" ON mcp_server_prompts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mcp_servers s
            JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
            WHERE s.id = mcp_server_prompts.server_id AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage MCP server prompts" ON mcp_server_prompts
    FOR ALL USING (true);

-- MCP Server Activity: Users can see activity in their workspaces
CREATE POLICY "Workspace members can view MCP server activity" ON mcp_server_activity
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = mcp_server_activity.workspace_id AND user_id = auth.uid())
    );

CREATE POLICY "System can insert MCP server activity" ON mcp_server_activity
    FOR INSERT WITH CHECK (true);