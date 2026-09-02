import sys
import os

# Dynamic path resolution to support imports when running from the backend directory
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.db import engine, Base
from sqlalchemy import text
from backend.app.api import auth, notes, contacts, tasks, timeline, search, admin

print("--- ACTIVE MODEL CONFIG IN MAIN ---")
print("ACTIVE_LLM_PROVIDER:", settings.ACTIVE_LLM_PROVIDER)
print("OLLAMA_MODEL:", settings.OLLAMA_MODEL)
print("GEMINI_MODEL:", settings.GEMINI_MODEL)
print("-----------------------------------")


# Initialize SQL tables and ensure user status/role columns exist
try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'approved'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user'"))
        # Ensure existing users are approved so service isn't disrupted
        conn.execute(text("UPDATE users SET status = 'approved' WHERE status IS NULL OR status = 'pending'"))
        # Ensure the first user is granted admin if no admin exists
        admin_exists = conn.execute(text("SELECT 1 FROM users WHERE role = 'admin'")).scalar()
        if not admin_exists:
            conn.execute(text("UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)"))
        conn.commit()
except Exception as e:
    print(f"Error initializing/migrating database tables: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(notes.router, prefix=settings.API_V1_STR)
app.include_router(contacts.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(timeline.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to Noted AI API server is running."}
