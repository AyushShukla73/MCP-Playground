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

                # Test categories
                cat_response = await client.get('http://localhost:8000/api/v1/permissions/categories', headers=headers)
                print('Categories:', cat_response.status_code)
                print('Categories:', json.dumps(cat_response.json(), indent=2))

                # Test policies
                pol_response = await client.get(f'http://localhost:8000/api/v1/permissions/policies?workspace_id={workspace_id}', headers=headers)
                print('Policies:', pol_response.status_code)
                print('Policies:', json.dumps(pol_response.json(), indent=2))

                # Test role-permissions
                rp_response = await client.get(f'http://localhost:8000/api/v1/permissions/role-permissions?workspace_id={workspace_id}', headers=headers)
                print('Role-permissions:', rp_response.status_code)
                print('Role-permissions:', json.dumps(rp_response.json(), indent=2))

                # Test rules
                rules_response = await client.get(f'http://localhost:8000/api/v1/permissions/rules?workspace_id={workspace_id}', headers=headers)
                print('Rules:', rules_response.status_code)
                print('Rules:', json.dumps(rules_response.json(), indent=2))

                # Test audit log
                audit_response = await client.get(f'http://localhost:8000/api/v1/permissions/audit-log?workspace_id={workspace_id}', headers=headers)
                print('Audit log:', audit_response.status_code)
                print('Audit log:', json.dumps(audit_response.json(), indent=2))

asyncio.run(test())