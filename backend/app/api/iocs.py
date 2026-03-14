from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.auth import TokenData
from app.schemas.schemas import IOCCreate, IOCUpdate, IOCOut, PaginatedResponse
from app.services import ioc_service

router = APIRouter(prefix="/iocs", tags=["IOC Library"])


@router.get("", response_model=PaginatedResponse)
def list_iocs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    ioc_type: Optional[str] = None,
    actor_id: Optional[int] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    items, total = ioc_service.get_iocs(db, skip, page_size, ioc_type, actor_id, active_only)
    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=[IOCOut.model_validate(i).model_dump() for i in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/search")
def search_ioc(
    value: str,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    ioc = ioc_service.search_ioc_by_value(db, value)
    if not ioc:
        return {"found": False}
    return {"found": True, "ioc": IOCOut.model_validate(ioc).model_dump()}


@router.get("/{ioc_id}", response_model=IOCOut)
def get_ioc(
    ioc_id: int,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    return ioc_service.get_ioc_by_id(db, ioc_id)


@router.post("", status_code=201, response_model=IOCOut)
def create_ioc(
    data: IOCCreate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    return ioc_service.create_ioc(db, data)


@router.post("/bulk", status_code=201)
def bulk_create_iocs(
    iocs: list[IOCCreate],
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    created = ioc_service.bulk_create_iocs(db, iocs)
    return {"created": len(created), "items": [IOCOut.model_validate(i).model_dump() for i in created]}


@router.patch("/{ioc_id}", response_model=IOCOut)
def update_ioc(
    ioc_id: int,
    data: IOCUpdate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    return ioc_service.update_ioc(db, ioc_id, data)


@router.delete("/{ioc_id}", status_code=204)
def delete_ioc(
    ioc_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.role not in ("admin", "analyst"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    ioc_service.delete_ioc(db, ioc_id)
