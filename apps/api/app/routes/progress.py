from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db.models import Attempt, Badge, Skill, SkillMastery, Topic, User, UserBadge
from app.db.session import get_db
from app.engine import gamification, mastery

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(current_user)):
    attempts = db.scalars(select(Attempt).where(Attempt.user_id == user.id).order_by(Attempt.created_at.desc())).all()
    scores = {m.skill_id: m for m in db.scalars(select(SkillMastery).where(SkillMastery.user_id == user.id)).all()}

    per_skill: dict[str, dict] = defaultdict(lambda: {"attempts": 0, "correct": 0, "time_ms": 0})
    for a in attempts:
        for s in a.question.skills:
            row = per_skill[s.id]
            row["attempts"] += 1
            row["correct"] += a.is_correct
            row["time_ms"] += a.time_taken_ms or 0

    topics = []
    for topic in db.scalars(select(Topic).order_by(Topic.name)).all():
        skills = []
        for sub in topic.subtopics:
            for skill in sub.skills:
                stats = per_skill.get(skill.id, {"attempts": 0, "correct": 0, "time_ms": 0})
                skills.append(
                    {
                        "id": skill.id,
                        "name": skill.name,
                        "subtopic": sub.name,
                        "mastery": round(scores[skill.id].mastery_score) if skill.id in scores else 0,
                        "attempts": stats["attempts"],
                        "accuracy": round(100 * stats["correct"] / stats["attempts"]) if stats["attempts"] else None,
                        "avg_time_s": round(stats["time_ms"] / stats["attempts"] / 1000, 1) if stats["attempts"] else None,
                    }
                )
        attempted = [s for s in skills if s["attempts"]]
        total = sum(s["attempts"] for s in attempted)
        topics.append(
            {
                "id": topic.id,
                "name": topic.name,
                "mastery": round(sum(s["mastery"] for s in skills) / len(skills)) if skills else 0,
                "attempts": total,
                "accuracy": round(sum(per_skill[s["id"]]["correct"] for s in attempted) * 100 / total) if total else None,
                "skills": skills,
            }
        )

    all_skills = [s for t in topics for s in t["skills"]]
    weak = sorted((s for s in all_skills if s["attempts"]), key=lambda s: s["mastery"])[:5]

    goal = mastery.daily_goal(db, user.id)
    goal_skills = [db.get(Skill, sid) for sid in goal.skill_ids]

    g = gamification.profile(db, user.id)
    today = date.today()
    if g.last_active_date and g.last_active_date < today - timedelta(days=1):
        g.current_streak_days = 0
    db.commit()

    earned = {ub.badge_id: ub.earned_at for ub in db.scalars(select(UserBadge).where(UserBadge.user_id == user.id)).all()}
    badges = [
        {"code": b.code, "name": b.name, "description": b.description, "earned_at": earned.get(b.id)}
        for b in db.scalars(select(Badge)).all()
    ]

    trend = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        day_attempts = [a for a in attempts if _local_date(a.created_at) == day]
        trend.append({"date": day.isoformat(), "attempts": len(day_attempts), "correct": sum(a.is_correct for a in day_attempts)})

    correct = sum(a.is_correct for a in attempts)
    timed = [a.time_taken_ms for a in attempts if a.time_taken_ms]
    return {
        "user": {"display_name": user.display_name, "locale": user.locale},
        "stats": {
            "attempts": len(attempts),
            "accuracy": round(100 * correct / len(attempts)) if attempts else None,
            "avg_time_s": round(sum(timed) / len(timed) / 1000, 1) if timed else None,
            "today": trend[-1]["attempts"],
        },
        "gamification": {
            "xp": g.xp,
            "level": g.level,
            "xp_into_level": g.xp % gamification.XP_PER_LEVEL,
            "xp_per_level": gamification.XP_PER_LEVEL,
            "streak_days": g.current_streak_days,
            "longest_streak_days": g.longest_streak_days,
        },
        "daily_goal": {
            "target": goal.target_questions,
            "completed": min(goal.completed_questions, goal.target_questions),
            "skills": [{"id": s.id, "name": s.name, "subtopic": s.subtopic.name} for s in goal_skills if s],
        },
        "topics": topics,
        "weak_skills": weak,
        "badges": badges,
        "trend": trend,
        "recent": [
            {
                "id": a.id,
                "body": a.question.body,
                "topic": a.question.subtopic.topic.name,
                "is_correct": a.is_correct,
                "misconception_type": a.misconception_type,
                "time_taken_ms": a.time_taken_ms,
                "created_at": a.created_at,
                "from_test": a.quiz_id is not None,
            }
            for a in attempts[:25]
        ],
    }


@router.get("/plan")
def plan(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """A 7-day revision plan built from the learner's weak and unstarted skills."""
    topic_names = {t.id: t.name for t in db.scalars(select(Topic)).all()}
    goal = mastery.daily_goal(db, user.id)
    return {
        "days": mastery.revision_plan(db, user.id, topic_names),
        "today_done": min(goal.completed_questions, goal.target_questions),
    }


def _local_date(dt: datetime) -> date:
    return dt.astimezone().date()
