import datetime
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from backend.app.models.note import Note
from backend.app.models.contact import Contact
from backend.app.models.task import Task
from backend.app.models.relation import Relationship
from backend.app.models.user import User
from backend.app.services.extractors import cognitive_extractor
from backend.app.services.vector_db import vector_db
from backend.app.kernels import get_kernel

class IngestionPipelineService:
    async def process_note(self, db: Session, note_id: UUID, user_id: UUID, provider: Optional[str] = None) -> Note:
        """
        Orchestrates note ingestion:
        1. Query note text from PostgreSQL.
        2. Clean up any previous tasks and relationships created by this note (in case of updates).
        3. Run LLM Cognitive Extractor (extracts title, summary, tags, contacts, tasks).
        4. Create/update Contacts and Tasks.
        5. Create relationships (Note -> Contact, Note -> Task).
        6. Generate text embeddings and index inside ChromaDB.
        """
        # 1. Fetch note
        note = db.query(Note).filter(Note.id == note_id, Note.user_id == user_id).first()
        if not note:
            raise ValueError("Note not found")
            
        user = db.query(User).filter(User.id == user_id).first()
        occupation = user.occupation if user else "Software Engineer"
        ai_tone = user.ai_tone if user else "balanced"
            
        # 2. Cleanup previous extractions (stale tasks/relations) to avoid duplicates on update
        db.query(Relationship).filter(
            Relationship.user_id == user_id,
            Relationship.source_id == note_id
        ).delete()
        
        db.query(Task).filter(
            Task.user_id == user_id,
            Task.source_note_id == note_id
        ).delete()
        db.commit()

        # 3. LLM Extraction
        extraction = await cognitive_extractor.extract_all(
            content=note.content,
            occupation=occupation,
            ai_tone=ai_tone,
            provider=provider
        )
        
        note.title = extraction.get("title") or note.title or "Untitled Note"
        note.summary = extraction.get("summary")
        note.importance = extraction.get("importance") or "5"
        note.memory_type = extraction.get("memory_type") or "general"
        # Store tags as comma-separated lowercase strings
        tags_list = [t.lower().strip() for t in extraction.get("tags", [])]
        note.tags = ",".join(tags_list) if tags_list else None
        
        # Save note updates
        db.add(note)
        db.commit()
        db.refresh(note)
        
        # 4. Process Contacts
        contact_ids_map = {}
        for name in extraction.get("contacts", []):
            name_clean = name.strip()
            if not name_clean:
                continue
                
            # Check if contact already exists for this user
            contact = db.query(Contact).filter(
                Contact.user_id == user_id,
                Contact.name.ilike(name_clean)
            ).first()
            
            if not contact:
                contact = Contact(
                    user_id=user_id,
                    name=name_clean,
                    role="Contact",
                    context=f"Mentioned in note: '{note.title}'"
                )
                db.add(contact)
                db.commit()
                db.refresh(contact)
            else:
                contact.last_interaction = datetime.datetime.now()
                # Append context
                if contact.context:
                    if note.title not in contact.context:
                        contact.context += f"\nAlso mentioned in: '{note.title}'"
                else:
                    contact.context = f"Mentioned in note: '{note.title}'"
                db.add(contact)
                db.commit()
                
            contact_ids_map[name_clean.lower()] = contact.id
            
            # Create Relationship: Note -> Contact (mentions)
            rel = Relationship(
                user_id=user_id,
                source_type="note",
                source_id=note_id,
                target_type="contact",
                target_id=contact.id,
                relation_type="mentions"
            )
            db.add(rel)
            
        # 5. Process Tasks
        for task_item in extraction.get("tasks", []):
            desc = task_item.get("description", "").strip()
            if not desc:
                continue
                
            due_date_val = None
            if task_item.get("due_date"):
                try:
                    due_date_val = datetime.datetime.fromisoformat(task_item.get("due_date"))
                except ValueError:
                    pass
                    
            task = Task(
                user_id=user_id,
                source_note_id=note_id,
                description=desc,
                status="pending",
                due_date=due_date_val
            )
            db.add(task)
            db.commit()
            db.refresh(task)
            
            # Create Relationship: Note -> Task (creates)
            rel_task = Relationship(
                user_id=user_id,
                source_type="note",
                source_id=note_id,
                target_type="task",
                target_id=task.id,
                relation_type="creates"
            )
            db.add(rel_task)
            
            # Attempt to link task to a mentioned contact
            for contact_name, c_id in contact_ids_map.items():
                if contact_name in desc.lower():
                    rel_assoc = Relationship(
                        user_id=user_id,
                        source_type="task",
                        source_id=task.id,
                        target_type="contact",
                        target_id=c_id,
                        relation_type="concerns"
                    )
                    db.add(rel_assoc)
                    
        db.commit()
        
        # 6. Generate Vector Embeddings & Index in ChromaDB
        kernel = get_kernel()
        try:
            # We embed the whole note content
            embeddings = await kernel.generate_embeddings(note.content)
            vector_db.upsert_note(
                user_id=user_id,
                note_id=note_id,
                content=note.content,
                title=note.title,
                summary=note.summary,
                tags=note.tags,
                embedding=embeddings
            )
        except Exception as e:
            print(f"Failed to generate embeddings or index in ChromaDB: {e}")
            
        return note

ingestion_pipeline = IngestionPipelineService()
