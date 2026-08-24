import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.app.core.db import Base

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=True)
    content = Column(String, nullable=False)
    summary = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated list of tags
    importance = Column(String, nullable=True, default="5")  # Importance rating (1-10)
    memory_type = Column(String, nullable=True, default="general")  # idea, meeting, decision, expense, general
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
