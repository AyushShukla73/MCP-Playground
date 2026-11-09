"""MCP Server routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from uuid import UUID
from backend.services.mcp_server import mcp_server_service
from backend.api.routes.auth import get_current_user
import structlog

logger = structlog.get_logger()

router = APIRouter()


class MCPServerCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    transport_type: str = Field(..., pattern="^(stdio|streamable_http|sse)$")
    config: Dict[str, Any] = Field(default_factory=dict)


class MCPServerUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[str] = Field(None, pattern="^(connected|disconnected|error|connecting)$")


class MCPServerResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    transport_type: str
    config: Dict[str, Any]
    status: str
    last_connected_at: Optional[str]
    last_error: Optional[str]
    created_by: UUID
    created_at: str
    updated_at: str


class MCPServerListResponse(BaseModel):
    servers: List[MCPServerResponse]
    total: int
    limit: int
    offset: int


class MCPServerToolResponse(BaseModel):
    id: UUID
    server_id: UUID
    name: str
    description: Optional[str]
    input_schema: Dict[str, Any]
    output_schema: Optional[Dict[str, Any]]
    annotations: Optional[Dict[str, Any]]
    is_enabled: bool
    discovered_at: str
    updated_at: str


class MCPServerResourceResponse(BaseModel):
    id: UUID
    server_id: UUID
    uri: str
    name: str
    description: Optional[str]
    mime_type: Optional[str]
    annotations: Optional[Dict[str, Any]]
    is_enabled: bool
    discovered_at: str
    updated_at: str


class MCPServerPromptResponse(BaseModel):
    id: UUID
    server_id: UUID
    name: str
    description: Optional[str]
    arguments: List[Dict[str, Any]]
    is_enabled: bool
    discovered_at: str
    updated_at: str


class MCPServerActivityResponse(BaseModel):
    id: UUID
    server_id: UUID
    workspace_id: UUID
    user_id: Optional[UUID]
    action: str
    status: str
    details: Optional[Dict[str, Any]]
    duration_ms: Optional[int]
    error_message: Optional[str]
    created_at: str


class MCPServerActivityListResponse(BaseModel):
    activity: List[MCPServerActivityResponse]
    total: int
    limit: int
    offset: int


class ConnectionTestRequest(BaseModel):
    timeout_seconds: int = Field(default=30, ge=1, le=300)


class ConnectionTestResponse(BaseModel):
    success: bool
    status: str
    details: Dict[str, Any]
    duration_ms: int
    error_message: Optional[str]


class HealthCheckResponse(BaseModel):
    status: str
    latency_ms: Optional[int]
    details: Dict[str, Any]


class RefreshDiscoveryResponse(BaseModel):
    success: bool
    tools_count: int
    resources_count: int
    prompts_count: int
    duration_ms: int
    error_message: Optional[str]


@router.post("", response_model=MCPServerResponse, status_code=status.HTTP_201_CREATED)
async def create_server(request: MCPServerCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new MCP server."""
    user_id = UUID(current_user["sub"])
    server = await mcp_server_service.create_server(
        workspace_id=None,  # Will be determined from user's default workspace or we need to pass it
        user_id=user_id,
        name=request.name,
        description=request.description,
        transport_type=request.transport_type,
        config=request.config,
    )
    if not server:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create MCP server")
    return MCPServerResponse(**server.model_dump())


@router.get("", response_model=MCPServerListResponse)
async def get_servers(
    workspace_id: UUID = Query(..., description="Workspace ID"),
    status: Optional[str] = Query(None, pattern="^(connected|disconnected|error|connecting)$"),
    transport_type: Optional[str] = Query(None, pattern="^(stdio|streamable_http|sse)$"),
    search: Optional[str] = Query(None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort_by: str = Query(default="created_at", pattern="^(name|status|transport_type|created_at|updated_at)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    current_user: dict = Depends(get_current_user),
):
    """Get MCP servers for a workspace with filtering, sorting, and pagination."""
    user_id = UUID(current_user["sub"])
    result = await mcp_server_service.get_servers(
        workspace_id=workspace_id,
        user_id=user_id,
        status=status,
        transport_type=transport_type,
        search=search,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return MCPServerListResponse(**result)


@router.get("/{server_id}", response_model=MCPServerResponse)
async def get_server(server_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get an MCP server by ID."""
    user_id = UUID(current_user["sub"])
    server = await mcp_server_service.get_server(server_id, user_id)
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MCP server not found")
    return MCPServerResponse(**server.model_dump())


@router.patch("/{server_id}", response_model=MCPServerResponse)
async def update_server(server_id: UUID, request: MCPServerUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update an MCP server (admin+)."""
    user_id = UUID(current_user["sub"])
    server = await mcp_server_service.update_server(
        server_id=server_id,
        user_id=user_id,
        name=request.name,
        description=request.description,
        config=request.config,
        status=request.status,
    )
    if not server:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or server not found")
    return MCPServerResponse(**server.model_dump())


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(server_id: UUID, current_user: dict = Depends(get_current_user)):
    """Delete an MCP server (admin+)."""
    user_id = UUID(current_user["sub"])
    success = await mcp_server_service.delete_server(server_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized or server not found")


@router.post("/{server_id}/test-connection", response_model=ConnectionTestResponse)
async def test_connection(server_id: UUID, request: ConnectionTestRequest, current_user: dict = Depends(get_current_user)):
    """Test connection to an MCP server."""
    user_id = UUID(current_user["sub"])
    result = await mcp_server_service.test_connection(server_id, user_id, request.timeout_seconds)
    return ConnectionTestResponse(**result)


@router.get("/{server_id}/health", response_model=HealthCheckResponse)
async def get_health(server_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get health status of an MCP server."""
    user_id = UUID(current_user["sub"])
    result = await mcp_server_service.get_health(server_id, user_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MCP server not found")
    return HealthCheckResponse(**result)


@router.get("/{server_id}/tools", response_model=List[MCPServerToolResponse])
async def get_tools(server_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get tools for an MCP server."""
    user_id = UUID(current_user["sub"])
    tools = await mcp_server_service.get_tools(server_id, user_id)
    return [MCPServerToolResponse(**t.model_dump()) for t in tools]


@router.get("/{server_id}/resources", response_model=List[MCPServerResourceResponse])
async def get_resources(server_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get resources for an MCP server."""
    user_id = UUID(current_user["sub"])
    resources = await mcp_server_service.get_resources(server_id, user_id)
    return [MCPServerResourceResponse(**r.model_dump()) for r in resources]


@router.get("/{server_id}/prompts", response_model=List[MCPServerPromptResponse])
async def get_prompts(server_id: UUID, current_user: dict = Depends(get_current_user)):
    """Get prompts for an MCP server."""
    user_id = UUID(current_user["sub"])
    prompts = await mcp_server_service.get_prompts(server_id, user_id)
    return [MCPServerPromptResponse(**p.model_dump()) for p in prompts]


@router.get("/{server_id}/activity", response_model=MCPServerActivityListResponse)
async def get_activity(
    server_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Get activity log for an MCP server."""
    user_id = UUID(current_user["sub"])
    result = await mcp_server_service.get_activity(server_id, user_id, limit, offset)
    return MCPServerActivityListResponse(**result)


@router.post("/{server_id}/refresh-discovery", response_model=RefreshDiscoveryResponse)
async def refresh_discovery(server_id: UUID, current_user: dict = Depends(get_current_user)):
    """Refresh capability discovery for an MCP server."""
    user_id = UUID(current_user["sub"])
    result = await mcp_server_service.refresh_discovery(server_id, user_id)
    return RefreshDiscoveryResponse(**result)