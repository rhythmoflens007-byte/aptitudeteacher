import random
import re

import pytest
from sqlalchemy import select

from app import content_i18n as ci
from app.db.models import Question
from app.db.session import SessionLocal
from app.question_templates import TEMPLATES, by_name, generate
from app.seed import link_templates

LANGS = ci.LANGUAGES
DIGITS = re.compile(r"\d+")


@pytest.mark.parametrize("lang", LANGS)
def test_every_template_renders_fully_in_each_language(lang):
    for tpl in TEMPLATES:
        for k in range(12):
            with ci.language(lang) as missing:
                tpl.make(random.Random(f"{tpl.name}:{k}"))
            assert not missing, f"{tpl.name} has untranslated text in {lang}: {sorted(missing)[:2]}"


@pytest.mark.parametrize("lang", LANGS)
def test_translation_keeps_numbers_options_and_answer(lang):
    for tpl in TEMPLATES:
        seed = f"{tpl.name}:numbers"
        with ci.language("en"):
            en = tpl.make(random.Random(seed))
        with ci.language(lang):
            shown = tpl.make(random.Random(seed))
        assert len(shown["options"]) == 4
        assert en["options"].index(en["correct_option"]) == shown["options"].index(shown["correct_option"])
        # Every number in the English question must still be there (words around it may move).
        assert sorted(DIGITS.findall(en["body"])) == sorted(DIGITS.findall(shown["body"])), tpl.name


def test_english_is_untouched_by_the_translation_layer():
    tpl = by_name("percent_of")
    with ci.language("en"):
        q = tpl.make(random.Random("x"))
    assert q["body"].startswith("What is ") and q["body"].endswith("?")
    assert not re.search(r"[ऀ-౿]", q["body"] + q["explanation"])


def test_hindi_agrees_with_gender():
    # "की बेटी" and "का बेटा": the possessive follows the relation word's gender.
    seen = set()
    tpl = by_name("child_of_mothers_brother")
    for k in range(30):
        with ci.language("hi"):
            body = tpl.make(random.Random(k))["body"]
        seen.update(re.findall(r"(का बेटा|की बेटी|का बेटी|की बेटा)", body))
    assert seen <= {"का बेटा", "की बेटी"} and seen


def test_generated_questions_remember_their_seed():
    made, _ = generate("Percentages", "Percentage change", 2, set(), random.Random(3))
    assert made["template"] and made["variant"]
    with ci.language("hi"):
        again = by_name(made["template"]).make(ci.template_rng(made["template"], made["variant"]))
    with ci.language("en"):
        english = by_name(made["template"]).make(ci.template_rng(made["template"], made["variant"]))
    assert english["body"] == made["body"]
    assert again["body"] != made["body"]


def test_seeded_questions_are_linked_and_localized(client):
    with SessionLocal() as db:
        link_templates(db)
        templated = db.scalars(select(Question).where(Question.source == "template")).all()
        assert templated and all(q.template and q.variant for q in templated)
        shown = ci.localize(templated[0], "ta")
        assert shown and shown["body"] != templated[0].body
        assert set(shown["labels"]) == set(templated[0].options)


def test_written_and_verbal_questions(client):
    with SessionLocal() as db:
        quant = db.scalar(select(Question).where(Question.body.like("The price of a bag rises from ₹400%")))
        verbal = db.scalar(select(Question).where(Question.body.like("PEN is to WRITE%")))
    shown = ci.localize(quant, "hi")
    assert shown["body"].startswith("एक बैग की कीमत")
    kept = ci.localize(verbal, "te")
    assert kept["body"] == verbal.body and kept["labels"] == {}
    assert kept["explanation"] != verbal.explanation


def test_practice_shows_translated_question_and_grades_english_answer(client, user):
    assert client.patch("/auth/me", headers=user, json={"locale": "hi"}).status_code == 200
    with SessionLocal() as db:
        q = db.scalars(select(Question).where(Question.source == "template")).first()
        qid, correct = q.id, q.correct_option
    out = client.get(f"/questions/{qid}", headers=user).json()
    assert re.search(r"[ऀ-ॿ]", out["body"])
    assert correct in out["options"] and out["labels"][correct]
    res = client.post("/attempts", headers=user, json={"question_id": qid, "chosen_answer": correct, "time_taken_ms": 30000})
    body = res.json()
    assert body["is_correct"] is True and body["correct_option"] == correct
    assert re.search(r"[ऀ-ॿ]", body["explanation"])
