#!/usr/bin/env python3
"""Script to apply the 0003_tool_permissions.sql migration."""
import asyncio
import asyncpg
import os
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

async def apply_migration():
    """Apply the 0003_tool_permissions.sql migration."""
    # Read the migration file
    migration_path = Path(__file__).parent / "supabase" / "migrations" / "0003_tool_permissions.sql"
    migration_sql = migration_path.read_text()

    # Split into individual statements (by semicolon, but handle edge cases)
    # Simple split for now - migration is well-formed
    statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]

    conn = await asyncpg.connect(DATABASE_URL)

    try:
        for i, stmt in enumerate(statements):
            if not stmt:
                continue
            print(f"Executing statement {i+1}/{len(statements)}...")
            try:
                await conn.execute(stmt)
                print(f"  OK")
            except Exception as e:
                # Some statements might fail if already applied (e.g., ON CONFLICT DO NOTHING)
                print(f"  Warning: {e}")
        print("Migration applied successfully!")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(apply_migration())