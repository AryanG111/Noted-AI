from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class TaskBase(BaseModel):
    description: str
    status: str = "pending"
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    source_note_id: Optional[UUID] = None

class TaskUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None

class TaskResponse(TaskBase):
    id: UUID
    user_id: UUID
    source_note_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
