import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Test health
        resp = await client.get("http://localhost:8000/health")
        print(f"Health: {resp.status_code} - {resp.json()}")

        # Test login
        resp = await client.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        print(f"Login: {resp.status_code}")
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            print(f"Token: {token[:50]}...")

            # Test permissions categories
            headers = {"Authorization": f"Bearer {token}"}
            resp = await client.get("http://localhost:8000/api/v1/permissions/categories", headers=headers)
            print(f"Categories: {resp.status_code}")
            if resp.status_code == 200:
                print(f"Categories data: {resp.json()}")
            else:
                print(f"Error: {resp.text}")

asyncio.run(test())