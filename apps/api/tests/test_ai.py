import json
from types import SimpleNamespace

import pytest

from app import ai
from app.db.models import Question
from tests.test_api import answer_wrong, correct_answer


def learner(locale="en", name="Asha", gender="female"):
    return SimpleNamespace(locale=locale, tutor_name=name, tutor_gender=gender)


def test_persona_uses_name_and_gender():
    female = ai.persona(learner(name="Meera"))
    assert "You are Meera" in female and "woman" in female and "feminine grammatical forms" in female
    male = ai.persona(learner(name="Arjun", gender="male"))
    assert "You are Arjun" in male and " man " in male and "masculine grammatical forms" in male


def sample_question():
    return Question(
        difficulty=2,
        body="What is 10% of 50?",
        options=["5", "10", "15", "50"],
        correct_option="5",
        explanation="1. 10% means 10/100.\n2. 50 × 10/100 = 5.",
    )


# --- Pure functions with the AI stubbed ---------------------------------------------------------


def test_classifier_uses_ai_label(fake_ai):
    fake_ai["responses"]["Classify"] = json.dumps({"type": "partial_method"})
    assert ai.classify_misconception(sample_question(), "10", 40000) == "partial_method"
    assert fake_ai["calls"][-1]["as_json"] is True


@pytest.mark.parametrize("raw", ['{"type": "made_up"}', "not json", '["partial_method"]'])
def test_classifier_falls_back_on_bad_output(fake_ai, raw):
    fake_ai["responses"]["Classify"] = raw
    assert ai.classify_misconception(sample_question(), "10", 40000) == "conceptual_gap"


def test_classifier_falls_back_when_quota_exhausted(fake_ai):
    fake_ai["responses"]["Classify"] = ai.AIUnavailable("429 quota")
    assert ai.classify_misconception(sample_question(), "10", 10000) == "careless_slip"


GOOD_QUESTION = {
    "body": "What is 20% of 80?",
    "options": ["16", "18", "20", "24"],
    "correct_option": "16",
    "explanation": "1. 20% = 1/5.\n2. 80 / 5 = 16.",
}


def test_generated_question_accepted_when_valid(fake_ai):
    fake_ai["responses"]["Write ONE"] = json.dumps(GOOD_QUESTION)
    assert ai.generate_question("Percentages", "Percentage change", 2, [sample_question()]) == GOOD_QUESTION


@pytest.mark.parametrize(
    "broken",
    [
        {**GOOD_QUESTION, "correct_option": "17"},
        {**GOOD_QUESTION, "options": ["16", "16", "20", "24"]},
        {**GOOD_QUESTION, "options": ["16", "18", "20"]},
        {**GOOD_QUESTION, "explanation": ""},
        {k: v for k, v in GOOD_QUESTION.items() if k != "body"},
    ],
)
def test_generated_question_rejected_when_invalid(fake_ai, broken):
    fake_ai["responses"]["Write ONE"] = json.dumps(broken)
    assert ai.generate_question("Percentages", "Percentage change", 2, []) is None


def test_explanation_translated_for_hindi_but_not_english(fake_ai):
    fake_ai["responses"]["Rewrite the reference"] = "हिन्दी व्याख्या"
    q = sample_question()
    assert ai.explain(q, learner("en")) == q.explanation
    assert ai.explain(q, learner("hi")) == "हिन्दी व्याख्या"
    assert "Hindi" in fake_ai["calls"][-1]["contents"]


def test_ocr_rejects_images_without_a_question(monkeypatch):
    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_generate", lambda *a, **k: " none ")
    with pytest.raises(ValueError):
        ai.ocr_question(b"img", "image/png")


# --- The real SDK call path, with only the network client replaced -------------------------------


class RecordingModels:
    def __init__(self, text):
        self.text = text
        self.requests = []

    def generate_content(self, model, contents, config):
        self.requests.append(SimpleNamespace(model=model, contents=contents, config=config))
        return SimpleNamespace(text=self.text)


@pytest.fixture
def sdk(monkeypatch):
    models = RecordingModels("Great question. 1. First step…")
    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(models=models))
    return models


def test_tutor_builds_valid_gemini_conversation(sdk):
    history = [("tutor", "Hi!"), ("student", "Explain ratios"), ("tutor", "Sure…"), ("student", "Why 8 parts?")]
    reply = ai.tutor_reply(history, "Divide 1200 in 3:5", learner("ta", "Kavin", "male"))
    assert reply.startswith("Great question")
    request = sdk.requests[-1]
    roles = [c.role for c in request.contents]
    assert roles == ["user", "model", "user"], "Gemini conversations must start with the user turn"
    assert "Tamil" in request.config.system_instruction
    assert "You are Kavin" in request.config.system_instruction
    assert "masculine grammatical forms" in request.config.system_instruction
    assert "Divide 1200 in 3:5" in request.config.system_instruction
    assert request.model == "gemini-2.5-flash"


def test_json_mode_and_image_parts_reach_the_sdk(sdk):
    sdk.text = json.dumps({"type": "careless_slip"})
    assert ai.classify_misconception(sample_question(), "10", 30000) == "careless_slip"
    assert sdk.requests[-1].config.response_mime_type == "application/json"

    sdk.text = "What is 2 + 2?"
    assert ai.ocr_question(b"\x89PNG", "image/png") == "What is 2 + 2?"
    image_part = sdk.requests[-1].contents[0]
    assert image_part.inline_data.mime_type == "image/png"


def test_sdk_errors_become_ai_unavailable(monkeypatch):
    def boom(**_):
        raise RuntimeError("429 RESOURCE_EXHAUSTED")

    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(models=SimpleNamespace(generate_content=boom)))
    assert "quota" in ai.tutor_reply([("student", "hi")], None, learner("en"))


def test_empty_sdk_response_is_treated_as_unavailable(sdk):
    sdk.text = ""
    with pytest.raises(ai.AIUnavailable):
        ai._generate("hello")


# --- End-to-end through the API with the AI on ----------------------------------------------------


def test_ai_diagnosis_and_lesson_flow_through_attempts(client, user, fake_ai):
    fake_ai["responses"]["Classify"] = json.dumps({"type": "partial_method"})
    fake_ai["responses"]["micro-lesson"] = "Core idea: add speeds when moving towards each other."
    q = client.get("/questions/next", headers=user).json()["question"]
    res = answer_wrong(client, user, q, time_ms=3000).json()
    assert res["misconception_type"] == "partial_method"
    assert res["micro_lesson"].startswith("Core idea")
    assert res["retest_question_id"]


def test_ai_generates_a_fresh_question_once_seeds_run_out(client, user, fake_ai):
    fake_ai["responses"]["Write ONE"] = json.dumps(GOOD_QUESTION)
    skill = client.get("/topics", headers=user).json()[0]["subtopics"][0]["skills"][0]
    for _ in range(12):
        nxt = client.get("/questions/next", headers=user).json()
        if nxt["question"]["source"] == "ai_generated":
            break
        q = nxt["question"]
        client.post("/attempts", headers=user, json={"question_id": q["id"], "chosen_answer": correct_answer(client, q["id"]), "time_taken_ms": 30000})

    made = client.post("/questions/generate", headers=user, json={"skill_id": skill["id"]})
    assert made.status_code == 201
    assert made.json()["source"] == "ai_generated"
    assert made.json()["body"] == GOOD_QUESTION["body"]
    assert sorted(made.json()["options"]) == sorted(GOOD_QUESTION["options"])


def test_generate_reports_invalid_ai_output(client, user, fake_ai):
    fake_ai["responses"]["Write ONE"] = "garbage"
    skill = client.get("/topics", headers=user).json()[0]["subtopics"][0]["skills"][0]
    assert client.post("/questions/generate", headers=user, json={"skill_id": skill["id"]}).status_code == 503


def test_ocr_endpoint(client, user, fake_ai):
    fake_ai["responses"]["Part"] = "A train 100 m long crosses a pole in 5 s. Find its speed."
    res = client.post("/tutor/ocr", headers=user, files={"image": ("q.jpg", b"\xff\xd8fake", "image/jpeg")})
    assert res.status_code == 201, res.text
    assert res.json()["question_text"].startswith("A train")

    fake_ai["responses"]["Part"] = "NONE"
    assert client.post("/tutor/ocr", headers=user, files={"image": ("q.jpg", b"\xff\xd8", "image/jpeg")}).status_code == 422
    assert client.post("/tutor/ocr", headers=user, files={"image": ("q.gif", b"GIF", "image/gif")}).status_code == 415
    big = b"0" * (5 * 1024 * 1024 + 1)
    assert client.post("/tutor/ocr", headers=user, files={"image": ("q.png", big, "image/png")}).status_code == 413


def test_tutor_conversation_with_ai(client, user, fake_ai):
    fake_ai["responses"]["Content"] = "Think of it as closing the gap."
    session = client.post("/tutor/sessions", headers=user, json={"question_text": "Two trains approach each other"}).json()
    reply = client.post(f"/tutor/sessions/{session['id']}/messages", headers=user, json={"content": "why add speeds?"}).json()
    assert reply["role"] == "tutor" and reply["content"] == "Think of it as closing the gap."
    assert "Two trains approach each other" in fake_ai["calls"][-1]["system"]
    history = client.get(f"/tutor/sessions/{session['id']}", headers=user).json()["messages"]
    assert [m["role"] for m in history] == ["student", "tutor"]
