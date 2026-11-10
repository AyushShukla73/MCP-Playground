cd C:\Users\ayush\OneDrive\Desktop\MCP\mcp-control-room

# Login with correct email
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"email": "test@test.com", "password": "password123"}' -ErrorAction SilentlyContinue
if ($loginResponse -and $loginResponse.access_token) {
    $token = $loginResponse.access_token
    echo "Token: $token"

    # Test categories endpoint
    $headers = @{ Authorization = "Bearer $token" }
    $categories = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/permissions/categories" -Method Get -Headers $headers
    echo "Categories: $($categories | ConvertTo-Json -Depth 5)"
} else {
    echo "Login failed or no token"
}