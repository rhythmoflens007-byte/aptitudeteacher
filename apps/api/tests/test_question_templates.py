import random

import pytest

from app.question_templates import TEMPLATES, for_skill, generate
from app.seed_data import CURRICULUM

RUNS = 300
SKILLS = {(subtopic, skill) for subtopics in CURRICULUM.values() for subtopic, skills in subtopics.items() for skill in skills}


def test_templates_cover_quant_and_logical():
    assert len(TEMPLATES) >= 80
    covered = {(t.subtopic, t.skill) for t in TEMPLATES}
    for (topic, _), subtopics in CURRICULUM.items():
        if topic == "Verbal Ability":
            continue
        for subtopic, skills in subtopics.items():
            for skill in skills:
                if subtopic in ("Syllogisms", "Statements and Conclusions"):
                    continue
                assert (subtopic, skill) in covered, f"no template for {subtopic} / {skill}"


@pytest.mark.parametrize("tpl", TEMPLATES, ids=lambda t: t.name)
def test_template_always_makes_a_valid_question(tpl):
    assert (tpl.subtopic, tpl.skill) in SKILLS, f"{tpl.name} points at a skill that doesn't exist"
    assert tpl.difficulty in range(1, 6)
    bodies = set()
    for seed in range(RUNS):
        q = tpl.make(random.Random(seed))
        where = f"{tpl.name} seed {seed}: {q['body']}"
        assert q["body"].strip(), where
        assert len(q["options"]) == 4, where
        assert len(set(q["options"])) == 4, f"duplicate options {q['options']} in {where}"
        assert q["correct_option"] in q["options"], where
        assert all(o.strip() for o in q["options"]), where
        assert len(q["explanation"].strip()) >= 20, where
        assert "nan" not in q["body"].lower().split() and "-0" not in q["options"], where
        bodies.add(q["body"])
    assert len(bodies) >= 6, f"{tpl.name} produces too few distinct questions ({len(bodies)})"


def test_generate_avoids_questions_already_seen():
    subtopic, skill = "Percentages", "Percentage change"
    seen: set[str] = set()
    rng = random.Random(1)
    for _ in range(25):
        made = generate(subtopic, skill, 2, seen, rng)
        assert made is not None
        question, difficulty = made
        assert question["body"] not in seen
        assert difficulty in range(1, 6)
        seen.add(question["body"])


def test_generate_prefers_the_target_difficulty():
    rng = random.Random(3)
    picked = [generate("Number Series", "Finding the series pattern", 1, set(), rng)[1] for _ in range(40)]
    assert picked.count(1) > len(picked) / 2


def test_no_template_for_a_skill_returns_none():
    assert for_skill("Synonyms and Antonyms", "Synonyms") == []
    assert generate("Synonyms and Antonyms", "Synonyms", 2, set()) is None
