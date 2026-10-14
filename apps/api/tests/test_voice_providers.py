import asyncio

import pytest

from app import tts
from app.config import get_settings


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def chain(monkeypatch):
    """Configures the provider chain and records which providers were called."""
    calls: list[str] = []

    def use(names: str, behaviour: dict):
        monkeypatch.setattr(get_settings(), "tts_providers", names)
        for name, result in behaviour.items():

            async def fake(text, voice, name=name, result=result):
                calls.append(name)
                if isinstance(result, Exception):
                    raise result
                return result

            monkeypatch.setattr(tts, f"_{name}", fake)
        tts._cache.clear()
        return calls

    return use


# A real MPEG-1 Layer III frame header at 48 kbps: FF FB 30 xx.
MP3_48K = b"\xff\xfb\x30\x00" + b"\x00" * 5996


def test_mp3_duration_is_read_from_the_frame_header():
    assert tts.mp3_duration_ms(MP3_48K) == 1000  # 6000 bytes × 8 ÷ 48 kbps


def test_estimated_word_timings_cover_the_clip_in_order():
    words = tts.estimate_words("Speed is distance over time", MP3_48K)
    assert [w["text"] for w in words] == ["Speed", "is", "distance", "over", "time"]
    starts = [w["start"] for w in words]
    assert starts == sorted(starts) and starts[0] == 0 and words[-1]["end"] <= 1000


def test_falls_back_to_the_next_provider(chain):
    calls = chain("azure,edge", {"azure": OSError("bad key"), "edge": (MP3_48K, [])})
    result = run(tts.synthesize("Fallback check one", "en", "female"))
    assert calls == ["azure", "edge"] and result["provider"] == "edge"
    assert result["words"], "providers without timings still get estimated ones"


def test_a_saved_clip_plays_even_when_every_provider_is_down(chain):
    calls = chain("edge", {"edge": (MP3_48K, [{"text": "Namaste", "start": 0, "end": 400}])})
    first = run(tts.synthesize("Disk cache check", "hi", "female"))
    chain("edge", {"edge": OSError("offline")})
    again = run(tts.synthesize("Disk cache check", "hi", "female"))
    assert again["audio"] == first["audio"] and calls == ["edge"]


def test_reports_every_problem_when_nothing_works(chain):
    chain("google,edge", {"google": OSError("quota"), "edge": OSError("offline")})
    with pytest.raises(tts.TTSUnavailable) as err:
        run(tts.synthesize("Nothing works here", "ta", "male"))
    assert "google" in str(err.value) and "edge" in str(err.value)


def test_keyed_providers_say_when_they_are_not_set_up():
    with pytest.raises(tts.TTSUnavailable):
        run(tts._azure("hi", "en-IN-NeerjaExpressiveNeural"))
    with pytest.raises(tts.TTSUnavailable):
        run(tts._google("hi", "en-IN-NeerjaExpressiveNeural"))


def test_unknown_provider_names_are_ignored(monkeypatch):
    monkeypatch.setattr(get_settings(), "tts_providers", "polly, edge ,EDGE")
    assert tts.providers() == ["edge"]
