from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.app.core.db import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.note import Note
from backend.app.models.contact import Contact
from backend.app.models.task import Task

router = APIRouter(prefix="/timeline", tags=["timeline"])

@router.get("")
def get_timeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Collects notes, tasks, and contacts and bundles them into a sorted chronological events list.
    """
    events = []
    
    # 1. Fetch notes
    notes = db.query(Note).filter(Note.user_id == current_user.id).all()
    for note in notes:
        events.append({
            "id": str(note.id),
            "type": "note",
            "timestamp": note.created_at.isoformat() if note.created_at else None,
            "title": note.title or "Untitled Note",
            "description": note.summary or (note.content[:100] + "..." if len(note.content) > 100 else note.content),
            "tags": note.tags.split(",") if note.tags else []
        })
        
    # 2. Fetch tasks
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    for task in tasks:
        events.append({
            "id": str(task.id),
            "type": "task",
            "timestamp": task.created_at.isoformat() if task.created_at else None,
            "title": "Action Item Detected",
            "description": task.description,
            "status": task.status,
            "due_date": task.due_date.isoformat() if task.due_date else None
        })
        
    # 3. Fetch contacts
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    for contact in contacts:
        timestamp = contact.last_interaction or contact.created_at
        entity_type = getattr(contact, "entity_type", "person") or "person"
        events.append({
            "id": str(contact.id),
            "type": "contact",
            "entity_type": entity_type,
            "timestamp": timestamp.isoformat() if timestamp else None,
            "title": f"Interacted with {contact.name}" if entity_type == "team" else f"Met / Mentioned {contact.name}",
            "description": f"Evolving {entity_type.capitalize()} Profile: {contact.role or ('Team' if entity_type == 'team' else 'Contact')}. Context: {contact.context or 'No contextual logs yet'}"
        })
        
    # Sort events by timestamp descending. Events without timestamps are placed at the end.
    events.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return events

@router.get("/graph")
def get_memory_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns rich nodes and edges of the memory knowledge graph with timestamps and clusters.
    """
    from backend.app.models.relation import Relationship
    
    nodes = []
    edges = []
    
    # 1. Gather Notes
    notes = db.query(Note).filter(Note.user_id == current_user.id).all()
    for note in notes:
        tag_list = [t.strip() for t in note.tags.split(",") if t.strip()] if note.tags else []
        cluster = tag_list[0] if tag_list else "Knowledge Notes"
        nodes.append({
            "id": str(note.id),
            "label": note.title or "Untitled Note",
            "type": "note",
            "cluster": cluster,
            "created_at": note.created_at.isoformat() if note.created_at else None,
            "summary": note.summary or (note.content[:140] + "..." if len(note.content or "") > 140 else note.content),
            "tags": tag_list
        })
        
    # 2. Gather Contacts (People, Teams, Organizations, Institutions)
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    for contact in contacts:
        entity_type = getattr(contact, "entity_type", "person") or "person"
        cluster = "Teams & Organizations" if entity_type in ["team", "organization", "institution"] else "People & Network"
        nodes.append({
            "id": str(contact.id),
            "label": contact.name,
            "type": "contact",
            "entity_type": entity_type,
            "organization": getattr(contact, "organization", None),
            "cluster": cluster,
            "created_at": (contact.last_interaction or contact.created_at).isoformat() if (contact.last_interaction or contact.created_at) else None,
            "role": contact.role or ("Team" if entity_type == "team" else "Contact"),
            "context": contact.context or "No contextual notes yet"
        })
        
    # 3. Gather Tasks
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    for task in tasks:
        nodes.append({
            "id": str(task.id),
            "label": task.description[:28] + "..." if len(task.description) > 28 else task.description,
            "type": "task",
            "cluster": "Action Commitments",
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "status": task.status,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "description": task.description
        })
        
    # 4. Gather Relationships
    relations = db.query(Relationship).filter(Relationship.user_id == current_user.id).all()
    for rel in relations:
        edges.append({
            "source": str(rel.source_id),
            "target": str(rel.target_id),
            "label": rel.relation_type,
            "created_at": rel.created_at.isoformat() if getattr(rel, "created_at", None) else None
        })
        
    return {"nodes": nodes, "edges": edges}
