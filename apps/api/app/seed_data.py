import json
from pathlib import Path

BANK_DIR = Path(__file__).parent / "question_bank"
TOPIC_ORDER = ["quantitative", "logical-reasoning", "verbal"]


def _load() -> dict:
    """topic -> subtopic -> skill -> [(difficulty, body, options, correct_option, explanation)]"""
    curriculum: dict = {}
    for slug in TOPIC_ORDER:
        data = json.loads((BANK_DIR / f"{slug}.json").read_text(encoding="utf-8"))
        curriculum[(data["topic"], data["slug"])] = {
            subtopic: {
                skill: [(q["difficulty"], q["question"], q["options"], q["answer"], q["explanation"]) for q in questions]
                for skill, questions in skills.items()
            }
            for subtopic, skills in data["subtopics"].items()
        }
    return curriculum


CURRICULUM = _load()
