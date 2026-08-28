import httpx
import sys
import os

# Configure stdout encoding to prevent Unicode errors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Adjust Python search path to import backend correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Base API URL
API_URL = "http://127.0.0.1:8000/api"

async def run_tests():
    print("==================================================")
    print("          NOTED AI API INTEGRATION TEST           ")
    print("==================================================")
    
    email = "integration_test_user@example.com"
    password = "supersecrettestpassword123"
    token = None
    note_id = None
    contact_id = None
    task_id = None
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        # 1. Register test user
        print("\n1. Testing Auth: User Registration...")
        try:
            reg_res = await client.post(f"{API_URL}/auth/register", json={
                "email": email,
                "password": password,
                "full_name": "Rahul Sharma",
                "occupation": "Researcher",
                "ai_tone": "creative"
            })
            if reg_res.status_code == 200:
                print(" -> Success! User registered.")
            elif reg_res.status_code == 400 and "already exists" in reg_res.text:
                print(" -> User already exists. Proceeding to login.")
            else:
                print(f" -> Failed: {reg_res.status_code} {reg_res.text}")
                return
        except Exception as e:
            print(f" -> Connection error: {e}")
            return
            
        # 2. Login to get token
        print("\n2. Testing Auth: User Login...")
        login_res = await client.post(f"{API_URL}/auth/login", json={
            "email": email,
            "password": password
        })
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            print(" -> Success! Token retrieved.")
        else:
            print(f" -> Failed: {login_res.status_code} {login_res.text}")
            return
            
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Create Note (Triggers Ingestion Pipeline)
        print("\n3. Testing Pipeline: Creating Note...")
        note_content = (
            "Met with Rahul Sharma today. We discussed the AWS migration plan. "
            "Need to email the project architecture proposal to Rahul by next Friday."
        )
        print(f" -> Submitting note content:\n    \"{note_content}\"")
        print(" -> Ingestion pipeline running (extracting summary, tags, contact, task)...")
        
        note_res = await client.post(f"{API_URL}/notes", headers=headers, json={
            "title": "Discussion with Rahul",
            "content": note_content
        })
        
        if note_res.status_code == 201:
            note_data = note_res.json()
            note_id = note_data["id"]
            print(f" -> Success! Note Created with ID: {note_id}")
            
            # Wait for background task to complete (is_processing == False)
            print(" -> Ingestion pipeline running in background, polling for completion...")
            max_attempts = 30
            for attempt in range(max_attempts):
                await asyncio.sleep(1.0)
                note_check_res = await client.get(f"{API_URL}/notes/{note_id}", headers=headers)
                if note_check_res.status_code == 200:
                    note_data = note_check_res.json()
                    if not note_data.get("is_processing"):
                        break
            else:
                print(" -> Warning: Ingestion pipeline did not complete within timeout.")
                
            print(f"    - Generated Title: {note_data.get('title')}")
            print(f"    - Generated Summary: {note_data.get('summary')}")
            print(f"    - Generated Tags: {note_data.get('tags')}")
        else:
            print(f" -> Failed: {note_res.status_code} {note_res.text}")
            return
            
        # 4. Fetch Contacts (Verify entity extraction & relationship)
        print("\n4. Testing Contacts Memory...")
        contacts_res = await client.get(f"{API_URL}/contacts", headers=headers)
        if contacts_res.status_code == 200:
            contacts_list = contacts_res.json()
            print(f" -> Success! Retrieved {len(contacts_list)} contacts.")
            for c in contacts_list:
                print(f"    - Contact Name: {c['name']} (Role: {c['role']})")
                print(f"      Context: {c['context']}")
                contact_id = c['id']
        else:
            print(f" -> Failed: {contacts_res.status_code} {contacts_res.text}")
            
        # 5. Fetch Tasks (Verify task extraction)
        print("\n5. Testing Action Items / Tasks...")
        tasks_res = await client.get(f"{API_URL}/tasks", headers=headers)
        if tasks_res.status_code == 200:
            tasks_list = tasks_res.json()
            print(f" -> Success! Retrieved {len(tasks_list)} tasks.")
            for t in tasks_list:
                print(f"    - Task: \"{t['description']}\"")
                print(f"      Status: {t['status']} | Due Date: {t['due_date']}")
                task_id = t['id']
        else:
            print(f" -> Failed: {tasks_res.status_code} {tasks_res.text}")
            
        # 6. Fetch Timeline
        print("\n6. Testing Chronological Timeline...")
        timeline_res = await client.get(f"{API_URL}/timeline", headers=headers)
        if timeline_res.status_code == 200:
            timeline_list = timeline_res.json()
            print(f" -> Success! Retrieved {len(timeline_list)} timeline events.")
            for item in timeline_list[:3]:
                print(f"    - [{item['type'].upper()}] {item['title']}: {item['description']}")
        else:
            print(f" -> Failed: {timeline_res.status_code} {timeline_res.text}")
            
        # 7. Semantic Search (Verify ChromaDB querying)
        print("\n7. Testing Semantic Search (ChromaDB)...")
        search_query = "cloud transition"
        print(f" -> Querying: \"{search_query}\"")
        search_res = await client.get(f"{API_URL}/search?query={search_query}&limit=3", headers=headers)
        if search_res.status_code == 200:
            search_data = search_res.json()
            print(f" -> Success! Retrieved {len(search_data['results'])} semantic matches.")
            for item in search_data['results']:
                print(f"    - Title: {item['title']} (Score: {round(item['score']*100)}%)")
                print(f"      Summary: {item['summary']}")
        else:
            print(f" -> Failed: {search_res.status_code} {search_res.text}")
            
        # 8. Q&A Ask Noted (Verify dynamic RAG context + LLM completion)
        print("\n8. Testing Ask Noted (RAG Chat)...")
        chat_query = "What did I discuss with Rahul and what is pending?"
        print(f" -> Asking: \"{chat_query}\"")
        chat_res = await client.post(f"{API_URL}/search/chat", headers=headers, json={
            "query": chat_query
        })
        if chat_res.status_code == 200:
            chat_data = chat_res.json()
            print(" -> Success! Recalled memory response:")
            print("--------------------------------------------------")
            print(chat_data["answer"])
            print("--------------------------------------------------")
            print("    References:")
            for cite in chat_data["citations"]:
                print(f"     - Note: {cite['title']}")
        else:
            print(f" -> Failed: {chat_res.status_code} {chat_res.text}")
            
        # 8b. Testing Agent Reasoning & Tool-calling (Create contact and task via Chat)
        print("\n8b. Testing Agent Reasoning: Creating contact and task via chat...")
        agent_query = "Please create a contact for Jayshree Patil. She is a teacher at college IMCC. Also create a task to submit assignment to Jayshree by 2026-08-28."
        print(f" -> Sending command: \"{agent_query}\"")
        agent_res = await client.post(f"{API_URL}/search/chat", headers=headers, json={
            "query": agent_query
        })
        if agent_res.status_code == 200:
            agent_data = agent_res.json()
            print(" -> Success! Agent response:")
            print("--------------------------------------------------")
            print(agent_data["answer"])
            print("--------------------------------------------------")
            
            # Fetch contacts to verify Jayshree was created
            verify_contacts = await client.get(f"{API_URL}/contacts", headers=headers)
            if verify_contacts.status_code == 200:
                print(" -> Verifying contacts list:")
                for c in verify_contacts.json():
                    print(f"    - Found contact: {c['name']} (Role: {c['role']}) | Context: {c['context']}")
            
            # Fetch tasks to verify the task was created
            verify_tasks = await client.get(f"{API_URL}/tasks", headers=headers)
            if verify_tasks.status_code == 200:
                print(" -> Verifying tasks list:")
                for t in verify_tasks.json():
                    print(f"    - Found task: \"{t['description']}\" | Status: {t['status']} | Due: {t['due_date']}")
        else:
            print(f" -> Agent reasoning failed: {agent_res.status_code} {agent_res.text}")
            
        # 9. Proactive Memory reminders
        print("\n9. Testing Proactive Reminders...")
        pro_res = await client.get(f"{API_URL}/search/proactive", headers=headers)
        if pro_res.status_code == 200:
            pro_data = pro_res.json()
            print(f" -> Success! Proactive suggestion: {pro_data.get('reminder')}")
        else:
            print(f" -> Failed: {pro_res.status_code} {pro_res.text}")
            
        # 10. Database Cleanup
        print("\n10. Cleaning up Database...")
        # Note: We delete the user which cascades deletes all notes, tasks, contacts, and relationships in PostgreSQL
        # We also delete the note embedding from ChromaDB
        if note_id:
            del_note_res = await client.delete(f"{API_URL}/notes/{note_id}", headers=headers)
            print(f"    - Deleted Note from ChromaDB & SQL: {del_note_res.status_code}")
            
        # Let's clean up user from postgres using SQL directly to leave the DB completely pristine!
        from backend.app.core.db import SessionLocal
        from backend.app.models.user import User
        from uuid import UUID
        
        db = SessionLocal()
        try:
            # Fetch user UUID and delete
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
                db.commit()
                print("    - Test User deleted from PostgreSQL database. Cleanup complete!")
        except Exception as err:
            print(f"    - Cleanup SQL failed: {err}")
        finally:
            db.close()
            
    print("\n==================================================")
    print("            INTEGRATION TEST COMPLETE             ")
    print("==================================================")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_tests())
