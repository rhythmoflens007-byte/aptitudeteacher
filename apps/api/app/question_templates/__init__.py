"""Question templates: each one writes a fresh, correct question from random numbers.

Answers are computed, never typed, and wrong options come from the mistakes students actually make.
"""

import random

from app.question_templates import logical, quant  # noqa: F401  (importing registers every template)
from app.question_templates.core import TEMPLATES, Template

__all__ = ["TEMPLATES", "Template", "for_skill", "generate"]


def for_skill(subtopic: str, skill: str) -> list[Template]:
    return [t for t in TEMPLATES if t.subtopic == subtopic and t.skill == skill]


def generate(subtopic: str, skill: str, difficulty: int, avoid: set[str], rng: random.Random | None = None) -> tuple[dict, int] | None:
    """A new question for the skill, close to `difficulty`, whose text isn't in `avoid`."""
    rng = rng or random.Random()
    choices = for_skill(subtopic, skill)
    if not choices:
        return None
    best = min(abs(t.difficulty - difficulty) for t in choices)
    closest = [t for t in choices if abs(t.difficulty - difficulty) == best]
    for attempt in range(60):
        # Mostly the nearest difficulty, sometimes any template so a skill doesn't run dry.
        chosen = rng.choice(closest if attempt < 30 and rng.random() < 0.8 else choices)
        question = chosen.make(rng)
        if question["body"] not in avoid:
            return question, chosen.difficulty
    return None
