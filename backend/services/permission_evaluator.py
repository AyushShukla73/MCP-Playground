"""Permission evaluation service for MCP tool access control."""
import time
import fnmatch
from typing import Optional, Dict, Any, List, Tuple
from uuid import UUID
from enum import Enum

from backend.services.base import BaseService
from backend.schemas.models import ToolPermissionCategory


class PermissionDecision(str, Enum):
    """Permission decision outcomes."""
    ALLOWED = "allowed"
    DENIED = "denied"
    PENDING_APPROVAL = "pending_approval"
    ERROR = "error"


class PermissionEvaluator(BaseService):
    """Service for evaluating tool permissions at execution time."""

    # Role hierarchy: higher number = higher privilege
    ROLE_HIERARCHY = {
        "owner": 4,
        "admin": 3,
        "member": 2,
        "viewer": 1,
    }

    async def evaluate_permission(
        self,
        workspace_id: UUID,
        user_id: UUID,
        tool_name: str,
        server_id: Optional[UUID] = None,
        input_parameters: Optional[Dict[str, Any]] = None,
        user_role: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate permission for a tool execution.

        Evaluation order (highest priority first):
        1. Explicit tool role permissions (tool_role_permissions)
        2. Fine-grained permission rules (tool_permission_rules)
        3. Workspace-level policies (tool_permission_policies)
        4. Tool category defaults (tool_categories)
        5. Server-level tool enabled status (mcp_server_tools.is_enabled)

        Returns:
            Dict with decision, matched_rule info, and metadata
        """
        start_time = time.perf_counter()

        try:
            # Get user's role in workspace if not provided
            if user_role is None:
                user_role = await self._get_user_role(workspace_id, user_id)

            if not user_role:
                return self._build_decision(
                    decision=PermissionDecision.DENIED,
                    user_role=user_role or "viewer",
                    tool_name=tool_name,
                    server_id=server_id,
                    input_parameters=input_parameters,
                    error_message="User is not a member of this workspace",
                    duration_ms=int((time.perf_counter() - start_time) * 1000),
                )

            # Get tool info from mcp_server_tools
            tool_info = await self._get_tool_info(tool_name, server_id, workspace_id)
            if not tool_info:
                return self._build_decision(
                    decision=PermissionDecision.DENIED,
                    user_role=user_role,
                    tool_name=tool_name,
                    server_id=server_id,
                    input_parameters=input_parameters,
                    error_message=f"Tool '{tool_name}' not found",
                    duration_ms=int((time.perf_counter() - start_time) * 1000),
                )

            # Check if tool is enabled at server level
            if not tool_info.get("is_enabled", True):
                return self._build_decision(
                    decision=PermissionDecision.DENIED,
                    user_role=user_role,
                    tool_name=tool_name,
                    server_id=server_id,
                    input_parameters=input_parameters,
                    error_message=f"Tool '{tool_name}' is disabled on the server",
                    duration_ms=int((time.perf_counter() - start_time) * 1000),
                )

            # 1. Check explicit role permissions (highest priority)
            role_perm = await self._check_role_permissions(
                workspace_id, tool_name, server_id, user_role
            )
            if role_perm:
                return self._build_decision(
                    decision=role_perm["decision"],
                    user_role=user_role,
                    tool_name=tool_name,
                    server_id=server_id,
                    input_parameters=input_parameters,
                    matched_role_permission_id=role_perm["id"],
                    duration_ms=int((time.perf_counter() - start_time) * 1000),
                )

            # 2. Check fine-grained permission rules
            rule_match = await self._check_permission_rules(
                workspace_id, tool_name, server_id, user_id, user_role, input_parameters
            )
            if rule_match:
                return self._build_decision(
                    decision=rule_match["decision"],
                    user_role=user_role,
                    tool_name=tool_name,
                    server_id=server_id,
                    input_parameters=input_parameters,
                    matched_rule_id=rule_match["id"],
                    duration_ms=int((time.perf_counter() - start_time) * 1000),
                )

            # 3. Check workspace policies
            policy_match = await self._check_workspace_policies(
                workspace_id, tool_name, server_id, user_role
            )
            if policy_match:
                return self._build_decision(
                    decision=policy_match["decision"],
                    user_role=user_role,
                    tool_name=tool_name,
                    server_id=server_id,
                    input_parameters=input_parameters,
                    matched_policy_id=policy_match["id"],
                    duration_ms=int((time.perf_counter() - start_time) * 1000),
                )

            # 4. Fall back to tool category defaults
            category_decision = await self._check_category_defaults(
                tool_info.get("category"), user_role
            )
            if category_decision:
                return self._build_decision(
                    decision=category_decision["decision"],
                    user_role=user_role,
                    tool_name=tool_name,
                    server_id=server_id,
                    input_parameters=input_parameters,
                    duration_ms=int((time.perf_counter() - start_time) * 1000),
                )

            # 5. Default deny for unknown tools
            return self._build_decision(
                decision=PermissionDecision.DENIED,
                user_role=user_role,
                tool_name=tool_name,
                server_id=server_id,
                input_parameters=input_parameters,
                error_message="No matching permission rule found - default deny",
                duration_ms=int((time.perf_counter() - start_time) * 1000),
            )

        except Exception as e:
            return self._build_decision(
                decision=PermissionDecision.ERROR,
                user_role=user_role or "viewer",
                tool_name=tool_name,
                server_id=server_id,
                input_parameters=input_parameters,
                error_message=str(e),
                duration_ms=int((time.perf_counter() - start_time) * 1000),
            )

    def _build_decision(
        self,
        decision: PermissionDecision,
        user_role: str,
        tool_name: str,
        server_id: Optional[UUID],
        input_parameters: Optional[Dict[str, Any]],
        matched_policy_id: Optional[UUID] = None,
        matched_rule_id: Optional[UUID] = None,
        matched_role_permission_id: Optional[UUID] = None,
        error_message: Optional[str] = None,
        duration_ms: int = 0,
    ) -> Dict[str, Any]:
        """Build a standardized decision response."""
        return {
            "decision": decision.value,
            "user_role": user_role,
            "tool_name": tool_name,
            "server_id": str(server_id) if server_id else None,
            "input_parameters": input_parameters,
            "matched_policy_id": str(matched_policy_id) if matched_policy_id else None,
            "matched_rule_id": str(matched_rule_id) if matched_rule_id else None,
            "matched_role_permission_id": str(matched_role_permission_id) if matched_role_permission_id else None,
            "error_message": error_message,
            "evaluation_duration_ms": duration_ms,
        }

    async def _get_user_role(self, workspace_id: UUID, user_id: UUID) -> Optional[str]:
        """Get user's role in workspace."""
        query = """
            SELECT role FROM workspace_members
            WHERE workspace_id = $1 AND user_id = $2
        """
        row = await self.pool.fetchrow(query, workspace_id, user_id)
        return row["role"] if row else None

    async def _get_tool_info(
        self, tool_name: str, server_id: Optional[UUID], workspace_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get tool information from mcp_server_tools."""
        if server_id:
            query = """
                SELECT t.*, s.workspace_id
                FROM mcp_server_tools t
                JOIN mcp_servers s ON s.id = t.server_id
                WHERE t.name = $1 AND t.server_id = $2 AND s.workspace_id = $3
            """
            return await self.pool.fetchrow(query, tool_name, server_id, workspace_id)
        else:
            # Find tool across all servers in workspace
            query = """
                SELECT t.*, s.workspace_id
                FROM mcp_server_tools t
                JOIN mcp_servers s ON s.id = t.server_id
                WHERE t.name = $1 AND s.workspace_id = $2
                ORDER BY t.discovered_at DESC
                LIMIT 1
            """
            return await self.pool.fetchrow(query, tool_name, workspace_id)

    async def _check_role_permissions(
        self,
        workspace_id: UUID,
        tool_name: str,
        server_id: Optional[UUID],
        user_role: str,
    ) -> Optional[Dict[str, Any]]:
        """Check explicit role-based permissions."""
        user_role_level = self.ROLE_HIERARCHY.get(user_role, 0)

        # Build query with server_id filter if provided
        if server_id:
            query = """
                SELECT * FROM tool_role_permissions
                WHERE workspace_id = $1 AND tool_name = $2 AND server_id = $3
                ORDER BY
                    CASE role WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'member' THEN 2 WHEN 'viewer' THEN 1 END DESC
            """
            rows = await self.pool.fetch(query, workspace_id, tool_name, server_id)
        else:
            query = """
                SELECT * FROM tool_role_permissions
                WHERE workspace_id = $1 AND tool_name = $2 AND server_id IS NULL
                ORDER BY
                    CASE role WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'member' THEN 2 WHEN 'viewer' THEN 1 END DESC
            """
            rows = await self.pool.fetch(query, workspace_id, tool_name)

        # Find the highest priority rule that applies to user's role or higher
        for row in rows:
            rule_role_level = self.ROLE_HIERARCHY.get(row["role"], 0)
            if user_role_level >= rule_role_level:
                permission = row["permission"]
                if permission == "allow":
                    return {"decision": PermissionDecision.ALLOWED, "id": row["id"]}
                elif permission == "deny":
                    return {"decision": PermissionDecision.DENIED, "id": row["id"]}
                elif permission == "require_approval":
                    return {"decision": PermissionDecision.PENDING_APPROVAL, "id": row["id"]}

        return None

    async def _check_permission_rules(
        self,
        workspace_id: UUID,
        tool_name: str,
        server_id: Optional[UUID],
        user_id: UUID,
        user_role: str,
        input_parameters: Optional[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """Check fine-grained permission rules with conditions."""
        query = """
            SELECT * FROM tool_permission_rules
            WHERE workspace_id = $1 AND tool_name = $2 AND enabled = true
        """
        params = [workspace_id, tool_name]

        if server_id:
            query += " AND (server_id = $3 OR server_id IS NULL)"
            params.append(server_id)
        else:
            query += " AND server_id IS NULL"

        query += " ORDER BY priority ASC"

        rows = await self.pool.fetch(query, *params)

        for row in rows:
            condition_type = row["condition_type"]
            condition_config = row["condition_config"] or {}

            if await self._evaluate_condition(
                condition_type, condition_config, user_id, user_role, input_parameters
            ):
                action = row["action"]
                if action == "allow":
                    return {"decision": PermissionDecision.ALLOWED, "id": row["id"]}
                elif action == "deny":
                    return {"decision": PermissionDecision.DENIED, "id": row["id"]}
                elif action == "require_approval":
                    return {"decision": PermissionDecision.PENDING_APPROVAL, "id": row["id"]}

        return None

    async def _evaluate_condition(
        self,
        condition_type: str,
        condition_config: Dict[str, Any],
        user_id: UUID,
        user_role: str,
        input_parameters: Optional[Dict[str, Any]],
    ) -> bool:
        """Evaluate a permission rule condition."""
        if condition_type == "always":
            return True

        elif condition_type == "time_based":
            # Config: {"allowed_hours": [9, 17], "timezone": "UTC", "days": [1,2,3,4,5]}
            from datetime import datetime
            import pytz

            tz = pytz.timezone(condition_config.get("timezone", "UTC"))
            now = datetime.now(tz)

            allowed_hours = condition_config.get("allowed_hours", [])
            if allowed_hours and now.hour not in allowed_hours:
                return False

            allowed_days = condition_config.get("days", [])
            if allowed_days and (now.weekday() + 1) not in allowed_days:  # 1=Monday
                return False

            return True

        elif condition_type == "parameter_based":
            # Config: {"parameter": "table_name", "operator": "in", "values": ["public.*", "analytics.*"]}
            if not input_parameters:
                return False

            param_name = condition_config.get("parameter")
            operator = condition_config.get("operator", "equals")
            values = condition_config.get("values", [])

            param_value = input_parameters.get(param_name)
            if param_value is None:
                return False

            if operator == "equals":
                return param_value in values
            elif operator == "in":
                return any(fnmatch.fnmatch(str(param_value), v) for v in values)
            elif operator == "not_in":
                return not any(fnmatch.fnmatch(str(param_value), v) for v in values)
            elif operator == "contains":
                return any(v in str(param_value) for v in values)

            return False

        elif condition_type == "user_based":
            # Config: {"user_ids": ["uuid1", "uuid2"], "roles": ["owner", "admin"]}
            allowed_user_ids = condition_config.get("user_ids", [])
            if allowed_user_ids and str(user_id) in allowed_user_ids:
                return True

            allowed_roles = condition_config.get("roles", [])
            if allowed_roles and user_role in allowed_roles:
                return True

            return False

        elif condition_type == "resource_based":
            # Config: {"resource_type": "database", "resource_ids": ["db1", "db2"]}
            # This would need resource context passed in input_parameters
            if not input_parameters:
                return False

            resource_type = condition_config.get("resource_type")
            resource_ids = condition_config.get("resource_ids", [])

            # Check if input_parameters contains resource info
            resource_id = input_parameters.get("resource_id") or input_parameters.get(f"{resource_type}_id")
            if resource_id and str(resource_id) in resource_ids:
                return True

            return False

        return False

    async def _check_workspace_policies(
        self,
        workspace_id: UUID,
        tool_name: str,
        server_id: Optional[UUID],
        user_role: str,
    ) -> Optional[Dict[str, Any]]:
        """Check workspace-level permission policies."""
        user_role_level = self.ROLE_HIERARCHY.get(user_role, 0)

        query = """
            SELECT * FROM tool_permission_policies
            WHERE workspace_id = $1 AND enabled = true
            AND (server_id IS NULL OR server_id = $2)
            ORDER BY priority ASC
        """
        rows = await self.pool.fetch(query, workspace_id, server_id)

        for row in rows:
            # Check tool pattern match
            tool_pattern = row["tool_pattern"]
            if tool_pattern and not fnmatch.fnmatch(tool_name, tool_pattern):
                continue

            # Check category filter
            category_filter = row["category_filter"] or []
            if category_filter:
                tool_info = await self._get_tool_info(tool_name, server_id, workspace_id)
                tool_category = tool_info.get("category") if tool_info else None
                if tool_category and tool_category not in category_filter:
                    continue

            # Policy applies - evaluate
            policy_type = row["policy_type"]
            if policy_type == "allow":
                return {"decision": PermissionDecision.ALLOWED, "id": row["id"]}
            elif policy_type == "deny":
                return {"decision": PermissionDecision.DENIED, "id": row["id"]}
            elif policy_type == "require_approval":
                return {"decision": PermissionDecision.PENDING_APPROVAL, "id": row["id"]}

        return None

    async def _check_category_defaults(
        self, category: Optional[str], user_role: str
    ) -> Optional[Dict[str, Any]]:
        """Check tool category default permissions."""
        if not category:
            return None

        query = """
            SELECT * FROM tool_categories WHERE name = $1
        """
        row = await self.pool.fetchrow(query, category)

        if not row:
            return None

        # Check if user's role is in allowed roles
        allowed_roles = row["default_allowed_roles"] or []
        if user_role not in allowed_roles:
            return {"decision": PermissionDecision.DENIED}

        default_category = row["default_category"]
        requires_approval = row["default_requires_approval"]

        if default_category == "read":
            return {"decision": PermissionDecision.ALLOWED}
        elif default_category == "write":
            if requires_approval:
                return {"decision": PermissionDecision.PENDING_APPROVAL}
            return {"decision": PermissionDecision.ALLOWED}
        elif default_category == "destructive":
            return {"decision": PermissionDecision.PENDING_APPROVAL}
        elif default_category == "unknown":
            if requires_approval:
                return {"decision": PermissionDecision.PENDING_APPROVAL}
            return {"decision": PermissionDecision.ALLOWED}

        return None

    async def log_permission_decision(
        self,
        workspace_id: UUID,
        user_id: UUID,
        decision_data: Dict[str, Any],
    ) -> UUID:
        """Log a permission decision to the audit trail."""
        query = """
            INSERT INTO permission_decisions (
                workspace_id, user_id, tool_name, server_id, decision,
                matched_policy_id, matched_rule_id, matched_role_permission_id,
                user_role, input_parameters, evaluation_duration_ms, error_message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
        """
        row = await self.pool.fetchrow(
            query,
            workspace_id,
            user_id,
            decision_data["tool_name"],
            UUID(decision_data["server_id"]) if decision_data.get("server_id") else None,
            decision_data["decision"],
            UUID(decision_data["matched_policy_id"]) if decision_data.get("matched_policy_id") else None,
            UUID(decision_data["matched_rule_id"]) if decision_data.get("matched_rule_id") else None,
            UUID(decision_data["matched_role_permission_id"]) if decision_data.get("matched_role_permission_id") else None,
            decision_data["user_role"],
            decision_data.get("input_parameters"),
            decision_data.get("evaluation_duration_ms"),
            decision_data.get("error_message"),
        )
        return row["id"]

    async def get_permission_audit_log(
        self,
        workspace_id: UUID,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        tool_name: Optional[str] = None,
        decision: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get permission audit log for a workspace."""
        # Check user has access to workspace
        membership = await self.pool.fetchrow(
            "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
            workspace_id, user_id
        )
        if not membership:
            raise PermissionError("User is not a member of this workspace")

        is_admin = membership["role"] in ("owner", "admin")

        # Build query
        conditions = ["workspace_id = $1"]
        params = [workspace_id]
        param_idx = 2

        if not is_admin:
            conditions.append(f"user_id = ${param_idx}")
            params.append(user_id)
            param_idx += 1

        if tool_name:
            conditions.append(f"tool_name = ${param_idx}")
            params.append(tool_name)
            param_idx += 1

        if decision:
            conditions.append(f"decision = ${param_idx}")
            params.append(decision)
            param_idx += 1

        if start_date:
            conditions.append(f"created_at >= ${param_idx}")
            params.append(start_date)
            param_idx += 1

        if end_date:
            conditions.append(f"created_at <= ${param_idx}")
            params.append(end_date)
            param_idx += 1

        where_clause = " AND ".join(conditions)

        # Count total
        count_query = f"SELECT COUNT(*) as total FROM permission_decisions WHERE {where_clause}"
        total_row = await self.pool.fetchrow(count_query, *params)
        total = total_row["total"]

        # Get paginated results
        params.extend([limit, offset])
        query = f"""
            SELECT * FROM permission_decisions
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        rows = await self.pool.fetch(query, *params)

        return {
            "decisions": [dict(row) for row in rows],
            "total": total,
            "limit": limit,
            "offset": offset,
        }


# Singleton instance
permission_evaluator = PermissionEvaluator()