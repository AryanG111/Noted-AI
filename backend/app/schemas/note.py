from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class NoteBase(BaseModel):
    title: Optional[str] = None
    content: str

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[str] = None

class NoteResponse(NoteBase):
    id: UUID
    user_id: UUID
    summary: Optional[str] = None
    tags: Optional[str] = None
    importance: Optional[str] = None
    memory_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    error: Optional[str] = None
    is_processing: Optional[bool] = False

    class Config:
        from_attributes = True
