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
            workspaces = ws_response.json()

            if workspaces:
                workspace_id = workspaces[0]['id']

                # Test with database/query which has a role permission and a policy
                print("\n=== Test 1: database/query (has role permission for viewer) ===")
                eval_response = await client.post(
                    f'http://localhost:8000/api/v1/permissions/evaluate?workspace_id={workspace_id}',
                    headers=headers,
                    json={'tool_name': 'database/query', 'server_id': None, 'input_parameters': {}}
                )
                print('Evaluate:', eval_response.status_code)
                print('Evaluate response:', json.dumps(eval_response.json(), indent=2))

                # Test with database/insert which has a policy (allow database/*)
                print("\n=== Test 2: database/insert (policy allows database/*) ===")
                eval_response2 = await client.post(
                    f'http://localhost:8000/api/v1/permissions/evaluate?workspace_id={workspace_id}',
                    headers=headers,
                    json={'tool_name': 'database/insert', 'server_id': None, 'input_parameters': {}}
                )
                print('Evaluate:', eval_response2.status_code)
                print('Evaluate response:', json.dumps(eval_response2.json(), indent=2))

                # Test with a non-database tool
                print("\n=== Test 3: file/read (no specific rules, falls to category default) ===")
                eval_response3 = await client.post(
                    f'http://localhost:8000/api/v1/permissions/evaluate?workspace_id={workspace_id}',
                    headers=headers,
                    json={'tool_name': 'file/read', 'server_id': None, 'input_parameters': {}}
                )
                print('Evaluate:', eval_response3.status_code)
                print('Evaluate response:', json.dumps(eval_response3.json(), indent=2))

asyncio.run(test())