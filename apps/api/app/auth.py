import hashlib
import hmac
import secrets
from datetime import timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import User, utcnow
from app.db.session import get_db

PBKDF2_ITERATIONS = 390_000
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, expected = stored.split("$", 1)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return hmac.compare_digest(digest.hex(), expected)


def create_token(user_id: str) -> str:
    settings = get_settings()
    payload = {"sub": user_id, "exp": utcnow() + timedelta(hours=settings.jwt_expiry_hours)}
    return jwt.encode(payload, settings.signing_secret(), algorithm="HS256")


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to continue.")
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, get_settings().signing_secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise unauthorized
    user = db.get(User, payload.get("sub"))
    if user is None:
        raise unauthorized
    return user
