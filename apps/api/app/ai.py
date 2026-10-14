import json
import logging
import re
import time
from functools import lru_cache
from collections.abc import Callable, Iterator
from typing import Protocol

from google import genai
from google.genai import types

from app import offline_tutor
from app.config import get_settings
from app.db.models import Question

log = logging.getLogger("ai")

LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
}
MISCONCEPTIONS = ("careless_slip", "conceptual_gap", "partial_method", "no_attempt")
RETRY_PAUSES = (1.5,)
# A daily free-tier limit resets once a day; checking back hourly costs one request.
QUOTA_REST_SECONDS = 60 * 60
MINUTE_REST_SECONDS = 60
_resting_until: dict[str, float] = {}


class Learner(Protocol):
    locale: str
    tutor_name: str
    tutor_gender: str


def persona(learner: Learner) -> str:
    name = learner.tutor_name or "Asha"
    woman = (learner.tutor_gender or "female") == "female"
    return (
        f"You are {name}, a playful, upbeat {'woman' if woman else 'man'} who teaches aptitude to students "
        "preparing for placement and competitive exams (Quantitative Aptitude, Logical Reasoning, Verbal Ability). "
        "Your style is fun and witty: friendly energy, light humour and vivid everyday analogies, and you "
        "celebrate wins. When a student is wrong you stay kind and encouraging, and you never mock them. "
        "Being playful never costs accuracy. "
        "Teach, don't just answer: find what the student doesn't understand, explain the underlying "
        "concept in small numbered steps, show shortcuts where they exist, and end with one short "
        "check-for-understanding question. Keep replies under 180 words. Use plain text, no markdown "
        "tables. Your replies may be read aloud, so avoid symbols that sound odd when spoken. "
        f"In Hindi and Telugu, use {'feminine' if woman else 'masculine'} grammatical forms when referring to yourself."
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
    # The free tier sometimes answers "busy" (503): retry briefly, then hand over to the next model.
    # A 429 means that model's quota is used up, so retrying is pointless: rest it and move on.
    now = time.monotonic()
    models = [m for m in get_settings().gemini_models() if _resting_until.get(m, 0) <= now]
    if not models:
        raise AIUnavailable("Every Gemini model is out of free quota for now")
    response = None
    last_error: Exception | None = None
    for model in models:
        for pause in RETRY_PAUSES + (None,):
            try:
                response = _client().models.generate_content(model=model, contents=contents, config=config)
                break
            except Exception as exc:
                last_error = exc
                code = getattr(exc, "code", None)
                if code == 429 or "RESOURCE_EXHAUSTED" in str(exc):
                    rest = QUOTA_REST_SECONDS if "PerDay" in str(exc) else MINUTE_REST_SECONDS
                    _resting_until[model] = time.monotonic() + rest
                    log.info("%s is out of quota, resting it for %ds", model, rest)
                    break
                if not (code in (500, 503) or "UNAVAILABLE" in str(exc)):
                    log.warning("Gemini call failed: %s", exc)
                    raise AIUnavailable(str(exc)) from exc
                if pause is None:
                    log.info("%s is busy, trying the next model", model)
                    break
                log.info("%s is busy, retrying in %.1fs", model, pause)
                time.sleep(pause)
        if response is not None:
            break
    if response is None:
        log.warning("Gemini call failed on every model: %s", last_error)
        raise AIUnavailable(str(last_error)) from last_error
    if not response.text:
        raise AIUnavailable("Empty response from Gemini")
    return response.text


def _transient(exc: Exception) -> bool:
    code = getattr(exc, "code", None)
    return code in (500, 503) or "UNAVAILABLE" in str(exc)


def _rest_if_out_of_quota(model: str, exc: Exception) -> bool:
    if getattr(exc, "code", None) == 429 or "RESOURCE_EXHAUSTED" in str(exc):
        rest = QUOTA_REST_SECONDS if "PerDay" in str(exc) else MINUTE_REST_SECONDS
        _resting_until[model] = time.monotonic() + rest
        log.info("%s is out of quota, resting it for %ds", model, rest)
        return True
    return False


def _generate_stream(contents, system: str | None = None) -> Iterator[str]:
    """Yields the reply as it is written. Falls back to the next model only before any text has
    arrived; a failure mid-reply raises AIUnavailable so the caller can keep what it already has."""
    if not enabled():
        raise AIUnavailable("GEMINI_API_KEY is not set")
    config = types.GenerateContentConfig(system_instruction=system, temperature=0.4)
    now = time.monotonic()
    models = [m for m in get_settings().gemini_models() if _resting_until.get(m, 0) <= now]
    if not models:
        raise AIUnavailable("Every Gemini model is out of free quota for now")
    last_error: Exception | None = None
    for model in models:
        started = False
        try:
            for chunk in _client().models.generate_content_stream(model=model, contents=contents, config=config):
                text = chunk.text or ""
                if text:
                    started = True
                    yield text
            if started:
                return
            last_error = AIUnavailable("Empty response from Gemini")
        except Exception as exc:
            if started:
                log.warning("Gemini stream broke off: %s", exc)
                raise AIUnavailable(str(exc)) from exc
            last_error = exc
            if _rest_if_out_of_quota(model, exc) or _transient(exc):
                log.info("%s unavailable for streaming, trying the next model", model)
                continue
            log.warning("Gemini stream failed: %s", exc)
            raise AIUnavailable(str(exc)) from exc
    raise AIUnavailable(str(last_error))


_SENTENCE_END = re.compile(r"[.!?।॥]+[\"')\]]*(?:[ \t]+|\n+)|\n+")


class SentenceSplitter:
    """Cuts streamed text into whole sentences, keeping step numbers like '1.' with their step."""

    def __init__(self) -> None:
        self.buffer = ""

    def feed(self, text: str) -> list[str]:
        self.buffer += text
        sentences: list[str] = []
        start = 0
        for match in _SENTENCE_END.finditer(self.buffer):
            piece = self.buffer[start : match.end()]
            core = _EMOTION_TAG.sub("", piece).strip()
            if re.fullmatch(r"\d+[.)]?", core):
                continue
            sentences.append(piece)
            start = match.end()
        self.buffer = self.buffer[start:]
        return sentences

    def flush(self) -> list[str]:
        rest, self.buffer = self.buffer, ""
        return [rest] if rest.strip() else []


def _tagged(piece: str) -> tuple[str, str | None]:
    """'[excited] Great!\n' -> ('Great!\n', 'excited'), keeping the trailing spacing."""
    tags = [m.lower() for m in _EMOTION_TAG.findall(piece)]
    text = _EMOTION_TAG.sub("", piece)
    return text.lstrip(" \t") if tags else text, tags[0] if tags else None


def _language(locale: str) -> str:
    return LANGUAGES.get(locale, "English")


def _write_in(locale: str) -> str:
    """Instruction to write in a language using its own script, not romanised letters."""
    language = _language(locale)
    # Without this the "read aloud" persona makes the model spell numbers out as words.
    digits = "Keep all numbers as the digits 0-9 so they match the question."
    if language == "English":
        return f"Write in {language}. {digits}"
    return f"Write in {language} using the {language} script itself, never transliterated into Latin letters. {digits}"


NO_GREETING = "Do not greet the student or introduce yourself; start directly with the explanation."


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
            "Rewrite the reference explanation as clear numbered steps. "
            f"{_write_in(locale)} Keep numbers and option text unchanged. {NO_GREETING} "
            "Do not ask a follow-up question.",
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


RETEACH = ("conceptual_gap", "partial_method")


FALLBACK_LESSON = {
    "en": "Let's revisit this step by step. {solution} Try the next question on the same idea to lock it in.",
    "hi": "चलिए इसे कदम-दर-कदम फिर से देखते हैं। {solution} इसी विचार पर अगला सवाल हल करके इसे पक्का कीजिए।",
    "ta": "இதைப் படிப்படியாக மீண்டும் பார்ப்போம். {solution} இதே கருத்தில் அடுத்த கேள்வியை முயற்சி செய்து இதை உறுதியாக்குங்கள்.",
    "te": "దీన్ని దశలవారీగా మళ్ళీ చూద్దాం. {solution} ఇదే ఆలోచనపై తదుపరి ప్రశ్నను ప్రయత్నించి దీన్ని గట్టిగా గుర్తుంచుకోండి.",
}


def diagnose(
    q: Question,
    chosen: str | None,
    time_taken_ms: int | None,
    skill_name: str,
    learner: Learner,
    solution: Callable[[], str] | None = None,
) -> tuple[str, str | None]:
    """Classifies why an answer was wrong and, for real gaps, writes the micro-lesson in the same AI call.

    `solution` returns the explanation in the learner's language; the offline lesson is built from it
    so a Tamil student never gets an English fallback.
    """
    if not chosen:
        return "no_attempt", None

    def fallback_lesson() -> str:
        template = FALLBACK_LESSON.get(learner.locale, FALLBACK_LESSON["en"])
        return template.format(solution=solution() if solution else q.explanation)

    try:
        raw = _generate(
            f"{_question_block(q)}\nSkill: {skill_name}\nStudent chose: {chosen}\n"
            f"Time taken: {round((time_taken_ms or 0) / 1000)} seconds\n\n"
            "1. Classify the most likely reason for the wrong answer as exactly one of:\n"
            "careless_slip (right method, arithmetic/reading slip; wrong option is a near-miss),\n"
            "conceptual_gap (wrong method or misunderstood concept),\n"
            "partial_method (right approach but stopped early or misapplied one step),\n"
            "no_attempt (a guess: implausible option chosen very quickly).\n"
            "2. Only if the type is conceptual_gap or partial_method, write a focused micro-lesson (max 120 words) "
            "that fixes this exact gap: state the core idea, walk through this question with it, and give one "
            f"memory tip. {_write_in(learner.locale)} {NO_GREETING} Do not ask a follow-up question. "
            "Otherwise leave the lesson empty.\n"
            'Respond as JSON: {"type": "<one label>", "lesson": "<micro-lesson or empty string>"}',
            system=persona(learner),
            as_json=True,
        )
        data = json.loads(raw)
        label = data.get("type")
        if label in MISCONCEPTIONS:
            lesson = str(data.get("lesson") or "").strip()
            if label not in RETEACH:
                return label, None
            return label, lesson or fallback_lesson()
    except (AIUnavailable, ValueError, AttributeError):
        pass
    label = heuristic_misconception(chosen, time_taken_ms)
    return label, fallback_lesson() if label in RETEACH else None


BUSY_REPLY = {
    "en": "I couldn't reach the AI service just now (it may be busy, or the free daily limit may be used up). Please try again in a minute.",
    "hi": "अभी AI सेवा से संपर्क नहीं हो पाया (वह व्यस्त हो सकती है, या आज की मुफ़्त सीमा खत्म हो गई है)। कृपया एक मिनट बाद फिर से कोशिश करें।",
    "ta": "இப்போது AI சேவையை அணுக முடியவில்லை (அது பிஸியாக இருக்கலாம், அல்லது இன்றைய இலவச வரம்பு முடிந்திருக்கலாம்). ஒரு நிமிடம் கழித்து மீண்டும் முயற்சிக்கவும்.",
    "te": "ప్రస్తుతం AI సేవ అందుబాటులో లేదు (అది బిజీగా ఉండవచ్చు, లేదా ఈ రోజు ఉచిత పరిమితి ముగిసి ఉండవచ్చు). దయచేసి ఒక నిమిషం తర్వాత మళ్ళీ ప్రయత్నించండి.",
}

EMOTIONS = ("excited", "proud", "encouraging", "curious", "careful", "empathetic", "playful", "thinking", "neutral")
_EMOTION_TAG = re.compile(r"\[(" + "|".join(EMOTIONS) + r")\]\s*", re.IGNORECASE)


def split_emotions(text: str) -> tuple[str, list[str]]:
    """Removes the [emotion] tags the tutor puts before each sentence, returning clean text and the tags in order."""
    emotions = [match.lower() for match in _EMOTION_TAG.findall(text)]
    clean = _EMOTION_TAG.sub("", text)
    clean = re.sub(r"[ \t]+\n", "\n", clean).strip()
    return clean, emotions


def _tutor_prompt(history: list[tuple[str, str]], context: str | None, learner: Learner):
    while history and history[0][0] != "student":
        history = history[1:]
    contents = [
        types.Content(role="user" if role == "student" else "model", parts=[types.Part(text=text)])
        for role, text in history
    ]
    language = _language(learner.locale)
    system = (
        f"{persona(learner)}\nReply in {language}. {_write_in(learner.locale)} If the student's latest message is "
        f"written in a language other than {language} and English, reply in the student's language instead. "
        "Only introduce yourself in your first reply of a conversation.\n"
        "Put an emotion tag in square brackets at the start of EVERY sentence, describing how you say it. "
        f"Use only these tags: {', '.join(f'[{e}]' for e in EMOTIONS)}. "
        "Example: [excited] Great question! [thinking] Let's see how the speeds combine."
    )
    if context:
        system += f"\n\nThe student is asking about this problem:\n{context}"
    return contents, system


def tutor_reply(
    history: list[tuple[str, str]], context: str | None, learner: Learner, offline: offline_tutor.Help | None = None
) -> tuple[str, list[str]]:
    """Returns the tutor's reply and one emotion per sentence, which drives the avatar's body language.
    Without the AI, the offline tutor teaches from `offline` (the question's translated solution)."""
    if not enabled():
        return split_emotions(offline_tutor.reply(learner, history, offline))
    contents, system = _tutor_prompt(history, context, learner)
    try:
        return split_emotions(_generate(contents, system=system))
    except AIUnavailable:
        return BUSY_REPLY.get(learner.locale, BUSY_REPLY["en"]), ["empathetic"]


def tutor_reply_stream(
    history: list[tuple[str, str]], context: str | None, learner: Learner, offline: offline_tutor.Help | None = None
) -> Iterator[tuple[str, str | None]]:
    """Yields (sentence, emotion) as soon as each sentence is written, so the tutor can start
    talking within a second or two instead of after the whole reply."""
    splitter = SentenceSplitter()
    if not enabled():
        for piece in splitter.feed(offline_tutor.reply(learner, history, offline)) + splitter.flush():
            yield _tagged(piece)
        return
    contents, system = _tutor_prompt(history, context, learner)
    sent_any = False
    try:
        for chunk in _generate_stream(contents, system=system):
            for piece in splitter.feed(chunk):
                sent_any = True
                yield _tagged(piece)
    except AIUnavailable:
        if not sent_any and not splitter.buffer.strip():
            yield BUSY_REPLY.get(learner.locale, BUSY_REPLY["en"]), "empathetic"
            return
    for piece in splitter.flush():
        yield _tagged(piece)


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
