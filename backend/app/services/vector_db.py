import chromadb
from uuid import UUID
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings

class VectorDBService:
    def __init__(self):
        # Initialize the persistent client
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_DIR)
        # Create or fetch the core collection
        self.collection = self.client.get_or_create_collection(name="noted_ai_memories")
        
    def upsert_note(
        self,
        user_id: UUID,
        note_id: UUID,
        content: str,
        title: Optional[str] = None,
        summary: Optional[str] = None,
        tags: Optional[str] = None,
        embedding: Optional[List[float]] = None
    ):
        """Upsert note text content and its vector embedding into ChromaDB."""
        if not embedding:
            raise ValueError("Embedding must be provided for ChromaDB upsert.")
            
        metadata = {
            "user_id": str(user_id),
            "note_id": str(note_id),
            "title": title or "",
            "summary": summary or "",
            "tags": tags or ""
        }
        
        self.collection.upsert(
            ids=[str(note_id)],
            embeddings=[embedding],
            documents=[content],
            metadatas=[metadata]
        )
        
    def delete_note(self, note_id: UUID):
        """Remove note embedding from ChromaDB."""
        self.collection.delete(ids=[str(note_id)])
        
    def query_notes(
        self,
        user_id: UUID,
        query_embedding: List[float],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Perform similarity search over note embeddings, filtered by user_id."""
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where={"user_id": str(user_id)}
        )
        
        items = []
        if not results or not results.get("ids") or len(results["ids"][0]) == 0:
            return items
            
        # Convert ChromaDB query results to a list of dicts
        ids = results["ids"][0]
        distances = results["distances"][0] if results.get("distances") else [0.0] * len(ids)
        documents = results["documents"][0] if results.get("documents") else [""] * len(ids)
        metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(ids)
        
        for i in range(len(ids)):
            # Convert distance to a similarity score (0.0 to 1.0)
            # In ChromaDB, L2 distance is default: smaller distance means higher similarity.
            distance = distances[i]
            # Convert L2 distance to percentage similarity
            similarity_score = max(0.0, min(1.0, 1.0 - (distance / 2.0)))
            
            items.append({
                "note_id": UUID(ids[i]),
                "content": documents[i],
                "title": metadatas[i].get("title"),
                "summary": metadatas[i].get("summary"),
                "tags": metadatas[i].get("tags"),
                "score": similarity_score
            })
            
        return items

vector_db = VectorDBService()
