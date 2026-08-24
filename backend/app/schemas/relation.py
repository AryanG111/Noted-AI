from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class RelationshipBase(BaseModel):
    source_type: str
    source_id: UUID
    target_type: str
    target_id: UUID
    relation_type: str

class RelationshipCreate(RelationshipBase):
    pass

class RelationshipResponse(RelationshipBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
