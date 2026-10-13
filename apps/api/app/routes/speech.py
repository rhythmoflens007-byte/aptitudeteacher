import time
from collections import defaultdict, deque
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app import tts

router = APIRouter(tags=["speech"])

# Open to guests (the landing page says hello), so cap how often one address can call it.
RATE_LIMIT = 90
RATE_WINDOW_SECONDS = 60
_calls: dict[str, deque[float]] = defaultdict(deque)


class SpeechIn(BaseModel):
    text: str = Field(min_length=1, max_length=600)
    lang: str = Field(default="en", max_length=10)
    gender: Literal["female", "male"] = "female"


def _allow(client: str) -> bool:
    now = time.monotonic()
    calls = _calls[client]
    while calls and now - calls[0] > RATE_WINDOW_SECONDS:
        calls.popleft()
    if len(calls) >= RATE_LIMIT:
        return False
    calls.append(now)
    return True


@router.post("/tts")
async def speak(body: SpeechIn, request: Request):
    if not _allow(request.client.host if request.client else "unknown"):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many voice requests. Wait a moment.")
    try:
        return await tts.synthesize(body.text.strip(), body.lang, body.gender)
    except tts.TTSUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The voice service can't be reached right now.")
