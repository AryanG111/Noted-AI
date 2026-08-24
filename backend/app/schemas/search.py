from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class SearchQuery(BaseModel):
    query: str
    limit: int = 10

class SearchResultItem(BaseModel):
    id: UUID
    title: Optional[str] = None
    content: str
    summary: Optional[str] = None
    tags: Optional[str] = None
    score: float
    relevance_explanation: Optional[str] = None
    created_at: datetime

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
