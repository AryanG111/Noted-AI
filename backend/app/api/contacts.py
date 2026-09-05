from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Dict, Any

from backend.app.core.db import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.contact import Contact
from backend.app.models.relation import Relationship
from backend.app.models.note import Note
from backend.app.schemas.contact import ContactResponse, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.get("", response_model=List[ContactResponse])
def read_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).order_by(Contact.last_interaction.desc()).all()
    return contacts

@router.get("/{contact_id}", response_model=ContactResponse)
def read_contact(
    contact_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    return contact

@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: UUID,
    contact_in: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    if contact_in.name is not None:
        contact.name = contact_in.name
    if contact_in.role is not None:
        contact.role = contact_in.role
    if contact_in.entity_type is not None:
        contact.entity_type = contact_in.entity_type
    if contact_in.organization is not None:
        contact.organization = contact_in.organization
    if contact_in.context is not None:
        contact.context = contact_in.context
    if contact_in.last_interaction is not None:
        contact.last_interaction = contact_in.last_interaction
        
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.get("/{contact_id}/memories")
def get_contact_memories(
    contact_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all notes and tasks associated with this contact via the Relationship graph."""
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    # Query relationships where target is this contact
    relations = db.query(Relationship).filter(
        Relationship.user_id == current_user.id,
        Relationship.target_type == "contact",
        Relationship.target_id == contact_id
    ).all()
    
    # Also find relationships where source is task and target is contact
    relations_from_tasks = db.query(Relationship).filter(
        Relationship.user_id == current_user.id,
        Relationship.source_type == "task",
        Relationship.target_type == "contact",
        Relationship.target_id == contact_id
    ).all()
    
    notes = []
    tasks = []
    
    for rel in relations:
        if rel.source_type == "note":
            note = db.query(Note).filter(Note.id == rel.source_id).first()
            if note:
                notes.append({
                    "id": note.id,
                    "title": note.title,
                    "summary": note.summary,
                    "created_at": note.created_at
                })
                
    for rel in relations_from_tasks:
        from backend.app.models.task import Task
        task = db.query(Task).filter(Task.id == rel.source_id).first()
        if task:
            tasks.append({
                "id": task.id,
                "description": task.description,
                "status": task.status,
                "due_date": task.due_date,
                "created_at": task.created_at
            })
            
    return {
        "contact": contact,
        "notes": notes,
        "tasks": tasks
    }

@router.delete("/{contact_id}")
def delete_contact(
    contact_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    # Remove associated relationship links
    db.query(Relationship).filter(
        Relationship.user_id == current_user.id,
        (Relationship.source_id == contact_id) | (Relationship.target_id == contact_id)
    ).delete(synchronize_session=False)
    
    db.delete(contact)
    db.commit()
    return {"detail": "Contact deleted successfully"}
