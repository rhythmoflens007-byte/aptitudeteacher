from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Badge, Question, Skill, Subtopic, Topic
from app.db.session import Base, SessionLocal, engine
from app.engine.gamification import BADGES
from app.seed_data import CURRICULUM


def seed(db: Session) -> None:
    for code, name, description in BADGES:
        if not db.scalar(select(Badge).where(Badge.code == code)):
            db.add(Badge(code=code, name=name, description=description))

    if db.scalar(select(func.count()).select_from(Topic)):
        db.commit()
        return

    for (topic_name, slug), subtopics in CURRICULUM.items():
        topic = Topic(name=topic_name, slug=slug)
        db.add(topic)
        for subtopic_name, skills in subtopics.items():
            subtopic = Subtopic(topic=topic, name=subtopic_name)
            db.add(subtopic)
            for skill_name, questions in skills.items():
                skill = Skill(subtopic=subtopic, name=skill_name)
                db.add(skill)
                for difficulty, body, options, correct, explanation in questions:
                    assert correct in options, f"Seed answer not among options: {body}"
                    question = Question(
                        subtopic=subtopic,
                        difficulty=difficulty,
                        body=body,
                        options=options,
                        correct_option=correct,
                        explanation=explanation,
                        source="seed",
                    )
                    question.skills = [skill]
                    db.add(question)
    db.commit()


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    init_db()
    with SessionLocal() as db:
        print("questions:", db.scalar(select(func.count()).select_from(Question)))
