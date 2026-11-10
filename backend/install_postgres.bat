@echo off
"C:\Users\ayush\OneDrive\Desktop\MCP\mcp-control-room\backend\postgresql-17.exe" --mode unattended --prefix "C:/Program Files/PostgreSQL/17" --datadir "C:/Program Files/PostgreSQL/17/data" --password postgres --port 5432
echo Exit code: %errorlevel%
pause