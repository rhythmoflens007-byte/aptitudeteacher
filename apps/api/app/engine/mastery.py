import random
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import ai
from app.db.models import Attempt, DailyGoal, Question, QuestionSkill, Skill, SkillMastery, Subtopic, utcnow

WRONG_PENALTY = {"careless_slip": 3.0, "no_attempt": 6.0, "partial_method": 7.0, "conceptual_gap": 12.0}
NEEDS_RETEST = {"conceptual_gap", "partial_method"}
DAILY_TARGET = 10
REPEAT_AFTER_DAYS = 7


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def updated_score(score: float, correct: bool, difficulty: int, misconception: str | None) -> float:
    if correct:
        stretch = 1.25 if difficulty > target_difficulty(score) else 1.0
        new = score + (6 + 3 * difficulty) * (1 - score / 110) * stretch
    else:
        new = score - WRONG_PENALTY.get(misconception or "conceptual_gap", 12.0) * (0.6 + score / 250)
    return round(max(0.0, min(100.0, new)), 2)


def target_difficulty(score: float) -> int:
    return min(5, 1 + int(score // 20))


def mastery_for(db: Session, user_id: str, skill_id: str) -> SkillMastery:
    row = db.get(SkillMastery, (user_id, skill_id))
    if row is None:
        row = SkillMastery(user_id=user_id, skill_id=skill_id, mastery_score=0, attempts_count=0, streak_correct=0)
        db.add(row)
        db.flush()
    return row


def apply_attempt(db: Session, attempt: Attempt, question: Question) -> list[tuple[Skill, float]]:
    scores = []
    for skill in question.skills:
        row = mastery_for(db, attempt.user_id, skill.id)
        row.mastery_score = updated_score(row.mastery_score, attempt.is_correct, question.difficulty, attempt.misconception_type)
        row.attempts_count += 1
        row.streak_correct = row.streak_correct + 1 if attempt.is_correct else 0
        row.last_attempt_at = utcnow()
        scores.append((skill, row.mastery_score))
    return scores


def _skill_query(topic_id: str | None):
    stmt = select(Skill).join(Subtopic)
    return stmt.where(Subtopic.topic_id == topic_id) if topic_id else stmt


def _pending_retest_skill(db: Session, user_id: str, skill_ids: set[str]) -> str | None:
    recent = db.scalars(
        select(Attempt).where(Attempt.user_id == user_id, Attempt.quiz_id.is_(None)).order_by(Attempt.created_at.desc()).limit(15)
    ).all()
    settled: set[str] = set()
    for attempt in recent:
        for skill in attempt.question.skills:
            if skill.id in settled or skill.id not in skill_ids:
                continue
            settled.add(skill.id)
            if not attempt.is_correct and attempt.misconception_type in NEEDS_RETEST:
                return skill.id
    return None


def question_for_skill(db: Session, user_id: str, skill: Skill, exclude_id: str | None = None) -> Question:
    score = (db.get(SkillMastery, (user_id, skill.id)) or SkillMastery(mastery_score=0)).mastery_score
    target = target_difficulty(score)
    questions = db.scalars(select(Question).join(QuestionSkill).where(QuestionSkill.skill_id == skill.id)).all()
    solved = set(
        db.scalars(select(Attempt.question_id).where(Attempt.user_id == user_id, Attempt.is_correct.is_(True))).all()
    )
    # When each question was last answered, so recently seen ones are skipped and repeats go oldest-first.
    last_seen = dict(
        db.execute(
            select(Attempt.question_id, func.max(Attempt.created_at)).where(Attempt.user_id == user_id).group_by(Attempt.question_id)
        ).all()
    )
    cutoff = utcnow() - timedelta(days=REPEAT_AFTER_DAYS)
    fresh = [
        q for q in questions
        if q.id not in solved and q.id != exclude_id and (q.id not in last_seen or as_utc(last_seen[q.id]) < cutoff)
    ]
    if fresh:
        return min(fresh, key=lambda q: (abs(q.difficulty - target), random.random()))

    generated = ai.generate_question(skill.subtopic.name, skill.name, target, questions) if ai.enabled() else None
    if generated:
        question = Question(subtopic_id=skill.subtopic_id, difficulty=target, source="ai_generated", **generated)
        question.skills = [skill]
        db.add(question)
        db.commit()
        return question

    reusable = [q for q in questions if q.id != exclude_id] or list(questions)
    never = datetime.min.replace(tzinfo=timezone.utc)
    return min(reusable, key=lambda q: (as_utc(last_seen[q.id]) if q.id in last_seen else never, abs(q.difficulty - target)))


def next_question(db: Session, user_id: str, topic_id: str | None) -> tuple[Question, str]:
    skills = db.scalars(_skill_query(topic_id)).all()
    by_id = {s.id: s for s in skills}

    retest = _pending_retest_skill(db, user_id, set(by_id))
    if retest:
        return question_for_skill(db, user_id, by_id[retest]), "retest"

    mastery = {
        m.skill_id: m
        for m in db.scalars(select(SkillMastery).where(SkillMastery.user_id == user_id)).all()
    }
    now = utcnow()

    def priority(skill: Skill) -> float:
        row = mastery.get(skill.id)
        if row is None:
            return random.uniform(0, 8)
        just_seen = row.last_attempt_at and now - row.last_attempt_at < timedelta(minutes=3)
        return row.mastery_score + (35 if just_seen else 0) + random.uniform(0, 8)

    skill = min(skills, key=priority)
    reason = "new_skill" if skill.id not in mastery else "weakest_skill"
    return question_for_skill(db, user_id, skill), reason


def daily_goal(db: Session, user_id: str) -> DailyGoal:
    today = date.today()
    goal = db.get(DailyGoal, (user_id, today))
    if goal:
        return goal
    skills = db.scalars(select(Skill)).all()
    mastery = {
        m.skill_id: m for m in db.scalars(select(SkillMastery).where(SkillMastery.user_id == user_id)).all()
    }
    weakest = sorted(skills, key=lambda s: (mastery[s.id].mastery_score if s.id in mastery else 0, random.random()))[:3]
    recent_cutoff = utcnow() - timedelta(days=3)
    reinforce = [
        m.skill_id
        for m in mastery.values()
        if m.mastery_score >= 60 and m.last_attempt_at and m.last_attempt_at >= recent_cutoff
        and m.skill_id not in {s.id for s in weakest}
    ][:1]
    goal = DailyGoal(
        user_id=user_id,
        date=today,
        target_questions=DAILY_TARGET,
        completed_questions=0,
        skill_ids=[s.id for s in weakest] + reinforce,
    )
    db.add(goal)
    db.commit()
    return goal
