import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.auth import TokenData
from app.schemas.schemas import ThreatActorCreate, ThreatActorUpdate, ThreatActorOut, PaginatedResponse
from app.services import actor_service

router = APIRouter(prefix="/threat-actors", tags=["Threat Actors"])


def _serialize_actor(actor) -> dict:
    data = ThreatActorOut.model_validate(actor).model_dump()
    if isinstance(data.get("ttps"), str):
        try:
            data["ttps"] = json.loads(data["ttps"])
        except Exception:
            data["ttps"] = []
    return data


@router.get("", response_model=PaginatedResponse)
def list_actors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    items, total = actor_service.get_actors(db, skip, page_size, active_only)
    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=[_serialize_actor(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{actor_id}")
def get_actor(
    actor_id: int,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    return _serialize_actor(actor_service.get_actor_by_id(db, actor_id))


@router.post("", status_code=201)
def create_actor(
    data: ThreatActorCreate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    return _serialize_actor(actor_service.create_actor(db, data))


@router.patch("/{actor_id}")
def update_actor(
    actor_id: int,
    data: ThreatActorUpdate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    return _serialize_actor(actor_service.update_actor(db, actor_id, data))


@router.delete("/{actor_id}", status_code=204)
def delete_actor(
    actor_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin only")
    actor_service.delete_actor(db, actor_id)
