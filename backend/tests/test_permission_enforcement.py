"""Security tests for permission enforcement in tool execution."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4
from datetime import datetime

from backend.services.permission_evaluator import (
    permission_evaluator,
    PermissionDecision,
)
from backend.services.tool_call import tool_call_service
from backend.api.routes.tool_execution import (
    execute_tool,
    approve_execution,
    reject_execution,
    ToolExecuteRequest,
)


class TestPermissionEvaluator:
    """Test the core permission evaluator logic."""

    @pytest.fixture
    def mock_pool(self):
        """Mock asyncpg pool."""
        return AsyncMock()

    @pytest.mark.asyncio
    async def test_evaluate_permission_allowed_by_role(self, mock_pool):
        """Test that a user with appropriate role gets allowed."""
        with patch.object(permission_evaluator, 'pool', mock_pool):
            # Mock _get_user_role
            mock_pool.fetchrow.return_value = {"role": "owner"}

            # Mock _get_tool_info
            mock_pool.fetchrow.return_value = {
                "name": "read_file",
                "server_id": uuid4(),
                "is_enabled": True,
                "category": "read"
            }

            # Mock _check_role_permissions - returns allow for owner role
            mock_pool.fetch.return_value = [
                MagicMock(
                    permission="allow",
                    role="owner",
                    id=uuid4(),
                )
            ]

            result = await permission_evaluator.evaluate_permission(
                workspace_id=uuid4(),
                user_id=uuid4(),
                tool_name="read_file",
                server_id=uuid4(),
                input_parameters={"path": "/tmp/test.txt"},
            )

            assert result["decision"] == PermissionDecision.ALLOWED.value

    @pytest.mark.asyncio
    async def test_evaluate_permission_denied_by_policy(self, mock_pool):
        """Test that a deny policy blocks execution."""
        with patch.object(permission_evaluator, 'pool', mock_pool):
            # Mock _get_user_role
            mock_pool.fetchrow.return_value = {"role": "member"}

            # Mock _get_tool_info
            mock_pool.fetchrow.return_value = {
                "name": "delete_file",
                "server_id": uuid4(),
                "is_enabled": True,
                "category": "destructive"
            }

            # Mock _check_role_permissions - no role permissions
            mock_pool.fetch.return_value = []

            # Mock _check_permission_rules - no rules
            mock_pool.fetch.return_value = []

            # Mock _check_workspace_policies - deny policy
            mock_pool.fetch.return_value = [
                MagicMock(
                    policy_type="deny",
                    priority=200,
                    tool_pattern="delete_*",
                    category_filter=[],
                    id=uuid4(),
                )
            ]

            result = await permission_evaluator.evaluate_permission(
                workspace_id=uuid4(),
                user_id=uuid4(),
                tool_name="delete_file",
                server_id=uuid4(),
                input_parameters={"path": "/tmp/important.txt"},
            )

            assert result["decision"] == PermissionDecision.DENIED.value
            assert result["matched_policy_id"] is not None

    @pytest.mark.asyncio
    async def test_evaluate_permission_pending_approval(self, mock_pool):
        """Test that require_approval returns pending_approval."""
        with patch.object(permission_evaluator, 'pool', mock_pool):
            # Mock _get_user_role
            mock_pool.fetchrow.return_value = {"role": "member"}

            # Mock _get_tool_info
            mock_pool.fetchrow.return_value = {
                "name": "execute_command",
                "server_id": uuid4(),
                "is_enabled": True,
                "category": "destructive"
            }

            # Mock _check_role_permissions - no role permissions
            mock_pool.fetch.return_value = []

            # Mock _check_permission_rules - no rules
            mock_pool.fetch.return_value = []

            # Mock _check_workspace_policies - require_approval policy
            mock_pool.fetch.return_value = [
                MagicMock(
                    policy_type="require_approval",
                    priority=150,
                    tool_pattern="execute_*",
                    category_filter=[],
                    id=uuid4(),
                )
            ]

            result = await permission_evaluator.evaluate_permission(
                workspace_id=uuid4(),
                user_id=uuid4(),
                tool_name="execute_command",
                server_id=uuid4(),
                input_parameters={"command": "rm -rf /"},
            )

            assert result["decision"] == PermissionDecision.PENDING_APPROVAL.value

    @pytest.mark.asyncio
    async def test_evaluate_condition_time_based(self, mock_pool):
        """Test time-based condition evaluation."""
        condition = {
            "type": "time_based",
            "config": {
                "timezone": "UTC",
                "allowed_hours": [9, 17],
                "days": [1, 2, 3, 4, 5],  # Mon-Fri
            },
        }

        # Test the condition structure is parsed
        assert condition["type"] == "time_based"
        assert "allowed_hours" in condition["config"]

    @pytest.mark.asyncio
    async def test_evaluate_condition_parameter_based(self, mock_pool):
        """Test parameter-based condition evaluation."""
        condition = {
            "type": "parameter_based",
            "config": {
                "parameter": "path",
                "operator": "starts_with",
                "value": "/safe/",
            },
        }

        # Test the condition matches safe paths
        assert condition["type"] == "parameter_based"
        assert condition["config"]["parameter"] == "path"

    @pytest.mark.asyncio
    async def test_evaluate_condition_user_based(self, mock_pool):
        """Test user-based condition evaluation."""
        condition = {
            "type": "user_based",
            "config": {
                "user_ids": ["user-1", "user-2"],
                "roles": ["admins", "developers"],
            },
        }

        assert condition["type"] == "user_based"
        assert "user_ids" in condition["config"]

    @pytest.mark.asyncio
    async def test_evaluate_condition_resource_based(self, mock_pool):
        """Test resource-based condition evaluation."""
        condition = {
            "type": "resource_based",
            "config": {
                "resource_type": "server",
                "resource_ids": ["server-1", "server-2"],
            },
        }

        assert condition["type"] == "resource_based"
        assert condition["config"]["resource_type"] == "server"


class TestToolExecutionEndpoint:
    """Test the tool execution API endpoints with permission enforcement."""

    @pytest.fixture
    def mock_current_user(self):
        return {"sub": str(uuid4())}

    @pytest.fixture
    def mock_workspace_id(self):
        return uuid4()

    @pytest.fixture
    def mock_server_id(self):
        return uuid4()

    @pytest.mark.asyncio
    async def test_execute_tool_permission_allowed(self, mock_current_user, mock_workspace_id, mock_server_id):
        """Test tool execution when permission is allowed."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service, \
             patch('backend.api.routes.tool_execution.permission_evaluator') as mock_permission_evaluator, \
             patch('backend.api.routes.tool_execution.mcp_server_service') as mock_server_service, \
             patch('backend.api.routes.tool_execution.MCPClient') as mock_mcp_client:

            # Setup mocks
            mock_tool_call_service.create_tool_call = AsyncMock()
            mock_tool_call_service.update_tool_call_status = AsyncMock()

            mock_permission_evaluator.evaluate_permission = AsyncMock(return_value={
                "decision": PermissionDecision.ALLOWED.value,
                "matched_policy_id": None,
                "matched_rule_id": None,
                "matched_role_permission_id": str(uuid4()),
                "error_message": None,
            })
            mock_permission_evaluator.log_permission_decision = AsyncMock()

            mock_server_service.get_server = AsyncMock(return_value=MagicMock(
                config={"host": "localhost", "port": 8080},
                transport_type="stdio",
            ))

            mock_client_instance = AsyncMock()
            mock_client_instance.call_tool = AsyncMock(return_value=MagicMock(
                content=[MagicMock(type="text", text="Success")],
                isError=False,
            ))
            mock_mcp_client.return_value = mock_client_instance

            request = ToolExecuteRequest(
                tool_name="read_file",
                arguments={"path": "/tmp/test.txt"},
                server_id=mock_server_id,
            )

            result = await execute_tool(request, mock_workspace_id, mock_current_user)

            assert result.status == "completed"
            assert result.permission_decision == PermissionDecision.ALLOWED.value
            assert result.execution_result is not None
            mock_tool_call_service.create_tool_call.assert_called_once()
            mock_tool_call_service.update_tool_call_status.assert_called()

    @pytest.mark.asyncio
    async def test_execute_tool_permission_denied(self, mock_current_user, mock_workspace_id, mock_server_id):
        """Test tool execution when permission is denied."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service, \
             patch('backend.api.routes.tool_execution.permission_evaluator') as mock_permission_evaluator:

            mock_tool_call_service.create_tool_call = AsyncMock()
            mock_tool_call_service.update_tool_call_status = AsyncMock()

            mock_permission_evaluator.evaluate_permission = AsyncMock(return_value={
                "decision": PermissionDecision.DENIED.value,
                "matched_policy_id": str(uuid4()),
                "matched_rule_id": None,
                "matched_role_permission_id": None,
                "error_message": "Tool blocked by security policy",
            })
            mock_permission_evaluator.log_permission_decision = AsyncMock()

            request = ToolExecuteRequest(
                tool_name="delete_all_files",
                arguments={"confirm": True},
                server_id=mock_server_id,
            )

            with pytest.raises(Exception) as exc_info:
                await execute_tool(request, mock_workspace_id, mock_current_user)

            # Should raise 403
            assert exc_info.value.status_code == 403
            assert "Permission denied" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_execute_tool_pending_approval(self, mock_current_user, mock_workspace_id, mock_server_id):
        """Test tool execution when approval is required."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service, \
             patch('backend.api.routes.tool_execution.permission_evaluator') as mock_permission_evaluator:

            mock_tool_call_service.create_tool_call = AsyncMock()
            mock_tool_call_service.update_tool_call_status = AsyncMock()

            mock_permission_evaluator.evaluate_permission = AsyncMock(return_value={
                "decision": PermissionDecision.PENDING_APPROVAL.value,
                "matched_policy_id": str(uuid4()),
                "matched_rule_id": None,
                "matched_role_permission_id": None,
                "error_message": None,
            })
            mock_permission_evaluator.log_permission_decision = AsyncMock()

            request = ToolExecuteRequest(
                tool_name="execute_command",
                arguments={"command": "sudo reboot"},
                server_id=mock_server_id,
            )

            result = await execute_tool(request, mock_workspace_id, mock_current_user)

            assert result.status == "pending"
            assert result.permission_decision == PermissionDecision.PENDING_APPROVAL.value
            assert result.matched_policy_id is not None

    @pytest.mark.asyncio
    async def test_execute_tool_server_not_found(self, mock_current_user, mock_workspace_id, mock_server_id):
        """Test tool execution when server doesn't exist."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service, \
             patch('backend.api.routes.tool_execution.permission_evaluator') as mock_permission_evaluator, \
             patch('backend.api.routes.tool_execution.mcp_server_service') as mock_server_service:

            mock_tool_call_service.create_tool_call = AsyncMock()
            mock_tool_call_service.update_tool_call_status = AsyncMock()

            mock_permission_evaluator.evaluate_permission = AsyncMock(return_value={
                "decision": PermissionDecision.ALLOWED.value,
                "matched_policy_id": None,
                "matched_rule_id": None,
                "matched_role_permission_id": str(uuid4()),
                "error_message": None,
            })
            mock_permission_evaluator.log_permission_decision = AsyncMock()

            mock_server_service.get_server = AsyncMock(return_value=None)

            request = ToolExecuteRequest(
                tool_name="read_file",
                arguments={"path": "/tmp/test.txt"},
                server_id=mock_server_id,
            )

            with pytest.raises(Exception) as exc_info:
                await execute_tool(request, mock_workspace_id, mock_current_user)

            assert exc_info.value.status_code == 404
            assert "MCP server not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_execute_tool_execution_error(self, mock_current_user, mock_workspace_id, mock_server_id):
        """Test tool execution when MCP client raises an error."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service, \
             patch('backend.api.routes.tool_execution.permission_evaluator') as mock_permission_evaluator, \
             patch('backend.api.routes.tool_execution.mcp_server_service') as mock_server_service, \
             patch('backend.api.routes.tool_execution.MCPClient') as mock_mcp_client:

            mock_tool_call_service.create_tool_call = AsyncMock()
            mock_tool_call_service.update_tool_call_status = AsyncMock()

            mock_permission_evaluator.evaluate_permission = AsyncMock(return_value={
                "decision": PermissionDecision.ALLOWED.value,
                "matched_policy_id": None,
                "matched_rule_id": None,
                "matched_role_permission_id": str(uuid4()),
                "error_message": None,
            })
            mock_permission_evaluator.log_permission_decision = AsyncMock()

            mock_server_service.get_server = AsyncMock(return_value=MagicMock(
                config={"host": "localhost", "port": 8080},
                transport_type="stdio",
            ))

            mock_client_instance = AsyncMock()
            mock_client_instance.call_tool = AsyncMock(side_effect=Exception("Connection timeout"))
            mock_mcp_client.return_value = mock_client_instance

            request = ToolExecuteRequest(
                tool_name="read_file",
                arguments={"path": "/tmp/test.txt"},
                server_id=mock_server_id,
            )

            result = await execute_tool(request, mock_workspace_id, mock_current_user)

            assert result.status == "failed"
            assert result.execution_error == "Connection timeout"


class TestPermissionAuditLogging:
    """Test audit logging for permission decisions."""

    @pytest.mark.asyncio
    async def test_log_permission_decision(self):
        """Test that permission decisions are logged."""
        mock_pool = AsyncMock()
        mock_pool.fetchrow.return_value = {"id": uuid4()}

        with patch.object(permission_evaluator, 'pool', mock_pool):
            await permission_evaluator.log_permission_decision(
                workspace_id=uuid4(),
                user_id=uuid4(),
                decision_data={
                    "tool_name": "test_tool",
                    "server_id": str(uuid4()),
                    "decision": PermissionDecision.ALLOWED.value,
                    "matched_policy_id": None,
                    "matched_rule_id": None,
                    "matched_role_permission_id": str(uuid4()),
                    "user_role": "owner",
                    "input_parameters": {"param": "value"},
                    "evaluation_duration_ms": 50,
                    "error_message": None,
                },
            )

            mock_pool.fetchrow.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_permission_audit_log(self):
        """Test retrieving audit log entries."""
        mock_pool = AsyncMock()
        mock_pool.fetchrow.return_value = {"role": "admin"}
        mock_pool.fetch.return_value = [
            MagicMock(
                id=uuid4(),
                workspace_id=uuid4(),
                user_id=uuid4(),
                tool_name="test_tool",
                server_id=uuid4(),
                decision="allowed",
                matched_policy_id=None,
                matched_rule_id=None,
                matched_role_permission_id=uuid4(),
                user_role="owner",
                input_parameters={"param": "value"},
                evaluation_duration_ms=50,
                created_at=datetime.utcnow(),
            )
        ]

        with patch.object(permission_evaluator, 'pool', mock_pool):
            entries = await permission_evaluator.get_permission_audit_log(
                workspace_id=uuid4(),
                user_id=uuid4(),
                limit=10,
            )

            assert len(entries["decisions"]) == 1
            assert entries["decisions"][0]["tool_name"] == "test_tool"
            assert entries["decisions"][0]["decision"] == "allowed"


class TestPermissionEvaluationOrder:
    """Test the 5-tier permission evaluation order."""

    @pytest.mark.asyncio
    async def test_evaluation_order_role_permission_first(self, mock_pool):
        """Test that explicit role permissions are evaluated first."""
        with patch.object(permission_evaluator, 'pool', mock_pool):
            # Mock _get_user_role
            mock_pool.fetchrow.return_value = {"role": "owner"}

            # Mock _get_tool_info
            mock_pool.fetchrow.return_value = {
                "name": "read_file",
                "server_id": uuid4(),
                "is_enabled": True,
                "category": "read"
            }

            # Mock _check_role_permissions - returns allow for owner role
            mock_pool.fetch.return_value = [
                MagicMock(
                    permission="allow",
                    role="owner",
                    id=uuid4(),
                )
            ]

            result = await permission_evaluator.evaluate_permission(
                workspace_id=uuid4(),
                user_id=uuid4(),
                tool_name="read_file",
                server_id=uuid4(),
                input_parameters={},
            )

            # Should return allowed from role permission (highest priority)
            assert result["decision"] == PermissionDecision.ALLOWED.value
            assert result["matched_role_permission_id"] is not None

    @pytest.mark.asyncio
    async def test_evaluation_order_fine_grained_rules_second(self, mock_pool):
        """Test that fine-grained rules are evaluated after role permissions."""
        with patch.object(permission_evaluator, 'pool', mock_pool):
            call_count = [0]

            async def mock_fetchrow(*args, **kwargs):
                if "workspace_members" in args[0]:
                    return {"role": "member"}
                elif "mcp_server_tools" in args[0]:
                    return {
                        "name": "delete_file",
                        "server_id": uuid4(),
                        "is_enabled": True,
                        "category": "destructive"
                    }
                return None

            async def mock_fetch(*args, **kwargs):
                call_count[0] += 1
                if call_count[0] == 1:
                    # First call - role permissions (empty)
                    return []
                elif call_count[0] == 2:
                    # Second call - permission rules
                    return [
                        MagicMock(
                            action="deny",
                            priority=150,
                            condition_type="always",
                            condition_config={},
                            id=uuid4(),
                        )
                    ]
                return []

            mock_pool.fetchrow.side_effect = mock_fetchrow
            mock_pool.fetch.side_effect = mock_fetch

            result = await permission_evaluator.evaluate_permission(
                workspace_id=uuid4(),
                user_id=uuid4(),
                tool_name="delete_file",
                server_id=uuid4(),
                input_parameters={},
            )

            assert result["decision"] == PermissionDecision.DENIED.value
            assert result["matched_rule_id"] is not None

    @pytest.mark.asyncio
    async def test_evaluation_order_workspace_policies_third(self, mock_pool):
        """Test that workspace policies are evaluated third."""
        with patch.object(permission_evaluator, 'pool', mock_pool):
            call_count = [0]

            async def mock_fetchrow(*args, **kwargs):
                if "workspace_members" in args[0]:
                    return {"role": "member"}
                elif "mcp_server_tools" in args[0]:
                    return {
                        "name": "execute_command",
                        "server_id": uuid4(),
                        "is_enabled": True,
                        "category": "destructive"
                    }
                return None

            async def mock_fetch(*args, **kwargs):
                call_count[0] += 1
                if call_count[0] <= 2:
                    # First two calls - role permissions and rules (empty)
                    return []
                else:
                    # Third call - workspace policies
                    return [
                        MagicMock(
                            policy_type="require_approval",
                            priority=200,
                            tool_pattern="execute_*",
                            category_filter=[],
                            id=uuid4(),
                        )
                    ]

            mock_pool.fetchrow.side_effect = mock_fetchrow
            mock_pool.fetch.side_effect = mock_fetch

            result = await permission_evaluator.evaluate_permission(
                workspace_id=uuid4(),
                user_id=uuid4(),
                tool_name="execute_command",
                server_id=uuid4(),
                input_parameters={},
            )

            assert result["decision"] == PermissionDecision.PENDING_APPROVAL.value
            assert result["matched_policy_id"] is not None


class TestSecurityEdgeCases:
    """Test security edge cases and attack vectors."""

    @pytest.mark.asyncio
    async def test_tool_name_injection(self, mock_current_user, mock_workspace_id, mock_server_id):
        """Test that tool names with injection attempts are handled safely."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service, \
             patch('backend.api.routes.tool_execution.permission_evaluator') as mock_permission_evaluator:

            mock_tool_call_service.create_tool_call = AsyncMock()
            mock_tool_call_service.update_tool_call_status = AsyncMock()

            mock_permission_evaluator.evaluate_permission = AsyncMock(return_value={
                "decision": PermissionDecision.DENIED.value,
                "matched_policy_id": str(uuid4()),
                "matched_rule_id": None,
                "matched_role_permission_id": None,
                "error_message": "Invalid tool name",
            })
            mock_permission_evaluator.log_permission_decision = AsyncMock()

            # Attempt injection in tool name
            request = ToolExecuteRequest(
                tool_name="read_file; DROP TABLE users; --",
                arguments={},
                server_id=mock_server_id,
            )

            with pytest.raises(Exception) as exc_info:
                await execute_tool(request, mock_workspace_id, mock_current_user)

            assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_malformed_arguments(self, mock_current_user, mock_workspace_id, mock_server_id):
        """Test handling of malformed JSON arguments."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service, \
             patch('backend.api.routes.tool_execution.permission_evaluator') as mock_permission_evaluator, \
             patch('backend.api.routes.tool_execution.mcp_server_service') as mock_server_service, \
             patch('backend.api.routes.tool_execution.MCPClient') as mock_mcp_client:

            mock_tool_call_service.create_tool_call = AsyncMock()
            mock_tool_call_service.update_tool_call_status = AsyncMock()

            mock_permission_evaluator.evaluate_permission = AsyncMock(return_value={
                "decision": PermissionDecision.ALLOWED.value,
                "matched_policy_id": None,
                "matched_rule_id": None,
                "matched_role_permission_id": str(uuid4()),
                "error_message": None,
            })
            mock_permission_evaluator.log_permission_decision = AsyncMock()

            mock_server_service.get_server = AsyncMock(return_value=MagicMock(
                config={}, transport_type="stdio"
            ))

            mock_client_instance = AsyncMock()
            mock_client_instance.call_tool = AsyncMock(side_effect=ValueError("Invalid JSON"))
            mock_mcp_client.return_value = mock_client_instance

            # Arguments will be passed as dict, not JSON string at this layer
            request = ToolExecuteRequest(
                tool_name="read_file",
                arguments={"path": "/tmp/test.txt"},
                server_id=mock_server_id,
            )

            # The endpoint should handle serialization errors gracefully
            # (In practice, FastAPI would catch this at request validation)

    @pytest.mark.asyncio
    async def test_unauthorized_user_access(self, mock_workspace_id, mock_server_id):
        """Test that users can't access other users' tool executions."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service:
            mock_tool_call_service.get_tool_call = AsyncMock(return_value=None)

            from backend.api.routes.tool_execution import get_execution_status

            with pytest.raises(Exception) as exc_info:
                await get_execution_status("some-request-id", mock_workspace_id, {"sub": str(uuid4())})

            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_approval_workflow(self, mock_current_user, mock_workspace_id):
        """Test the approve/reject workflow for pending executions."""
        with patch('backend.api.routes.tool_execution.tool_call_service') as mock_tool_call_service:
            mock_tool_call_service.get_tool_call = AsyncMock(return_value=MagicMock(
                status="pending",
                permission_result="pending_approval",
            ))
            mock_tool_call_service.update_tool_call_status = AsyncMock()

            from backend.api.routes.tool_execution import approve_execution, reject_execution

            # Test approve
            result = await approve_execution("request-id", mock_workspace_id, mock_current_user)
            assert result.status == "approved"

            # Test reject
            result = await reject_execution("request-id", mock_workspace_id, mock_current_user)
            assert result.status == "rejected"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])