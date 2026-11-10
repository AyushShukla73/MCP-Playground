cd C:\Users\ayush\OneDrive\Desktop\MCP\mcp-control-room

# Login first
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"email": "test@example.com", "password": "password123"}'
$token = $loginResponse.access_token
echo "Token: $token"

# Test categories endpoint
$headers = @{ Authorization = "Bearer $token" }
$categories = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/permissions/categories" -Method Get -Headers $headers
echo "Categories: $($categories | ConvertTo-Json -Depth 5)"