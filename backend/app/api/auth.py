from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import create_access_token, get_current_user
from app.schemas.auth import Token, RegisterRequest, UserOut, TokenData
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate with username + password, returns a JWT."""
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role.value})
    return Token(access_token=token, user_id=user.id, username=user.username, role=user.role.value)


@router.post("/register", response_model=UserOut, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    user = auth_service.create_user(db, req)
    return user


@router.get("/me", response_model=UserOut)
def get_me(current_user: TokenData = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the currently authenticated user's profile."""
    user = auth_service.get_user_by_id(db, current_user.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
