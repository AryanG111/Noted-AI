from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class ContactBase(BaseModel):
    name: str
    role: Optional[str] = None
    context: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    context: Optional[str] = None
    last_interaction: Optional[datetime] = None

class ContactResponse(ContactBase):
    id: UUID
    user_id: UUID
    last_interaction: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
