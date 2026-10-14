"""Hearts, the XP history, daily quests, weekly leagues and friend codes.

Everything is computed from stored events when asked for, so there are no background jobs:
hearts refill on read, and the leagues settle the first time anyone looks after a week ends.
"""

import hashlib
import random
import secrets
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Attempt, Gamification, LeagueState, LessonRun, QuestClaim, User, XpEvent, utcnow
from app.engine.gamification import grant, profile

MAX_HEARTS = 5
HEART_REFILL = timedelta(hours=4)

LEAGUES = ["bronze", "silver", "gold", "platinum", "diamond"]
PROMOTE = 3  # top places move up a league each week
DEMOTE = 3  # bottom places move down, when the league is big enough to be fair
DEMOTE_MIN_SIZE = 10
LEAGUE_SHOWN = 30

QUEST_REWARD = 15


# ---------------------------------------------------------------- time helpers


def today() -> date:
    return date.today()


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def _local_bounds(start: date, days: int = 1) -> tuple[datetime, datetime]:
    """UTC instants covering whole local days, for comparing with stored timestamps."""
    begin = datetime.combine(start, time.min).astimezone()
    return begin.astimezone(timezone.utc), (begin + timedelta(days=days)).astimezone(timezone.utc)


# ---------------------------------------------------------------- XP history


def log_xp(db: Session, user_id: str, amount: int, source: str) -> None:
    if amount:
        db.add(XpEvent(user_id=user_id, amount=amount, source=source))


def add_xp(db: Session, user_id: str, amount: int, source: str) -> int:
    """Bonus XP (lessons, quests): added to the total and the history."""
    row = profile(db, user_id)
    row.xp += amount
    from app.engine.gamification import XP_PER_LEVEL

    row.level = 1 + row.xp // XP_PER_LEVEL
    log_xp(db, user_id, amount, source)
    return amount


def xp_between(db: Session, user_id: str, start: datetime, end: datetime) -> int:
    return db.scalar(
        select(func.coalesce(func.sum(XpEvent.amount), 0)).where(
            XpEvent.user_id == user_id, XpEvent.created_at >= start, XpEvent.created_at < end
        )
    ) or 0


# ---------------------------------------------------------------- hearts


def refill(row: Gamification, now: datetime | None = None) -> Gamification:
    """Adds the hearts that have grown back since the refill clock started."""
    now = now or utcnow()
    if row.hearts is None:
        row.hearts = MAX_HEARTS
    if row.hearts >= MAX_HEARTS:
        row.hearts = MAX_HEARTS
        row.hearts_refill_from = None
        return row
    started = row.hearts_refill_from or now
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    grown = int((now - started) / HEART_REFILL)
    if grown:
        row.hearts = min(MAX_HEARTS, row.hearts + grown)
        row.hearts_refill_from = None if row.hearts >= MAX_HEARTS else started + grown * HEART_REFILL
    elif row.hearts_refill_from is None:
        row.hearts_refill_from = now
    return row


def hearts(db: Session, user_id: str) -> Gamification:
    return refill(profile(db, user_id))


def next_heart_at(row: Gamification) -> datetime | None:
    if row.hearts >= MAX_HEARTS or row.hearts_refill_from is None:
        return None
    started = row.hearts_refill_from
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    return started + HEART_REFILL


def lose_heart(db: Session, user_id: str) -> Gamification:
    row = hearts(db, user_id)
    if row.hearts > 0:
        if row.hearts >= MAX_HEARTS:
            row.hearts_refill_from = utcnow()
        row.hearts -= 1
    return row


def gain_heart(db: Session, user_id: str) -> Gamification:
    """Practising earns hearts back."""
    row = hearts(db, user_id)
    if row.hearts < MAX_HEARTS:
        row.hearts += 1
        if row.hearts >= MAX_HEARTS:
            row.hearts_refill_from = None
    return row


# ---------------------------------------------------------------- daily quests

# kind -> possible targets; the reward is the same for each quest.
QUEST_KINDS = {
    "xp": [30, 50, 80],
    "lessons": [1, 2, 3],
    "perfect": [1],
    "in_a_row": [5, 8],
    "minutes": [5, 10],
}


def quests_for(user_id: str, day: date) -> list[dict]:
    """Three quests a day, the same all day for the same learner."""
    seed = int(hashlib.sha1(f"{user_id}:{day.isoformat()}".encode()).hexdigest(), 16)
    rng = random.Random(seed)
    kinds = rng.sample(sorted(QUEST_KINDS), 3)
    return [{"code": kind, "target": rng.choice(QUEST_KINDS[kind])} for kind in kinds]


def _longest_correct_run(results: list[bool]) -> int:
    best = run = 0
    for ok in results:
        run = run + 1 if ok else 0
        best = max(best, run)
    return best


def quest_progress(db: Session, user_id: str, day: date | None = None) -> list[dict]:
    day = day or today()
    start, end = _local_bounds(day)
    runs = db.scalars(
        select(LessonRun).where(LessonRun.user_id == user_id, LessonRun.completed, LessonRun.finished_at >= start, LessonRun.finished_at < end)
    ).all()
    attempts = db.scalars(
        select(Attempt).where(Attempt.user_id == user_id, Attempt.created_at >= start, Attempt.created_at < end).order_by(Attempt.created_at)
    ).all()
    claimed = set(db.scalars(select(QuestClaim.quest).where(QuestClaim.user_id == user_id, QuestClaim.date == day)).all())
    values = {
        "xp": xp_between(db, user_id, start, end),
        "lessons": len(runs),
        "perfect": sum(1 for r in runs if r.stars == 3),
        "in_a_row": _longest_correct_run([a.is_correct for a in attempts]),
        "minutes": sum(a.time_taken_ms or 0 for a in attempts) // 60_000,
    }
    out = []
    for quest in quests_for(user_id, day):
        progress = min(values[quest["code"]], quest["target"])
        out.append(
            {
                **quest,
                "progress": progress,
                "done": progress >= quest["target"],
                "claimed": quest["code"] in claimed,
                "reward": QUEST_REWARD,
            }
        )
    return out


def claim_quest(db: Session, user_id: str, code: str) -> dict | None:
    """Pays the reward for a finished quest once; None if it isn't today's, isn't done, or was paid."""
    day = today()
    quest = next((q for q in quest_progress(db, user_id, day) if q["code"] == code), None)
    if quest is None or not quest["done"] or quest["claimed"]:
        return None
    db.add(QuestClaim(user_id=user_id, date=day, quest=code))
    add_xp(db, user_id, QUEST_REWARD, "quest")
    return {**quest, "claimed": True}


# ---------------------------------------------------------------- leagues


def settle_leagues(db: Session) -> None:
    """Once a week ends, moves the top of each league up and the bottom down."""
    current = week_start(today())
    state = db.get(LeagueState, 1)
    if state is None:
        db.add(LeagueState(id=1, week_start=current))
        db.flush()
        return
    if state.week_start >= current:
        return
    start, end = _local_bounds(state.week_start, 7)
    weekly = dict(
        db.execute(
            select(XpEvent.user_id, func.sum(XpEvent.amount))
            .where(XpEvent.created_at >= start, XpEvent.created_at < end)
            .group_by(XpEvent.user_id)
        ).all()
    )
    rows = db.scalars(select(Gamification).where(Gamification.user_id.in_(list(weekly)))).all() if weekly else []
    by_tier: dict[int, list[Gamification]] = {}
    for row in rows:
        by_tier.setdefault(row.league_tier or 0, []).append(row)
    for tier, members in by_tier.items():
        ranked = sorted(members, key=lambda r: weekly.get(r.user_id, 0), reverse=True)
        if tier < len(LEAGUES) - 1:
            for row in ranked[:PROMOTE]:
                row.league_tier = tier + 1
                grant(db, row.user_id, "league_up")
        if tier > 0 and len(ranked) >= DEMOTE_MIN_SIZE:
            for row in ranked[-DEMOTE:]:
                row.league_tier = tier - 1
    state.week_start = current
    db.flush()


def league(db: Session, user: User) -> dict:
    settle_leagues(db)
    mine = profile(db, user.id)
    tier = mine.league_tier or 0
    start_day = week_start(today())
    start, end = _local_bounds(start_day, 7)
    weekly = dict(
        db.execute(
            select(XpEvent.user_id, func.sum(XpEvent.amount))
            .join(Gamification, Gamification.user_id == XpEvent.user_id)
            .where(XpEvent.created_at >= start, XpEvent.created_at < end, Gamification.league_tier == tier)
            .group_by(XpEvent.user_id)
        ).all()
    )
    weekly.setdefault(user.id, 0)
    names = dict(db.execute(select(User.id, User.display_name).where(User.id.in_(list(weekly)))).all())
    levels = dict(db.execute(select(Gamification.user_id, Gamification.level).where(Gamification.user_id.in_(list(weekly)))).all())
    ranked = sorted(weekly.items(), key=lambda kv: (-kv[1], names.get(kv[0], "")))
    members = [
        {"rank": i + 1, "name": names.get(uid, "?"), "xp": xp, "level": levels.get(uid, 1), "me": uid == user.id}
        for i, (uid, xp) in enumerate(ranked)
    ]
    shown = members[:LEAGUE_SHOWN]
    if not any(m["me"] for m in shown):
        shown.append(next(m for m in members if m["me"]))
    return {
        "tier": tier,
        "league": LEAGUES[tier],
        "week_start": start_day.isoformat(),
        "ends_at": end.isoformat(),
        "promote": PROMOTE if tier < len(LEAGUES) - 1 else 0,
        "demote": DEMOTE if tier > 0 and len(members) >= DEMOTE_MIN_SIZE else 0,
        "size": len(members),
        "members": shown,
    }


# ---------------------------------------------------------------- friends

_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L


def new_friend_code(db: Session) -> str:
    while True:
        code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
        if not db.scalar(select(User.id).where(User.friend_code == code)):
            return code


def ensure_friend_codes(db: Session) -> None:
    for user in db.scalars(select(User).where(User.friend_code.is_(None))).all():
        user.friend_code = new_friend_code(db)
    db.commit()
