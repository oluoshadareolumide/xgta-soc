"""
Threat Actor service — CRUD operations.
"""
import json
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from fastapi import HTTPException

from app.models.models import ThreatActor
from app.schemas.schemas import ThreatActorCreate, ThreatActorUpdate


def get_actors(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    active_only: bool = False,
) -> tuple[list[ThreatActor], int]:
    q = db.query(ThreatActor)
    if active_only:
        q = q.filter(ThreatActor.is_active == True)
    total = q.count()
    items = q.order_by(desc(ThreatActor.confidence)).offset(skip).limit(limit).all()
    return items, total


def get_actor_by_id(db: Session, actor_id: int) -> ThreatActor:
    actor = db.query(ThreatActor).filter(ThreatActor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="Threat actor not found")
    return actor


def create_actor(db: Session, data: ThreatActorCreate) -> ThreatActor:
    existing = db.query(ThreatActor).filter(ThreatActor.actor_id == data.actor_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Actor ID already exists")

    actor = ThreatActor(
        actor_id=data.actor_id,
        name=data.name,
        origin=data.origin,
        sector=data.sector,
        confidence=data.confidence,
        is_active=data.is_active,
        ttps=json.dumps(data.ttps) if data.ttps else None,
        description=data.description,
    )
    db.add(actor)
    db.commit()
    db.refresh(actor)
    return actor


def update_actor(db: Session, actor_id: int, data: ThreatActorUpdate) -> ThreatActor:
    actor = get_actor_by_id(db, actor_id)
    update_data = data.model_dump(exclude_unset=True)
    if "ttps" in update_data and update_data["ttps"] is not None:
        update_data["ttps"] = json.dumps(update_data["ttps"])
    for key, value in update_data.items():
        setattr(actor, key, value)
    db.commit()
    db.refresh(actor)
    return actor


def delete_actor(db: Session, actor_id: int) -> None:
    actor = get_actor_by_id(db, actor_id)
    db.delete(actor)
    db.commit()
