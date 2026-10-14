"""Questions in the learner's language.

Questions are stored once, in English: that text is what answers are graded against and what keeps the
bank free of duplicates. Translations live in app/translations/<lang>.json as {english: translated}.
Template questions are re-created from their seed with every sentence passed through `T`, so the numbers
and the order of the options are exactly those of the stored English question. Hand-written questions are
looked up sentence by sentence. Anything without a complete translation is simply shown in English.
"""

import json
import random
from contextlib import contextmanager
from contextvars import ContextVar
from functools import lru_cache
from pathlib import Path

CATALOG_DIR = Path(__file__).parent / "translations"
LANGUAGES = ("hi", "ta", "te")

_lang: ContextVar[str] = ContextVar("question_lang", default="en")
_missing: ContextVar[set | None] = ContextVar("question_missing", default=None)


@lru_cache
def catalog(lang: str) -> dict[str, str]:
    path = CATALOG_DIR / f"{lang}.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


class Word(str):
    """A translated phrase that knows its grammar. Catalog values may be "text|gender|possessive|dative",
    e.g. "माँ|f" or "ரவி|m|ரவியின்|ரவிக்கு". Patterns pick forms with format specs: {x:का/की} gives the
    masculine or feminine form, {x:of} the possessive and {x:to} the dative ("to Ravi")."""

    gender: str
    possessive: str
    dative: str

    def __new__(cls, text: str, gender: str = "", possessive: str = "", dative: str = ""):
        word = super().__new__(cls, text)
        word.gender = gender
        word.possessive = possessive or text
        word.dative = dative or text
        return word

    @classmethod
    def parse(cls, raw: str) -> "Word":
        return cls(*raw.split("|", 3))

    def __format__(self, spec: str) -> str:
        if spec == "of":
            return self.possessive
        if spec == "to":
            return self.dative
        if "/" in spec:
            masculine, feminine = spec.split("/", 1)
            return feminine if self.gender == "f" else masculine
        return format(str(self), spec)


def _keeps_grammar(name: str):
    def method(self: Word, *args) -> Word:
        return Word(getattr(str, name)(self, *args), self.gender, self.possessive, self.dative)

    return method


# Templates lower-case or capitalise phrases; the result should still agree like the original.
for _name in ("lower", "upper", "capitalize", "title", "strip"):
    setattr(Word, _name, _keeps_grammar(_name))


def current() -> str:
    return _lang.get()


def L(text):
    """A whole known phrase (a name, a weekday, an option word) in the current language."""
    if not isinstance(text, str) or _lang.get() == "en":
        return text
    return catalog(_lang.get()).get(text, text).split("|")[0]


def T(pattern: str, /, **values) -> str:
    """str.format for question text: the pattern and any phrase-valued fields are translated."""
    lang = _lang.get()
    if lang == "en":
        return pattern.format(**values) if values else pattern
    table = catalog(lang)
    target = table.get(pattern)
    if target is None:
        missing = _missing.get()
        if missing is not None:
            missing.add(pattern)
        target = pattern
    if not values:
        # A single phrase keeps its grammar, so a later pattern can agree with it ({x:का/की}).
        return Word.parse(target)
    values = {k: _as_word(v, table) if isinstance(v, str) else v for k, v in values.items()}
    return target.format(**values)


def _as_word(value: str, table: dict[str, str]) -> "Word":
    if isinstance(value, Word):
        return value
    return Word.parse(table[value]) if value in table else Word(value)


@contextmanager
def language(lang: str):
    """Everything T and L produce inside the block is in `lang`; `missing` collects untranslated patterns."""
    missing: set[str] = set()
    token, token_missing = _lang.set(lang), _missing.set(missing)
    try:
        yield missing
    finally:
        _lang.reset(token)
        _missing.reset(token_missing)


def template_rng(template_name: str, variant: str) -> random.Random:
    """The random source a stored template question was made from. "s12" is the 13th question of the
    seeding run (seeded by the template's name); anything else is a seed of its own."""
    if variant.startswith("s") and variant[1:].isdigit():
        rng = random.Random(template_name)
        _replay(rng, template_name, int(variant[1:]))
        return rng
    return random.Random(variant)


def _replay(rng: random.Random, template_name: str, skip: int) -> None:
    from app.question_templates import by_name

    tpl = by_name(template_name)
    with language("en"):
        for _ in range(skip):
            tpl.make(rng)


@lru_cache(maxsize=4096)
def _render(template_name: str, variant: str, lang: str) -> dict | None:
    from app.question_templates import by_name

    tpl = by_name(template_name)
    if tpl is None:
        return None
    with language(lang) as missing:
        try:
            made = tpl.make(template_rng(template_name, variant))
        except Exception:
            return None
    return None if missing else made


def localize(q, lang: str) -> dict | None:
    """{"body", "labels" (english option -> shown option), "explanation"} or None to show English."""
    if lang == "en" or lang not in LANGUAGES:
        return None
    if getattr(q, "template", None) and getattr(q, "variant", None):
        return _localize_template(q, lang)
    return _localize_written(q, lang)


def _localize_template(q, lang: str) -> dict | None:
    english = _render(q.template, q.variant, "en")
    shown = _render(q.template, q.variant, lang)
    # Only trust a re-render that reproduces the stored question exactly; otherwise show English.
    if not english or not shown or english["body"] != q.body or english["options"] != list(q.options):
        return None
    if len(set(shown["options"])) != len(shown["options"]):
        return None
    return {
        "body": shown["body"],
        "labels": dict(zip(english["options"], shown["options"])),
        "explanation": shown["explanation"],
    }


def _localize_written(q, lang: str) -> dict | None:
    table = catalog(lang)
    body = table.get(q.body)
    if body is None:
        # Verbal questions test English, so only their explanation is translated.
        explanation = table.get(q.explanation)
        return {"body": q.body, "labels": {}, "explanation": explanation} if explanation else None
    labels = {o: table.get(o, o) for o in q.options}
    if len(set(labels.values())) != len(labels):
        labels = {o: o for o in q.options}
    return {"body": body, "labels": labels, "explanation": table.get(q.explanation, q.explanation)}
