import itertools
import os
import tempfile
from pathlib import Path

import pytest

# Must be set before any app module is imported: settings and the engine are built at import time.
_db_dir = tempfile.mkdtemp(prefix="aptitude-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_db_dir, 'test.db').as_posix()}"
os.environ["GEMINI_API_KEY"] = ""
os.environ["JWT_SECRET"] = "test-secret"
os.environ["GEMINI_MODEL"] = "gemini-3.6-flash"
os.environ["GEMINI_FALLBACK_MODELS"] = "gemini-3.8-flash,gemini-3.5-flash"

from fastapi.testclient import TestClient  # noqa: E402

from app import ai  # noqa: E402
from app.main import app  # noqa: E402

_emails = itertools.count()


@pytest.fixture(autouse=True)
def fresh_model_quota():
    """Models rested after a quota error in one test must not stay rested in the next."""
    ai._resting_until.clear()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def user(client):
    """A fresh registered user; returns auth headers."""
    res = client.post(
        "/auth/register",
        json={"email": f"student{next(_emails)}@example.com", "password": "password123", "display_name": "Student"},
    )
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture
def fake_ai(monkeypatch):
    """Turns the AI on and routes every Gemini call through a scripted stand-in."""
    calls: list[dict] = []
    responses: dict[str, object] = {}

    def fake_generate(contents, system=None, as_json=False):
        text = contents if isinstance(contents, str) else repr(contents)
        calls.append({"contents": contents, "system": system, "as_json": as_json})
        for needle, reply in responses.items():
            if needle in text:
                if isinstance(reply, Exception):
                    raise reply
                return reply(text) if callable(reply) else reply
        raise ai.AIUnavailable("no scripted response")

    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_generate", fake_generate)
    return {"calls": calls, "responses": responses}
