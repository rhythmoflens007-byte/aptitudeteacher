from app.seed_data import CURRICULUM


def all_questions():
    for (topic, _), subtopics in CURRICULUM.items():
        for subtopic, skills in subtopics.items():
            for skill, questions in skills.items():
                for q in questions:
                    yield topic, subtopic, skill, q


def test_three_sections():
    assert [t for t, _ in CURRICULUM] == ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"]


def test_every_question_is_well_formed():
    problems = []
    for topic, subtopic, skill, (difficulty, body, options, correct, explanation) in all_questions():
        where = f"{topic} / {subtopic} / {skill}: {body[:50]}"
        if difficulty not in range(1, 6):
            problems.append(f"bad difficulty {difficulty}: {where}")
        if len(options) != 4 or len(set(options)) != 4:
            problems.append(f"needs 4 distinct options: {where}")
        if correct not in options:
            problems.append(f"answer not among options: {where}")
        if len(explanation.strip()) < 20:
            problems.append(f"explanation too thin: {where}")
    assert not problems, "\n".join(problems)


def test_no_duplicate_questions():
    bodies = [q[1] for *_, q in all_questions()]
    assert len(bodies) == len(set(bodies))


def test_every_skill_has_enough_questions_to_retest():
    thin = [f"{s} / {k}" for _, s, k, _ in all_questions()]
    counts = {name: thin.count(name) for name in set(thin)}
    assert all(n >= 2 for n in counts.values()), {k: v for k, v in counts.items() if v < 2}
