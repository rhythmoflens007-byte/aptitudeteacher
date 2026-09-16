import pytest

from app.engine.mastery import target_difficulty, updated_score


def test_correct_answers_raise_mastery_with_diminishing_gains():
    low = updated_score(10, True, 2, None) - 10
    high = updated_score(80, True, 2, None) - 80
    assert low > high > 0


def test_harder_correct_answers_count_more():
    assert updated_score(20, True, 4, None) > updated_score(20, True, 1, None)


@pytest.mark.parametrize("worse, milder", [("conceptual_gap", "partial_method"), ("partial_method", "careless_slip")])
def test_penalty_scales_with_misconception_severity(worse, milder):
    assert updated_score(50, False, 3, worse) < updated_score(50, False, 3, milder)


def test_scores_stay_within_bounds():
    assert updated_score(0, False, 5, "conceptual_gap") == 0
    score = 0.0
    for _ in range(200):
        score = updated_score(score, True, 5, None)
    assert score <= 100


@pytest.mark.parametrize("score, level", [(0, 1), (19.9, 1), (20, 2), (55, 3), (79, 4), (80, 5), (100, 5)])
def test_target_difficulty_bands(score, level):
    assert target_difficulty(score) == level
