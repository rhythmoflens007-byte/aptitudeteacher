import random
from datetime import date, timedelta
from math import isqrt

from app.question_templates.core import FEMALE, MALE, mcq, near, num, ordinal, template

ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
COMPASS = ["North", "East", "South", "West"]


def plus(c: int) -> str:
    """' + 2', ' - 1' or '' for a constant term."""
    return f" + {c}" if c > 0 else f" - {abs(c)}" if c < 0 else ""


def series_question(rng, terms: list[int], ans: int, wrongs: list[int], steps: str) -> dict:
    return mcq(
        rng,
        f"Find the next number: {', '.join(map(str, terms))}, ?",
        str(ans),
        [str(w) for w in wrongs if w != ans],
        steps,
        near(ans, str, max(1, abs(ans) // 20)),
    )


# ---------------------------------------------------------------- Number Series

@template("Number Series", "Finding the series pattern", 1)
def arithmetic(rng):
    a, d = rng.randint(2, 40), rng.choice([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, -3, -4, -5, -7])
    if d < 0:
        a += 60
    terms = [a + i * d for i in range(5)]
    ans = a + 5 * d
    return series_question(
        rng, terms, ans, [ans + d, ans - 1, terms[-1] + 2 * d],
        f"1. Each term {'adds' if d > 0 else 'subtracts'} {abs(d)}: the differences are all {d}.\n2. {terms[-1]} {'+' if d > 0 else '-'} {abs(d)} = {ans}.",
    )


@template("Number Series", "Finding the series pattern", 2)
def geometric(rng):
    a, r = rng.randint(1, 6), rng.choice([2, 3, 4])
    terms = [a * r ** i for i in range(5)]
    ans = a * r ** 5
    return series_question(
        rng, terms, ans, [terms[-1] + (terms[-1] - terms[-2]), terms[-1] * (r + 1), ans - a],
        f"1. Each term is the previous one × {r}.\n2. {terms[-1]} × {r} = {ans}.",
    )


@template("Number Series", "Finding the series pattern", 2)
def times_and_add(rng):
    k, c = rng.choice([2, 3]), rng.choice([-2, -1, 1, 2, 3])
    t = [rng.randint(2, 7)]
    for _ in range(4):
        t.append(t[-1] * k + c)
    ans = t[-1] * k + c
    sign = "+" if c > 0 else "-"
    return series_question(
        rng, t, ans, [t[-1] * k, t[-1] * k - c, t[-1] + (t[-1] - t[-2]) * k],
        f"1. Each term = previous × {k} {sign} {abs(c)}.\n   e.g. {t[0]} × {k} {sign} {abs(c)} = {t[1]}.\n2. {t[-1]} × {k} {sign} {abs(c)} = {ans}.",
    )


@template("Number Series", "Finding the series pattern", 3)
def growing_gaps(rng):
    a, d0, s = rng.randint(1, 20), rng.randint(1, 6), rng.randint(1, 4)
    t = [a]
    for i in range(5):
        t.append(t[-1] + d0 + i * s)
    ans = t[-1] + d0 + 5 * s
    diffs = [t[i + 1] - t[i] for i in range(5)]
    return series_question(
        rng, t, ans, [t[-1] + diffs[-1], ans + s, ans - s],
        f"1. Differences: {', '.join(map(str, diffs))}. Each difference grows by {s}.\n"
        f"2. The next difference is {diffs[-1] + s}.\n3. {t[-1]} + {diffs[-1] + s} = {ans}.",
    )


@template("Number Series", "Finding the series pattern", 3)
def doubling_gaps(rng):
    a, d0 = rng.randint(1, 15), rng.randint(1, 5)
    t = [a]
    for i in range(5):
        t.append(t[-1] + d0 * 2 ** i)
    ans = t[-1] + d0 * 2 ** 5
    diffs = [t[i + 1] - t[i] for i in range(5)]
    return series_question(
        rng, t, ans, [t[-1] + diffs[-1], t[-1] * 2, ans + d0],
        f"1. Differences: {', '.join(map(str, diffs))}. Each difference doubles.\n"
        f"2. The next difference is {diffs[-1] * 2}.\n3. {t[-1]} + {diffs[-1] * 2} = {ans}.",
    )


@template("Number Series", "Finding the series pattern", 3)
def powers_plus(rng):
    p, c, start = rng.choice([2, 3]), rng.choice([-2, -1, 0, 1, 2, 3]), rng.randint(1, 6)
    t = [n ** p + c for n in range(start, start + 5)]
    ans = (start + 5) ** p + c
    word, sup = ("square", "²") if p == 2 else ("cube", "³")
    return series_question(
        rng, t, ans, [t[-1] + (t[-1] - t[-2]), (start + 6) ** p + c, ans + 1],
        f"1. The terms follow n{sup}{plus(c)} for n = {start}, {start + 1}, {start + 2}…: "
        f"{', '.join(f'{n}{sup}{plus(c)}' for n in range(start, start + 5))}.\n"
        f"2. Next n = {start + 5}: {start + 5}{sup}{plus(c)} = {ans}.\n"
        f"Spot it by checking each term against the nearest {word}.",
    )


@template("Number Series", "Finding the series pattern", 4)
def two_series_interleaved(rng):
    a, d1 = rng.randint(1, 10), rng.randint(2, 5)
    b, d2 = rng.randint(10, 30), rng.randint(3, 9)
    t = []
    for i in range(3):
        t += [a + i * d1, b + i * d2]
    t = t[:6]
    ans = a + 3 * d1
    return series_question(
        rng, t, ans, [b + 3 * d2, t[-1] + d2, ans + d1],
        f"1. Two series are mixed together. Odd places: {a}, {a + d1}, {a + 2 * d1} (+{d1} each). Even places: {b}, {b + d2}, {b + 2 * d2} (+{d2} each).\n"
        f"2. The next term is in the odd places: {a + 2 * d1} + {d1} = {ans}.",
    )


# ---------------------------------------------------------------- Blood Relations

def person(rng, gender: str | None = None, used: set | None = None) -> tuple[str, str]:
    used = used if used is not None else set()
    gender = gender or rng.choice(["m", "f"])
    name = rng.choice([n for n in (MALE if gender == "m" else FEMALE) if n not in used])
    used.add(name)
    return name, gender


def g(gender: str, male: str, female: str) -> str:
    return male if gender == "m" else female


def relation(rng, body: str, answer: str, wrongs: list[str], steps: str) -> dict:
    return mcq(rng, body, answer, wrongs, steps, lambda s: ["Cannot be determined", "Grandfather", "Cousin", "Brother-in-law"][s % 4])


@template("Blood Relations", "Tracing relationship chains", 1)
def child_of_mothers_brother(rng):
    used: set = set()
    s, _ = person(rng, used=used)
    pointed = rng.choice(["m", "f"])
    return relation(
        rng,
        f"Pointing to a {g(pointed, 'man', 'woman')}, {s} says, '{g(pointed, 'He', 'She')} is the {g(pointed, 'son', 'daughter')} of my mother's only brother.' "
        f"How is the {g(pointed, 'man', 'woman')} related to {s}?",
        "Cousin",
        [g(pointed, "Brother", "Sister"), g(pointed, "Nephew", "Niece"), g(pointed, "Uncle", "Aunt")],
        f"1. {s}'s mother's brother is {s}'s maternal uncle.\n2. The uncle's {g(pointed, 'son', 'daughter')} is {s}'s cousin.",
    )


@template("Blood Relations", "Tracing relationship chains", 1)
def grandparent(rng):
    used: set = set()
    a, ag = person(rng, used=used)
    b, _ = person(rng, used=used)
    c, cg = person(rng, used=used)
    return relation(
        rng,
        f"{a} is the {g(ag, 'father', 'mother')} of {b}. {c} is the {g(cg, 'father', 'mother')} of {a}. How is {c} related to {b}?",
        g(cg, "Grandfather", "Grandmother"),
        [g(cg, "Father", "Mother"), g(cg, "Uncle", "Aunt"), g(cg, "Great-grandfather", "Great-grandmother")],
        f"1. {c} is {a}'s parent, and {a} is {b}'s parent.\n2. A parent's parent is a grandparent, so {c} is {b}'s {g(cg, 'grandfather', 'grandmother')}.",
    )


@template("Blood Relations", "Tracing relationship chains", 2)
def siblings_child(rng):
    used: set = set()
    a, ag = person(rng, used=used)
    b, bg = person(rng, used=used)
    c, cg = person(rng, used=used)
    return relation(
        rng,
        f"{a} is the {g(ag, 'son', 'daughter')} of {b}. {b} is the {g(bg, 'brother', 'sister')} of {c}. How is {a} related to {c}?",
        g(ag, "Nephew", "Niece"),
        [g(ag, "Son", "Daughter"), "Cousin", g(ag, "Brother", "Sister")],
        f"1. {b} and {c} are siblings.\n2. {a} is {b}'s child, so {c} is {a}'s {g(cg, 'uncle', 'aunt')}.\n3. That makes {a} {c}'s {g(ag, 'nephew', 'niece')}.",
    )


@template("Blood Relations", "Tracing relationship chains", 2)
def parents_spouse(rng):
    used: set = set()
    a, ag = person(rng, used=used)
    b, bg = person(rng, used=used)
    c, cg = person(rng, used=used)
    d, _ = person(rng, "f" if cg == "m" else "m", used=used)
    return relation(
        rng,
        f"{a} is the {g(ag, 'brother', 'sister')} of {b}. {b} is the {g(bg, 'son', 'daughter')} of {c}. "
        f"{d} is the {g(cg, 'wife', 'husband')} of {c}. How is {a} related to {d}?",
        g(ag, "Son", "Daughter"),
        [g(ag, "Nephew", "Niece"), g(ag, "Brother", "Sister"), g(ag, "Grandson", "Granddaughter")],
        f"1. {a} and {b} are siblings, so they share parents.\n2. {c} is their {g(cg, 'father', 'mother')}, and {d} is {c}'s {g(cg, 'wife', 'husband')}.\n"
        f"3. So {d} is {a}'s {g(cg, 'mother', 'father')}, which makes {a} {d}'s {g(ag, 'son', 'daughter')}.",
    )


@template("Blood Relations", "Tracing relationship chains", 2)
def grandfathers_only_son(rng):
    used: set = set()
    s, _ = person(rng, used=used)
    pointed = rng.choice(["m", "f"])
    return relation(
        rng,
        f"Pointing to a {g(pointed, 'boy', 'girl')} in a photo, {s} says, '{g(pointed, 'He', 'She')} is the {g(pointed, 'son', 'daughter')} "
        f"of my paternal grandfather's only son.' How is the {g(pointed, 'boy', 'girl')} related to {s}?",
        g(pointed, "Brother", "Sister"),
        ["Cousin", g(pointed, "Nephew", "Niece"), g(pointed, "Son", "Daughter")],
        f"1. {s}'s paternal grandfather's only son must be {s}'s father.\n2. The father's {g(pointed, 'son', 'daughter')} is {s}'s {g(pointed, 'brother', 'sister')}.",
    )


@template("Blood Relations", "Tracing relationship chains", 2)
def brothers_child(rng):
    used: set = set()
    a, _ = person(rng, "m", used)
    b, _ = person(rng, "m", used)
    c, _ = person(rng, "f", used)
    d, dg = person(rng, used=used)
    return relation(
        rng,
        f"{a} and {b} are brothers. {c} is {a}'s wife. {d} is {b}'s {g(dg, 'son', 'daughter')}. How is {d} related to {c}?",
        g(dg, "Nephew", "Niece"),
        [g(dg, "Son", "Daughter"), "Cousin", g(dg, "Brother-in-law", "Sister-in-law")],
        f"1. {c} is married to {a}, so {b} is her brother-in-law.\n2. {d} is {b}'s child, so {c} is {d}'s aunt.\n3. That makes {d} {c}'s {g(dg, 'nephew', 'niece')}.",
    )


@template("Blood Relations", "Tracing relationship chains", 2)
def grandchild(rng):
    used: set = set()
    a, ag = person(rng, used=used)
    b, bg = person(rng, used=used)
    c, cg = person(rng, used=used)
    return relation(
        rng,
        f"{b} is the {g(bg, 'father', 'mother')} of {c}. {c} is the {g(cg, 'father', 'mother')} of {a}. How is {a} related to {b}?",
        g(ag, "Grandson", "Granddaughter"),
        [g(ag, "Son", "Daughter"), g(ag, "Nephew", "Niece"), g(ag, "Great-grandson", "Great-granddaughter")],
        f"1. {b} is {c}'s parent and {c} is {a}'s parent.\n2. So {b} is {a}'s grandparent, and {a} is {b}'s {g(ag, 'grandson', 'granddaughter')}.",
    )


@template("Blood Relations", "Tracing relationship chains", 3)
def fathers_only_son(rng):
    used: set = set()
    a, _ = person(rng, used=used)
    b, bg = person(rng, used=used)
    if bg == "m":
        answer, wrongs = "Father", ["Uncle", "Brother", "Grandfather"]
        steps = (f"1. The only son of {b}'s father is {b} himself.\n2. So {a}'s father is {b}.")
    else:
        answer, wrongs = "Aunt", ["Mother", "Sister", "Cousin"]
        steps = (f"1. {b} is a woman, so the only son of {b}'s father is {b}'s brother.\n"
                 f"2. That brother is {a}'s father, so {b} is {a}'s father's sister: {a}'s aunt.")
    return relation(rng, f"{a}'s father is the only son of {b}'s father. How is {b} related to {a}?", answer, wrongs, steps)


@template("Blood Relations", "Tracing relationship chains", 3)
def sisters_grandchild(rng):
    used: set = set()
    a, _ = person(rng, "f", used)
    b, _ = person(rng, "f", used)
    c, cg = person(rng, used=used)
    d, dg = person(rng, used=used)
    return relation(
        rng,
        f"{a} is the mother of {b}. {b} is the sister of {c}. {d} is the {g(dg, 'son', 'daughter')} of {c}. How is {a} related to {d}?",
        "Grandmother",
        ["Mother", "Aunt", "Great-grandmother"],
        f"1. {b} and {c} are siblings, so {a} is {c}'s mother too.\n2. {d} is {c}'s child, so {a} is {d}'s grandmother.",
    )


@template("Blood Relations", "Tracing relationship chains", 3)
def great_uncle(rng):
    used: set = set()
    p, _ = person(rng, "m", used)
    q, _ = person(rng, used=used)
    r, _ = person(rng, "f", used)
    s, sg = person(rng, used=used)
    return relation(
        rng,
        f"{p} is the father of {q}. {r} is the mother of {p}. {s} is the {g(sg, 'brother', 'sister')} of {r}. How is {s} related to {q}?",
        g(sg, "Great-uncle", "Great-aunt"),
        [g(sg, "Uncle", "Aunt"), g(sg, "Grandfather", "Grandmother"), "Cousin"],
        f"1. {r} is {p}'s mother, so {r} is {q}'s grandmother.\n2. {s} is {r}'s {g(sg, 'brother', 'sister')}, i.e. the {g(sg, 'brother', 'sister')} of {q}'s grandmother.\n"
        f"3. A grandparent's {g(sg, 'brother', 'sister')} is a {g(sg, 'great-uncle', 'great-aunt')}.",
    )


@template("Blood Relations", "Tracing relationship chains", 3)
def only_daughter_of_my_mother(rng):
    used: set = set()
    x, xg = person(rng, used=used)
    if xg == "m":
        answer, wrongs = "Maternal uncle", ["Father", "Brother", "Grandfather"]
        steps = f"1. The only daughter of {x}'s mother is {x}'s sister.\n2. The woman's mother is {x}'s sister.\n3. So {x} is the woman's maternal uncle."
    else:
        answer, wrongs = "Mother", ["Aunt", "Sister", "Grandmother"]
        steps = f"1. {x} is a woman, so the only daughter of {x}'s mother is {x} herself.\n2. The woman's mother is {x}, so {x} is her mother."
    return relation(
        rng, f"Introducing a woman, {x} says, 'Her mother is the only daughter of my mother.' How is {x} related to the woman?",
        answer, wrongs, steps,
    )


# ---------------------------------------------------------------- Coding-Decoding

WORDS = ["CAT", "DOG", "SUN", "PEN", "BOOK", "TREE", "FISH", "MILK", "LAMP", "RAIN", "GOLD", "STAR", "BIRD", "SHIP",
         "TABLE", "CHAIR", "WATER", "PLANT", "MANGO", "TIGER", "HOUSE", "LIGHT", "SMILE", "BREAD", "TRAIN", "CLOUD",
         "SCHOOL", "MARKET", "FRIEND", "GARDEN", "WINDOW", "PENCIL", "BOTTLE", "FLOWER"]


def shift(word: str, k: int) -> str:
    return "".join(ALPHA[(ALPHA.index(ch) + k) % 26] for ch in word)


def shift_each(word: str, ks: list[int]) -> str:
    return "".join(ALPHA[(ALPHA.index(ch) + k) % 26] for ch, k in zip(word, ks))


def mirror(word: str) -> str:
    return "".join(ALPHA[25 - ALPHA.index(ch)] for ch in word)


def code_question(rng, w1, c1, w2, answer, wrongs, steps) -> dict:
    fallback = lambda s: shift(answer, s + 4)  # noqa: E731
    return mcq(rng, f"If {w1} is coded as {c1}, how is {w2} coded?", answer, wrongs, steps, fallback)


def two_words(rng, same_length: bool = False) -> tuple[str, str]:
    w1 = rng.choice(WORDS)
    pool = [w for w in WORDS if w != w1 and (len(w) == len(w1) or not same_length)]
    return w1, rng.choice(pool)


@template("Coding-Decoding", "Letter-shift codes", 1)
def forward_shift(rng):
    k = rng.choice([1, 2, 3])
    w1, w2 = two_words(rng)
    ans = shift(w2, k)
    return code_question(
        rng, w1, shift(w1, k), w2, ans, [shift(w2, k + 1), shift(w2, -k), shift(w2, k - 1) if k > 1 else shift(w2, k + 2)],
        f"1. Each letter moves {k} step{'s' if k > 1 else ''} forward: {', '.join(f'{a}→{b}' for a, b in zip(w1, shift(w1, k)))}.\n"
        f"2. {w2}: {', '.join(f'{a}→{b}' for a, b in zip(w2, ans))}, giving {ans}.",
    )


@template("Coding-Decoding", "Letter-shift codes", 2)
def backward_shift(rng):
    k = rng.choice([1, 2, 3, 4])
    w1, w2 = two_words(rng)
    ans = shift(w2, -k)
    return code_question(
        rng, w1, shift(w1, -k), w2, ans, [shift(w2, k), shift(w2, -k - 1), shift(w2, -k + 1) if k > 1 else shift(w2, -3)],
        f"1. Each letter moves {k} step{'s' if k > 1 else ''} back: {', '.join(f'{a}→{b}' for a, b in zip(w1, shift(w1, -k)))}.\n"
        f"2. {w2}: {', '.join(f'{a}→{b}' for a, b in zip(w2, ans))}, giving {ans}.\nAfter A the alphabet wraps round to Z.",
    )


@template("Coding-Decoding", "Letter-shift codes", 3)
def growing_shift(rng):
    start = rng.choice([1, 2])
    w1, w2 = two_words(rng, same_length=True)
    ks = [start + i for i in range(len(w1))]
    ans = shift_each(w2, ks)
    return code_question(
        rng, w1, shift_each(w1, ks), w2, ans, [shift(w2, start), shift_each(w2, [k + 1 for k in ks]), shift_each(w2, ks[::-1])],
        f"1. The shifts grow by one each letter: {', '.join(f'{a}+{k}={b}' for a, k, b in zip(w1, ks, shift_each(w1, ks)))}.\n"
        f"2. {w2}: {', '.join(f'{a}+{k}={b}' for a, k, b in zip(w2, ks, ans))}, giving {ans}.",
    )


@template("Coding-Decoding", "Letter-shift codes", 3)
def mirror_code(rng):
    w1, w2 = two_words(rng)
    ans = mirror(w2)
    return code_question(
        rng, w1, mirror(w1), w2, ans, [shift(w2, 1), mirror(w2)[::-1], shift(mirror(w2), 1)],
        f"1. Each letter is replaced by its mirror in the alphabet (A↔Z, B↔Y, C↔X…): {', '.join(f'{a}→{b}' for a, b in zip(w1, mirror(w1)))}.\n"
        f"2. {w2}: {', '.join(f'{a}→{b}' for a, b in zip(w2, ans))}, giving {ans}.\nTip: a letter and its mirror always add up to 27 (A=1, Z=26).",
    )


@template("Coding-Decoding", "Letter-shift codes", 3)
def reverse_then_shift(rng):
    k = rng.choice([1, 2])
    w1, w2 = two_words(rng)
    ans = shift(w2[::-1], k)
    return code_question(
        rng, w1, shift(w1[::-1], k), w2, ans, [shift(w2, k), w2[::-1], shift(w2[::-1], -k)],
        f"1. The word is written backwards, then each letter moves {k} forward: {w1} → {w1[::-1]} → {shift(w1[::-1], k)}.\n"
        f"2. {w2} → {w2[::-1]} → {ans}.",
    )


def positions(word: str) -> list[int]:
    return [ALPHA.index(ch) + 1 for ch in word]


@template("Coding-Decoding", "Number codes", 1)
def letter_sum(rng):
    w1, w2 = two_words(rng)
    ans = sum(positions(w2))
    return mcq(
        rng,
        f"If {w1} = {sum(positions(w1))} (adding the positions of its letters in the alphabet), what is {w2}?",
        str(ans),
        [str(ans + 1), str(ans - 2), str(sum(27 - p for p in positions(w2)))],
        f"1. A=1, B=2 … Z=26. {w1} = {' + '.join(map(str, positions(w1)))} = {sum(positions(w1))}.\n"
        f"2. {w2} = {' + '.join(map(str, positions(w2)))} = {ans}.",
        near(ans, str, 3),
    )


@template("Coding-Decoding", "Number codes", 2)
def position_digits(rng):
    pool = [w for w in WORDS if all(p < 10 for p in positions(w))] + ["BAD", "FACE", "CAGE", "BEAD", "FADE", "HIDE", "DICE", "BIG", "ACHE"]
    w1, w2 = rng.sample(pool, 2)
    code = lambda w: "".join(map(str, positions(w)))  # noqa: E731
    ans = code(w2)
    return mcq(
        rng,
        f"If {w1} is coded as {code(w1)}, how is {w2} coded?",
        ans,
        ["".join(str(p + 1) for p in positions(w2)), ans[::-1], "".join(str(27 - p) for p in positions(w2))],
        f"1. Each letter is replaced by its position in the alphabet: {', '.join(f'{c}={p}' for c, p in zip(w1, positions(w1)))}.\n"
        f"2. {w2}: {', '.join(f'{c}={p}' for c, p in zip(w2, positions(w2)))}, giving {ans}.",
        lambda s: str(int(ans) + s),
    )


@template("Coding-Decoding", "Number codes", 3)
def number_rule_code(rng):
    rules = [
        ("n × (n + 1)", lambda n: n * (n + 1)), ("n² + 1", lambda n: n * n + 1), ("n² - 1", lambda n: n * n - 1),
        ("n × (n + 2)", lambda n: n * (n + 2)), ("n³", lambda n: n ** 3), ("2n + 3", lambda n: 2 * n + 3), ("n² + n + 1", lambda n: n * n + n + 1),
    ]
    text, f = rng.choice(rules)
    xs = sorted(rng.sample(range(2, 8), 3))
    q = rng.choice([n for n in range(5, 13) if n not in xs])
    ans = f(q)
    return mcq(
        rng,
        f"In a code, {', '.join(f'{x} = {f(x)}' for x in xs)}. What does {q} equal?",
        str(ans),
        [str(f(q - 1)), str(f(q + 1)), str(ans + q)],
        f"1. Each number n is coded as {text}: {', '.join(f'{x} → {f(x)}' for x in xs)}.\n2. For {q}: {ans}.",
        near(ans, str),
    )


# ---------------------------------------------------------------- Direction Sense

TRIPLES = [(3, 4, 5), (6, 8, 10), (5, 12, 13), (8, 15, 17), (9, 12, 15), (12, 16, 20), (7, 24, 25), (15, 20, 25)]


def heading_label(x: int, y: int) -> str:
    ns = "North" if y > 0 else "South" if y < 0 else ""
    ew = "East" if x > 0 else "West" if x < 0 else ""
    return f"{ns}-{ew}" if ns and ew else ns or ew


@template("Direction Sense", "Direction and displacement", 1)
def two_legs(rng):
    a, b, c = rng.choice(TRIPLES)
    first, second = rng.choice([("north", "east"), ("south", "west"), ("east", "north"), ("west", "south"), ("north", "west"), ("south", "east")])
    who = rng.choice(MALE + FEMALE)
    return mcq(
        rng,
        f"{who} walks {a} km {first} and then {b} km {second}. How far is {who} from the starting point?",
        f"{c} km",
        [f"{a + b} km", f"{abs(b - a)} km", f"{c + 2} km"],
        f"1. {first.capitalize()} and {second} are at right angles, so use Pythagoras.\n2. Distance = √({a}² + {b}²) = √{a * a + b * b} = {c} km.\n"
        f"The {a + b} km option is the total path walked, not the distance from the start.",
        lambda s: f"{c + s * 3} km",
    )


@template("Direction Sense", "Direction and displacement", 2)
def facing_after_turns(rng):
    start = rng.randrange(4)
    moves = []
    facing = start
    for _ in range(rng.randint(2, 4)):
        turn = rng.choice([("90° clockwise", 1), ("90° anticlockwise", -1), ("180°", 2), ("right", 1), ("left", -1)])
        moves.append(turn)
        facing = (facing + turn[1]) % 4
    who = rng.choice(MALE + FEMALE)
    trail, now = [], start
    for word, step in moves:
        nxt = (now + step) % 4
        trail.append(f"{COMPASS[now]} turned {word} → {COMPASS[nxt]}")
        now = nxt
    turns = ", then ".join(("turns " + w) if w in ("right", "left") else ("turns " + w) for w, _ in moves)
    return mcq(
        rng,
        f"{who} faces {COMPASS[start]}, {turns}. Which direction is {who} facing now?",
        COMPASS[facing],
        [d for d in COMPASS if d != COMPASS[facing]],
        "\n".join(f"{i + 1}. {t}." for i, t in enumerate(trail)),
    )


@template("Direction Sense", "Direction and displacement", 3)
def walk_and_turn(rng):
    while True:
        heading = rng.randrange(4)
        x = y = 0
        legs, path = [], 0
        steps_text = []
        for i in range(rng.randint(3, 4)):
            if i:
                turn = rng.choice(["left", "right"])
                heading = (heading + (1 if turn == "right" else -1)) % 4
            d = rng.randrange(2, 21, 2)
            dx, dy = [(0, 1), (1, 0), (0, -1), (-1, 0)][heading]
            x, y = x + dx * d, y + dy * d
            path += d
            legs.append((None if not i else turn, d, COMPASS[heading]))
            steps_text.append(f"{i + 1}. {'Start' if not i else 'Turn ' + turn + ', now facing ' + COMPASS[heading]}: {d} m {COMPASS[heading].lower()} → ({x}, {y}).")
        dist2 = x * x + y * y
        root = isqrt(dist2)
        if dist2 and (root * root == dist2 or (abs(x) == abs(y))):
            break
    distance = f"{root} m" if root * root == dist2 else f"{abs(x)}√2 m"
    answer = f"{distance}, {heading_label(x, y)}"
    first = legs[0]
    parts = [f"walks {first[1]} m {first[2].lower()}"] + [f"turns {t} and walks {d} m" for t, d, _ in legs[1:]]
    opposite = heading_label(-x, -y)
    return mcq(
        rng,
        f"A man {', '.join(parts[:-1])}, then {parts[-1]}. Where is he now relative to his starting point?",
        answer,
        [f"{distance}, {opposite}", f"{path} m, {heading_label(x, y)}", f"{distance}, {heading_label(y, x) if heading_label(y, x) != heading_label(x, y) else heading_label(-y, x)}"],
        "Take the start as (0, 0), with north as +y and east as +x.\n" + "\n".join(steps_text)
        + f"\nDistance = √({abs(x)}² + {abs(y)}²) = {distance}, towards the {heading_label(x, y).lower()}.",
        lambda s: f"{path + 2 * s} m, {opposite}",
    )


# ---------------------------------------------------------------- Seating Arrangement / ranking

@template("Seating Arrangement", "Linear arrangement", 1)
def row_total(rng):
    p, q = rng.randint(3, 30), rng.randint(3, 30)
    who = rng.choice(MALE + FEMALE)
    return mcq(
        rng,
        f"In a row of students, {who} is {ordinal(p)} from the left and {ordinal(q)} from the right. How many students are in the row?",
        str(p + q - 1),
        [str(p + q), str(p + q + 1), str(p + q - 2)],
        f"1. Adding both positions counts {who} twice: {p} + {q} = {p + q}.\n2. Remove the double count: {p + q} - 1 = {p + q - 1}.",
    )


@template("Seating Arrangement", "Linear arrangement", 2)
def rank_from_bottom(rng):
    n = rng.randint(20, 60)
    p = rng.randint(3, n - 3)
    who = rng.choice(MALE + FEMALE)
    return mcq(
        rng,
        f"{who} ranks {ordinal(p)} from the top in a class of {n} students. What is {who}'s rank from the bottom?",
        ordinal(n - p + 1),
        [ordinal(n - p), ordinal(n - p + 2), ordinal(p)],
        f"1. Rank from top + rank from bottom = total + 1.\n2. Rank from bottom = {n} - {p} + 1 = {n - p + 1}.",
        lambda s: ordinal(n - p + 2 + s),
    )


@template("Seating Arrangement", "Linear arrangement", 2)
def people_between(rng):
    while True:
        n, p, q = rng.randint(20, 50), rng.randint(3, 20), rng.randint(3, 20)
        if p + q < n - 1:
            break
    a, b = rng.sample(MALE + FEMALE, 2)
    between = n - p - q
    return mcq(
        rng,
        f"In a row of {n} children, {a} is {ordinal(p)} from the left and {b} is {ordinal(q)} from the right. How many children are between them?",
        str(between),
        [str(between + 1), str(between - 1) if between > 1 else str(between + 2), str(n - p - q - 2) if between > 2 else str(between + 3)],
        f"1. {a} is in seat {p} from the left. {b} is {ordinal(q)} from the right, i.e. seat {n - q + 1} from the left.\n"
        f"2. Children between = {n - q + 1} - {p} - 1 = {between}.",
        lambda s: str(between + 3 + s),
    )


@template("Seating Arrangement", "Linear arrangement", 3)
def swap_places(rng):
    a_left, b_right = rng.randint(5, 20), rng.randint(5, 20)
    new_left = a_left + rng.randint(3, 12)
    n = new_left + b_right - 1
    a, b = rng.sample(MALE + FEMALE, 2)
    return mcq(
        rng,
        f"In a row, {a} is {ordinal(a_left)} from the left and {b} is {ordinal(b_right)} from the right. "
        f"When they swap places, {a} becomes {ordinal(new_left)} from the left. How many people are in the row?",
        str(n),
        [str(a_left + b_right - 1), str(new_left + b_right), str(n + a_left - 1)],
        f"1. After swapping, {a} sits in {b}'s old seat, which is {ordinal(b_right)} from the right.\n"
        f"2. So that seat is {ordinal(new_left)} from the left and {ordinal(b_right)} from the right.\n3. Total = {new_left} + {b_right} - 1 = {n}.",
        lambda s: str(n + 2 + s),
    )


# ---------------------------------------------------------------- Clocks and Calendars

def degrees(x: float) -> str:
    return f"{num(x)}°"


@template("Clocks and Calendars", "Clock angles", 2)
def angle_between_hands(rng):
    while True:
        h, m = rng.randint(1, 12), rng.choice(range(5, 60, 5))
        hour = (h % 12) * 30 + m * 0.5
        minute = m * 6
        angle = abs(hour - minute)
        angle = min(angle, 360 - angle)
        if angle not in (0, 180) and abs((h % 12) * 30 - minute) != angle:
            break
    naive = abs((h % 12) * 30 - minute)
    naive = min(naive, 360 - naive)
    return mcq(
        rng,
        f"What is the angle between the hour and minute hands of a clock at {h}:{m:02d}?",
        degrees(angle),
        [degrees(naive), degrees(360 - angle), degrees(angle + 15)],
        f"1. Minute hand: {m} × 6 = {minute}°.\n2. Hour hand: {h % 12} × 30 + {m} × 0.5 = {num(hour)}°.\n"
        f"3. Angle = |{num(hour)} - {minute}| = {num(abs(hour - minute))}°" + (f", and the smaller angle is 360 - {num(abs(hour - minute))} = {num(angle)}°" if abs(hour - minute) > 180 else "") + ".\n"
        f"{degrees(naive)} is the trap: it forgets the hour hand moves as the minutes pass.",
        lambda s: degrees(angle + 5 * s + 20),
    )


@template("Clocks and Calendars", "Clock angles", 3)
def hands_together(rng):
    h = rng.randint(1, 10)
    total = 60 * h
    whole, rem = divmod(total, 11)
    answer = f"{whole} {rem}/11 minutes past {h}" if rem else f"{whole} minutes past {h}"
    return mcq(
        rng,
        f"At what time between {h} and {h + 1} o'clock are the hands of a clock exactly together?",
        answer,
        [f"{5 * h} minutes past {h}", f"{whole + 1} minutes past {h}", f"{whole} {(rem + 3) % 11 or 1}/11 minutes past {h}"],
        f"1. At {h}:00 the minute hand is {h * 30}° behind the hour hand.\n2. It gains 6 - 0.5 = 5.5° per minute.\n"
        f"3. Time to catch up = {h * 30} ÷ 5.5 = {total}/11 = {whole}{f' {rem}/11' if rem else ''} minutes.",
        lambda s: f"{whole - s} minutes past {h}",
    )


@template("Clocks and Calendars", "Day of the week", 1)
def days_later(rng):
    today = rng.randrange(7)
    n = rng.randint(15, 400)
    ans = WEEKDAYS[(today + n) % 7]
    return mcq(
        rng,
        f"If today is {WEEKDAYS[today]}, what day of the week will it be {n} days from today?",
        ans,
        [WEEKDAYS[(today + n + 1) % 7], WEEKDAYS[(today + n - 1) % 7], WEEKDAYS[(today + n % 10) % 7]],
        f"1. Every 7 days the weekday repeats, so only the remainder matters.\n2. {n} = 7 × {n // 7} + {n % 7}.\n3. {WEEKDAYS[today]} + {n % 7} days = {ans}.",
        lambda s: WEEKDAYS[(today + n + 2 + s) % 7],
    )


def long_date(d: date) -> str:
    return f"{d.day} {d.strftime('%B')} {d.year}"


def count_days(a: date, b: date) -> str:
    if (a.year, a.month) == (b.year, b.month):
        return f"{b.day} - {a.day} = {(b - a).days}"
    parts = []
    first_month_end = date(a.year + (a.month == 12), a.month % 12 + 1, 1) - timedelta(days=1)
    parts.append(f"{(first_month_end - a).days} (rest of {a.strftime('%B')})")
    cur = first_month_end + timedelta(days=1)
    while (cur.year, cur.month) != (b.year, b.month):
        end = date(cur.year + (cur.month == 12), cur.month % 12 + 1, 1) - timedelta(days=1)
        leap = cur.month == 2 and end.day == 29
        parts.append(f"{end.day} ({cur.strftime('%B')}{', leap year' if leap else ''})")
        cur = end + timedelta(days=1)
    parts.append(f"{b.day} ({b.strftime('%B')})")
    return " + ".join(parts) + f" = {(b - a).days}"


@template("Clocks and Calendars", "Day of the week", 2)
def weekday_of_date(rng):
    while True:
        a = date(rng.randint(2015, 2030), rng.randint(1, 12), rng.randint(1, 28))
        b = a + timedelta(days=rng.randint(20, 120))
        if (b - a).days % 7:
            break
    n = (b - a).days
    ans = WEEKDAYS[b.weekday()]
    return mcq(
        rng,
        f"{long_date(a)} was a {WEEKDAYS[a.weekday()]}. What day of the week was {long_date(b)}?",
        ans,
        [WEEKDAYS[(b.weekday() + 1) % 7], WEEKDAYS[(b.weekday() - 1) % 7], WEEKDAYS[(a.weekday() + n % 10) % 7]],
        f"1. Days from {long_date(a)} to {long_date(b)} = {count_days(a, b)}.\n2. {n} = 7 × {n // 7} + {n % 7}, so {n % 7} odd days.\n"
        f"3. {WEEKDAYS[a.weekday()]} + {n % 7} = {ans}.",
        lambda s: WEEKDAYS[(b.weekday() + 2 + s) % 7],
    )


@template("Clocks and Calendars", "Day of the week", 3)
def across_a_leap_february(rng):
    year = rng.choice([2016, 2020, 2024, 2028])
    a = date(year, rng.randint(1, 2), rng.randint(1, 28))
    b = date(year, rng.randint(3, 5), rng.randint(1, 28))
    n = (b - a).days
    ans = WEEKDAYS[b.weekday()]
    off_by_one = WEEKDAYS[(b.weekday() - 1) % 7]
    return mcq(
        rng,
        f"{long_date(a)} was a {WEEKDAYS[a.weekday()]}. What day of the week was {long_date(b)}?",
        ans,
        [off_by_one, WEEKDAYS[(b.weekday() + 1) % 7], WEEKDAYS[(b.weekday() + 3) % 7]],
        f"1. {year} is a leap year, so February has 29 days.\n2. Days = {count_days(a, b)}.\n"
        f"3. {n} = 7 × {n // 7} + {n % 7}, so {WEEKDAYS[a.weekday()]} + {n % 7} = {ans}.\n{off_by_one} is what you get if you forget 29 February.",
    )


# ---------------------------------------------------------------- Classification and Analogies

@template("Classification and Analogies", "Letter and number analogies", 1)
def number_analogy(rng):
    rules = [
        (lambda n: n * n, lambda n: f"{n}²"), (lambda n: n ** 3, lambda n: f"{n}³"),
        (lambda n: n * n + 1, lambda n: f"{n}² + 1"), (lambda n: n * n - 1, lambda n: f"{n}² - 1"),
        (lambda n: n * (n + 1), lambda n: f"{n} × {n + 1}"), (lambda n: 2 * n + 1, lambda n: f"2 × {n} + 1"),
    ]
    f, show = rng.choice(rules)
    a, b = rng.sample(range(3, 13), 2)
    ans = f(b)
    return mcq(
        rng,
        f"{a} : {f(a)} :: {b} : ?",
        str(ans),
        [str(b * b) if b * b != ans else str(b ** 3), str(f(b + 1)), str(ans + 2)],
        f"1. Find the rule: {f(a)} = {show(a)}.\n2. Apply the same rule to {b}: {show(b)} = {ans}.",
        near(ans, str),
    )


@template("Classification and Analogies", "Letter and number analogies", 2)
def letter_analogy(rng):
    k, step = rng.choice([1, 2, 3]), rng.choice([1, 2])
    while True:
        s1, s2 = rng.randint(0, 18), rng.randint(0, 18)
        if s1 != s2:
            break
    group = lambda s: "".join(ALPHA[s + i * step] for i in range(3))  # noqa: E731
    g1, g2 = group(s1), group(s2)
    ans = shift(g2, k)
    return mcq(
        rng,
        f"{g1} : {shift(g1, k)} :: {g2} : ?",
        ans,
        [shift(g2, k + 1), shift(g2, -k), g2[::-1]],
        f"1. Each letter moves forward by {k}: {', '.join(f'{a}→{b}' for a, b in zip(g1, shift(g1, k)))}.\n"
        f"2. {', '.join(f'{a}→{b}' for a, b in zip(g2, ans))}, giving {ans}.",
        lambda s: shift(g2, k + 2 + s),
    )


@template("Classification and Analogies", "Letter and number analogies", 3)
def mirror_analogy(rng):
    s1, s2 = rng.sample(range(0, 10), 2)
    g1 = ALPHA[s1:s1 + 3][::-1] if rng.random() < 0.5 else ALPHA[s1:s1 + 3]
    g2 = ALPHA[s2:s2 + 3]
    ans = mirror(g2)
    return mcq(
        rng,
        f"{g1} : {mirror(g1)} :: {g2} : ?",
        ans,
        [shift(g2, 3), ans[::-1], shift(ans, 1)],
        f"1. Each letter is paired with its mirror in the alphabet: {', '.join(f'{a}↔{b}' for a, b in zip(g1, mirror(g1)))}.\n"
        f"2. {', '.join(f'{a}↔{b}' for a, b in zip(g2, ans))}, giving {ans}.",
    )


def is_prime(n: int) -> bool:
    return n > 1 and all(n % d for d in range(2, isqrt(n) + 1))


@template("Classification and Analogies", "Odd one out", 2)
def odd_number_out(rng):
    kind = rng.choice(["prime", "square", "cube", "multiple"])
    if kind == "prime":
        group = rng.sample([p for p in range(11, 100) if is_prime(p)], 3)
        odd = rng.choice([c for c in [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93] if c not in group])
        why = f"{', '.join(map(str, sorted(group)))} are prime numbers; {odd} is not ({factor_pair(odd)})."
    elif kind == "square":
        group = [n * n for n in rng.sample(range(4, 16), 3)]
        odd = rng.choice([x for x in range(20, 230) if isqrt(x) ** 2 != x and abs(isqrt(x) ** 2 - x) <= 3])
        why = f"{', '.join(f'{x} = {isqrt(x)}²' for x in sorted(group))} are perfect squares; {odd} is not."
    elif kind == "cube":
        group = [n ** 3 for n in rng.sample(range(2, 10), 3)]
        odd = rng.choice([x * x for x in range(5, 25) if round((x * x) ** (1 / 3)) ** 3 != x * x])
        why = f"{', '.join(f'{x} = {round(x ** (1 / 3))}³' for x in sorted(group))} are perfect cubes; {odd} is a square, not a cube."
    else:
        k = rng.choice([6, 7, 8, 9, 11, 12, 13])
        group = [k * m for m in rng.sample(range(3, 12), 3)]
        odd = k * rng.randint(3, 11) + rng.choice([1, 2, -1])
        why = f"{', '.join(map(str, sorted(group)))} are all multiples of {k}; {odd} is not."
    items = group + [odd]
    rng.shuffle(items)
    return mcq(
        rng,
        f"Find the odd one out: {', '.join(map(str, items))}",
        str(odd),
        [str(x) for x in group],
        why,
    )


def factor_pair(n: int) -> str:
    d = next(d for d in range(2, n) if n % d == 0)
    return f"{n} = {d} × {n // d}"


@template("Classification and Analogies", "Odd one out", 3)
def odd_letter_group(rng):
    step = rng.choice([1, 2, 3])
    starts = rng.sample(range(0, 26 - 3 * step - 2), 4)
    groups = ["".join(ALPHA[s + i * step] for i in range(3)) for s in starts]
    odd_i = rng.randrange(4)
    s = starts[odd_i]
    groups[odd_i] = ALPHA[s] + ALPHA[s + step] + ALPHA[s + 2 * step + 1]
    odd = groups[odd_i]
    return mcq(
        rng,
        f"Find the odd one out: {', '.join(groups)}",
        odd,
        [x for x in groups if x != odd],
        f"1. In each group the letters go up by {step}: e.g. {groups[(odd_i + 1) % 4]}.\n"
        f"2. In {odd} the gaps are {step} and {step + 1}, so it breaks the pattern.",
    )
