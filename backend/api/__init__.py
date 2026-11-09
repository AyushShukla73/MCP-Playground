"""API package initialization."""
from fastapi import APIRouter

from backend.api.routes import workspaces, projects, tasks, tool_calls, approvals, analytics, auth, servers, permissions, tool_execution

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(tool_calls.router, prefix="/tool-calls", tags=["tool_calls"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(servers.router, prefix="/servers", tags=["servers"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(tool_execution.router, prefix="/tool-execution", tags=["tool_execution"])