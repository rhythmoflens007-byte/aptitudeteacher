import re
from types import SimpleNamespace

import pytest

from app import offline_tutor
from app.offline_tutor import PHRASES, TOPICS, Help

INDIC = re.compile(r"[ऀ-౿]")


def learner(locale="en", gender="female"):
    return SimpleNamespace(locale=locale, tutor_name="Asha", tutor_gender=gender)


def test_every_line_carries_an_emotion_tag():
    text = offline_tutor.reply(learner("ta"), [("student", "probability")])
    assert all(line.startswith("[") for line in text.splitlines())


@pytest.mark.parametrize("lang", ["en", "hi", "ta", "te"])
def test_each_language_has_every_phrase_and_topic(lang):
    assert set(PHRASES[lang]) == set(PHRASES["en"])
    for key, _, cards in TOPICS:
        assert lang in cards, key
        title, lines = cards[lang]
        assert title and len(lines) == 3


def test_introduces_itself_only_once():
    first = offline_tutor.reply(learner(), [("student", "hi")])
    later = offline_tutor.reply(learner(), [("student", "hi"), ("tutor", first), ("student", "ratio")])
    assert "I'm Asha" in first and "I'm Asha" not in later


@pytest.mark.parametrize(
    ("message", "topic"),
    [
        ("How do trains cross a platform?", "speed"),
        ("ब्याज कैसे निकालें", "interest"),
        ("சதவீதம் எப்படி?", "percent"),
        ("పాచికలు సంభావ్యత", "probability"),
        ("Frankly I am lost", None),
    ],
)
def test_recognises_the_topic_in_any_language(message, topic):
    assert offline_tutor.topic_for(message) == topic


def test_hint_answer_and_full_solution_in_the_learners_language():
    help = Help("1. पहला कदम।\n2. दूसरा कदम।", "25%")
    history = [("student", "hi"), ("tutor", "..."), ("student", "बस एक संकेत दीजिए")]
    hint = offline_tutor.reply(learner("hi"), history, help)
    assert "पहला कदम" in hint and "दूसरा कदम" not in hint
    answer = offline_tutor.reply(learner("hi"), history[:-1] + [("student", "उत्तर क्या है?")], help)
    assert "25%" in answer and "पहला कदम" not in answer
    full = offline_tutor.reply(learner("hi"), history[:-1] + [("student", "समझाइए")], help)
    assert "पहला कदम" in full and "दूसरा कदम" in full


def test_hindi_tutor_speaks_with_their_own_gender():
    assert "सिखा सकता" in offline_tutor.reply(learner("hi", "male"), [("student", "hi")])
    assert "सिखा सकती" in offline_tutor.reply(learner("hi", "female"), [("student", "hi")])


def test_question_tutor_session_is_taught_in_hindi(client, user):
    client.patch("/auth/me", headers=user, json={"locale": "hi"})
    q = client.get("/questions/next", headers=user).json()["question"]
    session = client.post("/tutor/sessions", headers=user, json={"question_id": q["id"]}).json()
    reply = client.post(f"/tutor/sessions/{session['id']}/messages", headers=user, json={"content": "समझाइए"}).json()
    assert INDIC.search(reply["content"])
    assert reply["emotions"] and "thinking" in reply["emotions"]
