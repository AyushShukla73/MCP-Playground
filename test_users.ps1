cd C:\Users\ayush\OneDrive\Desktop\MCP\mcp-control-room
python -c "
import asyncio
from backend.database.connection import db_pool

async def test():
    await db_pool.initialize()
    rows = await db_pool.fetch('SELECT * FROM auth.users')
    for row in rows:
        print(dict(row))
    await db_pool.close()

asyncio.run(test())
"