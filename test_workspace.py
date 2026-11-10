import asyncio
from backend.database.connection import db_pool
from backend.services.workspace import workspace_service
from uuid import UUID

async def test():
    user_id = UUID('00000000-0000-0000-0000-000000000001')
    workspaces = await workspace_service.get_user_workspaces(user_id)
    for w in workspaces:
        print(w)

asyncio.run(test())