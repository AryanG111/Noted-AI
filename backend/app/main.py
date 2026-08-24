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
from backend.app.api import auth, notes, contacts, tasks, timeline, search

print("--- ACTIVE MODEL CONFIG IN MAIN ---")
print("OLLAMA_MODEL:", settings.OLLAMA_MODEL)
print("-----------------------------------")
# Env updated to minimax-cloud


# Initialize SQL tables on startup (simplifies local development without strictly needing migrations)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Error creating database tables: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",  # React default port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(notes.router, prefix=settings.API_V1_STR)
app.include_router(contacts.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(timeline.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to Noted AI API server is running."}
