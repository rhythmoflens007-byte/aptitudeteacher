from datetime import date, timedelta

from sqlalchemy import select

from app.db.models import Question, Skill
from app.db.session import SessionLocal


def answer(client, user, question_id, right=True):
    q = client.get(f"/questions/{question_id}", headers=user).json()
    with SessionLocal() as db:
        correct = db.get(Question, question_id).correct_option
    chosen = correct if right else next(o for o in q["options"] if o != correct)
    return client.post("/attempts", headers=user, json={"question_id": question_id, "chosen_answer": chosen, "time_taken_ms": 30000})


def test_plan_covers_a_week_and_ends_with_a_mock(client, user):
    days = client.get("/progress/plan", headers=user).json()["days"]
    assert len(days) == 7
    assert days[0]["date"] == date.today().isoformat()
    assert days[-1]["date"] == (date.today() + timedelta(days=6)).isoformat()
    assert days[-1]["mock"] and not any(d["mock"] for d in days[:-1])
    assert all(d["items"] for d in days)
    first = days[0]["items"][0]
    assert {"skill_id", "skill", "topic", "topic_id", "mastery", "kind"} <= set(first)


def test_plan_puts_a_weak_skill_first(client, user):
    with SessionLocal() as db:
        skill = db.scalars(select(Skill)).first()
        skill_id = skill.id
    q = client.get(f"/questions/next?skill_id={skill_id}", headers=user).json()
    assert q["reason"] == "plan" and skill.name in q["question"]["skills"]
    assert answer(client, user, q["question"]["id"], right=False).status_code == 200
    days = client.get("/progress/plan", headers=user).json()["days"]
    assert days[0]["items"][0]["skill_id"] == skill_id


def test_unknown_skill_is_a_404(client, user):
    assert client.get("/questions/next?skill_id=nope", headers=user).status_code == 404
