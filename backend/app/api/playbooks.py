"""
Playbooks API Router
CRUD + execution control (execute, resume manual step, cancel).
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.core.security import get_current_user
from app.schemas.auth import TokenData
from app.services import playbook_service
from app.services.playbook_engine import (
    playbook_registry,
    PLAYBOOK_STEP_TEMPLATES,
)
from app.models.models import PlaybookStatus

router = APIRouter(prefix="/playbooks", tags=["Playbooks"])


def _serialize(pb) -> dict:
    runner = playbook_registry.get_runner(pb.playbook_id)
    template = PLAYBOOK_STEP_TEMPLATES.get(pb.playbook_id, {})
    steps = template.get("steps", [])

    current_step = None
    if runner:
        current_step = runner.current_step

    return {
        "id": pb.id,
        "playbook_id": pb.playbook_id,
        "name": pb.name,
        "description": pb.description,
        "total_steps": pb.total_steps,
        "auto_steps": pb.auto_steps,
        "manual_steps": pb.manual_steps,
        "estimated_eta_minutes": pb.estimated_eta_minutes,
        "status": pb.status.value if hasattr(pb.status, "value") else pb.status,
        "is_running": runner is not None,
        "current_step": current_step,
        "steps": steps,
        "created_at": pb.created_at.isoformat(),
        "updated_at": pb.updated_at.isoformat(),
    }


@router.get("")
def list_playbooks(
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    playbooks = playbook_service.get_playbooks(db)
    return [_serialize(pb) for pb in playbooks]


@router.get("/{playbook_id}")
def get_playbook(
    playbook_id: int,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    pb = playbook_service.get_playbook_by_id(db, playbook_id)
    return _serialize(pb)


@router.post("/{playbook_id}/execute", status_code=202)
async def execute_playbook(
    playbook_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Start executing a playbook. Returns immediately; execution runs in background."""
    if current_user.role not in ("admin", "analyst"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    pb = playbook_service.get_playbook_by_id(db, playbook_id)

    if playbook_registry.get_runner(pb.playbook_id):
        raise HTTPException(status_code=409, detail="Playbook is already running")

    await playbook_registry.execute(pb.id, pb.playbook_id, SessionLocal)
    return {"status": "started", "playbook_id": pb.playbook_id, "message": f"Playbook {pb.name} execution started"}


@router.post("/{playbook_id}/resume", status_code=200)
def resume_manual_step(
    playbook_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Analyst approves a paused manual step to continue execution."""
    if current_user.role not in ("admin", "analyst"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    pb = playbook_service.get_playbook_by_id(db, playbook_id)
    success = playbook_registry.resume_step(pb.playbook_id)
    if not success:
        raise HTTPException(status_code=404, detail="No running playbook found or not paused")
    return {"status": "resumed", "playbook_id": pb.playbook_id}


@router.post("/{playbook_id}/cancel", status_code=200)
def cancel_playbook(
    playbook_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Cancel a running playbook."""
    if current_user.role not in ("admin", "analyst"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    pb = playbook_service.get_playbook_by_id(db, playbook_id)
    success = playbook_registry.cancel(pb.playbook_id)
    if not success:
        raise HTTPException(status_code=404, detail="Playbook is not currently running")
    playbook_service.reset_playbook_status(db, playbook_id)
    return {"status": "cancelled", "playbook_id": pb.playbook_id}


@router.post("/{playbook_id}/reset", status_code=200)
def reset_playbook(
    playbook_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Reset a completed/failed playbook back to ready state."""
    pb = playbook_service.reset_playbook_status(db, playbook_id)
    return _serialize(pb)
