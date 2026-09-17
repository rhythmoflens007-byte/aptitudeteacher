from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import ai
from app.auth import current_user
from app.db.models import Attempt, Question, Skill, SkillMastery, Topic, User
from app.db.session import get_db
from app.engine import gamification, mastery
from app.schemas import (
    AttemptIn,
    AttemptOut,
    BadgeOut,
    GenerateIn,
    NextQuestionOut,
    QuestionOut,
    SkillScore,
)

router = APIRouter(tags=["practice"])


@router.get("/topics")
def topics(db: Session = Depends(get_db), _: User = Depends(current_user)):
    return [
        {
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "subtopics": [
                {"id": s.id, "name": s.name, "skills": [{"id": k.id, "name": k.name} for k in s.skills]}
                for s in t.subtopics
            ],
        }
        for t in db.scalars(select(Topic).order_by(Topic.name)).all()
    ]


@router.get("/questions/next", response_model=NextQuestionOut)
def next_question(topic_id: str | None = None, db: Session = Depends(get_db), user: User = Depends(current_user)):
    question, reason = mastery.next_question(db, user.id, topic_id)
    return NextQuestionOut(question=QuestionOut.of(question), reason=reason)


@router.get("/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: str, db: Session = Depends(get_db), _: User = Depends(current_user)):
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found.")
    return QuestionOut.of(question)


@router.post("/questions/generate", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def generate(body: GenerateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    skill = db.get(Skill, body.skill_id)
    if skill is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Skill not found.")
    if not ai.enabled():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Add GEMINI_API_KEY to apps/api/.env to generate new questions.")
    row = db.get(SkillMastery, (user.id, skill.id))
    difficulty = mastery.target_difficulty(row.mastery_score if row else 0)
    examples = db.scalars(select(Question).where(Question.skills.contains(skill)).limit(2)).all()
    data = ai.generate_question(skill.subtopic.name, skill.name, difficulty, list(examples))
    if data is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The AI couldn't produce a valid question just now. Try again.")
    question = Question(subtopic_id=skill.subtopic_id, difficulty=difficulty, source="ai_generated", **data)
    question.skills = [skill]
    db.add(question)
    db.commit()
    return QuestionOut.of(question)


@router.post("/attempts", response_model=AttemptOut)
def submit_attempt(body: AttemptIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    question = db.get(Question, body.question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found.")

    goal = mastery.daily_goal(db, user.id)
    is_correct = body.chosen_answer == question.correct_option
    # A plain snapshot, so the AI calls below never touch the database session from another thread.
    learner = SimpleNamespace(locale=user.locale, tutor_name=user.tutor_name, tutor_gender=user.tutor_gender)
    snapshot = SimpleNamespace(
        body=question.body, options=list(question.options), correct_option=question.correct_option, explanation=question.explanation
    )
    # The translated explanation doesn't depend on the diagnosis, so it runs alongside it.
    pool = ThreadPoolExecutor(max_workers=1)
    explanation = pool.submit(ai.explain, snapshot, learner)
    pool.shutdown(wait=False)
    misconception, lesson = (None, None)
    if not is_correct:
        skill_name = question.skills[0].name if question.skills else ""
        misconception, lesson = ai.diagnose(
            question, body.chosen_answer, body.time_taken_ms, skill_name, learner, solution=explanation.result
        )

    attempt = Attempt(
        user_id=user.id,
        question_id=question.id,
        chosen_answer=body.chosen_answer,
        is_correct=is_correct,
        time_taken_ms=body.time_taken_ms,
        misconception_type=misconception,
        hint_used=body.hint_used,
    )
    db.add(attempt)
    db.flush()

    scores = mastery.apply_attempt(db, attempt, question)
    xp = gamification.award_xp(db, user.id, is_correct, question.difficulty)
    goal.completed_questions += 1
    goal_just_completed = goal.completed_questions == goal.target_questions

    micro_lesson = None
    retest_id = None
    if misconception in mastery.NEEDS_RETEST and question.skills:
        micro_lesson = lesson
        retest_id = mastery.question_for_skill(db, user.id, question.skills[0], exclude_id=question.id).id

    badges = gamification.check_badges(db, user.id, goal_just_completed)
    db.commit()

    return AttemptOut(
        is_correct=is_correct,
        correct_option=question.correct_option,
        explanation=explanation.result(),
        misconception_type=misconception,
        micro_lesson=micro_lesson,
        retest_question_id=retest_id,
        xp_gained=xp,
        mastery=[SkillScore(skill=skill.name, score=score) for skill, score in scores],
        new_badges=[BadgeOut(code=b.code, name=b.name, description=b.description) for b in badges],
        daily_goal_completed=goal.completed_questions,
        daily_goal_target=goal.target_questions,
    )
