import asyncio
import httpx
import json

async def test():
    async with httpx.AsyncClient() as client:
        login_response = await client.post('http://localhost:8000/api/v1/auth/login', json={'email': 'test@test.com', 'password': 'password123'})
        print('Login:', login_response.status_code)
        if login_response.status_code == 200:
            token = login_response.json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}

            ws_response = await client.get('http://localhost:8000/api/v1/workspaces', headers=headers)
            print('Workspaces:', ws_response.status_code)
            workspaces = ws_response.json()
            print('Workspaces:', json.dumps(workspaces, indent=2))

            if workspaces:
                workspace_id = workspaces[0]['id']
                eval_response = await client.post(
                    f'http://localhost:8000/api/v1/permissions/evaluate?workspace_id={workspace_id}',
                    headers=headers,
                    json={'tool_name': 'test_tool', 'server_id': None, 'input_parameters': {}}
                )
                print('Evaluate:', eval_response.status_code)
                print('Evaluate response:', json.dumps(eval_response.json(), indent=2))

asyncio.run(test())