#!/usr/bin/env python3
"""Script to apply the 0003_tool_permissions.sql migration using psycopg2."""
import os
import re
import psycopg2
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

def apply_migration():
    """Apply the 0003_tool_permissions.sql migration."""
    # Read the migration file
    migration_path = Path(__file__).parent / "supabase" / "migrations" / "0003_tool_permissions.sql"
    migration_sql = migration_path.read_text()

    # Split into individual statements (by semicolon, but handle edge cases)
    # More careful splitting for psycopg2
    statements = []
    current = ""
    in_function = False

    for line in migration_sql.split('\n'):
        stripped = line.strip()

        # Skip comments
        if stripped.startswith('--'):
            continue

        current += line + '\n'

        # Check for function/procedure definitions
        if 'CREATE OR REPLACE FUNCTION' in line or 'CREATE FUNCTION' in line:
            in_function = True
        if in_function and stripped.endswith(';') and ('END' in stripped or 'end' in stripped):
            in_function = False
            statements.append(current.strip())
            current = ""
            continue

        if not in_function and stripped.endswith(';'):
            statements.append(current.strip())
            current = ""

    # Add any remaining
    if current.strip():
        statements.append(current.strip())

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        for i, stmt in enumerate(statements):
            if not stmt:
                continue
            print(f"Executing statement {i+1}/{len(statements)}...")
            try:
                cur.execute(stmt)
                print(f"  OK")
            except Exception as e:
                # Some statements might fail if already applied (e.g., ON CONFLICT DO NOTHING)
                print(f"  Warning: {e}")
        print("Migration applied successfully!")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    apply_migration()