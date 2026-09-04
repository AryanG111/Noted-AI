from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class NoteBase(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: str = Field(..., max_length=100000)

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = Field(None, max_length=100000)
    summary: Optional[str] = Field(None, max_length=2000)
    tags: Optional[str] = Field(None, max_length=500)

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
