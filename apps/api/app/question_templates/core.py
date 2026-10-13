import random
from collections.abc import Callable
from dataclasses import dataclass
from fractions import Fraction

MakeFn = Callable[[random.Random], dict]


@dataclass(frozen=True)
class Template:
    name: str
    subtopic: str
    skill: str
    difficulty: int
    make: MakeFn


TEMPLATES: list[Template] = []


def template(subtopic: str, skill: str, difficulty: int):
    def register(fn: MakeFn) -> MakeFn:
        TEMPLATES.append(Template(fn.__name__, subtopic, skill, difficulty, fn))
        return fn

    return register


def num(x) -> str:
    """12 → '12', 12.5 → '12.5', 12000 → '12,000', 1/3 → '0.33'."""
    if isinstance(x, Fraction):
        x = float(x)
    if float(x).is_integer():
        return f"{int(x):,}"
    return f"{round(x, 2):,.2f}".rstrip("0").rstrip(".")


def dec(x) -> str:
    """Up to 4 decimal places, for multipliers like 1.1025 that `num` would over-round."""
    return f"{round(float(x), 4):.4f}".rstrip("0").rstrip(".")


def ordinal(n: int) -> str:
    suffix = "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def rupees(x) -> str:
    return f"₹{num(x)}"


def pct(x) -> str:
    return f"{num(x)}%"


def frac(x: Fraction) -> str:
    return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"


def mcq(
    rng: random.Random,
    body: str,
    correct: str,
    wrongs: list[str],
    explanation: str,
    fallback: Callable[[int], str] | None = None,
) -> dict:
    """Four distinct options: the answer plus the first three usable mistakes, padded by `fallback`."""
    options = [correct]
    for w in wrongs:
        if w not in options:
            options.append(w)
        if len(options) == 4:
            break
    step = 1
    while len(options) < 4:
        if fallback is None or step > 60:
            raise ValueError(f"not enough distinct options for: {body}")
        candidate = fallback(step)
        if candidate not in options:
            options.append(candidate)
        step += 1
    rng.shuffle(options)
    return {"body": body, "options": options, "correct_option": correct, "explanation": explanation}


def near(value: float, fmt: Callable = num, gap: float | None = None) -> Callable[[int], str]:
    """Pads options with values a little either side of the answer."""
    if gap is None:
        gap = max(1, round(abs(value) * 0.1)) if abs(value) >= 5 else 1

    def pick(step: int) -> str:
        offset = gap * ((step + 1) // 2) * (1 if step % 2 else -1)
        # Never offer zero or a negative amount; step further up instead.
        return fmt(value + offset if value + offset > 0 else value + gap * (step + 2))

    return pick


MALE = ["Arjun", "Rahul", "Vikram", "Karthik", "Rohan", "Aditya", "Imran", "Suresh", "Manoj", "Nikhil", "Farhan", "Ravi"]
FEMALE = ["Priya", "Ananya", "Meera", "Kavya", "Sneha", "Divya", "Fatima", "Lakshmi", "Pooja", "Nisha", "Asha", "Riya"]
PEOPLE = MALE + FEMALE


def names(rng: random.Random, k: int) -> list[str]:
    return rng.sample(PEOPLE, k)
