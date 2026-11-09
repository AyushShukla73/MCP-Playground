/**
 * TypeScript types matching backend Pydantic models for MCP Servers
 * Source: backend/api/routes/servers.py
 */

export type MCPTransportType = "stdio" | "streamable_http" | "sse";
export type MCPServerStatus = "connected" | "disconnected" | "error" | "connecting";
export type MCPActivityAction =
  | "connection_test"
  | "health_check"
  | "tools_list"
  | "resources_list"
  | "prompts_list"
  | "tool_call"
  | "resource_read"
  | "prompt_get"
  | "discovery_refresh";
export type MCPActivityStatus = "success" | "failure" | "pending";

export interface MCPServerResponse {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  transport_type: MCPTransportType;
  config: Record<string, unknown>;
  status: MCPServerStatus;
  last_connected_at?: string;
  last_error?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MCPServerCreate {
  name: string;
  description?: string;
  transport_type: MCPTransportType;
  config: Record<string, unknown>;
}

export interface MCPServerUpdate {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  status?: MCPServerStatus;
}

export interface MCPServerListParams {
  workspace_id: string;
  status?: MCPServerStatus;
  transport_type?: MCPTransportType;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: "name" | "status" | "transport_type" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
}

export interface MCPServerListResponse {
  servers: MCPServerResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface MCPServerToolResponse {
  id: string;
  server_id: string;
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  is_enabled: boolean;
  discovered_at: string;
  updated_at: string;
}

export interface MCPServerResourceResponse {
  id: string;
  server_id: string;
  uri: string;
  name: string;
  description?: string;
  mime_type?: string;
  annotations?: Record<string, unknown>;
  is_enabled: boolean;
  discovered_at: string;
  updated_at: string;
}

export interface MCPServerPromptResponse {
  id: string;
  server_id: string;
  name: string;
  description?: string;
  arguments: Record<string, unknown>[];
  is_enabled: boolean;
  discovered_at: string;
  updated_at: string;
}

export interface MCPServerActivityResponse {
  id: string;
  server_id: string;
  workspace_id: string;
  user_id?: string;
  action: MCPActivityAction;
  status: MCPActivityStatus;
  details?: Record<string, unknown>;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
}

export interface MCPServerActivityListParams {
  limit?: number;
  offset?: number;
}

export interface MCPServerActivityListResponse {
  activity: MCPServerActivityResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConnectionTestRequest {
  timeout_seconds?: number;
}

export interface ConnectionTestResponse {
  success: boolean;
  status: string;
  details: Record<string, unknown>;
  duration_ms: number;
  error_message?: string;
}

export interface HealthCheckResponse {
  status: string;
  latency_ms?: number;
  details: Record<string, unknown>;
}

export interface RefreshDiscoveryResponse {
  success: boolean;
  tools_count: number;
  resources_count: number;
  prompts_count: number;
  duration_ms: number;
  error_message?: string;
}