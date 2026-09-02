import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.app.core.db import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    ai_tone = Column(String, default="balanced", nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending, approved, rejected
    role = Column(String, default="user", nullable=False)        # user, admin
    created_at = Column(DateTime(timezone=True), server_default=func.now())
