from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db.models import Attempt, LessonProgress, LessonRun, Question, User, utcnow
from app.db.session import get_db
from app.engine import course, game, gamification
from app.schemas import BadgeOut, QuestionOut

router = APIRouter(prefix="/learn", tags=["learn"])

LESSON_BONUS = 10
STAR_BONUS = 5
CHECKPOINT_BONUS = 20


class StartIn(BaseModel):
    key: str = Field(min_length=3, max_length=80)


def _hearts(row) -> dict:
    nxt = game.next_heart_at(row)
    return {"hearts": row.hearts, "max_hearts": game.MAX_HEARTS, "next_heart_at": nxt.isoformat() if nxt else None}


@router.get("/course")
def get_course(db: Session = Depends(get_db), user: User = Depends(current_user)):
    sections = course.with_progress(db, user.id, course.build_path(db))
    hearts = game.hearts(db, user.id)
    db.commit()
    return {"sections": sections, **_hearts(hearts)}


@router.post("/lessons/start")
def start_lesson(body: StartIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    sections = course.with_progress(db, user.id, course.build_path(db))
    found = course.find_lesson(sections, body.key)
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found.")
    _, unit, lesson = found
    if lesson["state"] == "locked":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Finish the earlier lessons to unlock this one.")
    hearts = game.hearts(db, user.id)
    if hearts.hearts <= 0:
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, "You're out of hearts. Practise to earn one back, or wait for a refill.")
    run, questions = course.start_run(db, user.id, lesson, unit)
    db.commit()
    return {
        "run_id": run.id,
        "lesson": {**lesson, "unit": unit["name"]},
        "questions": [QuestionOut.of(q, user.locale).model_dump() for q in questions],
        **_hearts(hearts),
    }


def _summary(db: Session, run: LessonRun, user: User, new_badges: list | None = None) -> dict:
    tries = course.first_tries(db, run)
    total = len(run.question_ids)
    sections = course.build_path(db)
    started = run.started_at if run.started_at.tzinfo else run.started_at.replace(tzinfo=timezone.utc)
    finished = run.finished_at or utcnow()
    if finished.tzinfo is None:
        finished = finished.replace(tzinfo=timezone.utc)
    g = game.hearts(db, user.id)
    return {
        "run_id": run.id,
        "completed": run.completed,
        "stars": run.stars,
        "correct": run.correct,
        "total": total,
        "accuracy": round(100 * run.correct / total) if total else 0,
        "answered": len(tries),
        "xp": run.xp,
        "time_ms": int((finished - started).total_seconds() * 1000),
        "next_key": course.next_lesson(sections, run.lesson_key) if run.completed else None,
        "streak_days": g.current_streak_days,
        "quests": game.quest_progress(db, user.id),
        "new_badges": new_badges or [],
        **_hearts(g),
    }


@router.post("/runs/{run_id}/finish")
def finish_run(run_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    run = db.get(LessonRun, run_id)
    if run is None or run.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found.")
    if run.finished_at is not None:
        return _summary(db, run, user)

    tries = course.first_tries(db, run)
    total = len(run.question_ids)
    run.correct = sum(1 for qid in run.question_ids if tries.get(qid))
    run.completed = all(qid in tries for qid in run.question_ids)
    run.finished_at = utcnow()
    answered_xp = sum(
        (10 * a.question.difficulty if a.is_correct else 2)
        for a in db.scalars(select(Attempt).where(Attempt.lesson_run_id == run.id)).all()
    )
    badges = []
    if run.completed:
        run.stars = course.stars_for(run.correct / total if total else 0)
        checkpoint = run.lesson_key.startswith("unit:")
        bonus = LESSON_BONUS + STAR_BONUS * run.stars + (CHECKPOINT_BONUS if checkpoint else 0)
        game.add_xp(db, user.id, bonus, "lesson")
        run.xp = answered_xp + bonus
        row = db.get(LessonProgress, (user.id, run.lesson_key))
        if row is None:
            row = LessonProgress(user_id=user.id, lesson_key=run.lesson_key, stars=0, completions=0)
            db.add(row)
        row.stars = max(row.stars or 0, run.stars)
        row.completions = (row.completions or 0) + 1
        row.completed_at = datetime.now(timezone.utc)
        for code, earned in (("first_lesson", True), ("perfect_lesson", run.stars == 3), ("unit_cleared", checkpoint)):
            if earned and (badge := gamification.grant(db, user.id, code)):
                badges.append(BadgeOut(code=badge.code, name=badge.name, description=badge.description).model_dump())
        badges += [BadgeOut(code=b.code, name=b.name, description=b.description).model_dump() for b in gamification.check_badges(db, user.id)]
    else:
        run.xp = answered_xp
    db.flush()
    summary = _summary(db, run, user, badges)
    db.commit()
    return summary


@router.get("/runs/{run_id}")
def get_run(run_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Resumes a lesson after a reload: its questions and which were already answered."""
    run = db.get(LessonRun, run_id)
    if run is None or run.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found.")
    by_id = {q.id: q for q in db.scalars(select(Question).where(Question.id.in_(run.question_ids))).all()}
    return {
        "run_id": run.id,
        "finished": run.finished_at is not None,
        "questions": [QuestionOut.of(by_id[qid], user.locale).model_dump() for qid in run.question_ids if qid in by_id],
        "answered": course.first_tries(db, run),
        **_hearts(game.hearts(db, user.id)),
    }
