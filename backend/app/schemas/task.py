from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class TaskBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=1000)
    status: str = Field("pending", pattern="^(pending|done)$")
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    source_note_id: Optional[UUID] = None

class TaskUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    status: Optional[str] = Field(None, pattern="^(pending|done)$")
    due_date: Optional[datetime] = None

class TaskResponse(TaskBase):
    id: UUID
    user_id: UUID
    source_note_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
