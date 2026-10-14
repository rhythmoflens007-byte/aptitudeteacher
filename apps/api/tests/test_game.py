import itertools
from datetime import timedelta

from sqlalchemy import select

from app.db.models import Gamification, LeagueState, Question, User, XpEvent, utcnow
from app.db.session import SessionLocal
from app.engine import game

_n = itertools.count()


def register(client, name="Learner"):
    res = client.post("/auth/register", json={"email": f"gamer{next(_n)}@example.com", "password": "password123", "display_name": name})
    assert res.status_code == 201
    return {"Authorization": f"Bearer {res.json()['token']}"}, res.json()["user"]["id"]


def correct_answer(question_id):
    with SessionLocal() as db:
        return db.get(Question, question_id).correct_option


def wrong_answer(question):
    right = correct_answer(question["id"])
    return next(o for o in question["options"] if o != right)


def first_lesson(client, headers, slug="quantitative"):
    course = client.get("/learn/course", headers=headers).json()
    section = next(s for s in course["sections"] if s["slug"] == slug)
    return section, section["units"][0]["lessons"]


def play(client, headers, key, wrong=0):
    start = client.post("/learn/lessons/start", headers=headers, json={"key": key})
    assert start.status_code == 200, start.text
    data = start.json()
    for i, q in enumerate(data["questions"]):
        answer = wrong_answer(q) if i < wrong else correct_answer(q["id"])
        res = client.post("/attempts", headers=headers, json={"question_id": q["id"], "chosen_answer": answer, "time_taken_ms": 20000, "lesson_run_id": data["run_id"]})
        assert res.status_code == 200, res.text
    return data, client.post(f"/learn/runs/{data['run_id']}/finish", headers=headers).json()


def test_course_has_three_sections_with_ordered_lessons(client):
    headers, _ = register(client)
    course = client.get("/learn/course", headers=headers).json()
    assert [s["slug"] for s in course["sections"]] == ["quantitative", "logical-reasoning", "verbal"]
    for section in course["sections"]:
        lessons = [lesson for unit in section["units"] for lesson in unit["lessons"]]
        assert lessons[0]["state"] == "current"
        assert all(lesson["state"] == "locked" for lesson in lessons[1:])
        for unit in section["units"]:
            assert unit["lessons"][-1]["kind"] == "checkpoint"
            assert [lesson["level"] for lesson in unit["lessons"][:3]] == [1, 2, 3]
    assert course["hearts"] == 5


def test_locked_lessons_cannot_start(client):
    headers, _ = register(client)
    _, lessons = first_lesson(client, headers)
    assert client.post("/learn/lessons/start", headers=headers, json={"key": lessons[1]["key"]}).status_code == 403
    assert client.post("/learn/lessons/start", headers=headers, json={"key": "skill:nope:1"}).status_code == 404


def test_perfect_lesson_gives_three_stars_xp_and_unlocks_the_next(client):
    headers, _ = register(client)
    _, lessons = first_lesson(client, headers)
    data, summary = play(client, headers, lessons[0]["key"])
    assert len(data["questions"]) == 8
    assert summary["completed"] and summary["stars"] == 3 and summary["accuracy"] == 100
    assert summary["xp"] > 8 * 10 and summary["next_key"] == lessons[1]["key"]
    assert any(b["code"] == "first_lesson" for b in summary["new_badges"])
    _, again = first_lesson(client, headers)
    assert again[0]["state"] == "done" and again[0]["stars"] == 3 and again[1]["state"] == "current"
    # Finishing twice changes nothing.
    assert client.post(f"/learn/runs/{data['run_id']}/finish", headers=headers).json()["xp"] == summary["xp"]


def test_wrong_answers_cost_hearts_and_practice_earns_them_back(client):
    headers, _ = register(client)
    _, lessons = first_lesson(client, headers)
    _, summary = play(client, headers, lessons[0]["key"], wrong=3)
    assert summary["hearts"] == 2 and summary["stars"] == 1
    practice = client.get("/questions/next", headers=headers).json()["question"]
    res = client.post("/attempts", headers=headers, json={"question_id": practice["id"], "chosen_answer": correct_answer(practice["id"])}).json()
    assert res["hearts"] == 3


def test_out_of_hearts_blocks_lessons_until_they_refill(client):
    headers, uid = register(client)
    _, lessons = first_lesson(client, headers)
    with SessionLocal() as db:
        g = db.get(Gamification, uid)
        g.hearts, g.hearts_refill_from = 0, utcnow()
        db.commit()
    assert client.post("/learn/lessons/start", headers=headers, json={"key": lessons[0]["key"]}).status_code == 409
    with SessionLocal() as db:
        db.get(Gamification, uid).hearts_refill_from = utcnow() - game.HEART_REFILL * 2 - timedelta(minutes=1)
        db.commit()
    status = client.get("/game/status", headers=headers).json()
    assert status["hearts"] == 2 and status["next_heart_at"]
    assert client.post("/learn/lessons/start", headers=headers, json={"key": lessons[0]["key"]}).status_code == 200


def test_unfinished_lesson_does_not_count(client):
    headers, _ = register(client)
    _, lessons = first_lesson(client, headers)
    data = client.post("/learn/lessons/start", headers=headers, json={"key": lessons[0]["key"]}).json()
    summary = client.post(f"/learn/runs/{data['run_id']}/finish", headers=headers).json()
    assert not summary["completed"] and summary["next_key"] is None
    _, again = first_lesson(client, headers)
    assert again[0]["state"] == "current"
    # Answers can't be sent to a lesson that has ended.
    q = data["questions"][0]
    late = client.post("/attempts", headers=headers, json={"question_id": q["id"], "chosen_answer": "x", "lesson_run_id": data["run_id"]})
    assert late.status_code == 409


def test_daily_quests_track_progress_and_pay_once(client):
    headers, uid = register(client)
    quests = client.get("/game/quests", headers=headers).json()
    assert len(quests) == 3 and len({q["code"] for q in quests}) == 3
    _, lessons = first_lesson(client, headers)
    play(client, headers, lessons[0]["key"])
    play(client, headers, lessons[1]["key"])
    quests = client.get("/game/quests", headers=headers).json()
    done = [q for q in quests if q["done"]]
    assert done, quests
    xp_before = client.get("/game/status", headers=headers).json()["xp"]
    claimed = client.post(f"/game/quests/{done[0]['code']}/claim", headers=headers)
    assert claimed.status_code == 200 and claimed.json()["xp"] == xp_before + game.QUEST_REWARD
    assert client.post(f"/game/quests/{done[0]['code']}/claim", headers=headers).status_code == 409
    assert client.post("/game/quests/not-a-quest/claim", headers=headers).status_code == 409


def test_quests_are_the_same_all_day_and_change_by_day():
    day = game.today()
    assert game.quests_for("u1", day) == game.quests_for("u1", day)
    assert any(game.quests_for("u1", day + timedelta(days=d)) != game.quests_for("u1", day) for d in range(1, 6))


def test_league_ranks_this_weeks_xp_and_settles_weekly(client):
    players = [register(client, f"Racer {i}") for i in range(4)]
    with SessionLocal() as db:
        ids = [uid for _, uid in players]
        for g in db.scalars(select(Gamification).where(Gamification.user_id.in_(ids))).all():
            g.league_tier = 3  # a quiet league just for this test
        last_week = utcnow() - timedelta(days=7)
        for points, uid in zip([400, 300, 200, 100], ids):
            db.add(XpEvent(user_id=uid, amount=points, source="test", created_at=last_week))
        db.add(XpEvent(user_id=ids[3], amount=50, source="test", created_at=utcnow()))
        state = db.get(LeagueState, 1) or LeagueState(id=1, week_start=game.week_start(game.today()))
        state.week_start = game.week_start(game.today()) - timedelta(days=7)
        db.merge(state)
        db.commit()
    board = client.get("/game/league", headers=players[3][0]).json()
    with SessionLocal() as db:
        tiers = [db.get(Gamification, uid).league_tier for uid in ids]
    assert tiers == [4, 4, 4, 3]  # top three of last week moved up to diamond
    assert board["league"] == "platinum" and board["members"][0]["me"] and board["members"][0]["xp"] == 50


def test_friends_by_code(client):
    alice, _ = register(client, "Alice")
    bob, bob_id = register(client, "Bob")
    bob_code = client.get("/game/friends", headers=bob).json()["my_code"]
    alice_code = client.get("/game/friends", headers=alice).json()["my_code"]
    assert len(bob_code) == 6 and bob_code != alice_code
    added = client.post("/game/friends", headers=alice, json={"code": bob_code.lower()})
    assert added.status_code == 201 and added.json()["name"] == "Bob"
    assert client.post("/game/friends", headers=alice, json={"code": bob_code}).status_code == 409
    assert client.post("/game/friends", headers=alice, json={"code": alice_code}).status_code == 400
    assert client.post("/game/friends", headers=alice, json={"code": "ZZZZZZ"}).status_code == 404
    names = [f["name"] for f in client.get("/game/friends", headers=alice).json()["friends"]]
    assert sorted(names) == ["Alice", "Bob"]
    assert client.delete(f"/game/friends/{bob_id}", headers=alice).status_code == 204
    assert [f["name"] for f in client.get("/game/friends", headers=alice).json()["friends"]] == ["Alice"]


def test_every_user_gets_a_friend_code(client):
    register(client)
    with SessionLocal() as db:
        assert not db.scalars(select(User).where(User.friend_code.is_(None))).all()
