from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import ai
from app.config import get_settings
from app.routes import auth, learn, practice, progress, quizzes, social, speech, tutor
from app.seed import init_db

settings = get_settings()
if settings.environment == "production" and settings.jwt_secret == "dev-only-change-me":
    # With the public default, anyone could sign their own login tokens.
    raise RuntimeError("Set JWT_SECRET to a long random value before running in production.")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Aptitude Teacher API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, practice, quizzes, tutor, progress, speech, learn, social):
    app.include_router(module.router)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "environment": settings.environment, "ai_enabled": ai.enabled()}
