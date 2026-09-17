import json
import logging
from functools import lru_cache
from typing import Protocol

from google import genai
from google.genai import types

from app.config import get_settings
from app.db.models import Question

log = logging.getLogger("ai")

LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "bn": "Bengali",
    "te": "Telugu",
    "mr": "Marathi",
    "ta": "Tamil",
    "ur": "Urdu",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "es": "Spanish",
    "fr": "French",
    "ar": "Arabic",
}
MISCONCEPTIONS = ("careless_slip", "conceptual_gap", "partial_method", "no_attempt")

class Learner(Protocol):
    locale: str
    tutor_name: str
    tutor_gender: str


def persona(learner: Learner) -> str:
    name = learner.tutor_name or "Asha"
    woman = (learner.tutor_gender or "female") == "female"
    return (
        f"You are {name}, a warm, patient {'woman' if woman else 'man'} who teaches aptitude to students "
        "preparing for placement and competitive exams (Quantitative Aptitude, Logical Reasoning, Verbal Ability). "
        "Teach, don't just answer: find what the student doesn't understand, explain the underlying "
        "concept in small numbered steps, show shortcuts where they exist, and end with one short "
        "check-for-understanding question. Keep replies under 180 words. Use plain text, no markdown "
        "tables. Your replies may be read aloud, so avoid symbols that sound odd when spoken. "
        "In languages with grammatical gender (such as Hindi, Urdu, Marathi, Punjabi, Gujarati, Spanish, French and "
        f"Arabic), use {'feminine' if woman else 'masculine'} grammatical forms when referring to yourself."
    )


class AIUnavailable(Exception):
    pass


def enabled() -> bool:
    return bool(get_settings().gemini_api_key)


@lru_cache
def _client() -> genai.Client:
    return genai.Client(api_key=get_settings().gemini_api_key)


def _generate(contents, system: str | None = None, as_json: bool = False) -> str:
    if not enabled():
        raise AIUnavailable("GEMINI_API_KEY is not set")
    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.4,
        response_mime_type="application/json" if as_json else None,
    )
    try:
        response = _client().models.generate_content(
            model=get_settings().gemini_model, contents=contents, config=config
        )
    except Exception as exc:
        log.warning("Gemini call failed: %s", exc)
        raise AIUnavailable(str(exc)) from exc
    if not response.text:
        raise AIUnavailable("Empty response from Gemini")
    return response.text


def _language(locale: str) -> str:
    return LANGUAGES.get(locale, "English")


def _question_block(q: Question) -> str:
    options = "\n".join(f"- {o}" for o in q.options)
    return f"Question: {q.body}\nOptions:\n{options}\nCorrect answer: {q.correct_option}"


def explain(q: Question, learner: Learner) -> str:
    locale = learner.locale
    if locale == "en" or not enabled():
        return q.explanation
    try:
        return _generate(
            f"{_question_block(q)}\nReference explanation: {q.explanation}\n\n"
            f"Rewrite the reference explanation as clear numbered steps in {_language(locale)}. "
            "Keep numbers and option text unchanged.",
            system=persona(learner),
        )
    except AIUnavailable:
        return q.explanation


def heuristic_misconception(chosen: str | None, time_taken_ms: int | None) -> str:
    if not chosen or (time_taken_ms is not None and time_taken_ms < 5000):
        return "no_attempt"
    if time_taken_ms is not None and time_taken_ms < 20000:
        return "careless_slip"
    return "conceptual_gap"


def classify_misconception(q: Question, chosen: str | None, time_taken_ms: int | None) -> str:
    if not chosen:
        return "no_attempt"
    try:
        raw = _generate(
            f"{_question_block(q)}\nStudent chose: {chosen}\n"
            f"Time taken: {round((time_taken_ms or 0) / 1000)} seconds\n\n"
            "Classify the most likely reason for the wrong answer as exactly one of:\n"
            "careless_slip (right method, arithmetic/reading slip; wrong option is a near-miss),\n"
            "conceptual_gap (wrong method or misunderstood concept),\n"
            "partial_method (right approach but stopped early or misapplied one step),\n"
            "no_attempt (a guess: implausible option chosen very quickly).\n"
            'Respond as JSON: {"type": "<one label>"}',
            as_json=True,
        )
        label = json.loads(raw).get("type")
        if label in MISCONCEPTIONS:
            return label
    except (AIUnavailable, ValueError, AttributeError):
        pass
    return heuristic_misconception(chosen, time_taken_ms)


def micro_lesson(q: Question, skill_name: str, misconception: str, learner: Learner) -> str:
    fallback = (
        f"Let's revisit this step by step. {q.explanation} "
        "Try the next question on the same idea to lock it in."
    )
    try:
        return _generate(
            f"{_question_block(q)}\nSkill: {skill_name}\nDiagnosed issue: {misconception}\n\n"
            f"In {_language(learner.locale)}, give a focused micro-lesson (max 120 words) that fixes this exact "
            "gap: state the core idea, walk through this question with it, and give one memory tip. "
            "Do not ask a follow-up question.",
            system=persona(learner),
        )
    except AIUnavailable:
        return fallback


def tutor_reply(
    history: list[tuple[str, str]], context: str | None, learner: Learner, worked_solution: str | None = None
) -> str:
    if not enabled():
        base = (
            f"I'm {learner.tutor_name or 'Asha'}, running in offline mode right now, so I can't hold a full "
            "conversation yet. Add a free Gemini API key to apps/api/.env to switch me on."
        )
        return f"{base}\n\nHere's the worked solution meanwhile:\n{worked_solution}" if worked_solution else base
    while history and history[0][0] != "student":
        history = history[1:]
    contents = [
        types.Content(role="user" if role == "student" else "model", parts=[types.Part(text=text)])
        for role, text in history
    ]
    language = _language(learner.locale)
    system = (
        f"{persona(learner)}\nReply in {language}. If the student's latest message is written in a language other "
        f"than {language} and English, reply in the student's language instead."
    )
    if context:
        system += f"\n\nThe student is asking about this problem:\n{context}"
    try:
        return _generate(contents, system=system)
    except AIUnavailable:
        return "I couldn't reach the AI service just now (the free quota may be used up). Please try again in a minute."


def generate_question(subtopic: str, skill: str, difficulty: int, examples: list[Question]) -> dict | None:
    sample = "\n\n".join(_question_block(e) for e in examples[:2])
    try:
        raw = _generate(
            f"Write ONE new multiple-choice aptitude question.\nSubtopic: {subtopic}\nSkill: {skill}\n"
            f"Difficulty: {difficulty} on a 1-5 scale\n\nStyle examples:\n{sample}\n\n"
            "Rules: exactly 4 distinct options; exactly one correct; distractors should reflect common "
            "mistakes; verify the arithmetic before answering; explanation in numbered steps.\n"
            'Respond as JSON: {"body": str, "options": [str, str, str, str], "correct_option": str, '
            '"explanation": str}',
            as_json=True,
        )
        data = json.loads(raw)
    except (AIUnavailable, ValueError):
        return None
    options = data.get("options")
    if (
        not isinstance(options, list)
        or len(options) != 4
        or len(set(options)) != 4
        or data.get("correct_option") not in options
        or not data.get("body")
        or not data.get("explanation")
    ):
        return None
    return {k: data[k] for k in ("body", "options", "correct_option", "explanation")}


def ocr_question(image: bytes, mime_type: str) -> str:
    text = _generate(
        [
            types.Part.from_bytes(data=image, mime_type=mime_type),
            "Transcribe the aptitude question in this image exactly, including all answer options. "
            "Output only the transcribed question text. If there is no question in the image, output NONE.",
        ]
    ).strip()
    if text.upper() == "NONE":
        raise ValueError("No question found in the image.")
    return text
