from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from backend.app.core.db import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.note import Note
from backend.app.schemas.note import NoteCreate, NoteUpdate, NoteResponse
from backend.app.services.pipeline import ingestion_pipeline
from backend.app.services.vector_db import vector_db

router = APIRouter(prefix="/notes", tags=["notes"])

@router.get("", response_model=List[NoteResponse])
def read_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notes = db.query(Note).filter(Note.user_id == current_user.id).order_by(Note.created_at.desc()).all()
    return notes

@router.get("/{note_id}", response_model=NoteResponse)
def read_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    return note

@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_in: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_active_kernel: Optional[str] = Header(None)
):
    # Initial save to DB
    note = Note(
        user_id=current_user.id,
        title=note_in.title or "Untitled Note",
        content=note_in.content
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    
    # Process through pipeline
    try:
        processed_note = await ingestion_pipeline.process_note(db, note.id, current_user.id, provider=x_active_kernel)
        return processed_note
    except Exception as e:
        # If pipeline processing fails, we still return the note (reliability requirement NFR)
        print(f"Ingestion pipeline failed: {e}")
        return note

@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: UUID,
    note_in: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_active_kernel: Optional[str] = Header(None)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
        
    if note_in.content is not None:
        note.content = note_in.content
    if note_in.title is not None:
        note.title = note_in.title
        
    db.add(note)
    db.commit()
    db.refresh(note)
    
    # Re-process note
    try:
        processed_note = await ingestion_pipeline.process_note(db, note.id, current_user.id, provider=x_active_kernel)
        return processed_note
    except Exception as e:
        print(f"Ingestion pipeline update failed: {e}")
        return note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
        
    # Delete from PostgreSQL (cascade deletes tasks & relationships if set up, but let's delete them cleanly)
    db.delete(note)
    db.commit()
    
    # Delete from ChromaDB
    try:
        vector_db.delete_note(note_id)
    except Exception as e:
        print(f"Failed to delete note from ChromaDB: {e}")
        
    return status.HTTP_204_NO_CONTENT
