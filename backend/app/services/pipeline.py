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

def update_contact_context(context: Optional[str], old_title: Optional[str], new_title: Optional[str], is_mentioned: bool) -> Optional[str]:
    # Extract unique existing titles mentioned in context
    existing_titles = []
    other_lines = []
    
    if context:
        for raw_line in context.split('\n'):
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("Mentioned in note:") or line.startswith("Also mentioned in:"):
                # Extract title within quotes or after colon
                part = line.split(":", 1)[1].strip()
                # strip enclosing quotes
                if (part.startswith("'") and part.endswith("'")) or (part.startswith('"') and part.endswith('"')):
                    extracted_t = part[1:-1].strip()
                else:
                    extracted_t = part
                if extracted_t and extracted_t not in existing_titles:
                    existing_titles.append(extracted_t)
            else:
                other_lines.append(line)

    # Clean out old_title if it was renamed
    if old_title and old_title in existing_titles:
        existing_titles.remove(old_title)

    # If is_mentioned is False, ensure new_title is also removed
    if not is_mentioned and new_title and new_title in existing_titles:
        existing_titles.remove(new_title)

    # If is_mentioned is True, ensure new_title is added once
    if is_mentioned and new_title:
        if new_title not in existing_titles:
            existing_titles.append(new_title)

    # Reconstruct clean, deduplicated lines
    formatted_mention_lines = []
    for i, t in enumerate(existing_titles):
        if i == 0:
            formatted_mention_lines.append(f"Mentioned in note: '{t}'")
        else:
            formatted_mention_lines.append(f"Also mentioned in: '{t}'")

    all_lines = other_lines + formatted_mention_lines
    return "\n".join(all_lines) if all_lines else None

def infer_entity_type_and_role(name: str) -> tuple[str, str]:
    n = name.lower().strip()
    # Teams / departments / groups
    if any(k in n for k in ["team", "dept", "department", "squad", "crew", "guild", "committee", "ops", "qa team", "backend team", "dev team", "security team"]):
        return "team", "Team"
    # Institutions (schools, colleges, universities, hospitals, foundations)
    if any(k in n for k in ["university", "college", "school", "institute", "institution", "academy", "hospital", "foundation", "lab", "laboratory"]):
        return "institution", "Institution"
    # Organizations / Companies
    if any(k in n for k in ["inc", "corp", "corporation", "ltd", "llc", "technologies", "solutions", "organization", "agency", "group"]):
        return "organization", "Organization"
    return "person", "Contact"

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
            
        old_title = note.title
        
        # Get all contacts previously mentioned in this note
        old_relations = db.query(Relationship).filter(
            Relationship.user_id == user_id,
            Relationship.source_id == note_id,
            Relationship.target_type == "contact",
            Relationship.relation_type == "mentions"
        ).all()
        old_contact_ids = [rel.target_id for rel in old_relations]
            
        user = db.query(User).filter(User.id == user_id).first()
        occupation = user.occupation if user else "Software Engineer"
        ai_tone = user.ai_tone if user else "balanced"
            
        # 2. LLM Extraction (Run first so failures don't wipe out DB context)
        extraction = await cognitive_extractor.extract_all(
            content=note.content,
            occupation=occupation,
            ai_tone=ai_tone,
            provider=provider
        )
        
        # 3. Cleanup previous extractions (stale tasks/relations) to avoid duplicates on update
        db.query(Relationship).filter(
            Relationship.user_id == user_id,
            Relationship.source_id == note_id
        ).delete()
        
        db.query(Task).filter(
            Task.user_id == user_id,
            Task.source_note_id == note_id
        ).delete()
        db.commit()
        
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
        new_title = note.title
        # 4. Process Contacts (People, Teams, Organizations)
        extracted_names = [name.strip() for name in extraction.get("contacts", []) if name.strip()]
        
        # Filter out user's own name to avoid self-contacts, but never filter teams
        if user and user.full_name:
            user_name_lower = user.full_name.lower().strip()
            user_first_name = user.full_name.split()[0].lower().strip() if user.full_name.split() else ""
            extracted_names = [
                name for name in extracted_names
                if name.lower().strip() != user_name_lower and (name.lower().strip() != user_first_name or any(k in name.lower() for k in ["team", "org", "dept", "group"]))
            ]
            
        extracted_names_lower = [name.lower() for name in extracted_names]
        
        # First, find all contacts that were previously mentioned but are no longer mentioned,
        # and remove the old note reference from their context.
        for old_contact_id in old_contact_ids:
            contact = db.query(Contact).filter(Contact.id == old_contact_id).first()
            if contact and contact.name.lower() not in extracted_names_lower:
                contact.context = update_contact_context(contact.context, old_title, new_title, is_mentioned=False)
                db.add(contact)
        db.commit()
        
        contact_ids_map = {}
        for name in extracted_names:
            ent_type, def_role = infer_entity_type_and_role(name)
            # Check if contact already exists for this user
            contact = db.query(Contact).filter(
                Contact.user_id == user_id,
                Contact.name.ilike(name)
            ).first()
            
            if not contact:
                contact = Contact(
                    user_id=user_id,
                    name=name,
                    role=def_role,
                    entity_type=ent_type,
                    context=update_contact_context(None, old_title, new_title, is_mentioned=True)
                )
                db.add(contact)
                db.commit()
                db.refresh(contact)
            else:
                contact.last_interaction = datetime.datetime.now()
                if not contact.entity_type or contact.entity_type == "person":
                    contact.entity_type = ent_type
                contact.context = update_contact_context(contact.context, old_title, new_title, is_mentioned=True)
                db.add(contact)
                db.commit()
                
            contact_ids_map[name.lower()] = contact.id
            
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
        kernel = get_kernel(provider)
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
