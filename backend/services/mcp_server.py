"""MCP Server Service - handles MCP server management, discovery, and activity tracking."""
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime
import structlog

from backend.services.base import BaseService
from backend.schemas.models import (
    MCPServerCreate,
    MCPServerUpdate,
    MCPServerResponse,
    MCPServerToolResponse,
    MCPServerResourceResponse,
    MCPServerPromptResponse,
    MCPServerActivityResponse,
    MCPServerHealthResponse,
    MCPServerTestConnectionResponse,
    MCPServerDiscoveryResponse,
)

logger = structlog.get_logger()


class MCPServerService(BaseService):
    """Service for managing MCP servers and their capabilities."""

    async def create_server(
        self,
        workspace_id: UUID,
        user_id: UUID,
        data: MCPServerCreate,
    ) -> MCPServerResponse:
        """Create a new MCP server registration."""
        await self._verify_workspace_member(workspace_id, user_id, ["owner", "admin", "member"])

        query = """
            INSERT INTO mcp_servers (workspace_id, name, description, transport_type, config, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, workspace_id, name, description, transport_type, config, status,
                      last_connected_at, last_error, created_by, created_at, updated_at
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query,
                workspace_id,
                data.name,
                data.description,
                data.transport_type.value,
                data.config,
                user_id,
            )

        await self._log_audit(
            workspace_id,
            user_id,
            "mcp_server_create",
            "mcp_server",
            row["id"],
            {"name": data.name, "transport_type": data.transport_type.value},
        )

        return MCPServerResponse(**dict(row))

    async def get_servers(
        self,
        workspace_id: UUID,
        user_id: UUID,
        search: Optional[str] = None,
        status: Optional[str] = None,
        transport_type: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MCPServerResponse], int]:
        """List MCP servers in a workspace with filtering and pagination."""
        await self._verify_workspace_member(workspace_id, user_id)

        conditions = ["workspace_id = $1"]
        params: List[Any] = [workspace_id]
        param_idx = 2

        if search:
            conditions.append(f"(name ILIKE ${param_idx} OR description ILIKE ${param_idx})")
            params.append(f"%{search}%")
            param_idx += 1

        if status:
            conditions.append(f"status = ${param_idx}")
            params.append(status)
            param_idx += 1

        if transport_type:
            conditions.append(f"transport_type = ${param_idx}")
            params.append(transport_type)
            param_idx += 1

        where_clause = " AND ".join(conditions)

        valid_sort_columns = {"name", "status", "transport_type", "created_at", "updated_at", "last_connected_at"}
        sort_column = sort_by if sort_by in valid_sort_columns else "created_at"
        sort_dir = sort_order.upper() if sort_order.upper() in ("ASC", "DESC") else "DESC"

        count_query = f"SELECT COUNT(*) FROM mcp_servers WHERE {where_clause}"
        data_query = f"""
            SELECT id, workspace_id, name, description, transport_type, config, status,
                   last_connected_at, last_error, created_by, created_at, updated_at
            FROM mcp_servers
            WHERE {where_clause}
            ORDER BY {sort_column} {sort_dir}
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])

        async with self.pool.acquire() as conn:
            total = await conn.fetchval(count_query, *params[:-2])
            rows = await conn.fetch(data_query, *params)

        return [MCPServerResponse(**dict(row)) for row in rows], total

    async def get_server(self, workspace_id: UUID, user_id: UUID, server_id: UUID) -> Optional[MCPServerResponse]:
        """Get a single MCP server by ID."""
        await self._verify_workspace_member(workspace_id, user_id)

        query = """
            SELECT id, workspace_id, name, description, transport_type, config, status,
                   last_connected_at, last_error, created_by, created_at, updated_at
            FROM mcp_servers
            WHERE id = $1 AND workspace_id = $2
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, server_id, workspace_id)

        return MCPServerResponse(**dict(row)) if row else None

    async def update_server(
        self,
        workspace_id: UUID,
        user_id: UUID,
        server_id: UUID,
        data: MCPServerUpdate,
    ) -> Optional[MCPServerResponse]:
        """Update an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id, ["owner", "admin"])

        existing = await self.get_server(workspace_id, user_id, server_id)
        if not existing:
            return None

        updates = []
        params: List[Any] = [server_id, workspace_id]
        param_idx = 3

        if data.name is not None:
            updates.append(f"name = ${param_idx}")
            params.append(data.name)
            param_idx += 1
        if data.description is not None:
            updates.append(f"description = ${param_idx}")
            params.append(data.description)
            param_idx += 1
        if data.transport_type is not None:
            updates.append(f"transport_type = ${param_idx}")
            params.append(data.transport_type.value)
            param_idx += 1
        if data.config is not None:
            updates.append(f"config = ${param_idx}")
            params.append(data.config)
            param_idx += 1
        if data.status is not None:
            updates.append(f"status = ${param_idx}")
            params.append(data.status)
            param_idx += 1

        if not updates:
            return existing

        updates.append("updated_at = NOW()")
        query = f"""
            UPDATE mcp_servers
            SET {", ".join(updates)}
            WHERE id = $1 AND workspace_id = $2
            RETURNING id, workspace_id, name, description, transport_type, config, status,
                      last_connected_at, last_error, created_by, created_at, updated_at
        """

        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, *params)

        if row:
            await self._log_audit(
                workspace_id,
                user_id,
                "mcp_server_update",
                "mcp_server",
                server_id,
                data.model_dump(exclude_unset=True),
            )

        return MCPServerResponse(**dict(row)) if row else None

    async def delete_server(self, workspace_id: UUID, user_id: UUID, server_id: UUID) -> bool:
        """Delete an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id, ["owner", "admin"])

        query = "DELETE FROM mcp_servers WHERE id = $1 AND workspace_id = $2"
        async with self.pool.acquire() as conn:
            result = await conn.execute(query, server_id, workspace_id)

        if result == "DELETE 1":
            await self._log_audit(
                workspace_id,
                user_id,
                "mcp_server_delete",
                "mcp_server",
                server_id,
                {},
            )
            return True
        return False

    async def test_connection(
        self,
        workspace_id: UUID,
        user_id: UUID,
        server_id: UUID,
    ) -> MCPServerTestConnectionResponse:
        """Test connection to an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id)

        server = await self.get_server(workspace_id, user_id, server_id)
        if not server:
            raise ValueError("Server not found")

        start_time = datetime.utcnow()
        success = False
        error_message = None
        details = {}

        try:
            from backend.mcp_client import MCPClient
            client = MCPClient(server.config, server.transport_type.value)
            result = await client.test_connection()
            success = result.get("success", False)
            error_message = result.get("error")
            details = result.get("details", {})
        except Exception as e:
            error_message = str(e)
            logger.error("mcp_connection_test_failed", server_id=str(server_id), error=str(e))

        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        new_status = "connected" if success else "error"
        await self._update_server_status(workspace_id, server_id, new_status, error_message)

        await self._log_activity(
            workspace_id,
            server_id,
            user_id,
            "connection_test",
            "success" if success else "failure",
            details,
            duration_ms,
            error_message,
        )

        return MCPServerTestConnectionResponse(
            success=success,
            error=error_message,
            details=details,
            duration_ms=duration_ms,
        )

    async def get_health(
        self,
        workspace_id: UUID,
        user_id: UUID,
        server_id: UUID,
    ) -> MCPServerHealthResponse:
        """Get health status of an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id)

        server = await self.get_server(workspace_id, user_id, server_id)
        if not server:
            raise ValueError("Server not found")

        try:
            from backend.mcp_client import MCPClient
            client = MCPClient(server.config, server.transport_type.value)
            result = await client.health_check()
            return MCPServerHealthResponse(**result)
        except Exception as e:
            logger.error("mcp_health_check_failed", server_id=str(server_id), error=str(e))
            return MCPServerHealthResponse(
                status="unhealthy",
                latency_ms=None,
                error=str(e),
                last_check=datetime.utcnow(),
            )

    async def get_tools(
        self,
        workspace_id: UUID,
        user_id: UUID,
        server_id: UUID,
        enabled_only: bool = True,
    ) -> List[MCPServerToolResponse]:
        """Get tools for an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id)

        conditions = ["server_id = $1"]
        params: List[Any] = [server_id]
        if enabled_only:
            conditions.append("is_enabled = true")

        query = f"""
            SELECT id, server_id, name, description, input_schema, output_schema,
                   annotations, is_enabled, discovered_at, updated_at
            FROM mcp_server_tools
            WHERE {" AND ".join(conditions)}
            ORDER BY name
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        return [MCPServerToolResponse(**dict(row)) for row in rows]

    async def get_resources(
        self,
        workspace_id: UUID,
        user_id: UUID,
        server_id: UUID,
        enabled_only: bool = True,
    ) -> List[MCPServerResourceResponse]:
        """Get resources for an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id)

        conditions = ["server_id = $1"]
        params: List[Any] = [server_id]
        if enabled_only:
            conditions.append("is_enabled = true")

        query = f"""
            SELECT id, server_id, uri, name, description, mime_type,
                   annotations, is_enabled, discovered_at, updated_at
            FROM mcp_server_resources
            WHERE {" AND ".join(conditions)}
            ORDER BY name
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        return [MCPServerResourceResponse(**dict(row)) for row in rows]

    async def get_prompts(
        self,
        workspace_id: UUID,
        user_id: UUID,
        server_id: UUID,
        enabled_only: bool = True,
    ) -> List[MCPServerPromptResponse]:
        """Get prompts for an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id)

        conditions = ["server_id = $1"]
        params: List[Any] = [server_id]
        if enabled_only:
            conditions.append("is_enabled = true")

        query = f"""
            SELECT id, server_id, name, description, arguments,
                   is_enabled, discovered_at, updated_at
            FROM mcp_server_prompts
            WHERE {" AND ".join(conditions)}
            ORDER BY name
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        return [MCPServerPromptResponse(**dict(row)) for row in rows]

    async def get_activity(
        self,
        workspace_id: UUID,
        user_id: UUID,
        server_id: UUID,
        action: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[MCPServerActivityResponse], int]:
        """Get activity log for an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id)

        conditions = ["server_id = $1", "workspace_id = $2"]
        params: List[Any] = [server_id, workspace_id]
        param_idx = 3

        if action:
            conditions.append(f"action = ${param_idx}")
            params.append(action)
            param_idx += 1
        if status:
            conditions.append(f"status = ${param_idx}")
            params.append(status)
            param_idx += 1

        where_clause = " AND ".join(conditions)

        count_query = f"SELECT COUNT(*) FROM mcp_server_activity WHERE {where_clause}"
        data_query = f"""
            SELECT id, server_id, workspace_id, user_id, action, status,
                   details, duration_ms, error_message, created_at
            FROM mcp_server_activity
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])

        async with self.pool.acquire() as conn:
            total = await conn.fetchval(count_query, *params[:-2])
            rows = await conn.fetch(data_query, *params)

        return [MCPServerActivityResponse(**dict(row)) for row in rows], total

    async def refresh_discovery(
        self,
        workspace_id: UUID,
        user_id: UUID,
        server_id: UUID,
    ) -> MCPServerDiscoveryResponse:
        """Refresh capability discovery for an MCP server."""
        await self._verify_workspace_member(workspace_id, user_id)

        server = await self.get_server(workspace_id, user_id, server_id)
        if not server:
            raise ValueError("Server not found")

        start_time = datetime.utcnow()
        tools_discovered = 0
        resources_discovered = 0
        prompts_discovered = 0
        errors = []

        try:
            from backend.mcp_client import MCPClient
            client = MCPClient(server.config, server.transport_type.value)

            # Discover tools
            try:
                tools = await client.list_tools()
                tools_discovered = await self._sync_tools(server_id, tools)
            except Exception as e:
                errors.append(f"Tools discovery failed: {str(e)}")
                logger.error("mcp_tools_discovery_failed", server_id=str(server_id), error=str(e))

            # Discover resources
            try:
                resources = await client.list_resources()
                resources_discovered = await self._sync_resources(server_id, resources)
            except Exception as e:
                errors.append(f"Resources discovery failed: {str(e)}")
                logger.error("mcp_resources_discovery_failed", server_id=str(server_id), error=str(e))

            # Discover prompts
            try:
                prompts = await client.list_prompts()
                prompts_discovered = await self._sync_prompts(server_id, prompts)
            except Exception as e:
                errors.append(f"Prompts discovery failed: {str(e)}")
                logger.error("mcp_prompts_discovery_failed", server_id=str(server_id), error=str(e))

            success = len(errors) == 0
            await self._update_server_status(
                workspace_id,
                server_id,
                "connected" if success else "error",
                "; ".join(errors) if errors else None,
            )

        except Exception as e:
            logger.error("mcp_discovery_failed", server_id=str(server_id), error=str(e))
            success = False
            errors.append(str(e))
            await self._update_server_status(workspace_id, server_id, "error", str(e))

        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        await self._log_activity(
            workspace_id,
            server_id,
            user_id,
            "discovery_refresh",
            "success" if success else "failure",
            {"tools": tools_discovered, "resources": resources_discovered, "prompts": prompts_discovered, "errors": errors},
            duration_ms,
            "; ".join(errors) if errors else None,
        )

        return MCPServerDiscoveryResponse(
            success=success,
            tools_discovered=tools_discovered,
            resources_discovered=resources_discovered,
            prompts_discovered=prompts_discovered,
            errors=errors,
            duration_ms=duration_ms,
        )

    async def _sync_tools(self, server_id: UUID, tools: List[Dict[str, Any]]) -> int:
        """Sync discovered tools to database."""
        count = 0
        async with self.pool.acquire() as conn:
            for tool in tools:
                try:
                    await conn.execute(
                        """
                        INSERT INTO mcp_server_tools (server_id, name, description, input_schema, output_schema, annotations, is_enabled)
                        VALUES ($1, $2, $3, $4, $5, $6, true)
                        ON CONFLICT (server_id, name) DO UPDATE SET
                            description = EXCLUDED.description,
                            input_schema = EXCLUDED.input_schema,
                            output_schema = EXCLUDED.output_schema,
                            annotations = EXCLUDED.annotations,
                            updated_at = NOW()
                        """,
                        server_id,
                        tool.get("name"),
                        tool.get("description"),
                        tool.get("inputSchema", {}),
                        tool.get("outputSchema"),
                        tool.get("annotations"),
                    )
                    count += 1
                except Exception as e:
                    logger.error("sync_tool_failed", server_id=str(server_id), tool=tool.get("name"), error=str(e))
        return count

    async def _sync_resources(self, server_id: UUID, resources: List[Dict[str, Any]]) -> int:
        """Sync discovered resources to database."""
        count = 0
        async with self.pool.acquire() as conn:
            for resource in resources:
                try:
                    await conn.execute(
                        """
                        INSERT INTO mcp_server_resources (server_id, uri, name, description, mime_type, annotations, is_enabled)
                        VALUES ($1, $2, $3, $4, $5, $6, true)
                        ON CONFLICT (server_id, uri) DO UPDATE SET
                            name = EXCLUDED.name,
                            description = EXCLUDED.description,
                            mime_type = EXCLUDED.mime_type,
                            annotations = EXCLUDED.annotations,
                            updated_at = NOW()
                        """,
                        server_id,
                        resource.get("uri"),
                        resource.get("name"),
                        resource.get("description"),
                        resource.get("mimeType"),
                        resource.get("annotations"),
                    )
                    count += 1
                except Exception as e:
                    logger.error("sync_resource_failed", server_id=str(server_id), resource=resource.get("uri"), error=str(e))
        return count

    async def _sync_prompts(self, server_id: UUID, prompts: List[Dict[str, Any]]) -> int:
        """Sync discovered prompts to database."""
        count = 0
        async with self.pool.acquire() as conn:
            for prompt in prompts:
                try:
                    await conn.execute(
                        """
                        INSERT INTO mcp_server_prompts (server_id, name, description, arguments, is_enabled)
                        VALUES ($1, $2, $3, $4, true)
                        ON CONFLICT (server_id, name) DO UPDATE SET
                            description = EXCLUDED.description,
                            arguments = EXCLUDED.arguments,
                            updated_at = NOW()
                        """,
                        server_id,
                        prompt.get("name"),
                        prompt.get("description"),
                        prompt.get("arguments", []),
                    )
                    count += 1
                except Exception as e:
                    logger.error("sync_prompt_failed", server_id=str(server_id), prompt=prompt.get("name"), error=str(e))
        return count

    async def _update_server_status(
        self,
        workspace_id: UUID,
        server_id: UUID,
        status: str,
        error: Optional[str] = None,
    ) -> None:
        """Update server status and last connected timestamp."""
        query = """
            UPDATE mcp_servers
            SET status = $1, last_error = $2, last_connected_at = CASE WHEN $1 = 'connected' THEN NOW() ELSE last_connected_at END, updated_at = NOW()
            WHERE id = $3 AND workspace_id = $4
        """
        async with self.pool.acquire() as conn:
            await conn.execute(query, status, error, server_id, workspace_id)

    async def _log_activity(
        self,
        workspace_id: UUID,
        server_id: UUID,
        user_id: UUID,
        action: str,
        status: str,
        details: Dict[str, Any],
        duration_ms: int,
        error_message: Optional[str] = None,
    ) -> None:
        """Log MCP server activity."""
        query = """
            INSERT INTO mcp_server_activity (server_id, workspace_id, user_id, action, status, details, duration_ms, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                server_id,
                workspace_id,
                user_id,
                action,
                status,
                details,
                duration_ms,
                error_message,
            )


mcp_server_service = MCPServerService()