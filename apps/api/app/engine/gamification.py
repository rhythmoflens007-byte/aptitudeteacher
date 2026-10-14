from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Attempt, Badge, Gamification, SkillMastery, UserBadge, XpEvent

XP_PER_LEVEL = 250

BADGES = [
    ("first_attempt", "First Step", "Answered your first question."),
    ("streak_3", "On a Roll", "Practiced 3 days in a row."),
    ("streak_7", "Week Warrior", "Practiced 7 days in a row."),
    ("mastery_50", "Half Mastered", "Reached 50% mastery on a skill."),
    ("mastery_80", "Skill Master", "Reached 80% mastery on a skill."),
    ("hundred_attempts", "Centurion", "Answered 100 questions."),
    ("goal_getter", "Goal Getter", "Completed a daily goal."),
    ("mock_finisher", "Mock Finisher", "Completed a full mock test."),
    ("first_lesson", "Path Finder", "Finished your first lesson on the course path."),
    ("perfect_lesson", "Flawless", "Finished a lesson with three stars."),
    ("unit_cleared", "Unit Cleared", "Passed a unit checkpoint."),
    ("league_up", "Rising Star", "Moved up to a higher league."),
]


def profile(db: Session, user_id: str) -> Gamification:
    row = db.get(Gamification, user_id)
    if row is None:
        row = Gamification(user_id=user_id, xp=0, level=1, current_streak_days=0, longest_streak_days=0, hearts=5, league_tier=0)
        db.add(row)
        db.flush()
    return row


def award_xp(db: Session, user_id: str, correct: bool, difficulty: int, source: str = "practice") -> int:
    row = profile(db, user_id)
    gained = 10 * difficulty if correct else 2
    row.xp += gained
    row.level = 1 + row.xp // XP_PER_LEVEL
    db.add(XpEvent(user_id=user_id, amount=gained, source=source))

    today = date.today()
    if row.last_active_date != today:
        row.current_streak_days = row.current_streak_days + 1 if row.last_active_date == today - timedelta(days=1) else 1
        row.longest_streak_days = max(row.longest_streak_days, row.current_streak_days)
        row.last_active_date = today
    return gained


def grant(db: Session, user_id: str, code: str) -> Badge | None:
    badge = db.scalar(select(Badge).where(Badge.code == code))
    if badge is None or db.get(UserBadge, (user_id, badge.id)):
        return None
    db.add(UserBadge(user_id=user_id, badge_id=badge.id))
    return badge


def check_badges(db: Session, user_id: str, goal_just_completed: bool = False) -> list[Badge]:
    row = profile(db, user_id)
    earned: list[Badge | None] = []
    attempts = db.scalar(select(func.count()).select_from(Attempt).where(Attempt.user_id == user_id)) or 0
    best = db.scalar(select(func.max(SkillMastery.mastery_score)).where(SkillMastery.user_id == user_id)) or 0

    if attempts >= 1:
        earned.append(grant(db, user_id, "first_attempt"))
    if attempts >= 100:
        earned.append(grant(db, user_id, "hundred_attempts"))
    if row.current_streak_days >= 3:
        earned.append(grant(db, user_id, "streak_3"))
    if row.current_streak_days >= 7:
        earned.append(grant(db, user_id, "streak_7"))
    if best >= 50:
        earned.append(grant(db, user_id, "mastery_50"))
    if best >= 80:
        earned.append(grant(db, user_id, "mastery_80"))
    if goal_just_completed:
        earned.append(grant(db, user_id, "goal_getter"))
    return [b for b in earned if b]
