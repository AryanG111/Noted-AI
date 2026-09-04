import asyncio
import httpx
import sys
import os
import uuid

# Adjust path so backend imports resolve if needed
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Base API URL
API_URL = os.environ.get("TEST_API_URL", "http://127.0.0.1:8000/api")

async def run_suite():
    print("===============================================================")
    print("          NOTED AI COMPREHENSIVE API & EDGE CASE SUITE         ")
    print("===============================================================")
    
    test_user_id = str(uuid.uuid4())[:8]
    test_email = f"suite_user_{test_user_id}@example.com"
    valid_password = "SecurePassword123!"
    token = None
    
    passed = 0
    failed = 0

    def assert_test(condition, test_name, detail=""):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS] {test_name}")
            passed += 1
        else:
            print(f"  [FAIL] {test_name} -> {detail}")
            failed += 1

    async with httpx.AsyncClient(timeout=30.0) as client:
        # -------------------------------------------------------------
        # 1. AUTH VALIDATIONS & EDGE CASES
        # -------------------------------------------------------------
        print("\n--- 1. Auth Validations & Edge Cases ---")
        
        # 1.1 Short password check
        r = await client.post(f"{API_URL}/auth/register", json={
            "email": f"short_{test_user_id}@example.com",
            "password": "123", # < 8 chars
            "full_name": "Short Pass User"
        })
        assert_test(r.status_code == 422 and "at least 8 characters" in r.text, 
                    "Password < 8 characters returns 422 with friendly message", 
                    f"Status {r.status_code}: {r.text}")

        # 1.2 Invalid email format check
        r = await client.post(f"{API_URL}/auth/register", json={
            "email": "not-an-email",
            "password": valid_password,
            "full_name": "Invalid Email User"
        })
        assert_test(r.status_code == 422 and "email" in r.text.lower(), 
                    "Invalid email format returns 422 validation error", 
                    f"Status {r.status_code}: {r.text}")

        # 1.3 Successful registration
        r = await client.post(f"{API_URL}/auth/register", json={
            "email": test_email,
            "password": valid_password,
            "full_name": "Suite Tester",
            "occupation": "Security Engineer",
            "ai_tone": "balanced"
        })
        assert_test(r.status_code == 200 and "id" in r.json(), 
                    "Valid registration returns 200 with user schema", 
                    f"Status {r.status_code}: {r.text}")

        # 1.4 Duplicate registration check
        r = await client.post(f"{API_URL}/auth/register", json={
            "email": test_email,
            "password": valid_password
        })
        assert_test(r.status_code == 400 and "already exists" in r.text.lower(), 
                    "Duplicate email registration returns clean 400", 
                    f"Status {r.status_code}: {r.text}")

        # 1.5 Wrong password login check
        r = await client.post(f"{API_URL}/auth/login", json={
            "email": test_email,
            "password": "WrongPassword999!"
        })
        assert_test(r.status_code in (400, 401) and "incorrect email or password" in r.text.lower(), 
                    "Wrong password login returns clean 400/401 message", 
                    f"Status {r.status_code}: {r.text}")

        # 1.5.1 Pending status login check (returns 403)
        r = await client.post(f"{API_URL}/auth/login", json={
            "email": test_email,
            "password": valid_password
        })
        assert_test(r.status_code == 403 and "pending administrator approval" in r.text.lower(), 
                    "Pending user login is blocked with clean 403 approval notice", 
                    f"Status {r.status_code}: {r.text}")

        # Approve the test user in DB so downstream tests can execute
        try:
            from backend.app.core.db import SessionLocal
            from sqlalchemy import text
            with SessionLocal() as db_session:
                db_session.execute(text("UPDATE users SET status = 'approved' WHERE email = :email"), {"email": test_email.lower()})
                db_session.commit()
        except Exception as e:
            print(f"  [WARN] Could not directly approve user in DB: {e}")

        # 1.6 Login with whitespace / uppercase email (normalization)
        r = await client.post(f"{API_URL}/auth/login", json={
            "email": f"  {test_email.upper()}  ",
            "password": valid_password
        })
        assert_test(r.status_code == 200 and "access_token" in r.json(), 
                    "Login normalizes mixed-case and whitespace in email", 
                    f"Status {r.status_code}: {r.text}")
        
        if r.status_code == 200:
            token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1.7 Current user profile /auth/me
        r = await client.get(f"{API_URL}/auth/me", headers=headers)
        assert_test(r.status_code == 200 and r.json().get("email") == test_email.lower(), 
                    "GET /auth/me returns authenticated user details", 
                    f"Status {r.status_code}: {r.text}")

        # -------------------------------------------------------------
        # 2. NOTES API & EDGE CASES
        # -------------------------------------------------------------
        print("\n--- 2. Notes API & Edge Cases ---")
        
        # 2.1 Create note with empty title -> should fallback to 'Untitled Note'
        r = await client.post(f"{API_URL}/notes", headers=headers, json={
            "title": "",
            "content": "This is a test note created during automated validation suite."
        })
        assert_test(r.status_code == 201 and r.json().get("title") == "Untitled Note", 
                    "Create note with empty title falls back to 'Untitled Note'", 
                    f"Status {r.status_code}: {r.text}")
        note_id = r.json().get("id") if r.status_code == 201 else None

        # 2.2 Get note by ID
        if note_id:
            r = await client.get(f"{API_URL}/notes/{note_id}", headers=headers)
            assert_test(r.status_code == 200 and r.json().get("id") == note_id, 
                        f"GET /notes/{note_id} fetches correct note", 
                        f"Status {r.status_code}: {r.text}")

        # 2.3 Non-existent note UUID returns clean 404
        fake_uuid = str(uuid.uuid4())
        r = await client.get(f"{API_URL}/notes/{fake_uuid}", headers=headers)
        assert_test(r.status_code == 404 and "note not found" in r.text.lower(), 
                    "GET non-existent note returns clean 404 without debug trace", 
                    f"Status {r.status_code}: {r.text}")

        # 2.4 Update note
        if note_id:
            r = await client.put(f"{API_URL}/notes/{note_id}", headers=headers, json={
                "title": "Updated Title",
                "content": "Updated content content."
            })
            assert_test(r.status_code == 200 and r.json().get("title") == "Updated Title", 
                        "PUT /notes/{id} updates note correctly", 
                        f"Status {r.status_code}: {r.text}")

        # 2.5 Delete note
        if note_id:
            r = await client.delete(f"{API_URL}/notes/{note_id}", headers=headers)
            assert_test(r.status_code == 200 or r.status_code == 204, 
                        "DELETE /notes/{id} deletes note successfully", 
                        f"Status {r.status_code}: {r.text}")

        # -------------------------------------------------------------
        # 3. TASKS API & EDGE CASES
        # -------------------------------------------------------------
        print("\n--- 3. Tasks API & Edge Cases ---")
        
        # 3.1 Create manual task
        r = await client.post(f"{API_URL}/tasks", headers=headers, json={
            "description": "Prepare quarterly executive summary for team",
            "status": "pending"
        })
        assert_test(r.status_code == 201 and r.json().get("status") == "pending", 
                    "POST /tasks creates task with pending status", 
                    f"Status {r.status_code}: {r.text}")
        task_id = r.json().get("id") if r.status_code == 201 else None

        # 3.2 Invalid task status pattern validation check (e.g. status='invalid_status')
        if task_id:
            r = await client.put(f"{API_URL}/tasks/{task_id}", headers=headers, json={
                "status": "invalid_status_enum"
            })
            assert_test(r.status_code == 422 and "status" in r.text.lower(), 
                        "PUT /tasks/{id} with invalid status pattern returns clean 422", 
                        f"Status {r.status_code}: {r.text}")

        # 3.3 Valid toggle task status to 'done'
        if task_id:
            r = await client.put(f"{API_URL}/tasks/{task_id}", headers=headers, json={
                "status": "done"
            })
            assert_test(r.status_code == 200 and r.json().get("status") == "done", 
                        "PUT /tasks/{id} updates task status to done", 
                        f"Status {r.status_code}: {r.text}")

        # 3.4 Delete task
        if task_id:
            r = await client.delete(f"{API_URL}/tasks/{task_id}", headers=headers)
            assert_test(r.status_code == 204 or r.status_code == 200, 
                        "DELETE /tasks/{id} returns 204 No Content", 
                        f"Status {r.status_code}: {r.text}")

        # 3.5 Non-existent task delete returns clean 404
        r = await client.delete(f"{API_URL}/tasks/{fake_uuid}", headers=headers)
        assert_test(r.status_code == 404 and "task not found" in r.text.lower(), 
                    "DELETE non-existent task returns clean 404", 
                    f"Status {r.status_code}: {r.text}")

        # -------------------------------------------------------------
        # 4. CONTACTS API & EDGE CASES
        # -------------------------------------------------------------
        print("\n--- 4. Contacts API & Edge Cases ---")
        
        # 4.1 Fetch all contacts
        r = await client.get(f"{API_URL}/contacts", headers=headers)
        assert_test(r.status_code == 200 and isinstance(r.json(), list), 
                    "GET /contacts returns a list of contacts", 
                    f"Status {r.status_code}: {r.text}")

        # 4.2 Non-existent contact ID returns clean 404
        r = await client.get(f"{API_URL}/contacts/{fake_uuid}", headers=headers)
        assert_test(r.status_code == 404 and "contact not found" in r.text.lower(), 
                    "GET non-existent contact returns clean 404", 
                    f"Status {r.status_code}: {r.text}")

        # 4.3 Non-existent contact memories returns clean 404
        r = await client.get(f"{API_URL}/contacts/{fake_uuid}/memories", headers=headers)
        assert_test(r.status_code == 404 and "contact not found" in r.text.lower(), 
                    "GET memories for non-existent contact returns clean 404", 
                    f"Status {r.status_code}: {r.text}")

        # -------------------------------------------------------------
        # 5. TIMELINE & KNOWLEDGE GRAPH
        # -------------------------------------------------------------
        print("\n--- 5. Timeline & Knowledge Graph ---")
        
        # 5.1 Timeline
        r = await client.get(f"{API_URL}/timeline", headers=headers)
        assert_test(r.status_code == 200 and isinstance(r.json(), list), 
                    "GET /timeline returns aggregated chronological list", 
                    f"Status {r.status_code}: {r.text}")

        # 5.2 Memory Graph
        r = await client.get(f"{API_URL}/timeline/graph", headers=headers)
        assert_test(r.status_code == 200 and "nodes" in r.json() and "edges" in r.json(), 
                    "GET /timeline/graph returns nodes and edges structure", 
                    f"Status {r.status_code}: {r.text}")

        # -------------------------------------------------------------
        # 6. BRIEFING & 2-HOUR CACHING LOGIC
        # -------------------------------------------------------------
        print("\n--- 6. Daily Briefing & 2-Hour Cache Logic ---")
        
        # 6.1 First call generates briefing
        r1 = await client.get(f"{API_URL}/search/briefing", headers=headers)
        assert_test(r1.status_code == 200 and "headline" in r1.json() and "focus_summary" in r1.json(), 
                    "GET /search/briefing returns valid briefing structure", 
                    f"Status {r1.status_code}: {r1.text}")
        data1 = r1.json()

        # 6.2 Second call without force_refresh uses cached result (deterministic & instant)
        r2 = await client.get(f"{API_URL}/search/briefing", headers=headers)
        assert_test(r2.status_code == 200 and r2.json().get("timestamp") == data1.get("timestamp"), 
                    "GET /search/briefing within 2 hours returns cached result", 
                    f"Status {r2.status_code}: {r2.text}")

        # 6.3 Force refresh bypasses cache
        r3 = await client.get(f"{API_URL}/search/briefing?force_refresh=true", headers=headers)
        assert_test(r3.status_code == 200 and "headline" in r3.json(), 
                    "GET /search/briefing?force_refresh=true successfully re-evaluates briefing", 
                    f"Status {r3.status_code}: {r3.text}")

    print("\n===============================================================")
    print(f"                   RESULTS: {passed} PASSED, {failed} FAILED                 ")
    print("===============================================================")
    return failed == 0

if __name__ == "__main__":
    success = asyncio.run(run_suite())
    sys.exit(0 if success else 1)
