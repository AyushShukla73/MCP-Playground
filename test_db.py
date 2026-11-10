import asyncio
from backend.database.connection import db_pool

async def test():
    await db_pool.initialize()
    rows = await db_pool.fetch('SELECT * FROM tool_categories ORDER BY name')
    for row in rows:
        print('Row type:', type(row))
        print('Row keys:', list(row.keys()))
        d = dict(row)
        print('Dict:', d)
        break
    await db_pool.close()

asyncio.run(test())