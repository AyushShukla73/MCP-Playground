cd C:\Users\ayush\OneDrive\Desktop\MCP\mcp-control-room

# Login with correct email
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"email": "test@test.com", "password": "password123"}' -ErrorAction SilentlyContinue
if ($loginResponse -and $loginResponse.access_token) {
    $token = $loginResponse.access_token

    # Test workspaces endpoint with error details
    $headers = @{ Authorization = "Bearer $token" }
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/workspaces" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "Success: $($response | ConvertTo-Json -Depth 10)"
    } catch {
        Write-Host "Error status code: $($_.Exception.Response.StatusCode)"
        $responseBody = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseBody)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error content: $errorContent"
    }
} else {
    Write-Host "Login failed or no token"
    Write-Host $loginResponse
}