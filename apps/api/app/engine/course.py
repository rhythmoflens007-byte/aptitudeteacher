"""The course path: each topic is a section of units (subtopics), each skill has three lessons of rising
difficulty, and each unit ends with a checkpoint that mixes its skills. Lessons unlock in order.
"""

import random
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import question_templates
from app.db.models import Attempt, LessonProgress, LessonRun, Question, QuestionSkill, Skill, Subtopic, Topic, utcnow
from app.seed_data import CURRICULUM

LEVELS = (1, 2, 3)
LEVEL_DIFFICULTY = {1: 1, 2: 3, 3: 4}
LESSON_SIZE = 8
CHECKPOINT_SIZE = 10
CHECKPOINT_DIFFICULTY = 3
RECENT_DAYS = 3


def _order() -> dict[str, tuple[int, int, dict[str, int]]]:
    """Curriculum order: topic slug -> its position, and each subtopic's position and skill order."""
    out = {}
    for t_index, ((_, slug), subtopics) in enumerate(CURRICULUM.items()):
        out[slug] = (t_index, {name: (s_index, {k: i for i, k in enumerate(skills)}) for s_index, (name, skills) in enumerate(subtopics.items())})
    return out


def skill_key(skill_id: str, level: int) -> str:
    return f"skill:{skill_id}:{level}"


def checkpoint_key(subtopic_id: str) -> str:
    return f"unit:{subtopic_id}"


def build_path(db: Session) -> list[dict]:
    """Sections in curriculum order, each with its units and lessons (without the learner's progress)."""
    order = _order()
    sections = []
    for topic in sorted(db.scalars(select(Topic)).all(), key=lambda t: order.get(t.slug, (99, {}))[0]):
        sub_order = order.get(topic.slug, (99, {}))[1]
        units = []
        for sub in sorted(topic.subtopics, key=lambda s: sub_order.get(s.name, (99, {}))[0]):
            skill_order = sub_order.get(sub.name, (99, {}))[1]
            skills = sorted(sub.skills, key=lambda k: skill_order.get(k.name, 99))
            lessons = [
                {"key": skill_key(k.id, level), "kind": "skill", "skill": k.name, "skill_id": k.id, "level": level}
                for k in skills
                for level in LEVELS
            ]
            lessons.append({"key": checkpoint_key(sub.id), "kind": "checkpoint", "skill": None, "skill_id": None, "level": None})
            units.append({"id": sub.id, "name": sub.name, "lessons": lessons})
        sections.append({"id": topic.id, "name": topic.name, "slug": topic.slug, "units": units})
    return sections


def with_progress(db: Session, user_id: str, sections: list[dict]) -> list[dict]:
    """Marks every lesson done, current (the next one to take) or locked; each section unlocks on its own."""
    progress = {p.lesson_key: p for p in db.scalars(select(LessonProgress).where(LessonProgress.user_id == user_id)).all()}
    for section in sections:
        found_current = False
        done_count = total = 0
        for unit in section["units"]:
            unit_done = 0
            for lesson in unit["lessons"]:
                total += 1
                row = progress.get(lesson["key"])
                if row:
                    lesson["state"], lesson["stars"] = "done", row.stars
                    done_count += 1
                    unit_done += 1
                elif not found_current:
                    lesson["state"], lesson["stars"] = "current", 0
                    found_current = True
                else:
                    lesson["state"], lesson["stars"] = "locked", 0
            unit["done"] = unit_done
            unit["total"] = len(unit["lessons"])
        section["done"] = done_count
        section["total"] = total
    return sections


def find_lesson(sections: list[dict], key: str) -> tuple[dict, dict, dict] | None:
    for section in sections:
        for unit in section["units"]:
            for lesson in unit["lessons"]:
                if lesson["key"] == key:
                    return section, unit, lesson
    return None


def next_lesson(sections: list[dict], key: str) -> str | None:
    for section in sections:
        flat = [lesson for unit in section["units"] for lesson in unit["lessons"]]
        for i, lesson in enumerate(flat):
            if lesson["key"] == key:
                return flat[i + 1]["key"] if i + 1 < len(flat) else None
    return None


def _pick(db: Session, user_id: str, skills: list[Skill], target: int, count: int) -> list[Question]:
    """Questions near the target difficulty, unseen ones first, writing new ones from templates if a skill runs short."""
    since = utcnow() - timedelta(days=RECENT_DAYS)
    recent = set(
        db.scalars(select(Attempt.question_id).where(Attempt.user_id == user_id, Attempt.created_at >= since)).all()
    )
    chosen: list[Question] = []
    per_skill = [count // len(skills) + (1 if i < count % len(skills) else 0) for i in range(len(skills))]
    for skill, want in zip(skills, per_skill):
        pool = db.scalars(select(Question).join(QuestionSkill).where(QuestionSkill.skill_id == skill.id)).all()
        scored = sorted(pool, key=lambda q: abs(q.difficulty - target) + (3 if q.id in recent else 0) + random.random())
        good = [q for q in scored if abs(q.difficulty - target) <= 1 and q.id not in recent]
        picks = good[:want]
        avoid = {q.body for q in pool}
        while len(picks) < want:
            made = question_templates.generate(skill.subtopic.name, skill.name, target, avoid)
            if not made:
                break
            data, difficulty = made
            question = Question(subtopic_id=skill.subtopic_id, difficulty=difficulty, source="generated", **data)
            question.skills = [skill]
            db.add(question)
            db.flush()
            avoid.add(question.body)
            picks.append(question)
        # Skills without templates (verbal) reuse the closest questions, seen or not.
        for q in scored:
            if len(picks) >= want:
                break
            if q not in picks:
                picks.append(q)
        chosen += picks
    random.shuffle(chosen)
    return chosen


def start_run(db: Session, user_id: str, lesson: dict, unit: dict) -> tuple[LessonRun, list[Question]]:
    if lesson["kind"] == "checkpoint":
        skills = list(db.get(Subtopic, unit["id"]).skills)
        questions = _pick(db, user_id, skills, CHECKPOINT_DIFFICULTY, CHECKPOINT_SIZE)
    else:
        skill = db.get(Skill, lesson["skill_id"])
        questions = _pick(db, user_id, [skill], LEVEL_DIFFICULTY[lesson["level"]], LESSON_SIZE)
    run = LessonRun(user_id=user_id, lesson_key=lesson["key"], question_ids=[q.id for q in questions])
    db.add(run)
    db.flush()
    return run, questions


def stars_for(accuracy: float) -> int:
    return 3 if accuracy >= 0.9 else 2 if accuracy >= 0.7 else 1


def first_tries(db: Session, run: LessonRun) -> dict[str, bool]:
    """Whether each question was right the first time it was answered in this run."""
    out: dict[str, bool] = {}
    for a in db.scalars(select(Attempt).where(Attempt.lesson_run_id == run.id).order_by(Attempt.created_at)).all():
        out.setdefault(a.question_id, a.is_correct)
    return out
