"""MCP Server with STDIO and HTTP transports."""
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.server.sse import sse_server
from mcp.types import Tool, TextContent
import structlog
from typing import Any, Dict, List
import json

# Import tools
from backend.mcp_server.tools.list_tasks import list_tasks_tool
from backend.mcp_server.tools.get_task import get_task_tool
from backend.mcp_server.tools.search_tasks import search_tasks_tool
from backend.mcp_server.tools.get_project_summary import get_project_summary_tool
from backend.mcp_server.tools.propose_create_task import propose_create_task_tool
from backend.mcp_server.tools.propose_update_task import propose_update_task_tool
# Import auth
from backend.mcp_server.auth import mcp_auth, get_user_workspace_membership

logger = structlog.get_logger()

# Create MCP server
mcp = Server("mcp-control-room")


@mcp.list_tools()
async def list_tools() -> List[Tool]:
    """List available MCP tools."""
    return [
        Tool(
            name="list_tasks",
            description="List tasks in a project with optional filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project UUID"},
                    "status": {"type": "string", "description": "Filter by status (todo, in_progress, done)"},
                    "priority": {"type": "string", "description": "Filter by priority (low, medium, high, critical)"},
                    "assignee_id": {"type": "string", "description": "Filter by assignee UUID"},
                    "limit": {"type": "integer", "description": "Maximum number of tasks to return", "default": 50},
                    "offset": {"type": "integer", "description": "Offset for pagination", "default": 0},
                },
                "required": ["project_id"],
            },
        ),
        Tool(
            name="get_task",
            description="Get a specific task by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "Task UUID"},
                },
                "required": ["task_id"],
            },
        ),
        Tool(
            name="search_tasks",
            description="Search tasks by title/description with optional filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project UUID"},
                    "query": {"type": "string", "description": "Search query for title/description"},
                    "status": {"type": "string", "description": "Filter by status"},
                    "priority": {"type": "string", "description": "Filter by priority"},
                    "assignee_id": {"type": "string", "description": "Filter by assignee UUID"},
                },
                "required": ["project_id", "query"],
            },
        ),
        Tool(
            name="get_project_summary",
            description="Get project summary with task statistics",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project UUID"},
                },
                "required": ["project_id"],
            },
        ),
        Tool(
            name="propose_create_task",
            description="Propose creating a new task (requires approval for write operations)",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project UUID"},
                    "title": {"type": "string", "description": "Task title"},
                    "description": {"type": "string", "description": "Task description"},
                    "status": {"type": "string", "description": "Task status", "default": "todo"},
                    "priority": {"type": "string", "description": "Task priority", "default": "medium"},
                    "assignee_id": {"type": "string", "description": "Assignee UUID"},
                },
                "required": ["project_id", "title"],
            },
        ),
        Tool(
            name="propose_update_task",
            description="Propose updating an existing task (requires approval for write operations)",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "Task UUID"},
                    "title": {"type": "string", "description": "New task title"},
                    "description": {"type": "string", "description": "New task description"},
                    "status": {"type": "string", "description": "New task status"},
                    "priority": {"type": "string", "description": "New task priority"},
                    "assignee_id": {"type": "string", "description": "New assignee UUID"},
                },
                "required": ["task_id"],
            },
        ),
    ]


@mcp.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Call a specific MCP tool."""
    logger.info("MCP tool called", tool=name, arguments=arguments)

    # Add auth context to arguments for tools that need it
    if mcp_auth.is_authenticated():
        arguments["_auth"] = {
            "user_id": str(mcp_auth.user_id) if mcp_auth.user_id else None,
            "workspace_id": str(mcp_auth.workspace_id) if mcp_auth.workspace_id else None,
            "email": mcp_auth.email,
            "role": mcp_auth.role,
        }

    try:
        if name == "list_tasks":
            result = await list_tasks_tool(arguments)
        elif name == "get_task":
            result = await get_task_tool(arguments)
        elif name == "search_tasks":
            result = await search_tasks_tool(arguments)
        elif name == "get_project_summary":
            result = await get_project_summary_tool(arguments)
        elif name == "propose_create_task":
            result = await propose_create_task_tool(arguments)
        elif name == "propose_update_task":
            result = await propose_update_task_tool(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")

        return [TextContent(type="text", text=json.dumps(result, default=str))]

    except Exception as e:
        logger.error("MCP tool error", tool=name, error=str(e))
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]


async def run_stdio():
    """Run MCP server with STDIO transport."""
    logger.info("Starting MCP server with STDIO transport")
    async with stdio_server() as (read_stream, write_stream):
        await mcp.run(read_stream, write_stream, mcp.create_initialization_options())


async def run_http(host: str = "0.0.0.0", port: int = 8001):
    """Run MCP server with HTTP/SSE transport."""
    logger.info("Starting MCP server with HTTP transport", host=host, port=port)
    async with sse_server(host, port) as (read_stream, write_stream):
        await mcp.run(read_stream, write_stream, mcp.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "http":
        asyncio.run(run_http())
    else:
        asyncio.run(run_stdio())