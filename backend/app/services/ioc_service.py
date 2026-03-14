"""
IOC (Indicator of Compromise) service — CRUD operations.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from fastapi import HTTPException

from app.models.models import IOC
from app.schemas.schemas import IOCCreate, IOCUpdate


def get_iocs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    ioc_type: Optional[str] = None,
    actor_id: Optional[int] = None,
    active_only: bool = True,
) -> tuple[list[IOC], int]:
    q = db.query(IOC)
    if ioc_type:
        q = q.filter(IOC.ioc_type == ioc_type)
    if actor_id:
        q = q.filter(IOC.threat_actor_id == actor_id)
    if active_only:
        q = q.filter(IOC.is_active == True)
    total = q.count()
    items = q.order_by(desc(IOC.hits)).offset(skip).limit(limit).all()
    return items, total


def get_ioc_by_id(db: Session, ioc_id: int) -> IOC:
    ioc = db.query(IOC).filter(IOC.id == ioc_id).first()
    if not ioc:
        raise HTTPException(status_code=404, detail="IOC not found")
    return ioc


def search_ioc_by_value(db: Session, value: str) -> Optional[IOC]:
    return db.query(IOC).filter(IOC.value == value).first()


def create_ioc(db: Session, data: IOCCreate) -> IOC:
    # Deduplicate by value
    existing = search_ioc_by_value(db, data.value)
    if existing:
        # Increment hits instead of creating duplicate
        existing.hits += 1
        existing.last_seen = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    ioc = IOC(
        ioc_type=data.ioc_type,
        value=data.value,
        confidence=data.confidence,
        description=data.description,
        threat_actor_id=data.threat_actor_id,
    )
    db.add(ioc)
    db.commit()
    db.refresh(ioc)
    return ioc


def update_ioc(db: Session, ioc_id: int, data: IOCUpdate) -> IOC:
    ioc = get_ioc_by_id(db, ioc_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(ioc, key, value)
    db.commit()
    db.refresh(ioc)
    return ioc


def delete_ioc(db: Session, ioc_id: int) -> None:
    ioc = get_ioc_by_id(db, ioc_id)
    db.delete(ioc)
    db.commit()


def bulk_create_iocs(db: Session, iocs: list[IOCCreate]) -> list[IOC]:
    return [create_ioc(db, ioc) for ioc in iocs]
