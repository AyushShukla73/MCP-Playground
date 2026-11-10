#!/usr/bin/env python3
"""Script to apply all migrations in order: 0001, 0002, 0003."""
import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

MIGRATION_FILES = [
    "0001_initial_schema.sql",
    "0002_mcp_servers.sql",
    "0003_tool_permissions.sql"
]

def split_statements(sql_content):
    """Split SQL into individual statements, handling function definitions with dollar quoting."""
    statements = []
    current = ""
    in_function = False
    dollar_quote_level = 0

    for line in sql_content.split('\n'):
        stripped = line.strip()

        # Skip comments (but keep them in current for proper tracking)
        if stripped.startswith('--'):
            current += line + '\n'
            continue

        current += line + '\n'

        # Track dollar-quoted strings ($$...$$)
        # Count opening $$ and closing $$
        dollar_opens = line.count('$$')
        # Simple approach: toggle on each $$
        if dollar_opens % 2 == 1:
            dollar_quote_level = 1 - dollar_quote_level

        # Check for function/procedure definitions
        if 'CREATE OR REPLACE FUNCTION' in line or 'CREATE FUNCTION' in line:
            in_function = True

        # End of function: we're in a function, not in a dollar quote, and line ends with ;
        if in_function and dollar_quote_level == 0 and stripped.endswith(';'):
            in_function = False
            statements.append(current.strip())
            current = ""
            continue

        # Regular statement end: not in function, not in dollar quote, ends with ;
        if not in_function and dollar_quote_level == 0 and stripped.endswith(';'):
            statements.append(current.strip())
            current = ""

    # Add any remaining
    if current.strip():
        statements.append(current.strip())

    return statements

def apply_migration_file(migration_file):
    """Apply a single migration file."""
    print(f"\n{'='*60}")
    print(f"Applying {migration_file}...")
    print(f"{'='*60}")

    migration_path = Path(__file__).parent / "supabase" / "migrations" / migration_file
    migration_sql = migration_path.read_text()

    statements = split_statements(migration_sql)
    print(f"Found {len(statements)} statements")

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    success_count = 0
    warning_count = 0

    try:
        for i, stmt in enumerate(statements):
            if not stmt:
                continue
            print(f"  [{i+1}/{len(statements)}] ", end="", flush=True)
            try:
                cur.execute(stmt)
                print("OK")
                success_count += 1
            except Exception as e:
                error_msg = str(e)
                # Check if it's a "already exists" type error
                if any(keyword in error_msg.lower() for keyword in
                       ['already exists', 'duplicate key', 'on conflict', 'relation .* exists']):
                    print(f"SKIPPED (already exists)")
                    warning_count += 1
                else:
                    print(f"ERROR: {error_msg[:200]}")
                    raise
        print(f"  [OK] {migration_file} completed: {success_count} executed, {warning_count} skipped")
    finally:
        cur.close()
        conn.close()

def main():
    print("Applying all migrations in order...")
    print(f"Database: {DATABASE_URL}")

    # First, create the auth schema and minimal auth.users table if they don't exist
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute("CREATE SCHEMA IF NOT EXISTS auth;")
        print("[OK] Created auth schema")
        # Create uuid extension for uuid_generate_v4()
        cur.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
        print("[OK] Created uuid-ossp extension")
        # Create minimal auth.users table for foreign key references
        cur.execute("""
            CREATE TABLE IF NOT EXISTS auth.users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email TEXT UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        print("[OK] Created auth.users table")
        # Create auth.uid() function for RLS policies (returns a fixed test user ID)
        cur.execute("""
            CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
            SELECT '00000000-0000-0000-0000-000000000001'::UUID;
            $$ LANGUAGE sql SECURITY DEFINER;
        """)
        print("[OK] Created auth.uid() function")
        # Create auth.role() function for RLS policies
        cur.execute("""
            CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
            SELECT 'authenticated';
            $$ LANGUAGE sql SECURITY DEFINER;
        """)
        print("[OK] Created auth.role() function")
    finally:
        cur.close()
        conn.close()

    for migration_file in MIGRATION_FILES:
        apply_migration_file(migration_file)

    print("\n" + "="*60)
    print("All migrations applied successfully!")
    print("="*60)

if __name__ == "__main__":
    main()