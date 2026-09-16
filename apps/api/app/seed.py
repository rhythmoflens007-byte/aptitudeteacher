from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Badge, Question, Skill, Subtopic, Topic
from app.db.session import Base, SessionLocal, engine
from app.engine.gamification import BADGES
from app.seed_data import CURRICULUM


def _get_or_create(db: Session, model, **fields):
    row = db.scalar(select(model).filter_by(**fields))
    if row is None:
        row = model(**fields)
        db.add(row)
        db.flush()
    return row


def seed(db: Session) -> int:
    """Adds any badges, topics, skills and questions from seed_data that aren't in the database yet."""
    for code, name, description in BADGES:
        if not db.scalar(select(Badge).where(Badge.code == code)):
            db.add(Badge(code=code, name=name, description=description))

    existing = set(db.scalars(select(Question.body)).all())
    added = 0
    for (topic_name, slug), subtopics in CURRICULUM.items():
        topic = db.scalar(select(Topic).where(Topic.slug == slug)) or _get_or_create(db, Topic, name=topic_name, slug=slug)
        for subtopic_name, skills in subtopics.items():
            subtopic = _get_or_create(db, Subtopic, topic_id=topic.id, name=subtopic_name)
            for skill_name, questions in skills.items():
                skill = _get_or_create(db, Skill, subtopic_id=subtopic.id, name=skill_name)
                for difficulty, body, options, correct, explanation in questions:
                    if body in existing:
                        continue
                    question = Question(
                        subtopic_id=subtopic.id,
                        difficulty=difficulty,
                        body=body,
                        options=options,
                        correct_option=correct,
                        explanation=explanation,
                        source="seed",
                    )
                    question.skills = [skill]
                    db.add(question)
                    existing.add(body)
                    added += 1
    db.commit()
    return added


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        added = seed(db)
        print(f"added {added} questions; total {db.scalar(select(func.count()).select_from(Question))}")
