from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import ai
from app.config import get_settings
from app.routes import auth, practice, progress, quizzes, speech, tutor
from app.seed import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Aptitude Teacher API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, practice, quizzes, tutor, progress, speech):
    app.include_router(module.router)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "environment": settings.environment, "ai_enabled": ai.enabled()}
