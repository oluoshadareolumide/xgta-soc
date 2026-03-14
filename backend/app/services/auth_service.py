"""
Auth service — user management and authentication business logic.
"""
import json
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import User, UserRole
from app.schemas.auth import RegisterRequest
from app.core.security import get_password_hash, verify_password


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, req: RegisterRequest) -> User:
    if get_user_by_username(db, req.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    if get_user_by_email(db, req.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        role = UserRole(req.role)
    except ValueError:
        role = UserRole.analyst

    user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return user


def seed_admin_if_empty(db: Session) -> None:
    """Create a default admin account if no users exist."""
    if db.query(User).count() == 0:
        admin = User(
            username="admin",
            email="admin@xgta-soc.local",
            full_name="System Administrator",
            hashed_password=get_password_hash("Admin1234!"),
            role=UserRole.admin,
        )
        db.add(admin)
        db.commit()
        print("✓ Seeded default admin user (admin / Admin1234!)")
