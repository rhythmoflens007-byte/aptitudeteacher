import json
from types import SimpleNamespace

import pytest

from app import ai, tts
from app.routes import speech


def learner(locale="en"):
    return SimpleNamespace(locale=locale, tutor_name="Asha", tutor_gender="female")


def events(client, user, session_id, content="Why 8 parts?"):
    res = client.post(f"/tutor/sessions/{session_id}/messages/stream", headers=user, json={"content": content})
    assert res.status_code == 200, res.text
    assert res.headers["content-type"].startswith("application/x-ndjson")
    return [json.loads(line) for line in res.text.splitlines() if line.strip()]


def new_session(client, user):
    return client.post("/tutor/sessions", headers=user, json={}).json()["id"]


# --- Sentence splitting -----------------------------------------------------------------------------


def test_splitter_releases_whole_sentences_only():
    s = ai.SentenceSplitter()
    assert s.feed("[excited] Great quest") == []
    assert s.feed("ion! [thinking] 1. Add the") == ["[excited] Great question! "]
    assert s.feed(" speeds.\n2. Divide.") == ["[thinking] 1. Add the speeds.\n"]
    assert s.flush() == ["2. Divide."]


def test_splitter_keeps_decimals_and_indic_full_stops():
    s = ai.SentenceSplitter()
    assert s.feed("Speed is 2.5 km/h। अगला वाक्य") == ["Speed is 2.5 km/h। "]
    assert s.flush() == ["अगला वाक्य"]


def test_emotion_tag_is_lifted_off_each_sentence():
    assert ai._tagged("[Excited] Great!\n") == ("Great!\n", "excited")
    assert ai._tagged("No tag here. ") == ("No tag here. ", None)


# --- The streaming tutor ------------------------------------------------------------------------------


def test_offline_tutor_streams_and_saves_the_conversation(client, user):
    sid = new_session(client, user)
    got = events(client, user, sid)
    sentences = [e for e in got if e["type"] == "sentence"]
    done = got[-1]
    assert sentences and done["type"] == "done"
    assert done["message"]["content"] == "".join(e["text"] for e in sentences).strip()
    assert "offline mode" in done["message"]["content"]
    saved = client.get(f"/tutor/sessions/{sid}", headers=user).json()["messages"]
    assert [m["role"] for m in saved] == ["student", "tutor"]
    assert saved[1]["id"] == done["message"]["id"]


def test_ai_reply_streams_sentence_by_sentence_with_emotions(client, user, monkeypatch):
    chunks = ["[excited] Great quest", "ion! [thinking] 1. Add the", " speeds.\n[proud] 2. Divide."]
    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_generate_stream", lambda contents, system=None: iter(chunks))
    got = events(client, user, new_session(client, user))
    sentences = [(e["text"], e["emotion"]) for e in got if e["type"] == "sentence"]
    assert sentences == [("Great question! ", "excited"), ("1. Add the speeds.\n", "thinking"), ("2. Divide.", "proud")]
    assert got[-1]["message"]["content"] == "Great question! 1. Add the speeds.\n2. Divide."
    assert got[-1]["message"]["emotions"] == ["excited", "thinking", "proud"]


def test_busy_ai_streams_a_friendly_reply_in_the_learners_language(monkeypatch):
    def unavailable(contents, system=None):
        raise ai.AIUnavailable("busy")
        yield  # pragma: no cover

    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_generate_stream", unavailable)
    got = list(ai.tutor_reply_stream([("student", "hi")], None, learner("hi")))
    assert got == [(ai.BUSY_REPLY["hi"], "empathetic")]


def test_reply_cut_off_midway_keeps_what_was_already_said(monkeypatch):
    def breaks(contents, system=None):
        yield "[excited] First idea. [thinking] Second id"
        raise ai.AIUnavailable("connection dropped")

    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_generate_stream", breaks)
    got = list(ai.tutor_reply_stream([("student", "hi")], None, learner()))
    assert got == [("First idea. ", "excited"), ("Second id", "thinking")]


def test_stream_falls_back_to_the_next_model_before_any_text(monkeypatch):
    class Busy(Exception):
        code = 503

    used = []

    def stream(model, **_):
        used.append(model)
        if model == "gemini-3.6-flash":
            raise Busy("503 UNAVAILABLE")
        return iter([SimpleNamespace(text="Hello "), SimpleNamespace(text="there.")])

    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(models=SimpleNamespace(generate_content_stream=stream)))
    assert "".join(ai._generate_stream("hi")) == "Hello there."
    assert used == ["gemini-3.6-flash", "gemini-3.8-flash"]


def test_stream_that_breaks_after_text_does_not_switch_models(monkeypatch):
    def stream(model, **_):
        yield SimpleNamespace(text="Half a ")
        raise RuntimeError("503 UNAVAILABLE")

    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(models=SimpleNamespace(generate_content_stream=stream)))
    got = []
    with pytest.raises(ai.AIUnavailable):
        for piece in ai._generate_stream("hi"):
            got.append(piece)
    assert got == ["Half a "]


def test_stream_needs_a_conversation_you_own(client, user):
    res = client.post("/tutor/sessions/not-a-real-id/messages/stream", headers=user, json={"content": "hi"})
    assert res.status_code == 404


# --- Neural voices -------------------------------------------------------------------------------------


@pytest.fixture
def fake_voice(monkeypatch):
    calls = []

    async def edge(text, voice):
        calls.append((text, voice))
        return b"ID3-mp3-bytes", [{"text": "Vanakkam", "start": 50, "end": 600}]

    monkeypatch.setattr(tts, "_edge", edge)
    tts._cache.clear()
    speech._calls.clear()
    return calls


def test_tts_returns_audio_and_word_timings(client, fake_voice):
    res = client.post("/tts", json={"text": "வணக்கம்", "lang": "ta-IN", "gender": "female"})
    assert res.status_code == 200
    data = res.json()
    assert data["voice"] == "ta-IN-PallaviNeural"
    assert data["words"] == [{"text": "Vanakkam", "start": 50, "end": 600}]
    assert data["audio"]


def test_tts_picks_a_voice_per_language_and_gender():
    assert tts.voice_for("te", "male") == "te-IN-MohanNeural"
    assert tts.voice_for("hi-IN", "female") == "hi-IN-SwaraNeural"
    assert tts.voice_for("fr", "male") == "en-IN-NeerjaExpressiveNeural"


def test_tts_caches_repeated_sentences(client, fake_voice):
    for _ in range(3):
        assert client.post("/tts", json={"text": "Hello!", "lang": "en"}).status_code == 200
    assert len(fake_voice) == 1


def test_tts_reports_when_the_voice_service_is_down(client, monkeypatch):
    async def down(text, voice):
        raise OSError("no internet")

    monkeypatch.setattr(tts, "_edge", down)
    tts._cache.clear()
    speech._calls.clear()
    assert client.post("/tts", json={"text": "Hi"}).status_code == 503


def test_tts_is_rate_limited(client, fake_voice, monkeypatch):
    monkeypatch.setattr(speech, "RATE_LIMIT", 2)
    codes = [client.post("/tts", json={"text": f"Line {i}"}).status_code for i in range(3)]
    assert codes == [200, 200, 429]


def test_tts_rejects_overlong_text(client, fake_voice):
    assert client.post("/tts", json={"text": "x" * 601}).status_code == 422
