import random
from datetime import date, timedelta
from math import isqrt

from app.question_templates.core import FEMALE, MALE, L, T, mcq, near, num, ordinal, template

ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
COMPASS = ["North", "East", "South", "West"]


def plus(c: int) -> str:
    """' + 2', ' - 1' or '' for a constant term."""
    return f" + {c}" if c > 0 else f" - {abs(c)}" if c < 0 else ""


def series_question(rng, terms: list[int], ans: int, wrongs: list[int], steps: str) -> dict:
    return mcq(
        rng,
        T("Find the next number: {x1}, ?", x1=', '.join(map(str, terms))),
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
        T("1. Each term {x1} {d}: the differences are all {d2}.\n2. {x2} {x3} {d} = {ans}.", x1=T("adds") if d > 0 else T("subtracts"), d=abs(d), d2=d, x2=terms[-1], x3='+' if d > 0 else '-', ans=ans),
    )


@template("Number Series", "Finding the series pattern", 2)
def geometric(rng):
    a, r = rng.randint(1, 6), rng.choice([2, 3, 4])
    terms = [a * r ** i for i in range(5)]
    ans = a * r ** 5
    return series_question(
        rng, terms, ans, [terms[-1] + (terms[-1] - terms[-2]), terms[-1] * (r + 1), ans - a],
        T("1. Each term is the previous one × {r}.\n2. {x1} × {r} = {ans}.", r=r, x1=terms[-1], ans=ans),
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
        T("1. Each term = previous × {k} {sign} {c}.\n"
            "   e.g. {x1} × {k} {sign} {c} = {x2}.\n"
            "2. {x3} × {k} {sign} {c} = {ans}.", k=k, sign=sign, c=abs(c), x1=t[0], x2=t[1], x3=t[-1], ans=ans),
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
        T("1. Differences: {x1}. Each difference grows by {s}.\n"
            "2. The next difference is {x2}.\n"
            "3. {x3} + {x4} = {ans}.", x1=', '.join(map(str, diffs)), s=s, x2=diffs[-1] + s, x3=t[-1], x4=diffs[-1] + s, ans=ans),
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
        T("1. Differences: {x1}. Each difference doubles.\n"
            "2. The next difference is {x2}.\n"
            "3. {x3} + {x4} = {ans}.", x1=', '.join(map(str, diffs)), x2=diffs[-1] * 2, x3=t[-1], x4=diffs[-1] * 2, ans=ans),
    )


@template("Number Series", "Finding the series pattern", 3)
def powers_plus(rng):
    p, c, start = rng.choice([2, 3]), rng.choice([-2, -1, 0, 1, 2, 3]), rng.randint(1, 6)
    t = [n ** p + c for n in range(start, start + 5)]
    ans = (start + 5) ** p + c
    word, sup = ("square", "²") if p == 2 else ("cube", "³")
    return series_question(
        rng, t, ans, [t[-1] + (t[-1] - t[-2]), (start + 6) ** p + c, ans + 1],
        T("1. The terms follow n{sup}{x1} for n = {start}, {x2}, {x3}…: {x4}.\n"
            "2. Next n = {x5}: {x6}{sup}{x7} = {ans}.\n"
            "Spot it by checking each term against the nearest {word}.", sup=sup, x1=plus(c), start=start, x2=start + 1, x3=start + 2, x4=', '.join(f'{n}{sup}{plus(c)}' for n in range(start, start + 5)), x5=start + 5, x6=start + 5, x7=plus(c), ans=ans, word=word),
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
        T("1. Two series are mixed together. Odd places: {a}, {x1}, {x2} (+{d1} each). Even places: {b}, {x3}, {x4} (+{d2} each).\n"
            "2. The next term is in the odd places: {x5} + {d1} = {ans}.", a=a, x1=a + d1, x2=a + 2 * d1, d1=d1, b=b, x3=b + d2, x4=b + 2 * d2, d2=d2, x5=a + 2 * d1, ans=ans),
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
    return mcq(rng, body, answer, wrongs, steps, lambda s: [T("Cannot be determined"), T("Grandfather"), T("Cousin"), T("Brother-in-law")][s % 4])


@template("Blood Relations", "Tracing relationship chains", 1)
def child_of_mothers_brother(rng):
    used: set = set()
    s, _ = person(rng, used=used)
    pointed = rng.choice(["m", "f"])
    return relation(
        rng,
        T("Pointing to a {x1}, {s} says, '{x2} is the {x3} of my mother's only brother.' How is the {x4} related to {s}?", x1=g(pointed, T("man"), T("woman")), s=s, x2=g(pointed, 'He', T("She")), x3=g(pointed, T("son"), T("daughter")), x4=g(pointed, T("man"), T("woman"))),
        T("Cousin"),
        [g(pointed, T("Brother"), T("Sister")), g(pointed, T("Nephew"), T("Niece")), g(pointed, T("Uncle"), T("Aunt"))],
        T("1. {s}'s mother's brother is {s}'s maternal uncle.\n"
            "2. The uncle's {x1} is {s}'s cousin.", s=s, x1=g(pointed, T("son"), T("daughter"))),
    )


@template("Blood Relations", "Tracing relationship chains", 1)
def grandparent(rng):
    used: set = set()
    a, ag = person(rng, used=used)
    b, _ = person(rng, used=used)
    c, cg = person(rng, used=used)
    return relation(
        rng,
        T("{a} is the {x1} of {b}. {c} is the {x2} of {a}. How is {c} related to {b}?", a=a, x1=g(ag, T("father"), T("mother")), b=b, c=c, x2=g(cg, T("father"), T("mother"))),
        g(cg, T("Grandfather"), T("Grandmother")),
        [g(cg, T("Father"), T("Mother")), g(cg, T("Uncle"), T("Aunt")), g(cg, T("Great-grandfather"), T("Great-grandmother"))],
        T("1. {c} is {a}'s parent, and {a} is {b}'s parent.\n"
            "2. A parent's parent is a grandparent, so {c} is {b}'s {x1}.", c=c, a=a, b=b, x1=g(cg, T("grandfather"), T("grandmother"))),
    )


@template("Blood Relations", "Tracing relationship chains", 2)
def siblings_child(rng):
    used: set = set()
    a, ag = person(rng, used=used)
    b, bg = person(rng, used=used)
    c, cg = person(rng, used=used)
    return relation(
        rng,
        T("{a} is the {x1} of {b}. {b} is the {x2} of {c}. How is {a} related to {c}?", a=a, x1=g(ag, T("son"), T("daughter")), b=b, x2=g(bg, T("brother"), T("sister")), c=c),
        g(ag, T("Nephew"), T("Niece")),
        [g(ag, T("Son"), T("Daughter")), T("Cousin"), g(ag, T("Brother"), T("Sister"))],
        T("1. {b} and {c} are siblings.\n"
            "2. {a} is {b}'s child, so {c} is {a}'s {x1}.\n"
            "3. That makes {a} {c}'s {x2}.", b=b, c=c, a=a, x1=g(cg, T("uncle"), T("aunt")), x2=g(ag, T("nephew"), T("niece"))),
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
        T("{a} is the {x1} of {b}. {b} is the {x2} of {c}. {d} is the {x3} of {c}. How is {a} related to {d}?", a=a, x1=g(ag, T("brother"), T("sister")), b=b, x2=g(bg, T("son"), T("daughter")), c=c, d=d, x3=g(cg, T("wife"), T("husband"))),
        g(ag, T("Son"), T("Daughter")),
        [g(ag, T("Nephew"), T("Niece")), g(ag, T("Brother"), T("Sister")), g(ag, T("Grandson"), T("Granddaughter"))],
        T("1. {a} and {b} are siblings, so they share parents.\n"
            "2. {c} is their {x1}, and {d} is {c}'s {x2}.\n"
            "3. So {d} is {a}'s {x3}, which makes {a} {d}'s {x4}.", a=a, b=b, c=c, x1=g(cg, T("father"), T("mother")), d=d, x2=g(cg, T("wife"), T("husband")), x3=g(cg, T("mother"), T("father")), x4=g(ag, T("son"), T("daughter"))),
    )


@template("Blood Relations", "Tracing relationship chains", 2)
def grandfathers_only_son(rng):
    used: set = set()
    s, _ = person(rng, used=used)
    pointed = rng.choice(["m", "f"])
    return relation(
        rng,
        T("Pointing to a {x1} in a photo, {s} says, '{x2} is the {x3} of my paternal grandfather's only son.' How is the {x4} related to {s}?", x1=g(pointed, T("boy"), T("girl")), s=s, x2=g(pointed, 'He', T("She")), x3=g(pointed, T("son"), T("daughter")), x4=g(pointed, T("boy"), T("girl"))),
        g(pointed, T("Brother"), T("Sister")),
        [T("Cousin"), g(pointed, T("Nephew"), T("Niece")), g(pointed, T("Son"), T("Daughter"))],
        T("1. {s}'s paternal grandfather's only son must be {s}'s father.\n"
            "2. The father's {x1} is {s}'s {x2}.", s=s, x1=g(pointed, T("son"), T("daughter")), x2=g(pointed, T("brother"), T("sister"))),
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
        T("{a} and {b} are brothers. {c} is {a}'s wife. {d} is {b}'s {x1}. How is {d} related to {c}?", a=a, b=b, c=c, d=d, x1=g(dg, T("son"), T("daughter"))),
        g(dg, T("Nephew"), T("Niece")),
        [g(dg, T("Son"), T("Daughter")), T("Cousin"), g(dg, T("Brother-in-law"), T("Sister-in-law"))],
        T("1. {c} is married to {a}, so {b} is her brother-in-law.\n"
            "2. {d} is {b}'s child, so {c} is {d}'s aunt.\n"
            "3. That makes {d} {c}'s {x1}.", c=c, a=a, b=b, d=d, x1=g(dg, T("nephew"), T("niece"))),
    )


@template("Blood Relations", "Tracing relationship chains", 2)
def grandchild(rng):
    used: set = set()
    a, ag = person(rng, used=used)
    b, bg = person(rng, used=used)
    c, cg = person(rng, used=used)
    return relation(
        rng,
        T("{b} is the {x1} of {c}. {c} is the {x2} of {a}. How is {a} related to {b}?", b=b, x1=g(bg, T("father"), T("mother")), c=c, x2=g(cg, T("father"), T("mother")), a=a),
        g(ag, T("Grandson"), T("Granddaughter")),
        [g(ag, T("Son"), T("Daughter")), g(ag, T("Nephew"), T("Niece")), g(ag, T("Great-grandson"), T("Great-granddaughter"))],
        T("1. {b} is {c}'s parent and {c} is {a}'s parent.\n"
            "2. So {b} is {a}'s grandparent, and {a} is {b}'s {x1}.", b=b, c=c, a=a, x1=g(ag, T("grandson"), T("granddaughter"))),
    )


@template("Blood Relations", "Tracing relationship chains", 3)
def fathers_only_son(rng):
    used: set = set()
    a, _ = person(rng, used=used)
    b, bg = person(rng, used=used)
    if bg == "m":
        answer, wrongs = T("Father"), [T("Uncle"), T("Brother"), T("Grandfather")]
        steps = (T("1. The only son of {b}'s father is {b} himself.\n2. So {a}'s father is {b}.", b=b, a=a))
    else:
        answer, wrongs = T("Aunt"), [T("Mother"), T("Sister"), T("Cousin")]
        steps = (T("1. {b} is a woman, so the only son of {b}'s father is {b}'s brother.\n"
            "2. That brother is {a}'s father, so {b} is {a}'s father's sister: {a}'s aunt.", b=b, a=a))
    return relation(rng, T("{a}'s father is the only son of {b}'s father. How is {b} related to {a}?", a=a, b=b), answer, wrongs, steps)


@template("Blood Relations", "Tracing relationship chains", 3)
def sisters_grandchild(rng):
    used: set = set()
    a, _ = person(rng, "f", used)
    b, _ = person(rng, "f", used)
    c, cg = person(rng, used=used)
    d, dg = person(rng, used=used)
    return relation(
        rng,
        T("{a} is the mother of {b}. {b} is the sister of {c}. {d} is the {x1} of {c}. How is {a} related to {d}?", a=a, b=b, c=c, d=d, x1=g(dg, T("son"), T("daughter"))),
        T("Grandmother"),
        [T("Mother"), T("Aunt"), T("Great-grandmother")],
        T("1. {b} and {c} are siblings, so {a} is {c}'s mother too.\n"
            "2. {d} is {c}'s child, so {a} is {d}'s grandmother.", b=b, c=c, a=a, d=d),
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
        T("{p} is the father of {q}. {r} is the mother of {p}. {s} is the {x1} of {r}. How is {s} related to {q}?", p=p, q=q, r=r, s=s, x1=g(sg, T("brother"), T("sister"))),
        g(sg, T("Great-uncle"), T("Great-aunt")),
        [g(sg, T("Uncle"), T("Aunt")), g(sg, T("Grandfather"), T("Grandmother")), T("Cousin")],
        T("1. {r} is {p}'s mother, so {r} is {q}'s grandmother.\n"
            "2. {s} is {r}'s {x1}, i.e. the {x2} of {q}'s grandmother.\n"
            "3. A grandparent's {x3} is a {x4}.", r=r, p=p, q=q, s=s, x1=g(sg, T("brother"), T("sister")), x2=g(sg, T("brother"), T("sister")), x3=g(sg, T("brother"), T("sister")), x4=g(sg, T("great-uncle"), T("great-aunt"))),
    )


@template("Blood Relations", "Tracing relationship chains", 3)
def only_daughter_of_my_mother(rng):
    used: set = set()
    x, xg = person(rng, used=used)
    if xg == "m":
        answer, wrongs = T("Maternal uncle"), [T("Father"), T("Brother"), T("Grandfather")]
        steps = T("1. The only daughter of {x}'s mother is {x}'s sister.\n"
            "2. The woman's mother is {x}'s sister.\n"
            "3. So {x} is the woman's maternal uncle.", x=x)
    else:
        answer, wrongs = T("Mother"), [T("Aunt"), T("Sister"), T("Grandmother")]
        steps = T("1. {x} is a woman, so the only daughter of {x}'s mother is {x} herself.\n"
            "2. The woman's mother is {x}, so {x} is her mother.", x=x)
    return relation(
        rng, T("Introducing a woman, {x} says, 'Her mother is the only daughter of my mother.' How is {x} related to the woman?", x=x),
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
    return mcq(rng, T("If {w1} is coded as {c1}, how is {w2} coded?", w1=w1, c1=c1, w2=w2), answer, wrongs, steps, fallback)


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
        T("1. Each letter moves {k} step{x1} forward: {x2}.\n2. {w2}: {x3}, giving {ans}.", k=k, x1='s' if k > 1 else '', x2=', '.join(f'{a}→{b}' for a, b in zip(w1, shift(w1, k))), w2=w2, x3=', '.join(f'{a}→{b}' for a, b in zip(w2, ans)), ans=ans),
    )


@template("Coding-Decoding", "Letter-shift codes", 2)
def backward_shift(rng):
    k = rng.choice([1, 2, 3, 4])
    w1, w2 = two_words(rng)
    ans = shift(w2, -k)
    return code_question(
        rng, w1, shift(w1, -k), w2, ans, [shift(w2, k), shift(w2, -k - 1), shift(w2, -k + 1) if k > 1 else shift(w2, -3)],
        T("1. Each letter moves {k} step{x1} back: {x2}.\n"
            "2. {w2}: {x3}, giving {ans}.\n"
            "After A the alphabet wraps round to Z.", k=k, x1='s' if k > 1 else '', x2=', '.join(f'{a}→{b}' for a, b in zip(w1, shift(w1, -k))), w2=w2, x3=', '.join(f'{a}→{b}' for a, b in zip(w2, ans)), ans=ans),
    )


@template("Coding-Decoding", "Letter-shift codes", 3)
def growing_shift(rng):
    start = rng.choice([1, 2])
    w1, w2 = two_words(rng, same_length=True)
    ks = [start + i for i in range(len(w1))]
    ans = shift_each(w2, ks)
    return code_question(
        rng, w1, shift_each(w1, ks), w2, ans, [shift(w2, start), shift_each(w2, [k + 1 for k in ks]), shift_each(w2, ks[::-1])],
        T("1. The shifts grow by one each letter: {x1}.\n2. {w2}: {x2}, giving {ans}.", x1=', '.join(f'{a}+{k}={b}' for a, k, b in zip(w1, ks, shift_each(w1, ks))), w2=w2, x2=', '.join(f'{a}+{k}={b}' for a, k, b in zip(w2, ks, ans)), ans=ans),
    )


@template("Coding-Decoding", "Letter-shift codes", 3)
def mirror_code(rng):
    w1, w2 = two_words(rng)
    ans = mirror(w2)
    return code_question(
        rng, w1, mirror(w1), w2, ans, [shift(w2, 1), mirror(w2)[::-1], shift(mirror(w2), 1)],
        T("1. Each letter is replaced by its mirror in the alphabet (A↔Z, B↔Y, C↔X…): {x1}.\n"
            "2. {w2}: {x2}, giving {ans}.\n"
            "Tip: a letter and its mirror always add up to 27 (A=1, Z=26).", x1=', '.join(f'{a}→{b}' for a, b in zip(w1, mirror(w1))), w2=w2, x2=', '.join(f'{a}→{b}' for a, b in zip(w2, ans)), ans=ans),
    )


@template("Coding-Decoding", "Letter-shift codes", 3)
def reverse_then_shift(rng):
    k = rng.choice([1, 2])
    w1, w2 = two_words(rng)
    ans = shift(w2[::-1], k)
    return code_question(
        rng, w1, shift(w1[::-1], k), w2, ans, [shift(w2, k), w2[::-1], shift(w2[::-1], -k)],
        T("1. The word is written backwards, then each letter moves {k} forward: {w1} → {x1} → {x2}.\n"
            "2. {w2} → {x3} → {ans}.", k=k, w1=w1, x1=w1[::-1], x2=shift(w1[::-1], k), w2=w2, x3=w2[::-1], ans=ans),
    )


def positions(word: str) -> list[int]:
    return [ALPHA.index(ch) + 1 for ch in word]


@template("Coding-Decoding", "Number codes", 1)
def letter_sum(rng):
    w1, w2 = two_words(rng)
    ans = sum(positions(w2))
    return mcq(
        rng,
        T("If {w1} = {x1} (adding the positions of its letters in the alphabet), what is {w2}?", w1=w1, x1=sum(positions(w1)), w2=w2),
        str(ans),
        [str(ans + 1), str(ans - 2), str(sum(27 - p for p in positions(w2)))],
        T("1. A=1, B=2 … Z=26. {w1} = {x1} = {x2}.\n2. {w2} = {x3} = {ans}.", w1=w1, x1=' + '.join(map(str, positions(w1))), x2=sum(positions(w1)), w2=w2, x3=' + '.join(map(str, positions(w2))), ans=ans),
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
        T("If {w1} is coded as {x1}, how is {w2} coded?", w1=w1, x1=code(w1), w2=w2),
        ans,
        ["".join(str(p + 1) for p in positions(w2)), ans[::-1], "".join(str(27 - p) for p in positions(w2))],
        T("1. Each letter is replaced by its position in the alphabet: {x1}.\n"
            "2. {w2}: {x2}, giving {ans}.", x1=', '.join(f'{c}={p}' for c, p in zip(w1, positions(w1))), w2=w2, x2=', '.join(f'{c}={p}' for c, p in zip(w2, positions(w2))), ans=ans),
        lambda s: str(int(ans) + s),
    )


@template("Coding-Decoding", "Number codes", 3)
def number_rule_code(rng):
    rules = [
        (T("n × (n + 1)"), lambda n: n * (n + 1)), (T("n² + 1"), lambda n: n * n + 1), (T("n² - 1"), lambda n: n * n - 1),
        (T("n × (n + 2)"), lambda n: n * (n + 2)), ("n³", lambda n: n ** 3), (T("2n + 3"), lambda n: 2 * n + 3), (T("n² + n + 1"), lambda n: n * n + n + 1),
    ]
    text, f = rng.choice(rules)
    xs = sorted(rng.sample(range(2, 8), 3))
    q = rng.choice([n for n in range(5, 13) if n not in xs])
    ans = f(q)
    return mcq(
        rng,
        T("In a code, {x1}. What does {q} equal?", x1=', '.join(f'{x} = {f(x)}' for x in xs), q=q),
        str(ans),
        [str(f(q - 1)), str(f(q + 1)), str(ans + q)],
        T("1. Each number n is coded as {text}: {x1}.\n2. For {q}: {ans}.", text=text, x1=', '.join(f'{x} → {f(x)}' for x in xs), q=q, ans=ans),
        near(ans, str),
    )


# ---------------------------------------------------------------- Direction Sense

TRIPLES = [(3, 4, 5), (6, 8, 10), (5, 12, 13), (8, 15, 17), (9, 12, 15), (12, 16, 20), (7, 24, 25), (15, 20, 25)]


def heading_label(x: int, y: int) -> str:
    ns = "North" if y > 0 else "South" if y < 0 else ""
    ew = "East" if x > 0 else "West" if x < 0 else ""
    return L(f"{ns}-{ew}" if ns and ew else ns or ew)


@template("Direction Sense", "Direction and displacement", 1)
def two_legs(rng):
    a, b, c = rng.choice(TRIPLES)
    first, second = rng.choice([(T("north"), T("east")), (T("south"), T("west")), (T("east"), T("north")), (T("west"), T("south")), (T("north"), T("west")), (T("south"), T("east"))])
    who = rng.choice(MALE + FEMALE)
    return mcq(
        rng,
        T("{who} walks {a} km {first} and then {b} km {second}. How far is {who} from the starting point?", who=who, a=a, first=first, b=b, second=second),
        T("{c} km", c=c),
        [T("{x1} km", x1=a + b), T("{x1} km", x1=abs(b - a)), T("{x1} km", x1=c + 2)],
        T("1. {x1} and {second} are at right angles, so use Pythagoras.\n"
            "2. Distance = √({a}² + {b}²) = √{x2} = {c} km.\n"
            "The {x3} km option is the total path walked, not the distance from the start.", x1=first.capitalize(), second=second, a=a, b=b, x2=a * a + b * b, c=c, x3=a + b),
        lambda s: T("{x1} km", x1=c + s * 3),
    )


@template("Direction Sense", "Direction and displacement", 2)
def facing_after_turns(rng):
    start = rng.randrange(4)
    moves = []
    facing = start
    for _ in range(rng.randint(2, 4)):
        turn = rng.choice([(T("90° clockwise"), 1), (T("90° anticlockwise"), -1), ("180°", 2), ("right", 1), (T("left"), -1)])
        moves.append(turn)
        facing = (facing + turn[1]) % 4
    who = rng.choice(MALE + FEMALE)
    trail, now = [], start
    for word, step in moves:
        nxt = (now + step) % 4
        trail.append(T("{x1} turned {word} → {x2}", x1=COMPASS[now], word=word, x2=COMPASS[nxt]))
        now = nxt
    turns = T(", then ").join(T("turns {w}", w=w) for w, _ in moves)
    return mcq(
        rng,
        T("{who} faces {x1}, {turns}. Which direction is {who} facing now?", who=who, x1=COMPASS[start], turns=turns),
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
                turn = rng.choice([T("left"), "right"])
                heading = (heading + (1 if turn == "right" else -1)) % 4
            d = rng.randrange(2, 21, 2)
            dx, dy = [(0, 1), (1, 0), (0, -1), (-1, 0)][heading]
            x, y = x + dx * d, y + dy * d
            path += d
            legs.append((None if not i else turn, d, COMPASS[heading]))
            steps_text.append(T("{x1}. {x2}: {d} m {x3} → ({x}, {y}).", x1=i + 1, x2=T("Start") if not i else T("Turn {turn}, now facing {x1}", turn=turn, x1=COMPASS[heading]), d=d, x3=COMPASS[heading].lower(), x=x, y=y))
        dist2 = x * x + y * y
        root = isqrt(dist2)
        if dist2 and (root * root == dist2 or (abs(x) == abs(y))):
            break
    distance = T("{v} m", v=root) if root * root == dist2 else T("{x}√2 m", x=abs(x))
    answer = f"{distance}, {heading_label(x, y)}"
    first = legs[0]
    parts = [T("walks {x1} m {x2}", x1=first[1], x2=first[2].lower())] + [T("turns {t} and walks {d} m", t=t, d=d) for t, d, _ in legs[1:]]
    opposite = heading_label(-x, -y)
    return mcq(
        rng,
        T("A man {x1}, then {x2}. Where is he now relative to his starting point?", x1=', '.join(parts[:-1]), x2=parts[-1]),
        answer,
        [f"{distance}, {opposite}", T("{path} m, {x1}", path=path, x1=heading_label(x, y)), f"{distance}, {heading_label(y, x) if heading_label(y, x) != heading_label(x, y) else heading_label(-y, x)}"],
        T("Take the start as (0, 0), with north as +y and east as +x.\n") + "\n".join(steps_text)
        + T("\nDistance = √({x}² + {y}²) = {distance}, towards the {x1}.", x=abs(x), y=abs(y), distance=distance, x1=heading_label(x, y).lower()),
        lambda s: T("{x1} m, {opposite}", x1=path + 2 * s, opposite=opposite),
    )


# ---------------------------------------------------------------- Seating Arrangement / ranking

@template("Seating Arrangement", "Linear arrangement", 1)
def row_total(rng):
    p, q = rng.randint(3, 30), rng.randint(3, 30)
    who = rng.choice(MALE + FEMALE)
    return mcq(
        rng,
        T("In a row of students, {who} is {p} from the left and {q} from the right. How many students are in the row?", who=who, p=ordinal(p), q=ordinal(q)),
        str(p + q - 1),
        [str(p + q), str(p + q + 1), str(p + q - 2)],
        T("1. Adding both positions counts {who} twice: {p} + {q} = {x1}.\n"
            "2. Remove the double count: {x2} - 1 = {x3}.", who=who, p=p, q=q, x1=p + q, x2=p + q, x3=p + q - 1),
    )


@template("Seating Arrangement", "Linear arrangement", 2)
def rank_from_bottom(rng):
    n = rng.randint(20, 60)
    p = rng.randint(3, n - 3)
    who = rng.choice(MALE + FEMALE)
    return mcq(
        rng,
        T("{who} ranks {p} from the top in a class of {n} students. What is {who}'s rank from the bottom?", who=who, p=ordinal(p), n=n),
        ordinal(n - p + 1),
        [ordinal(n - p), ordinal(n - p + 2), ordinal(p)],
        T("1. Rank from top + rank from bottom = total + 1.\n"
            "2. Rank from bottom = {n} - {p} + 1 = {x1}.", n=n, p=p, x1=n - p + 1),
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
        T("In a row of {n} children, {a} is {p} from the left and {b} is {q} from the right. How many children are between them?", n=n, a=a, p=ordinal(p), b=b, q=ordinal(q)),
        str(between),
        [str(between + 1), str(between - 1) if between > 1 else str(between + 2), str(n - p - q - 2) if between > 2 else str(between + 3)],
        T("1. {a} is in seat {p} from the left. {b} is {q} from the right, i.e. seat {x1} from the left.\n"
            "2. Children between = {x2} - {p} - 1 = {between}.", a=a, p=p, b=b, q=ordinal(q), x1=n - q + 1, x2=n - q + 1, between=between),
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
        T("In a row, {a} is {a_left} from the left and {b} is {b_right} from the right. When they swap places, {a} becomes {new_left} from the left. How many people are in the row?", a=a, a_left=ordinal(a_left), b=b, b_right=ordinal(b_right), new_left=ordinal(new_left)),
        str(n),
        [str(a_left + b_right - 1), str(new_left + b_right), str(n + a_left - 1)],
        T("1. After swapping, {a} sits in {b}'s old seat, which is {b_right} from the right.\n"
            "2. So that seat is {new_left} from the left and {b_right} from the right.\n"
            "3. Total = {new_left2} + {b_right2} - 1 = {n}.", a=a, b=b, b_right=ordinal(b_right), new_left=ordinal(new_left), new_left2=new_left, b_right2=b_right, n=n),
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
        T("What is the angle between the hour and minute hands of a clock at {h}:{m}?", h=h, m=f"{m:02d}"),
        degrees(angle),
        [degrees(naive), degrees(360 - angle), degrees(angle + 15)],
        T("1. Minute hand: {m} × 6 = {minute}°.\n"
            "2. Hour hand: {x1} × 30 + {m} × 0.5 = {hour}°.\n"
            "3. Angle = |{hour} - {minute}| = {x2}°", m=m, minute=minute, x1=h % 12, hour=num(hour), x2=num(abs(hour - minute))) + (T(", and the smaller angle is 360 - {x1} = {angle}°", x1=num(abs(hour - minute)), angle=num(angle)) if abs(hour - minute) > 180 else "") + T(".\n{x1} is the trap: it forgets the hour hand moves as the minutes pass.", x1=degrees(naive)),
        lambda s: degrees(angle + 5 * s + 20),
    )


@template("Clocks and Calendars", "Clock angles", 3)
def hands_together(rng):
    h = rng.randint(1, 10)
    total = 60 * h
    whole, rem = divmod(total, 11)
    answer = T("{whole} {rem}/11 minutes past {h}", whole=whole, rem=rem, h=h) if rem else T("{whole} minutes past {h}", whole=whole, h=h)
    return mcq(
        rng,
        T("At what time between {h} and {x1} o'clock are the hands of a clock exactly together?", h=h, x1=h + 1),
        answer,
        [T("{x1} minutes past {h}", x1=5 * h, h=h), T("{x1} minutes past {h}", x1=whole + 1, h=h), T("{whole} {x1}/11 minutes past {h}", whole=whole, x1=(rem + 3) % 11 or 1, h=h)],
        T("1. At {h}:00 the minute hand is {x1}° behind the hour hand.\n"
            "2. It gains 6 - 0.5 = 5.5° per minute.\n"
            "3. Time to catch up = {x2} ÷ 5.5 = {total}/11 = {whole}{x3} minutes.", h=h, x1=h * 30, x2=h * 30, total=total, whole=whole, x3=f' {rem}/11' if rem else ''),
        lambda s: T("{x1} minutes past {h}", x1=whole - s, h=h),
    )


@template("Clocks and Calendars", "Day of the week", 1)
def days_later(rng):
    today = rng.randrange(7)
    n = rng.randint(15, 400)
    ans = WEEKDAYS[(today + n) % 7]
    return mcq(
        rng,
        T("If today is {x1}, what day of the week will it be {n} days from today?", x1=WEEKDAYS[today], n=n),
        ans,
        [WEEKDAYS[(today + n + 1) % 7], WEEKDAYS[(today + n - 1) % 7], WEEKDAYS[(today + n % 10) % 7]],
        T("1. Every 7 days the weekday repeats, so only the remainder matters.\n"
            "2. {n} = 7 × {x1} + {x2}.\n"
            "3. {x3} + {x4} days = {ans}.", n=n, x1=n // 7, x2=n % 7, x3=WEEKDAYS[today], x4=n % 7, ans=ans),
        lambda s: WEEKDAYS[(today + n + 2 + s) % 7],
    )


def long_date(d: date) -> str:
    return f"{d.day} {L(d.strftime('%B'))} {d.year}"


def count_days(a: date, b: date) -> str:
    if (a.year, a.month) == (b.year, b.month):
        return f"{b.day} - {a.day} = {(b - a).days}"
    parts = []
    first_month_end = date(a.year + (a.month == 12), a.month % 12 + 1, 1) - timedelta(days=1)
    parts.append(T("{x1} (rest of {x2})", x1=(first_month_end - a).days, x2=a.strftime('%B')))
    cur = first_month_end + timedelta(days=1)
    while (cur.year, cur.month) != (b.year, b.month):
        end = date(cur.year + (cur.month == 12), cur.month % 12 + 1, 1) - timedelta(days=1)
        leap = cur.month == 2 and end.day == 29
        parts.append(f"{end.day} ({L(cur.strftime('%B'))}{T(", leap year") if leap else ''})")
        cur = end + timedelta(days=1)
    parts.append(f"{b.day} ({L(b.strftime('%B'))})")
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
        T("{x1} was a {x2}. What day of the week was {x3}?", x1=long_date(a), x2=WEEKDAYS[a.weekday()], x3=long_date(b)),
        ans,
        [WEEKDAYS[(b.weekday() + 1) % 7], WEEKDAYS[(b.weekday() - 1) % 7], WEEKDAYS[(a.weekday() + n % 10) % 7]],
        T("1. Days from {x1} to {x2} = {x3}.\n"
            "2. {n} = 7 × {x4} + {x5}, so {x6} odd days.\n"
            "3. {x7} + {x8} = {ans}.", x1=long_date(a), x2=long_date(b), x3=count_days(a, b), n=n, x4=n // 7, x5=n % 7, x6=n % 7, x7=WEEKDAYS[a.weekday()], x8=n % 7, ans=ans),
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
        T("{x1} was a {x2}. What day of the week was {x3}?", x1=long_date(a), x2=WEEKDAYS[a.weekday()], x3=long_date(b)),
        ans,
        [off_by_one, WEEKDAYS[(b.weekday() + 1) % 7], WEEKDAYS[(b.weekday() + 3) % 7]],
        T("1. {year} is a leap year, so February has 29 days.\n"
            "2. Days = {x1}.\n"
            "3. {n} = 7 × {x2} + {x3}, so {x4} + {x5} = {ans}.\n"
            "{off_by_one} is what you get if you forget 29 February.", year=year, x1=count_days(a, b), n=n, x2=n // 7, x3=n % 7, x4=WEEKDAYS[a.weekday()], x5=n % 7, ans=ans, off_by_one=off_by_one),
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
        T("1. Find the rule: {x1} = {x2}.\n2. Apply the same rule to {b}: {x3} = {ans}.", x1=f(a), x2=show(a), b=b, x3=show(b), ans=ans),
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
        T("1. Each letter moves forward by {k}: {x1}.\n2. {x2}, giving {ans}.", k=k, x1=', '.join(f'{a}→{b}' for a, b in zip(g1, shift(g1, k))), x2=', '.join(f'{a}→{b}' for a, b in zip(g2, ans)), ans=ans),
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
        T("1. Each letter is paired with its mirror in the alphabet: {x1}.\n"
            "2. {x2}, giving {ans}.", x1=', '.join(f'{a}↔{b}' for a, b in zip(g1, mirror(g1))), x2=', '.join(f'{a}↔{b}' for a, b in zip(g2, ans)), ans=ans),
    )


def is_prime(n: int) -> bool:
    return n > 1 and all(n % d for d in range(2, isqrt(n) + 1))


@template("Classification and Analogies", "Odd one out", 2)
def odd_number_out(rng):
    kind = rng.choice(["prime", "square", "cube", T("multiple")])
    if kind == "prime":
        group = rng.sample([p for p in range(11, 100) if is_prime(p)], 3)
        odd = rng.choice([c for c in [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93] if c not in group])
        why = T("{x1} are prime numbers; {odd} is not ({x2}).", x1=', '.join(map(str, sorted(group))), odd=odd, x2=factor_pair(odd))
    elif kind == "square":
        group = [n * n for n in rng.sample(range(4, 16), 3)]
        odd = rng.choice([x for x in range(20, 230) if isqrt(x) ** 2 != x and abs(isqrt(x) ** 2 - x) <= 3])
        why = T("{x1} are perfect squares; {odd} is not.", x1=', '.join(f'{x} = {isqrt(x)}²' for x in sorted(group)), odd=odd)
    elif kind == "cube":
        group = [n ** 3 for n in rng.sample(range(2, 10), 3)]
        odd = rng.choice([x * x for x in range(5, 25) if round((x * x) ** (1 / 3)) ** 3 != x * x])
        why = T("{x1} are perfect cubes; {odd} is a square, not a cube.", x1=', '.join(f'{x} = {round(x ** (1 / 3))}³' for x in sorted(group)), odd=odd)
    else:
        k = rng.choice([6, 7, 8, 9, 11, 12, 13])
        group = [k * m for m in rng.sample(range(3, 12), 3)]
        odd = k * rng.randint(3, 11) + rng.choice([1, 2, -1])
        why = T("{x1} are all multiples of {k}; {odd} is not.", x1=', '.join(map(str, sorted(group))), k=k, odd=odd)
    items = group + [odd]
    rng.shuffle(items)
    return mcq(
        rng,
        T("Find the odd one out: {x1}", x1=', '.join(map(str, items))),
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
        T("Find the odd one out: {x1}", x1=', '.join(groups)),
        odd,
        [x for x in groups if x != odd],
        T("1. In each group the letters go up by {step}: e.g. {x1}.\n"
            "2. In {odd} the gaps are {step} and {x2}, so it breaks the pattern.", step=step, x1=groups[(odd_i + 1) % 4], odd=odd, x2=step + 1),
    )
