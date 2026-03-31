"""
Playbook service — database CRUD for playbook records.
Execution is handled by playbook_engine.py.
"""
import json
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException

from app.models.models import Playbook, PlaybookStatus
from app.services.playbook_engine import PLAYBOOK_STEP_TEMPLATES


def get_playbooks(db: Session) -> list[Playbook]:
    return db.query(Playbook).order_by(Playbook.id).all()


def get_playbook_by_id(db: Session, playbook_id: int) -> Playbook:
    pb = db.query(Playbook).filter(Playbook.id == playbook_id).first()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return pb


def get_playbook_by_pid(db: Session, playbook_id: str) -> Optional[Playbook]:
    return db.query(Playbook).filter(Playbook.playbook_id == playbook_id).first()


def seed_default_playbooks(db: Session) -> None:
    """Seed the 4 default playbooks if table is empty."""
    if db.query(Playbook).count() > 0:
        return

    defaults = [
        {"playbook_id": "PB-01", "name": "Credential Theft Response",   "total_steps": 7, "auto_steps": 5, "manual_steps": 2, "estimated_eta_minutes": 12},
        {"playbook_id": "PB-02", "name": "Ransomware Containment",      "total_steps": 9, "auto_steps": 7, "manual_steps": 2, "estimated_eta_minutes": 8},
        {"playbook_id": "PB-03", "name": "Lateral Movement Quarantine", "total_steps": 6, "auto_steps": 4, "manual_steps": 2, "estimated_eta_minutes": 15},
        {"playbook_id": "PB-04", "name": "C2 Traffic Disruption",       "total_steps": 5, "auto_steps": 5, "manual_steps": 0, "estimated_eta_minutes": 6},
    ]

    for d in defaults:
        template = PLAYBOOK_STEP_TEMPLATES.get(d["playbook_id"], {})
        pb = Playbook(
            playbook_id=d["playbook_id"],
            name=d["name"],
            total_steps=d["total_steps"],
            auto_steps=d["auto_steps"],
            manual_steps=d["manual_steps"],
            estimated_eta_minutes=d["estimated_eta_minutes"],
            status=PlaybookStatus.ready,
            steps_json=json.dumps(template.get("steps", [])),
        )
        db.add(pb)
    db.commit()
    print("✓ Seeded 4 default playbooks")


def reset_playbook_status(db: Session, playbook_id: int) -> Playbook:
    pb = get_playbook_by_id(db, playbook_id)
    pb.status = PlaybookStatus.ready
    db.commit()
    db.refresh(pb)
    return pb
