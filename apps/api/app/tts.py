"""Natural neural voices for the tutor, with word timings for lip-sync.

Voices come from a chain of providers, tried in order (TTS_PROVIDERS in .env):
- "edge": Microsoft Edge's free online voices via edge-tts. No key, but it is an unofficial service.
- "azure": Azure AI Speech, the official home of the same voices (free tier: 0.5M characters a month).
  Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.
- "google": Google Cloud Text-to-Speech (free tier: about 1M characters a month). Needs GOOGLE_TTS_API_KEY.
Every clip is kept on disk, so a sentence spoken once keeps working even when every provider is down.
If nothing can be reached, the frontend falls back to the browser's own voices.
"""

import asyncio
import base64
import hashlib
import json
import logging
import re
from collections import OrderedDict
from pathlib import Path
from xml.sax.saxutils import escape

import aiohttp
import edge_tts

from app.config import API_DIR, get_settings

log = logging.getLogger(__name__)

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
DISK_CACHE_FILES = 3000
_cache: OrderedDict[tuple[str, str], dict] = OrderedDict()


class TTSUnavailable(Exception):
    pass


def voice_for(lang: str, gender: str) -> str:
    code = (lang or "en").split("-")[0].lower()
    return VOICES.get((code, gender), VOICES.get((code, "female"), VOICES[("en", "female")]))


def _locale_of(voice: str) -> str:
    return "-".join(voice.split("-")[:2])


# ---------------------------------------------------------------- providers


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


async def _azure(text: str, voice: str) -> tuple[bytes, list[dict]]:
    settings = get_settings()
    if not (settings.azure_speech_key and settings.azure_speech_region):
        raise TTSUnavailable("Azure Speech isn't set up")
    ssml = (
        f"<speak version='1.0' xml:lang='{_locale_of(voice)}'><voice name='{voice}'>{escape(text)}</voice></speak>"
    )
    url = f"https://{settings.azure_speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
    headers = {
        "Ocp-Apim-Subscription-Key": settings.azure_speech_key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "aptitude-teacher",
    }
    async with aiohttp.ClientSession() as http:
        async with http.post(url, data=ssml.encode("utf-8"), headers=headers) as res:
            if res.status != 200:
                raise TTSUnavailable(f"Azure Speech answered {res.status}")
            return await res.read(), []


async def _google(text: str, voice: str) -> tuple[bytes, list[dict]]:
    settings = get_settings()
    if not settings.google_tts_api_key:
        raise TTSUnavailable("Google Text-to-Speech isn't set up")
    gender = "MALE" if voice in {VOICES[(code, "male")] for code in ("en", "hi", "ta", "te")} else "FEMALE"
    body = {
        "input": {"text": text},
        # Google picks its best voice for the language and gender.
        "voice": {"languageCode": _locale_of(voice), "ssmlGender": gender},
        "audioConfig": {"audioEncoding": "MP3"},
    }
    url = "https://texttospeech.googleapis.com/v1/text:synthesize"
    async with aiohttp.ClientSession() as http:
        async with http.post(url, params={"key": settings.google_tts_api_key}, json=body) as res:
            if res.status != 200:
                raise TTSUnavailable(f"Google Text-to-Speech answered {res.status}")
            data = await res.json()
    return base64.b64decode(data["audioContent"]), []


PROVIDERS = {"edge": lambda: _edge, "azure": lambda: _azure, "google": lambda: _google}


def providers() -> list[str]:
    names = [n.strip().lower() for n in get_settings().tts_providers.split(",")]
    return [n for n in dict.fromkeys(names) if n in PROVIDERS]


# ---------------------------------------------------------------- word timings for providers without them

_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]  # MPEG-1 Layer III, kbps
_BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]  # MPEG-2/2.5 Layer III


def mp3_duration_ms(audio: bytes) -> int:
    """Length of a constant-bitrate MP3, read from its first frame header."""
    start = 0
    if audio[:3] == b"ID3" and len(audio) > 10:
        size = (audio[6] & 0x7F) << 21 | (audio[7] & 0x7F) << 14 | (audio[8] & 0x7F) << 7 | (audio[9] & 0x7F)
        start = 10 + size
    for i in range(start, max(start, len(audio) - 4)):
        if audio[i] == 0xFF and audio[i + 1] & 0xE0 == 0xE0:
            version = (audio[i + 1] >> 3) & 0x03
            index = audio[i + 2] >> 4
            table = _BITRATES if version == 3 else _BITRATES_V2
            if 0 < index < 15 and table[index]:
                return round((len(audio) - i) * 8 / table[index])
    return 0


def estimate_words(text: str, audio: bytes) -> list[dict]:
    """Spreads the words over the clip in proportion to their length: close enough to move the lips."""
    words = re.findall(r"\S+", text)
    duration = mp3_duration_ms(audio) or len(text) * 70
    weights = [len(w) + 2 for w in words]
    total = sum(weights) or 1
    out, at = [], 0.0
    for word, weight in zip(words, weights):
        span = duration * weight / total
        out.append({"text": word, "start": round(at), "end": round(at + span * 0.9)})
        at += span
    return out


# ---------------------------------------------------------------- caches


def _disk_dir() -> Path | None:
    configured = get_settings().voice_cache_dir
    if configured == "off":
        return None
    return Path(configured) if configured else API_DIR / ".voice-cache"


def _disk_key(provider: str, voice: str, text: str) -> str:
    return hashlib.sha1(f"{provider}|{voice}|{text}".encode("utf-8")).hexdigest()


def _disk_read(provider: str, voice: str, text: str) -> dict | None:
    folder = _disk_dir()
    path = folder / f"{_disk_key(provider, voice, text)}.json" if folder else None
    if not path or not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _disk_write(provider: str, voice: str, text: str, result: dict) -> None:
    folder = _disk_dir()
    if not folder:
        return
    try:
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{_disk_key(provider, voice, text)}.json").write_text(json.dumps(result), encoding="utf-8")
        files = list(folder.glob("*.json"))
        if len(files) > DISK_CACHE_FILES:
            for old in sorted(files, key=lambda p: p.stat().st_mtime)[: len(files) - DISK_CACHE_FILES]:
                old.unlink(missing_ok=True)
    except OSError as exc:  # a full or read-only disk only costs us the cache
        log.warning("voice cache not written: %s", exc)


def _remember(key: tuple[str, str], result: dict) -> dict:
    _cache[key] = result
    _cache.move_to_end(key)
    if len(_cache) > CACHE_SIZE:
        _cache.popitem(last=False)
    return result


async def synthesize(text: str, lang: str, gender: str) -> dict:
    voice = voice_for(lang, gender)
    key = (voice, text)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    chain = providers()
    for name in chain:
        saved = _disk_read(name, voice, text)
        if saved:
            return _remember(key, saved)
    problems = []
    for name in chain:
        try:
            audio, words = await asyncio.wait_for(PROVIDERS[name]()(text, voice), TIMEOUT_SECONDS)
        except Exception as exc:  # network down, service changed, timeout, not set up
            problems.append(f"{name}: {exc}")
            continue
        if not audio:
            problems.append(f"{name}: no audio")
            continue
        result = {
            "voice": voice,
            "provider": name,
            "audio": base64.b64encode(audio).decode("ascii"),
            "words": words or estimate_words(text, audio),
        }
        _disk_write(name, voice, text, result)
        return _remember(key, result)
    raise TTSUnavailable("; ".join(problems) or "No voice provider is configured")
