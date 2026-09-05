from langchain_core.tools import tool
from sqlalchemy.orm import Session
from uuid import UUID
import datetime
from typing import Optional

def get_agent_tools(db: Session, user_id: UUID, accessed_notes: list, provider: Optional[str] = None):
    
    @tool
    async def search_memories(query: str) -> str:
        """
        Search the user's vector database notes conceptually for past memories or contexts.
        Use this tool to retrieve relevant note contents to answer questions or verify details.
        """
        from backend.app.services.vector_db import vector_db
        from backend.app.kernels import get_kernel
        
        kernel = get_kernel(provider)
        try:
            query_embedding = await kernel.generate_embeddings(query)
            results = vector_db.query_notes(
                user_id=user_id,
                query_embedding=query_embedding,
                limit=5
            )
            if not results:
                return "No conceptually similar memories found."
            
            out = []
            for idx, r in enumerate(results):
                note_id = r.get("note_id")
                if note_id:
                    # Deduplicate citations
                    if not any(c["id"] == str(note_id) for c in accessed_notes):
                        accessed_notes.append({
                            "id": str(note_id),
                            "title": r.get("title") or "Untitled Note"
                        })
                out.append(f"[{idx+1}] Title: '{r.get('title')}' | Summary: {r.get('summary')} | Content: {r.get('content')} (internal_note_id: {note_id})")
            return "\n".join(out)
        except Exception as e:
            return f"Search failed: {e}"

    @tool
    async def get_contacts() -> str:
        """
        Retrieve the list of all saved contacts in your memory directory, including their roles and context logs.
        Use this to find a contact or verify if they exist before updating or deleting them.
        """
        from backend.app.models.contact import Contact
        contacts = db.query(Contact).filter(Contact.user_id == user_id).all()
        if not contacts:
            return "No contacts found in memory."
        out = []
        for c in contacts:
            out.append(f"- Contact: '{c.name}' | Role: {c.role or 'None'} | Context: {c.context or 'None'} (internal_id: {c.id})")
        return "\n".join(out)

    @tool
    async def create_contact(name: str, role: Optional[str] = None, context: Optional[str] = None) -> str:
        """
        Create a new contact in the database.
        Use this when the user asks to add or create a person profile.
        Parameters:
        - name: Full name of the contact.
        - role: Professional role or relationship to the user (e.g. Teacher, Developer).
        - context: Brief background description or notes.
        """
        import json
        if name.strip().startswith("{") and name.strip().endswith("}"):
            try:
                args = json.loads(name)
                name = args.get("name", name)
                role = args.get("role", role)
                context = args.get("context", context)
            except Exception:
                pass
                
        role_val = role.strip() if role else "Contact"
        context_val = context.strip() if context else ""
        
        from backend.app.models.contact import Contact
        existing = db.query(Contact).filter(Contact.user_id == user_id, Contact.name.ilike(name.strip())).first()
        if existing:
            return f"Contact '{name}' already exists with ID: {existing.id}."
        
        new_c = Contact(
            user_id=user_id,
            name=name.strip(),
            role=role_val,
            context=context_val
        )
        db.add(new_c)
        db.commit()
        db.refresh(new_c)
        return f"Successfully created contact '{new_c.name}' with ID: {new_c.id}."

    @tool
    async def update_contact(contact_id: str, role: Optional[str] = None, context: Optional[str] = None) -> str:
        """
        Update an existing contact's details.
        Parameters:
        - contact_id: The UUID of the contact (retrieve via get_contacts or search first).
        - role: Updated professional role (optional).
        - context: Updated context/background info (optional).
        """
        import json
        if contact_id.strip().startswith("{") and contact_id.strip().endswith("}"):
            try:
                args = json.loads(contact_id)
                contact_id = args.get("contact_id", contact_id)
                role = args.get("role", role)
                context = args.get("context", context)
            except Exception:
                pass
                
        from backend.app.models.contact import Contact
        try:
            c_uuid = UUID(contact_id.strip())
        except ValueError:
            return "Invalid contact_id format. Must be a UUID string."
        
        contact = db.query(Contact).filter(Contact.user_id == user_id, Contact.id == c_uuid).first()
        if not contact:
            return f"Contact with ID {contact_id} not found."
        
        if role is not None:
            contact.role = role.strip()
        if context is not None:
            contact.context = context.strip()
        
        contact.last_interaction = datetime.datetime.now()
        db.commit()
        return f"Successfully updated contact '{contact.name}'."

    @tool
    async def delete_contact(contact_id: str) -> str:
        """
        Delete a contact from the database.
        Parameters:
        - contact_id: The UUID of the contact to delete.
        """
        from backend.app.models.contact import Contact
        try:
            c_uuid = UUID(contact_id.strip())
        except ValueError:
            return "Invalid contact_id format. Must be a UUID string."
        
        contact = db.query(Contact).filter(Contact.user_id == user_id, Contact.id == c_uuid).first()
        if not contact:
            return f"Contact with ID {contact_id} not found."
        
        db.delete(contact)
        db.commit()
        return f"Successfully deleted contact '{contact.name}'."

    @tool
    async def get_tasks() -> str:
        """
        Retrieve the list of all pending and completed commitments (tasks).
        Use this to find a task or verify status before updating or deleting it.
        """
        from backend.app.models.task import Task
        tasks = db.query(Task).filter(Task.user_id == user_id).all()
        if not tasks:
            return "No commitments found."
        out = []
        for t in tasks:
            due_str = t.due_date.strftime("%Y-%m-%d") if t.due_date else "None"
            out.append(f"- Task: '{t.description}' | Status: {t.status} | Due: {due_str} (internal_id: {t.id})")
        return "\n".join(out)

    @tool
    async def create_task(description: str, due_date: Optional[str] = None) -> str:
        """
        Create a new commitment/task.
        Parameters:
        - description: The task description (e.g. Submit assignment to Jayshree).
        - due_date: Optional ISO datetime string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS) representing the deadline.
        """
        import json
        if description.strip().startswith("{") and description.strip().endswith("}"):
            try:
                args = json.loads(description)
                description = args.get("description", description)
                due_date = args.get("due_date", due_date)
            except Exception:
                pass
                
        from backend.app.models.task import Task
        due_val = None
        if due_date:
            try:
                due_val = datetime.datetime.fromisoformat(due_date.strip())
            except ValueError:
                return f"Invalid due_date format: '{due_date}'. Must be ISO format (YYYY-MM-DD)."
        
        task = Task(
            user_id=user_id,
            description=description.strip(),
            status="pending",
            due_date=due_val
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return f"Successfully created task '{task.description}' (internal_id: {task.id})."

    @tool
    async def update_task(task_id: str, status: Optional[str] = None, due_date: Optional[str] = None) -> str:
        """
        Update an existing task's status or deadline.
        Parameters:
        - task_id: The UUID of the task.
        - status: Updated status, must be 'pending' or 'done' (optional).
        - due_date: Updated ISO datetime string (optional). Pass 'null' to clear the deadline.
        """
        import json
        if task_id.strip().startswith("{") and task_id.strip().endswith("}"):
            try:
                args = json.loads(task_id)
                task_id = args.get("task_id", task_id)
                status = args.get("status", status)
                due_date = args.get("due_date", due_date)
            except Exception:
                pass
                
        from backend.app.models.task import Task
        try:
            t_uuid = UUID(task_id.strip())
        except ValueError:
            return "Invalid task_id format. Must be a UUID string."
        
        task = db.query(Task).filter(Task.user_id == user_id, Task.id == t_uuid).first()
        if not task:
            return f"Task with ID {task_id} not found."
        
        if status is not None:
            stat_clean = status.strip().lower()
            if stat_clean not in ["pending", "done"]:
                return "Invalid status. Must be 'pending' or 'done'."
            task.status = stat_clean
            
        if due_date is not None:
            if due_date.strip().lower() == "null":
                task.due_date = None
            else:
                try:
                    task.due_date = datetime.datetime.fromisoformat(due_date.strip())
                except ValueError:
                    return f"Invalid due_date format: '{due_date}'. Must be ISO format (YYYY-MM-DD)."
        
        db.commit()
        return f"Successfully updated task '{task.description}'."

    @tool
    async def delete_task(task_id: str) -> str:
        """
        Delete a task.
        Parameters:
        - task_id: The UUID of the task.
        """
        from backend.app.models.task import Task
        try:
            t_uuid = UUID(task_id.strip())
        except ValueError:
            return "Invalid task_id format. Must be a UUID string."
        
        task = db.query(Task).filter(Task.user_id == user_id, Task.id == t_uuid).first()
        if not task:
            return f"Task with ID {task_id} not found."
        
        db.delete(task)
        db.commit()
        return f"Successfully deleted task '{task.description}'."

    @tool
    async def link_entities(source_type: str, source_id: str, target_type: str, target_id: str, relation_type: str) -> str:
        """
        Link two entities in the knowledge graph database (e.g. note -> contact, task -> contact, note -> task).
        Parameters:
        - source_type: must be 'note', 'contact', or 'task'.
        - source_id: UUID of source entity.
        - target_type: must be 'note', 'contact', or 'task'.
        - target_id: UUID of target entity.
        - relation_type: typical relationship label (e.g., 'mentions', 'creates', 'concerns').
        """
        from backend.app.models.relation import Relationship
        try:
            s_uuid = UUID(source_id.strip())
            t_uuid = UUID(target_id.strip())
        except ValueError:
            return "Invalid UUID format for source_id or target_id."
            
        s_type = source_type.strip().lower()
        t_type = target_type.strip().lower()
        
        if s_type not in ["note", "contact", "task"] or t_type not in ["note", "contact", "task"]:
            return "Invalid source_type or target_type. Must be 'note', 'contact', or 'task'."
            
        rel = Relationship(
            user_id=user_id,
            source_type=s_type,
            source_id=s_uuid,
            target_type=t_type,
            target_id=t_uuid,
            relation_type=relation_type.strip()
        )
        db.add(rel)
        db.commit()
        db.refresh(rel)
        return f"Successfully linked {s_type} ({source_id}) to {t_type} ({target_id}) with relation '{relation_type}'."

    return [
        search_memories,
        get_contacts,
        create_contact,
        update_contact,
        delete_contact,
        get_tasks,
        create_task,
        update_task,
        delete_task,
        link_entities
    ]
