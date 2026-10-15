import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class UTCDateTime(TypeDecorator):
    """SQLite drops tzinfo on read; every value is stored as UTC, so reattach it."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=timezone.utc) if value is not None and value.tzinfo is None else value


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    locale: Mapped[str] = mapped_column(String(10), default="en")
    tutor_name: Mapped[str] = mapped_column(String(30), default="Asha", server_default="Asha")
    tutor_gender: Mapped[str] = mapped_column(String(10), default="female", server_default="female")
    # Short code a friend types to follow you; filled in for older accounts at startup.
    friend_code: Mapped[str | None] = mapped_column(String(8), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    subtopics: Mapped[list["Subtopic"]] = relationship(back_populates="topic")


class Subtopic(Base):
    __tablename__ = "subtopics"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    topic: Mapped[Topic] = relationship(back_populates="subtopics")
    skills: Mapped[list["Skill"]] = relationship(back_populates="subtopic")


class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    subtopic_id: Mapped[str] = mapped_column(ForeignKey("subtopics.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(150))
    subtopic: Mapped[Subtopic] = relationship(back_populates="skills")


class QuestionSkill(Base):
    __tablename__ = "question_skills"
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    subtopic_id: Mapped[str] = mapped_column(ForeignKey("subtopics.id", ondelete="CASCADE"))
    difficulty: Mapped[int] = mapped_column(Integer)
    body: Mapped[str] = mapped_column(Text)
    options: Mapped[list[str]] = mapped_column(JSON)
    correct_option: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), default="seed")
    # Template questions can be re-created, in any language, from the template's name and the seed.
    template: Mapped[str | None] = mapped_column(String(60), nullable=True)
    variant: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    subtopic: Mapped[Subtopic] = relationship()
    skills: Mapped[list[Skill]] = relationship(secondary="question_skills")


class Attempt(Base):
    __tablename__ = "attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    quiz_id: Mapped[str | None] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=True)
    chosen_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    time_taken_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    misconception_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    hint_used: Mapped[bool] = mapped_column(Boolean, default=False)
    # Set when the answer was given inside a lesson on the course path.
    lesson_run_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    question: Mapped[Question] = relationship()


class SkillMastery(Base):
    __tablename__ = "skill_mastery"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    mastery_score: Mapped[float] = mapped_column(Float, default=0)
    attempts_count: Mapped[int] = mapped_column(Integer, default=0)
    last_attempt_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    streak_correct: Mapped[int] = mapped_column(Integer, default=0)
    skill: Mapped[Skill] = relationship()


class Quiz(Base):
    __tablename__ = "quizzes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(10))
    question_ids: Mapped[list[str]] = mapped_column(JSON)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)


class TutorSession(Base):
    __tablename__ = "tutor_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[str | None] = mapped_column(ForeignKey("questions.id", ondelete="SET NULL"), nullable=True)
    question_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class TutorMessage(Base):
    __tablename__ = "tutor_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("tutor_sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)
    # One emotion per sentence for tutor replies (drives the avatar's expressions); null for older messages.
    emotions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class DailyGoal(Base):
    __tablename__ = "daily_goals"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    target_questions: Mapped[int] = mapped_column(Integer)
    completed_questions: Mapped[int] = mapped_column(Integer, default=0)
    skill_ids: Mapped[list[str]] = mapped_column(JSON, default=list)


class Gamification(Base):
    __tablename__ = "gamification"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    current_streak_days: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    hearts: Mapped[int] = mapped_column(Integer, default=5, server_default="5")
    # When the next heart starts refilling from (one heart every few hours, up to the maximum).
    hearts_refill_from: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    league_tier: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class Badge(Base):
    __tablename__ = "badges"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)


class UserBadge(Base):
    __tablename__ = "user_badges"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    badge_id: Mapped[str] = mapped_column(ForeignKey("badges.id", ondelete="CASCADE"), primary_key=True)
    earned_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    badge: Mapped[Badge] = relationship()


class XpEvent(Base):
    """Every XP gain with its time, so weekly leagues and daily quests can be counted."""

    __tablename__ = "xp_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(20), default="practice")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, index=True)


class LessonRun(Base):
    """One go at a lesson on the course path."""

    __tablename__ = "lesson_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_key: Mapped[str] = mapped_column(String(80))
    question_ids: Mapped[list[str]] = mapped_column(JSON)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    xp: Mapped[int] = mapped_column(Integer, default=0)


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    lesson_key: Mapped[str] = mapped_column(String(80), primary_key=True)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    completions: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class Follow(Base):
    __tablename__ = "follows"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    friend_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class QuestClaim(Base):
    __tablename__ = "quest_claims"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    quest: Mapped[str] = mapped_column(String(20), primary_key=True)
    claimed_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class LeagueState(Base):
    """The week the leagues were last settled for (a single row)."""

    __tablename__ = "league_state"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    week_start: Mapped[date] = mapped_column(Date)


class AppMeta(Base):
    """Small key/value facts about the database itself, e.g. which version of the content it was seeded with."""

    __tablename__ = "app_meta"
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[str] = mapped_column(String(128))
