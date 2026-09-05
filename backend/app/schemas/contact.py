from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class ContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    role: Optional[str] = Field(None, max_length=150)
    entity_type: Optional[str] = Field("person", max_length=50)  # person, team, organization, institution
    organization: Optional[str] = Field(None, max_length=150)
    context: Optional[str] = Field(None, max_length=5000)

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    role: Optional[str] = Field(None, max_length=150)
    entity_type: Optional[str] = Field(None, max_length=50)
    organization: Optional[str] = Field(None, max_length=150)
    context: Optional[str] = Field(None, max_length=5000)
    last_interaction: Optional[datetime] = None

class ContactResponse(ContactBase):
    id: UUID
    user_id: UUID
    last_interaction: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
