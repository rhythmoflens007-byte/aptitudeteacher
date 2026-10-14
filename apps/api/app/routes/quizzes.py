import random
from collections import Counter, defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import ai
from app.auth import current_user
from app.content_i18n import localize
from app.db.models import Attempt, Question, Quiz, Subtopic, Topic, User, utcnow
from app.db.session import get_db
from app.engine import gamification, mastery
from app.schemas import QuestionOut, QuizIn, QuizOut, QuizSubmitIn

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

SECONDS_PER_QUESTION = 60


def _load(db: Session, quiz_id: str, user: User) -> Quiz:
    quiz = db.get(Quiz, quiz_id)
    if quiz is None or quiz.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found.")
    return quiz


def _questions(db: Session, quiz: Quiz) -> list[Question]:
    by_id = {q.id: q for q in db.scalars(select(Question).where(Question.id.in_(quiz.question_ids))).all()}
    return [by_id[qid] for qid in quiz.question_ids if qid in by_id]


def _out(db: Session, quiz: Quiz, locale: str) -> QuizOut:
    return QuizOut(
        id=quiz.id,
        kind=quiz.kind,
        duration_seconds=quiz.duration_seconds,
        started_at=quiz.started_at,
        questions=[QuestionOut.of(q, locale) for q in _questions(db, quiz)],
    )


@router.post("", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
def create_quiz(body: QuizIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if body.kind == "mock":
        chosen: list[Question] = []
        topics = db.scalars(select(Topic).order_by(Topic.name)).all()
        per_topic = max(3, body.count // len(topics))
        for topic in topics:
            pool = db.scalars(select(Question).join(Subtopic).where(Subtopic.topic_id == topic.id)).all()
            chosen += sorted(random.sample(pool, min(per_topic, len(pool))), key=lambda q: q.difficulty)
    else:
        stmt = select(Question).join(Subtopic)
        if body.topic_id:
            stmt = stmt.where(Subtopic.topic_id == body.topic_id)
        pool = db.scalars(stmt).all()
        chosen = random.sample(pool, min(body.count, len(pool)))

    if not chosen:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No questions available for this selection.")

    quiz = Quiz(
        user_id=user.id,
        kind=body.kind,
        question_ids=[q.id for q in chosen],
        duration_seconds=len(chosen) * SECONDS_PER_QUESTION,
    )
    db.add(quiz)
    db.commit()
    return _out(db, quiz, user.locale)


@router.get("")
def list_quizzes(db: Session = Depends(get_db), user: User = Depends(current_user)):
    quizzes = db.scalars(
        select(Quiz).where(Quiz.user_id == user.id, Quiz.submitted_at.is_not(None)).order_by(Quiz.started_at.desc()).limit(20)
    ).all()
    return [
        {
            "id": q.id,
            "kind": q.kind,
            "score": q.score,
            "total": len(q.question_ids),
            "started_at": q.started_at,
            "submitted_at": q.submitted_at,
        }
        for q in quizzes
    ]


@router.post("/{quiz_id}/submit")
def submit_quiz(quiz_id: str, body: QuizSubmitIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    quiz = _load(db, quiz_id, user)
    if quiz.submitted_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This test was already submitted.")

    answers = {a.question_id: a for a in body.answers}
    goal = mastery.daily_goal(db, user.id)
    score = 0
    for question in _questions(db, quiz):
        answer = answers.get(question.id)
        chosen = answer.chosen_answer if answer else None
        time_ms = answer.time_taken_ms if answer else None
        is_correct = chosen == question.correct_option
        score += is_correct
        attempt = Attempt(
            user_id=user.id,
            question_id=question.id,
            quiz_id=quiz.id,
            chosen_answer=chosen,
            is_correct=is_correct,
            time_taken_ms=time_ms,
            misconception_type=None if is_correct else ai.heuristic_misconception(chosen, time_ms),
        )
        db.add(attempt)
        mastery.apply_attempt(db, attempt, question)
        gamification.award_xp(db, user.id, is_correct, question.difficulty, "test")
        goal.completed_questions += 1

    quiz.score = score
    quiz.submitted_at = utcnow()
    db.flush()
    goal_crossed = goal.completed_questions >= goal.target_questions > goal.completed_questions - len(quiz.question_ids)
    if quiz.kind == "mock":
        gamification.grant(db, user.id, "mock_finisher")
    gamification.check_badges(db, user.id, goal_crossed)
    db.commit()
    return report(quiz.id, db, user)


@router.get("/{quiz_id}/report")
def report(quiz_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    quiz = _load(db, quiz_id, user)
    if quiz.submitted_at is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Submit the test to see its report.")

    attempts = {a.question_id: a for a in db.scalars(select(Attempt).where(Attempt.quiz_id == quiz.id)).all()}
    sections: dict[str, dict] = defaultdict(lambda: {"correct": 0, "total": 0, "time_ms": 0})
    weak = Counter()
    detail = []
    for question in _questions(db, quiz):
        attempt = attempts.get(question.id)
        section = sections[question.subtopic.topic.name]
        section["total"] += 1
        section["correct"] += bool(attempt and attempt.is_correct)
        section["time_ms"] += (attempt.time_taken_ms or 0) if attempt else 0
        if not (attempt and attempt.is_correct):
            weak.update(s.name for s in question.skills)
        shown = QuestionOut.of(question, user.locale)
        localized = localize(question, user.locale)
        detail.append(
            {
                "question": shown.model_dump(),
                "chosen_answer": attempt.chosen_answer if attempt else None,
                "correct_option": question.correct_option,
                "is_correct": bool(attempt and attempt.is_correct),
                "time_taken_ms": attempt.time_taken_ms if attempt else None,
                "explanation": localized["explanation"] if localized else question.explanation,
            }
        )

    total = len(detail)
    return {
        "id": quiz.id,
        "kind": quiz.kind,
        "score": quiz.score,
        "total": total,
        "accuracy": round(100 * (quiz.score or 0) / total) if total else 0,
        "time_used_ms": sum(s["time_ms"] for s in sections.values()),
        "duration_seconds": quiz.duration_seconds,
        "sections": [{"topic": name, **values} for name, values in sections.items()],
        "weak_skills": [{"skill": name, "missed": count} for name, count in weak.most_common(5)],
        "questions": detail,
    }
