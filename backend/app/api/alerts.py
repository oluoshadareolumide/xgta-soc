import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.auth import TokenData
from app.schemas.schemas import AlertCreate, AlertUpdate, AlertOut, PaginatedResponse
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def _serialize_alert(alert) -> dict:
    """Convert ORM alert to dict, deserializing JSON fields."""
    data = AlertOut.model_validate(alert).model_dump()
    # Deserialize mitre_tactics if stored as JSON string
    if isinstance(data.get("mitre_tactics"), str):
        try:
            data["mitre_tactics"] = json.loads(data["mitre_tactics"])
        except Exception:
            data["mitre_tactics"] = []
    return data


@router.get("", response_model=PaginatedResponse)
def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    actor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    items, total = alert_service.get_alerts(db, skip, page_size, status, severity, actor_id)
    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=[_serialize_alert(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/stats")
def get_alert_stats(
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    return alert_service.get_alert_stats(db)


@router.get("/{alert_id}")
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    alert = alert_service.get_alert_by_id(db, alert_id)
    return _serialize_alert(alert)


@router.post("", status_code=201)
def create_alert(
    data: AlertCreate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    alert = alert_service.create_alert(db, data)
    return _serialize_alert(alert)


@router.patch("/{alert_id}")
def update_alert(
    alert_id: int,
    data: AlertUpdate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    alert = alert_service.update_alert(db, alert_id, data)
    return _serialize_alert(alert)


@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.role not in ("admin", "analyst"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    alert_service.delete_alert(db, alert_id)
