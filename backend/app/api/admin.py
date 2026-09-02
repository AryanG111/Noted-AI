from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from backend.app.core.db import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.note import Note
from backend.app.models.task import Task
from backend.app.models.contact import Contact
from backend.app.models.relation import Relationship
from backend.app.schemas.user import UserResponse, UserStatusUpdate

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required."
        )
    return current_user

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all registered users."""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: UUID,
    status_in: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Approve or reject a user registration."""
    new_status = status_in.status.strip().lower()
    if new_status not in ["pending", "approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'pending', 'approved', or 'rejected'."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.id == admin.id and new_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot revoke or change your own admin approval status."
        )

    user.status = new_status
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a user account and associated notes/tasks/contacts."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Clean up associated records
    db.query(Relationship).filter(Relationship.user_id == user_id).delete()
    db.query(Task).filter(Task.user_id == user_id).delete()
    db.query(Contact).filter(Contact.user_id == user_id).delete()
    db.query(Note).filter(Note.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": f"User '{user.email}' and all associated data deleted successfully."}
