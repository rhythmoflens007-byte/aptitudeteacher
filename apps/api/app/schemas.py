import random
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.db.models import Question, User

Locale = Literal["en", "hi", "ta"]


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    locale: str

    @classmethod
    def of(cls, user: User) -> "UserOut":
        return cls(id=user.id, email=user.email, display_name=user.display_name, locale=user.locale)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)
    locale: Locale = "en"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    locale: Locale | None = None


class AuthOut(BaseModel):
    token: str
    user: UserOut


class QuestionOut(BaseModel):
    id: str
    body: str
    options: list[str]
    difficulty: int
    topic: str
    subtopic: str
    skills: list[str]
    source: str

    @classmethod
    def of(cls, q: Question) -> "QuestionOut":
        return cls(
            id=q.id,
            body=q.body,
            options=random.sample(q.options, len(q.options)),
            difficulty=q.difficulty,
            topic=q.subtopic.topic.name,
            subtopic=q.subtopic.name,
            skills=[s.name for s in q.skills],
            source=q.source,
        )


class NextQuestionOut(BaseModel):
    question: QuestionOut
    reason: Literal["retest", "weakest_skill", "new_skill"]


class AttemptIn(BaseModel):
    question_id: str
    chosen_answer: str | None = None
    time_taken_ms: int | None = Field(default=None, ge=0)
    hint_used: bool = False


class SkillScore(BaseModel):
    skill: str
    score: float


class BadgeOut(BaseModel):
    code: str
    name: str
    description: str


class AttemptOut(BaseModel):
    is_correct: bool
    correct_option: str
    explanation: str
    misconception_type: str | None
    micro_lesson: str | None
    retest_question_id: str | None
    xp_gained: int
    mastery: list[SkillScore]
    new_badges: list[BadgeOut]
    daily_goal_completed: int
    daily_goal_target: int


class GenerateIn(BaseModel):
    skill_id: str


class QuizIn(BaseModel):
    kind: Literal["quiz", "mock"]
    topic_id: str | None = None
    count: int = Field(default=10, ge=3, le=30)


class QuizOut(BaseModel):
    id: str
    kind: str
    duration_seconds: int
    started_at: datetime
    questions: list[QuestionOut]


class QuizAnswer(BaseModel):
    question_id: str
    chosen_answer: str | None = None
    time_taken_ms: int | None = Field(default=None, ge=0)


class QuizSubmitIn(BaseModel):
    answers: list[QuizAnswer]


class TutorSessionIn(BaseModel):
    question_id: str | None = None
    question_text: str | None = Field(default=None, max_length=4000)


class TutorMessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class TutorMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
