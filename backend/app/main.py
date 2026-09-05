import sys
import os
import logging

# Dynamic path resolution to support imports when running from the backend directory
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.core.config import settings
from backend.app.core.db import engine, Base
from sqlalchemy import text
from backend.app.api import auth, notes, contacts, tasks, timeline, search, admin

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("noted_ai")

# Initialize SQL tables and ensure user status/role columns exist
try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'approved'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user'"))
        conn.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS entity_type VARCHAR DEFAULT 'person'"))
        conn.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS organization VARCHAR"))
        # Ensure existing users are approved so service isn't disrupted
        conn.execute(text("UPDATE users SET status = 'approved' WHERE status IS NULL OR status = 'pending'"))
        # Ensure the first user is granted admin if no admin exists
        admin_exists = conn.execute(text("SELECT 1 FROM users WHERE role = 'admin'")).scalar()
        if not admin_exists:
            conn.execute(text("UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)"))
        conn.commit()
except Exception as e:
    logger.error(f"Error initializing/migrating database tables: {e}")

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

# 1. Custom HTTP Exception Handler (Clean messages)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if exc.status_code >= 500:
        logger.error(f"Server error {exc.status_code} on {request.method} {request.url.path}: {detail}")
        detail = "There's something wrong on our side. Please try again in a moment."
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail}
    )

# 2. Custom Request Validation Error Handler (User-friendly field error descriptions)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []) if l != "body")
        msg = err.get("msg", "Invalid input")
        if loc:
            messages.append(f"{loc}: {msg}")
        else:
            messages.append(msg)
    user_msg = "; ".join(messages) if messages else "Invalid input data provided."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": user_msg}
    )

# 3. Global Catch-all Exception Handler for unhandled 500 errors (Zero raw tracebacks exposed)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled internal server error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "There's something wrong on our side. Please try again in a moment."}
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
