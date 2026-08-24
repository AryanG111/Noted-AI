import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.app.core.db import Base

class Relationship(Base):
    __tablename__ = "relationships"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    source_type = Column(String, nullable=False)  # note, contact, task
    source_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    target_type = Column(String, nullable=False)  # note, contact, task
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    relation_type = Column(String, nullable=False)  # mentions, related_to, assigned_to, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
