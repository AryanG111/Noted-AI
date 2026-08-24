from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from backend.app.core.db import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.task import Task
from backend.app.schemas.task import TaskResponse, TaskUpdate, TaskCreate

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("", response_model=List[TaskResponse])
def read_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tasks = db.query(Task).filter(Task.user_id == current_user.id).order_by(Task.created_at.desc()).all()
    return tasks

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = Task(
        user_id=current_user.id,
        source_note_id=task_in.source_note_id,
        description=task_in.description,
        status=task_in.status,
        due_date=task_in.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    if task_in.description is not None:
        task.description = task_in.description
    if task_in.status is not None:
        task.status = task_in.status
    if task_in.due_date is not None:
        # Pydantic may serialize null/None or datetime. Let's make sure it handles None to clear due dates
        task.due_date = task_in.due_date
        
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    db.delete(task)
    db.commit()
    return status.HTTP_204_NO_CONTENT
