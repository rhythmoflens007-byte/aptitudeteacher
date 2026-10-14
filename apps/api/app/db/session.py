from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()


def _url(url: str) -> str:
    """Hosted Postgres providers hand out postgres:// or postgresql:// URLs; use the installed psycopg 3 driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


database_url = _url(settings.database_url)
if database_url.startswith("sqlite"):
    # SQLite allows one writer at a time; wait for it (up to 15 s) instead of failing with "database is locked".
    engine = create_engine(database_url, connect_args={"check_same_thread": False, "timeout": 15})
else:
    # Free hosted databases close idle connections; check each one before use instead of failing a request.
    engine = create_engine(database_url, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
