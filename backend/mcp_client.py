"""MCP Client for real protocol communication with MCP servers."""
import asyncio
import json
import os
import uuid
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

import structlog
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.sse import sse_client
from mcp.client.streamable_http import streamablehttp_client
from mcp.types import (
    InitializeResult,
    Tool,
    Resource,
    Prompt,
    CallToolResult,
    ReadResourceResult,
    GetPromptResult,
)

logger = structlog.get_logger()


class MCPClient:
    """Client for communicating with MCP servers via multiple transports."""

    def __init__(self, config: Dict[str, Any], transport_type: str, timeout_seconds: int = 30):
        self.config = config
        self.transport_type = transport_type
        self.timeout_seconds = timeout_seconds

    def _parse_stdio_config(self) -> StdioServerParameters:
        """Parse stdio transport configuration."""
        command = self.config.get("command")
        if not command:
            raise ValueError("STDIO transport requires 'command' in config")

        args = self.config.get("args", [])
        env = self.config.get("env", {})
        cwd = self.config.get("cwd")

        return StdioServerParameters(
            command=command,
            args=args,
            env={**os.environ, **env} if env else None,
            cwd=cwd,
        )

    def _parse_http_config(self) -> Dict[str, Any]:
        """Parse HTTP/SSE transport configuration."""
        url = self.config.get("url")
        if not url:
            raise ValueError("HTTP/SSE transport requires 'url' in config")

        headers = self.config.get("headers", {})
        timeout = self.config.get("timeout", self.timeout_seconds)

        return {
            "url": url,
            "headers": headers,
            "timeout": timeout,
        }

    async def _create_stdio_session(self) -> ClientSession:
        """Create a session for STDIO transport."""
        params = self._parse_stdio_config()
        read_stream, write_stream = await stdio_client(params).__aenter__()
        session = ClientSession(read_stream, write_stream)
        await session.__aenter__()
        return session

    async def _create_streamable_http_session(self) -> ClientSession:
        """Create a session for Streamable HTTP transport."""
        http_config = self._parse_http_config()
        read_stream, write_stream, _ = await streamablehttp_client(
            http_config["url"],
            headers=http_config["headers"],
            timeout=http_config["timeout"],
        ).__aenter__()
        session = ClientSession(read_stream, write_stream)
        await session.__aenter__()
        return session

    async def _create_sse_session(self) -> ClientSession:
        """Create a session for SSE transport."""
        http_config = self._parse_http_config()
        read_stream, write_stream = await sse_client(
            http_config["url"],
            headers=http_config["headers"],
            timeout=http_config["timeout"],
        ).__aenter__()
        session = ClientSession(read_stream, write_stream)
        await session.__aenter__()
        return session

    async def _create_session(self) -> ClientSession:
        """Create a new MCP session based on transport type."""
        if self.transport_type == "stdio":
            return await self._create_stdio_session()
        elif self.transport_type == "streamable_http":
            return await self._create_streamable_http_session()
        elif self.transport_type == "sse":
            return await self._create_sse_session()
        else:
            raise ValueError(f"Unsupported transport type: {self.transport_type}")

    async def close_session(self, session: ClientSession):
        """Close an MCP session."""
        try:
            await session.__aexit__(None, None, None)
        except Exception as e:
            logger.warning("Error closing session", error=str(e))

    async def initialize(self, session: ClientSession) -> InitializeResult:
        """Initialize the MCP session."""
        return await session.initialize()

    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools."""
        session = None
        try:
            session = await asyncio.wait_for(self._create_session(), timeout=self.timeout_seconds)
            await asyncio.wait_for(self.initialize(session), timeout=self.timeout_seconds)
            result = await asyncio.wait_for(session.list_tools(), timeout=self.timeout_seconds)
            return [
                {
                    "name": t.name,
                    "description": t.description,
                    "inputSchema": t.inputSchema,
                    "outputSchema": getattr(t, "outputSchema", None),
                    "annotations": getattr(t, "annotations", None),
                }
                for t in result.tools
            ]
        except Exception as e:
            logger.error("list_tools_failed", error=str(e))
            raise
        finally:
            if session:
                await self.close_session(session)

    async def list_resources(self) -> List[Dict[str, Any]]:
        """List available resources."""
        session = None
        try:
            session = await asyncio.wait_for(self._create_session(), timeout=self.timeout_seconds)
            await asyncio.wait_for(self.initialize(session), timeout=self.timeout_seconds)
            result = await asyncio.wait_for(session.list_resources(), timeout=self.timeout_seconds)
            return [
                {
                    "uri": r.uri,
                    "name": r.name,
                    "description": r.description,
                    "mimeType": getattr(r, "mimeType", None),
                    "annotations": getattr(r, "annotations", None),
                }
                for r in result.resources
            ]
        except Exception as e:
            logger.error("list_resources_failed", error=str(e))
            raise
        finally:
            if session:
                await self.close_session(session)

    async def list_prompts(self) -> List[Dict[str, Any]]:
        """List available prompts."""
        session = None
        try:
            session = await asyncio.wait_for(self._create_session(), timeout=self.timeout_seconds)
            await asyncio.wait_for(self.initialize(session), timeout=self.timeout_seconds)
            result = await asyncio.wait_for(session.list_prompts(), timeout=self.timeout_seconds)
            return [
                {
                    "name": p.name,
                    "description": p.description,
                    "arguments": [
                        {
                            "name": arg.name,
                            "description": arg.description,
                            "required": arg.required,
                        }
                        for arg in (p.arguments or [])
                    ],
                }
                for p in result.prompts
            ]
        except Exception as e:
            logger.error("list_prompts_failed", error=str(e))
            raise
        finally:
            if session:
                await self.close_session(session)

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> CallToolResult:
        """Call a tool."""
        session = None
        try:
            session = await asyncio.wait_for(self._create_session(), timeout=self.timeout_seconds)
            await asyncio.wait_for(self.initialize(session), timeout=self.timeout_seconds)
            return await asyncio.wait_for(session.call_tool(name, arguments), timeout=self.timeout_seconds)
        except Exception as e:
            logger.error("call_tool_failed", tool=name, error=str(e))
            raise
        finally:
            if session:
                await self.close_session(session)

    async def read_resource(self, uri: str) -> ReadResourceResult:
        """Read a resource."""
        session = None
        try:
            session = await asyncio.wait_for(self._create_session(), timeout=self.timeout_seconds)
            await asyncio.wait_for(self.initialize(session), timeout=self.timeout_seconds)
            return await asyncio.wait_for(session.read_resource(uri), timeout=self.timeout_seconds)
        except Exception as e:
            logger.error("read_resource_failed", uri=uri, error=str(e))
            raise
        finally:
            if session:
                await self.close_session(session)

    async def get_prompt(self, name: str, arguments: Dict[str, Any]) -> GetPromptResult:
        """Get a prompt."""
        session = None
        try:
            session = await asyncio.wait_for(self._create_session(), timeout=self.timeout_seconds)
            await asyncio.wait_for(self.initialize(session), timeout=self.timeout_seconds)
            return await asyncio.wait_for(session.get_prompt(name, arguments), timeout=self.timeout_seconds)
        except Exception as e:
            logger.error("get_prompt_failed", prompt=name, error=str(e))
            raise
        finally:
            if session:
                await self.close_session(session)

    async def ping(self, session: ClientSession) -> bool:
        """Ping the server to check connectivity."""
        try:
            await session.list_tools()
            return True
        except Exception:
            return False

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to an MCP server."""
        import time
        start_time = time.time()

        session = None
        try:
            session = await asyncio.wait_for(self._create_session(), timeout=self.timeout_seconds)
            init_result = await asyncio.wait_for(self.initialize(session), timeout=self.timeout_seconds)

            duration_ms = int((time.time() - start_time) * 1000)

            return {
                "success": True,
                "status": "connected",
                "details": {
                    "protocol_version": init_result.protocol_version,
                    "server_name": init_result.server_info.name,
                    "server_version": init_result.server_info.version,
                    "capabilities": {
                        "tools": init_result.capabilities.tools is not None,
                        "resources": init_result.capabilities.resources is not None,
                        "prompts": init_result.capabilities.prompts is not None,
                        "logging": init_result.capabilities.logging is not None,
                    },
                },
                "duration_ms": duration_ms,
                "error": None,
            }

        except asyncio.TimeoutError:
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                "success": False,
                "status": "timeout",
                "details": {},
                "duration_ms": duration_ms,
                "error": f"Connection timed out after {self.timeout_seconds} seconds",
            }
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                "success": False,
                "status": "error",
                "details": {"error_type": type(e).__name__},
                "duration_ms": duration_ms,
                "error": str(e),
            }
        finally:
            if session:
                await self.close_session(session)

    async def health_check(self) -> Dict[str, Any]:
        """Perform a health check on an MCP server."""
        import time
        start_time = time.time()

        session = None
        try:
            session = await asyncio.wait_for(self._create_session(), timeout=self.timeout_seconds)
            await asyncio.wait_for(self.initialize(session), timeout=self.timeout_seconds)
            is_healthy = await asyncio.wait_for(self.ping(session), timeout=5)

            latency_ms = int((time.time() - start_time) * 1000)

            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "latency_ms": latency_ms,
                "details": {
                    "transport": self.transport_type,
                    "ping_success": is_healthy,
                },
                "error": None,
                "last_check": None,
            }

        except asyncio.TimeoutError:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "status": "timeout",
                "latency_ms": latency_ms,
                "details": {"error": "Health check timed out"},
                "error": "Health check timed out",
                "last_check": None,
            }
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "status": "error",
                "latency_ms": latency_ms,
                "details": {"error_type": type(e).__name__, "error": str(e)},
                "error": str(e),
                "last_check": None,
            }
        finally:
            if session:
                await self.close_session(session)