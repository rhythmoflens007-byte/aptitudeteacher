import random
from typing import get_args

from sqlalchemy import func, inspect, select, text
from sqlalchemy.orm import Session

from app.db.models import Badge, Question, Skill, Subtopic, Topic
from app.db.session import Base, SessionLocal, engine
from app.engine.gamification import BADGES
from app.question_templates import TEMPLATES
from app.schemas import Locale
from app.seed_data import CURRICULUM

PER_TEMPLATE = 8


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
    skills_by_name: dict[tuple[str, str], Skill] = {}
    added = 0
    for (topic_name, slug), subtopics in CURRICULUM.items():
        topic = db.scalar(select(Topic).where(Topic.slug == slug)) or _get_or_create(db, Topic, name=topic_name, slug=slug)
        for subtopic_name, skills in subtopics.items():
            subtopic = _get_or_create(db, Subtopic, topic_id=topic.id, name=subtopic_name)
            for skill_name, questions in skills.items():
                skill = _get_or_create(db, Skill, subtopic_id=subtopic.id, name=skill_name)
                skills_by_name[(subtopic_name, skill_name)] = skill
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
    added += seed_templates(db, skills_by_name, existing)
    db.commit()
    return added


def seed_templates(db: Session, skills_by_name: dict[tuple[str, str], Skill], existing: set[str]) -> int:
    """A fixed starter set from every template. Seeded by name, so each restart recreates the same
    questions and adds nothing new unless a template itself changes."""
    added = 0
    for tpl in TEMPLATES:
        skill = skills_by_name[(tpl.subtopic, tpl.skill)]
        rng = random.Random(tpl.name)
        batch: set[str] = set()
        for k in range(PER_TEMPLATE * 10):
            if len(batch) == PER_TEMPLATE:
                break
            made = {**tpl.make(rng), "template": tpl.name, "variant": f"s{k}"}
            if made["body"] in batch:
                continue
            batch.add(made["body"])
            if made["body"] in existing:
                continue
            question = Question(subtopic_id=skill.subtopic_id, difficulty=tpl.difficulty, source="template", **made)
            question.skills = [skill]
            db.add(question)
            existing.add(made["body"])
            added += 1
    return added


def link_templates(db: Session) -> int:
    """Questions seeded before templates were recorded get their template and seed back, by re-running
    the seeding sequence and matching the text, so they can be translated too."""
    unlinked = {q.body: q for q in db.scalars(select(Question).where(Question.source == "template", Question.template.is_(None)))}
    if not unlinked:
        return 0
    linked = 0
    for tpl in TEMPLATES:
        rng = random.Random(tpl.name)
        for k in range(PER_TEMPLATE * 10):
            question = unlinked.get(tpl.make(rng)["body"])
            if question is not None and question.template is None:
                question.template, question.variant = tpl.name, f"s{k}"
                linked += 1
    db.commit()
    return linked


def add_missing_columns() -> None:
    """create_all never alters existing tables, so add columns introduced after a database was created."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in present:
                    continue
                ddl = f'ALTER TABLE {table.name} ADD COLUMN {column.name} {column.type.compile(engine.dialect)}'
                if column.server_default is not None:
                    ddl += f" DEFAULT '{column.server_default.arg}'"
                conn.execute(text(ddl))


def retire_unsupported_locales() -> None:
    """Moves accounts on a language the app no longer offers back to English."""
    supported = get_args(Locale)
    if "users" not in inspect(engine).get_table_names():
        return
    placeholders = ", ".join(f":l{i}" for i in range(len(supported)))
    with engine.begin() as conn:
        conn.execute(
            text(f"UPDATE users SET locale = 'en' WHERE locale IS NULL OR locale NOT IN ({placeholders})"),
            {f"l{i}": code for i, code in enumerate(supported)},
        )


def init_db() -> None:
    Base.metadata.create_all(engine)
    add_missing_columns()
    retire_unsupported_locales()
    with SessionLocal() as db:
        seed(db)
        link_templates(db)


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    add_missing_columns()
    with SessionLocal() as db:
        added = seed(db)
        print(f"added {added} questions; total {db.scalar(select(func.count()).select_from(Question))}")
