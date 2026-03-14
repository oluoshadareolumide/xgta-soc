from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Threat Actor Schemas ──────────────────────────────────────────────────────

class ThreatActorBase(BaseModel):
    name: str
    origin: Optional[str] = None
    sector: Optional[str] = None
    confidence: float = Field(ge=0, le=100)
    is_active: bool = True
    ttps: Optional[List[str]] = None
    description: Optional[str] = None


class ThreatActorCreate(ThreatActorBase):
    actor_id: str


class ThreatActorUpdate(BaseModel):
    name: Optional[str] = None
    origin: Optional[str] = None
    sector: Optional[str] = None
    confidence: Optional[float] = None
    is_active: Optional[bool] = None
    ttps: Optional[List[str]] = None
    description: Optional[str] = None


class ThreatActorOut(ThreatActorBase):
    id: int
    actor_id: str
    last_seen: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Alert Schemas ─────────────────────────────────────────────────────────────

class AlertBase(BaseModel):
    title: str
    severity: str
    technique: Optional[str] = None
    description: Optional[str] = None
    confidence: float = Field(ge=0, le=100)


class AlertCreate(AlertBase):
    threat_actor_id: Optional[int] = None


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    assignee_id: Optional[int] = None
    ai_summary: Optional[str] = None
    ai_recommendation: Optional[str] = None
    ai_impact: Optional[str] = None
    mitre_tactics: Optional[List[str]] = None


class AlertOut(AlertBase):
    id: int
    alert_id: str
    status: str
    ioc_count: int
    ai_summary: Optional[str]
    ai_recommendation: Optional[str]
    ai_impact: Optional[str]
    mitre_tactics: Optional[List[str]]
    threat_actor_id: Optional[int]
    assignee_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── IOC Schemas ───────────────────────────────────────────────────────────────

class IOCBase(BaseModel):
    ioc_type: str
    value: str
    confidence: float = Field(ge=0, le=100)
    description: Optional[str] = None


class IOCCreate(IOCBase):
    threat_actor_id: Optional[int] = None


class IOCUpdate(BaseModel):
    hits: Optional[int] = None
    is_active: Optional[bool] = None
    confidence: Optional[float] = None
    description: Optional[str] = None
    threat_actor_id: Optional[int] = None


class IOCOut(IOCBase):
    id: int
    hits: int
    is_active: bool
    first_seen: datetime
    last_seen: datetime
    threat_actor_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Pagination wrapper ────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int
