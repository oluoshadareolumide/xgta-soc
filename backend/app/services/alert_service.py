"""
Alert service — CRUD and business logic for security alerts.
"""
import json
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from fastapi import HTTPException

from app.models.models import Alert, AlertStatus, SeverityLevel
from app.schemas.schemas import AlertCreate, AlertUpdate


def _next_alert_id(db: Session) -> str:
    count = db.query(func.count(Alert.id)).scalar() or 0
    return f"ALT-{8800 + count + 1}"


def get_alerts(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    actor_id: Optional[int] = None,
) -> tuple[list[Alert], int]:
    q = db.query(Alert)
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    if actor_id:
        q = q.filter(Alert.threat_actor_id == actor_id)
    total = q.count()
    items = q.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()
    return items, total


def get_alert_by_id(db: Session, alert_id: int) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


def create_alert(db: Session, data: AlertCreate) -> Alert:
    alert = Alert(
        alert_id=_next_alert_id(db),
        title=data.title,
        severity=data.severity,
        technique=data.technique,
        description=data.description,
        confidence=data.confidence,
        threat_actor_id=data.threat_actor_id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def update_alert(db: Session, alert_id: int, data: AlertUpdate) -> Alert:
    alert = get_alert_by_id(db, alert_id)
    update_data = data.model_dump(exclude_unset=True)

    # Handle mitre_tactics list → JSON string
    if "mitre_tactics" in update_data and update_data["mitre_tactics"] is not None:
        update_data["mitre_tactics"] = json.dumps(update_data["mitre_tactics"])

    # Auto-set resolved_at timestamp
    if update_data.get("status") == AlertStatus.resolved and not alert.resolved_at:
        update_data["resolved_at"] = datetime.now(timezone.utc)

    for key, value in update_data.items():
        setattr(alert, key, value)

    db.commit()
    db.refresh(alert)
    return alert


def delete_alert(db: Session, alert_id: int) -> None:
    alert = get_alert_by_id(db, alert_id)
    db.delete(alert)
    db.commit()


def get_alert_stats(db: Session) -> dict:
    total = db.query(func.count(Alert.id)).scalar()
    open_count = db.query(func.count(Alert.id)).filter(Alert.status == "open").scalar()
    critical = db.query(func.count(Alert.id)).filter(Alert.severity == "critical").scalar()
    resolved = db.query(func.count(Alert.id)).filter(Alert.status == "resolved").scalar()
    return {
        "total": total,
        "open": open_count,
        "critical": critical,
        "resolved": resolved,
        "auto_resolved_pct": round((resolved / total * 100) if total else 0, 1),
    }
