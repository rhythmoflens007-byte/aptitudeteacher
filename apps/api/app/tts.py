"""Natural neural voices for the tutor, with word timings for lip-sync.

Uses Microsoft Edge's free online voices (via edge-tts), so every student hears the same Indian
voices whatever browser or phone they use. If the service can't be reached, the frontend falls
back to the browser's own voices.
"""

import asyncio
import base64
from collections import OrderedDict

import edge_tts

VOICES = {
    ("en", "female"): "en-IN-NeerjaExpressiveNeural",
    ("en", "male"): "en-IN-PrabhatNeural",
    ("hi", "female"): "hi-IN-SwaraNeural",
    ("hi", "male"): "hi-IN-MadhurNeural",
    ("ta", "female"): "ta-IN-PallaviNeural",
    ("ta", "male"): "ta-IN-ValluvarNeural",
    ("te", "female"): "te-IN-ShrutiNeural",
    ("te", "male"): "te-IN-MohanNeural",
}
TIMEOUT_SECONDS = 20
CACHE_SIZE = 300
_cache: OrderedDict[tuple[str, str], dict] = OrderedDict()


class TTSUnavailable(Exception):
    pass


def voice_for(lang: str, gender: str) -> str:
    code = (lang or "en").split("-")[0].lower()
    return VOICES.get((code, gender), VOICES.get((code, "female"), VOICES[("en", "female")]))


async def _edge(text: str, voice: str) -> tuple[bytes, list[dict]]:
    """Calls the voice service; returns MP3 bytes and word timings in milliseconds."""
    audio = bytearray()
    words: list[dict] = []
    communicate = edge_tts.Communicate(text, voice, boundary="WordBoundary")
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start = chunk["offset"] / 10_000
            words.append({"text": chunk["text"], "start": round(start), "end": round(start + chunk["duration"] / 10_000)})
    return bytes(audio), words


async def synthesize(text: str, lang: str, gender: str) -> dict:
    voice = voice_for(lang, gender)
    key = (voice, text)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    try:
        audio, words = await asyncio.wait_for(_edge(text, voice), TIMEOUT_SECONDS)
    except Exception as exc:  # network down, service changed, timeout
        raise TTSUnavailable(str(exc)) from exc
    if not audio:
        raise TTSUnavailable("The voice service returned no audio")
    result = {"voice": voice, "audio": base64.b64encode(audio).decode("ascii"), "words": words}
    _cache[key] = result
    if len(_cache) > CACHE_SIZE:
        _cache.popitem(last=False)
    return result
