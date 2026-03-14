"""
SQLAlchemy ORM models for XGTA-SOC.
All tables use SQL Server-compatible types.
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    String, Integer, Boolean, DateTime, Float, Text,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


class SeverityLevel(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class AlertStatus(str, enum.Enum):
    open = "open"
    investigating = "investigating"
    resolved = "resolved"
    false_positive = "false_positive"


class IOCType(str, enum.Enum):
    ip = "IP"
    domain = "Domain"
    hash = "Hash"
    url = "URL"
    email = "Email"
    file = "File"


class PlaybookStatus(str, enum.Enum):
    ready = "ready"
    running = "running"
    completed = "completed"
    failed = "failed"


# ── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(200))
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.analyst)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    assigned_alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="assignee")


class ThreatActor(Base):
    __tablename__ = "threat_actors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # e.g. TA001
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    origin: Mapped[Optional[str]] = mapped_column(String(10))           # country code
    sector: Mapped[Optional[str]] = mapped_column(String(100))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    ttps: Mapped[Optional[str]] = mapped_column(Text)                   # JSON array stored as text
    description: Mapped[Optional[str]] = mapped_column(Text)
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="threat_actor")
    iocs: Mapped[list["IOC"]] = relationship("IOC", back_populates="threat_actor")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alert_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # e.g. ALT-8821
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    severity: Mapped[SeverityLevel] = mapped_column(SAEnum(SeverityLevel), nullable=False)
    status: Mapped[AlertStatus] = mapped_column(SAEnum(AlertStatus), default=AlertStatus.open)
    technique: Mapped[Optional[str]] = mapped_column(String(200))
    ioc_count: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[Optional[str]] = mapped_column(Text)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text)
    ai_recommendation: Mapped[Optional[str]] = mapped_column(Text)
    ai_impact: Mapped[Optional[str]] = mapped_column(Text)
    mitre_tactics: Mapped[Optional[str]] = mapped_column(Text)          # JSON array as text

    threat_actor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("threat_actors.id"), nullable=True)
    assignee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    threat_actor: Mapped[Optional["ThreatActor"]] = relationship("ThreatActor", back_populates="alerts")
    assignee: Mapped[Optional["User"]] = relationship("User", back_populates="assigned_alerts")
    iocs: Mapped[list["IOC"]] = relationship("IOC", secondary="alert_iocs", back_populates="alerts")


class IOC(Base):
    __tablename__ = "iocs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ioc_type: Mapped[IOCType] = mapped_column(SAEnum(IOCType), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    hits: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[Optional[str]] = mapped_column(Text)
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    threat_actor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("threat_actors.id"), nullable=True)
    threat_actor: Mapped[Optional["ThreatActor"]] = relationship("ThreatActor", back_populates="iocs")
    alerts: Mapped[list["Alert"]] = relationship("Alert", secondary="alert_iocs", back_populates="iocs")


class AlertIOC(Base):
    """Many-to-many join table between alerts and IOCs."""
    __tablename__ = "alert_iocs"

    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id"), primary_key=True)
    ioc_id: Mapped[int] = mapped_column(ForeignKey("iocs.id"), primary_key=True)
    linked_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Playbook(Base):
    __tablename__ = "playbooks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    playbook_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    total_steps: Mapped[int] = mapped_column(Integer, default=0)
    auto_steps: Mapped[int] = mapped_column(Integer, default=0)
    manual_steps: Mapped[int] = mapped_column(Integer, default=0)
    estimated_eta_minutes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[PlaybookStatus] = mapped_column(SAEnum(PlaybookStatus), default=PlaybookStatus.ready)
    steps_json: Mapped[Optional[str]] = mapped_column(Text)             # JSON array of step definitions
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
