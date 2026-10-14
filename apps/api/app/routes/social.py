from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db.models import Follow, Gamification, User, XpEvent
from app.db.session import get_db
from app.engine import game

router = APIRouter(prefix="/game", tags=["game"])

MAX_FRIENDS = 100


class FriendIn(BaseModel):
    code: str = Field(min_length=4, max_length=12)


@router.get("/status")
def status_bar(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """The little numbers in the top bar: hearts, streak, XP, league and today's quests."""
    game.settle_leagues(db)
    g = game.hearts(db, user.id)
    quests = game.quest_progress(db, user.id)
    nxt = game.next_heart_at(g)
    db.commit()
    return {
        "hearts": g.hearts,
        "max_hearts": game.MAX_HEARTS,
        "next_heart_at": nxt.isoformat() if nxt else None,
        "xp": g.xp,
        "level": g.level,
        "streak_days": g.current_streak_days,
        "league": game.LEAGUES[g.league_tier or 0],
        "quests_done": sum(q["done"] for q in quests),
        "quests_unclaimed": sum(q["done"] and not q["claimed"] for q in quests),
    }


@router.get("/quests")
def quests(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return game.quest_progress(db, user.id)


@router.post("/quests/{code}/claim")
def claim(code: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    quest = game.claim_quest(db, user.id, code)
    if quest is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "That quest isn't finished yet, or was already claimed.")
    db.commit()
    return {"quest": quest, "xp": game.profile(db, user.id).xp}


@router.get("/league")
def league(db: Session = Depends(get_db), user: User = Depends(current_user)):
    data = game.league(db, user)
    db.commit()
    return data


def _friend_rows(db: Session, ids: list[str], me: str) -> list[dict]:
    if not ids:
        return []
    start, end = game._local_bounds(game.week_start(game.today()), 7)
    weekly = dict(
        db.execute(
            select(XpEvent.user_id, func.sum(XpEvent.amount))
            .where(XpEvent.user_id.in_(ids), XpEvent.created_at >= start, XpEvent.created_at < end)
            .group_by(XpEvent.user_id)
        ).all()
    )
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(ids))).all()}
    stats = {g.user_id: g for g in db.scalars(select(Gamification).where(Gamification.user_id.in_(ids))).all()}
    today = game.today()
    rows = []
    for uid in ids:
        u, g = users.get(uid), stats.get(uid)
        if not u:
            continue
        # A streak only counts if it is still alive (practised today or yesterday).
        alive = g and g.last_active_date and g.last_active_date >= today - timedelta(days=1)
        rows.append(
            {
                "id": uid,
                "name": u.display_name,
                "level": g.level if g else 1,
                "streak_days": (g.current_streak_days if alive else 0) if g else 0,
                "weekly_xp": weekly.get(uid, 0),
                "league": game.LEAGUES[(g.league_tier or 0) if g else 0],
                "me": uid == me,
            }
        )
    return sorted(rows, key=lambda r: -r["weekly_xp"])


@router.get("/friends")
def friends(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not user.friend_code:
        user.friend_code = game.new_friend_code(db)
        db.commit()
    ids = list(db.scalars(select(Follow.friend_id).where(Follow.user_id == user.id)).all())
    return {"my_code": user.friend_code, "friends": _friend_rows(db, ids + [user.id], user.id)}


@router.post("/friends", status_code=status.HTTP_201_CREATED)
def add_friend(body: FriendIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    code = body.code.strip().upper()
    friend = db.scalar(select(User).where(User.friend_code == code))
    if friend is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No one has that friend code. Check it and try again.")
    if friend.id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That's your own code. Share it with a friend instead.")
    if db.get(Follow, (user.id, friend.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "You're already following them.")
    if db.scalar(select(func.count()).select_from(Follow).where(Follow.user_id == user.id)) >= MAX_FRIENDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You're following the maximum number of friends.")
    db.add(Follow(user_id=user.id, friend_id=friend.id))
    db.commit()
    return _friend_rows(db, [friend.id], user.id)[0]


@router.delete("/friends/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_friend(friend_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Follow, (user.id, friend_id))
    if row:
        db.delete(row)
        db.commit()
