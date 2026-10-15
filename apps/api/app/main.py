import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from app import ai
from app.config import get_settings
from app.routes import auth, learn, practice, progress, quizzes, social, speech, tutor
from app.seed import init_db

settings = get_settings()
if settings.environment == "production" and settings.database_url.startswith("sqlite"):
    # A hosted server's files are wiped on every restart, so accounts must live in a real database.
    raise RuntimeError("Connect a Postgres database (DATABASE_URL) before running in production.")


_ready = threading.Event()
_init_lock = threading.Lock()


def ensure_db() -> None:
    with _init_lock:
        if not _ready.is_set():
            init_db()
            _ready.set()


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_db()
    yield


app = FastAPI(title="Aptitude Teacher API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def database_ready(request: Request, call_next):
    # Some serverless hosts skip the startup hook, so the first request prepares the database instead.
    if not _ready.is_set():
        await run_in_threadpool(ensure_db)
    return await call_next(request)


for module in (auth, practice, quizzes, tutor, progress, speech, learn, social):
    app.include_router(module.router)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "environment": settings.environment, "ai_enabled": ai.enabled()}
