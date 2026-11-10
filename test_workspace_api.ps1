cd C:\Users\ayush\OneDrive\Desktop\MCP\mcp-control-room

# Login with correct email
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"email": "test@test.com", "password": "password123"}' -ErrorAction SilentlyContinue
if ($loginResponse -and $loginResponse.access_token) {
    $token = $loginResponse.access_token

    # Test workspaces endpoint
    $headers = @{ Authorization = "Bearer $token" }
    $workspaces = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/workspaces" -Method Get -Headers $headers -ErrorAction SilentlyContinue
    Write-Host "Workspaces response:"
    $workspaces | ConvertTo-Json -Depth 10
} else {
    Write-Host "Login failed or no token"
    Write-Host $loginResponse
}