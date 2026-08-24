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
        events.append({
            "id": str(contact.id),
            "type": "contact",
            "timestamp": timestamp.isoformat() if timestamp else None,
            "title": f"Met / Mentioned {contact.name}",
            "description": f"Evolving Memory Profile: {contact.role or 'Contact'}. Context: {contact.context or 'No contextual logs yet'}"
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
    Returns nodes and edges of the memory knowledge graph for rendering.
    """
    from backend.app.models.relation import Relationship
    
    nodes = []
    edges = []
    
    # 1. Gather Notes
    notes = db.query(Note).filter(Note.user_id == current_user.id).all()
    for note in notes:
        nodes.append({
            "id": str(note.id),
            "label": note.title or "Untitled Note",
            "type": "note"
        })
        
    # 2. Gather Contacts
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    for contact in contacts:
        nodes.append({
            "id": str(contact.id),
            "label": contact.name,
            "type": "contact"
        })
        
    # 3. Gather Tasks
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    for task in tasks:
        nodes.append({
            "id": str(task.id),
            "label": task.description[:25] + "..." if len(task.description) > 25 else task.description,
            "type": "task"
        })
        
    # 4. Gather Relationships
    relations = db.query(Relationship).filter(Relationship.user_id == current_user.id).all()
    for rel in relations:
        edges.append({
            "source": str(rel.source_id),
            "target": str(rel.target_id),
            "label": rel.relation_type
        })
        
    return {"nodes": nodes, "edges": edges}
