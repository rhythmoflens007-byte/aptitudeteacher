def answer_wrong(client, headers, question, time_ms=45000):
    wrong = next(o for o in question["options"] if o != correct_answer(client, question["id"]))
    return client.post("/attempts", headers=headers, json={"question_id": question["id"], "chosen_answer": wrong, "time_taken_ms": time_ms})


def correct_answer(client, question_id):
    from app.db.models import Question
    from app.db.session import SessionLocal

    with SessionLocal() as db:
        return db.get(Question, question_id).correct_option


def test_reseeding_is_idempotent(client):
    from app.db.session import SessionLocal
    from app.seed import seed

    with SessionLocal() as db:
        assert seed(db) == 0


def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["ai_enabled"] is False


def test_register_login_and_profile(client):
    creds = {"email": "Asha.Test@Example.com", "password": "password123", "display_name": " Asha "}
    res = client.post("/auth/register", json=creds)
    assert res.status_code == 201
    assert res.json()["user"]["email"] == "asha.test@example.com"
    assert res.json()["user"]["display_name"] == "Asha"

    assert client.post("/auth/register", json=creds).status_code == 409
    assert client.post("/auth/login", json={**creds, "password": "wrong-password"}).status_code == 401

    token = client.post("/auth/login", json={"email": "asha.test@example.com", "password": "password123"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.patch("/auth/me", headers=headers, json={"locale": "ta"}).json()["locale"] == "ta"
    assert client.patch("/auth/me", headers=headers, json={"locale": "fr"}).status_code == 422


def test_protected_routes_require_a_valid_token(client):
    assert client.get("/progress/dashboard").status_code == 401
    assert client.get("/progress/dashboard", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_short_password_rejected(client):
    res = client.post("/auth/register", json={"email": "short@example.com", "password": "abc", "display_name": "x"})
    assert res.status_code == 422


def test_correct_answer_raises_mastery_and_awards_xp(client, user):
    q = client.get("/questions/next", headers=user).json()["question"]
    res = client.post(
        "/attempts",
        headers=user,
        json={"question_id": q["id"], "chosen_answer": correct_answer(client, q["id"]), "time_taken_ms": 30000},
    ).json()
    assert res["is_correct"] and res["misconception_type"] is None and res["retest_question_id"] is None
    assert res["xp_gained"] == 10 * q["difficulty"]
    assert res["mastery"][0]["score"] > 0
    assert [b["code"] for b in res["new_badges"]] == ["first_attempt"]


def test_concept_gap_teaches_then_retests_same_skill(client, user):
    q = client.get("/questions/next", headers=user).json()["question"]
    res = answer_wrong(client, user, q).json()
    assert res["misconception_type"] == "conceptual_gap"
    assert res["micro_lesson"]
    assert res["retest_question_id"] and res["retest_question_id"] != q["id"]

    nxt = client.get("/questions/next", headers=user).json()
    assert nxt["reason"] == "retest"
    assert nxt["question"]["skills"] == q["skills"]
    assert nxt["question"]["id"] != q["id"]

    retest = nxt["question"]
    client.post("/attempts", headers=user, json={"question_id": retest["id"], "chosen_answer": correct_answer(client, retest["id"]), "time_taken_ms": 30000})
    assert client.get("/questions/next", headers=user).json()["reason"] != "retest"


def test_careless_slip_does_not_force_a_retest(client, user):
    q = client.get("/questions/next", headers=user).json()["question"]
    res = answer_wrong(client, user, q, time_ms=12000).json()
    assert res["misconception_type"] == "careless_slip"
    assert res["retest_question_id"] is None
    assert client.get("/questions/next", headers=user).json()["reason"] != "retest"


def test_skip_is_recorded_as_no_attempt(client, user):
    q = client.get("/questions/next", headers=user).json()["question"]
    res = client.post("/attempts", headers=user, json={"question_id": q["id"], "chosen_answer": None}).json()
    assert not res["is_correct"] and res["misconception_type"] == "no_attempt"


def test_topic_filter_is_respected(client, user):
    topics = client.get("/topics", headers=user).json()
    verbal = next(t for t in topics if t["slug"] == "verbal")
    for _ in range(5):
        assert client.get(f"/questions/next?topic_id={verbal['id']}", headers=user).json()["question"]["topic"] == "Verbal Ability"


def test_quiz_scoring_report_and_double_submit(client, user):
    quiz = client.post("/quizzes", headers=user, json={"kind": "quiz", "count": 5}).json()
    assert len(quiz["questions"]) == 5 and quiz["duration_seconds"] == 300
    first = quiz["questions"][0]
    answers = [{"question_id": first["id"], "chosen_answer": correct_answer(client, first["id"]), "time_taken_ms": 20000}]

    report = client.post(f"/quizzes/{quiz['id']}/submit", headers=user, json={"answers": answers}).json()
    assert report["score"] == 1 and report["total"] == 5 and report["accuracy"] == 20
    assert sum(s["total"] for s in report["sections"]) == 5
    assert report["weak_skills"]
    assert client.post(f"/quizzes/{quiz['id']}/submit", headers=user, json={"answers": []}).status_code == 409
    assert client.get(f"/quizzes/{quiz['id']}/report", headers=user).json()["score"] == 1


def test_mock_covers_all_sections_and_grants_badge(client, user):
    mock = client.post("/quizzes", headers=user, json={"kind": "mock", "count": 15}).json()
    assert len(mock["questions"]) == 15
    assert {q["topic"] for q in mock["questions"]} == {"Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"}
    client.post(f"/quizzes/{mock['id']}/submit", headers=user, json={"answers": []})
    badges = client.get("/progress/dashboard", headers=user).json()["badges"]
    assert next(b for b in badges if b["code"] == "mock_finisher")["earned_at"]


def test_other_users_cannot_see_your_tests_or_chats(client, user):
    quiz = client.post("/quizzes", headers=user, json={"kind": "quiz", "count": 3}).json()
    session = client.post("/tutor/sessions", headers=user, json={}).json()
    other = client.post("/auth/register", json={"email": "intruder@example.com", "password": "password123", "display_name": "x"}).json()
    other_headers = {"Authorization": f"Bearer {other['token']}"}
    assert client.post(f"/quizzes/{quiz['id']}/submit", headers=other_headers, json={"answers": []}).status_code == 404
    assert client.get(f"/tutor/sessions/{session['id']}", headers=other_headers).status_code == 404


def test_daily_goal_and_dashboard(client, user):
    for _ in range(3):
        q = client.get("/questions/next", headers=user).json()["question"]
        client.post("/attempts", headers=user, json={"question_id": q["id"], "chosen_answer": correct_answer(client, q["id"]), "time_taken_ms": 25000})
    d = client.get("/progress/dashboard", headers=user).json()
    assert d["daily_goal"]["completed"] == 3 and d["daily_goal"]["target"] == 10
    assert len(d["daily_goal"]["skills"]) >= 3
    assert d["stats"]["attempts"] == 3 and d["stats"]["accuracy"] == 100
    assert d["trend"][-1]["attempts"] == 3
    assert d["gamification"]["streak_days"] == 1
    assert len(d["topics"]) == 3 and len(d["recent"]) == 3
    assert d["recent"][0]["created_at"].endswith("Z") or "+00:00" in d["recent"][0]["created_at"]


def test_offline_tutor_shows_worked_solution(client, user):
    q = client.get("/questions/next", headers=user).json()["question"]
    session = client.post("/tutor/sessions", headers=user, json={"question_id": q["id"]}).json()
    reply = client.post(f"/tutor/sessions/{session['id']}/messages", headers=user, json={"content": "help"}).json()
    assert "offline mode" in reply["content"]
    assert "Options:" not in reply["content"]
    listed = client.get("/tutor/sessions", headers=user).json()
    assert listed[0]["title"] == q["body"][:120]


def test_generate_and_ocr_need_the_ai(client, user):
    skill = client.get("/topics", headers=user).json()[0]["subtopics"][0]["skills"][0]
    assert client.post("/questions/generate", headers=user, json={"skill_id": skill["id"]}).status_code == 503
    res = client.post("/tutor/ocr", headers=user, files={"image": ("q.png", b"fake", "image/png")})
    assert res.status_code == 503
