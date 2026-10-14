from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_token, current_user, hash_password, verify_password
from app.db.models import User
from app.db.session import get_db
from app.engine import game, gamification
from app.schemas import AuthOut, LoginIn, ProfileIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists. Sign in instead.")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        display_name=body.display_name.strip(),
        locale=body.locale,
        friend_code=game.new_friend_code(db),
    )
    db.add(user)
    db.flush()
    gamification.profile(db, user.id)
    db.commit()
    return AuthOut(token=create_token(user.id), user=UserOut.of(user))


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")
    return AuthOut(token=create_token(user.id), user=UserOut.of(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return UserOut.of(user)


@router.patch("/me", response_model=UserOut)
def update_me(body: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.display_name is not None:
        user.display_name = body.display_name.strip()
    if body.locale is not None:
        user.locale = body.locale
    if body.tutor_name is not None:
        user.tutor_name = body.tutor_name
    if body.tutor_gender is not None:
        user.tutor_gender = body.tutor_gender
    db.add(user)
    db.commit()
    return UserOut.of(user)
