import random
from fractions import Fraction
from math import comb, factorial, gcd, lcm, perm

from app.question_templates.core import dec, frac, mcq, names, near, num, ordinal, pct, rupees, template

SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")


def power(base, exp) -> str:
    return f"{base}{str(exp).translate(SUP)}"


def days(v) -> str:
    return f"{num(v)} days"


def hours(v) -> str:
    return f"{num(v)} hours"


def seconds(v) -> str:
    return f"{num(v)} seconds"


def kmh(v) -> str:
    return f"{num(v)} km/h"


def change(v) -> str:
    if abs(v) < 1e-9:
        return "No change"
    return f"{num(abs(v))}% {'increase' if v > 0 else 'decrease'}"


def gain(v) -> str:
    if abs(v) < 1e-9:
        return "No profit, no loss"
    return f"{num(abs(v))}% {'profit' if v > 0 else 'loss'}"


def ratio(a: int, b: int) -> str:
    g = gcd(a, b)
    return f"{a // g}:{b // g}"


def multiple(rng: random.Random, of: int, low: int, high: int) -> int:
    """A random multiple of `of` between low and high."""
    first = -(-low // of)
    return of * rng.randint(first, max(first, high // of))


# ---------------------------------------------------------------- Percentages

@template("Percentages", "Percentage change", 1)
def percent_of(rng):
    p = rng.choice([5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75])
    n = multiple(rng, 100 // gcd(p, 100), 40, 1200)
    ans = p * n // 100
    return mcq(
        rng,
        f"What is {p}% of {num(n)}?",
        num(ans),
        [num(ans * 10), num(n - ans), num(ans + p)],
        f"1. {p}% means {p}/100.\n2. {p}/100 × {num(n)} = {num(ans)}.",
        near(ans),
    )


@template("Percentages", "Percentage change", 2)
def percentage_change(rng):
    p = rng.choice([5, 10, 15, 20, 25, 30, 40, 50, 60, 75])
    up = rng.random() < 0.6
    what, money = rng.choice([
        ("The price of a bag", True), ("A worker's monthly salary", True), ("The price of a phone", True),
        ("A town's population", False), ("The number of students in a school", False), ("A website's daily visitors", False),
    ])
    fmt = rupees if money else num
    base = multiple(rng, 100 // gcd(p, 100) * (10 if money else 1), 200, 60000 if money else 20000)
    delta = base * p // 100
    new = base + delta if up else base - delta
    word = "increase" if up else "decrease"
    return mcq(
        rng,
        f"{what} {'rises' if up else 'falls'} from {fmt(base)} to {fmt(new)}. What is the percentage {word}?",
        pct(p),
        [pct(delta / new * 100), pct(p * 2), pct(100 - p)],
        f"1. Change = {fmt(max(base, new))} - {fmt(min(base, new))} = {fmt(delta)}.\n"
        f"2. Percentage {word} = change ÷ original × 100 = {num(delta)} ÷ {num(base)} × 100 = {p}%.\n"
        f"Tip: always divide by the ORIGINAL value ({fmt(base)}), not the new one.",
        near(p, pct, 5),
    )


@template("Percentages", "Percentage change", 2)
def what_percent(rng):
    p = rng.choice([5, 8, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80, 125, 150])
    whole = multiple(rng, 100 // gcd(p, 100), 20, 900)
    part = whole * p // 100
    return mcq(
        rng,
        f"{num(part)} is what percent of {num(whole)}?",
        pct(p),
        [pct(whole / part * 100), pct(abs(100 - p)), pct(p / 10)],
        f"1. Percent = part ÷ whole × 100.\n2. {num(part)} ÷ {num(whole)} × 100 = {p}%.",
        near(p, pct, 5),
    )


@template("Percentages", "Percentage change", 3)
def undo_a_change(rng):
    x = rng.choice([10, 20, 25, 40, 50, 60, 75, 80])
    down = rng.random() < 0.6
    after = 100 - x if down else 100 + x
    ans = Fraction(x * 100, after)
    first, back = ("decreased", "increased") if down else ("increased", "decreased")
    other = Fraction(x * 100, 100 + x if down else 100 - x)
    return mcq(
        rng,
        f"A number is {first} by {x}%. By what percent must the result be {back} to get back the original number?",
        pct(ans),
        [pct(x), pct(other), pct(x * 2)],
        f"1. Take the number as 100. After a {x}% {'decrease' if down else 'increase'} it becomes {after}.\n"
        f"2. To get back to 100 we need a change of {x} on a base of {after}.\n"
        f"3. {x} ÷ {after} × 100 = {pct(ans)}.\nThe base has changed, so the answer is not simply {x}%.",
        near(float(ans), pct, 5),
    )


@template("Percentages", "Successive percentage changes", 2)
def up_then_down(rng):
    a = rng.choice([5, 10, 15, 20, 25, 30, 40, 50])
    b = rng.choice([5, 10, 15, 20, 25, 30, 40, 50])
    rise_first = rng.random() < 0.5
    x, y = (a, -b) if rise_first else (-a, b)
    net = x + y + x * y / 100
    thing = rng.choice(["The price of a TV", "A shop's rent", "The price of petrol", "A company's sales"])
    steps = f"increased by {a}% and then decreased by {b}%" if rise_first else f"decreased by {a}% and then increased by {b}%"
    f1, f2 = 1 + x / 100, 1 + y / 100
    return mcq(
        rng,
        f"{thing} is {steps}. What is the net change?",
        change(net),
        [change(x + y), change(x + y - x * y / 100), change(-net)],
        f"1. Multiply the factors: {dec(f1)} × {dec(f2)} = {dec(f1 * f2)}.\n"
        f"2. {dec(f1 * f2)} means {num(f1 * f2 * 100)}% of the original, so the result is: {change(net)}.\n"
        f"Shortcut: net % = x + y + xy/100 = {x} + ({y}) + ({x} × {y})/100 = {num(net)}%.",
        near(net, change, 1),
    )


@template("Percentages", "Successive percentage changes", 3)
def two_discounts(rng):
    d1, d2 = rng.sample([5, 10, 15, 20, 25, 30, 40, 50], 2)
    single = d1 + d2 - d1 * d2 / 100
    factor = (100 - d1) * (100 - d2) / 10000
    return mcq(
        rng,
        f"Two successive discounts of {d1}% and {d2}% are equivalent to a single discount of:",
        pct(single),
        [pct(d1 + d2), pct(d1 + d2 + d1 * d2 / 100), pct(max(d1, d2) + min(d1, d2) / 2)],
        f"1. Price factor = {dec((100 - d1) / 100)} × {dec((100 - d2) / 100)} = {dec(factor)}.\n"
        f"2. The customer pays {num(factor * 100)}%, so the single discount is 100 - {num(factor * 100)} = {pct(single)}.\n"
        "Discounts never simply add up: the second one applies to an already reduced price.",
        near(single, pct, 2),
    )


@template("Percentages", "Successive percentage changes", 4)
def population_two_years_ago(rng):
    r1, r2 = rng.choice([5, 10, 20, 25]), rng.choice([5, 10, 20, 25])
    start = 10000 * rng.randint(1, 9)
    now = start * (100 + r1) * (100 + r2) // 10000
    factor = (100 + r1) * (100 + r2) / 10000
    return mcq(
        rng,
        f"A town's population grows by {r1}% in the first year and {r2}% in the second. "
        f"If it is now {num(now)}, what was it two years ago?",
        num(start),
        [num(round(now * (100 - r1 - r2) / 100)), num(round(now / (1 + (r1 + r2) / 100))), num(start * (100 + r1) // 100)],
        f"1. Growth factor over two years = {dec(1 + r1 / 100)} × {dec(1 + r2 / 100)} = {dec(factor)}.\n"
        f"2. Original × {dec(factor)} = {num(now)}.\n3. Original = {num(now)} ÷ {dec(factor)} = {num(start)}.\n"
        f"Subtracting {r1 + r2}% from today's figure is the trap: the growth was on a smaller base.",
        near(start, gap=500),
    )


# ---------------------------------------------------------------- Time and Work

WORK_PAIRS = [(a, b) for a in range(4, 41) for b in range(a + 2, 91) if (a * b) % (a + b) == 0]
PIPE_PAIRS = [(f, e) for f in range(2, 16) for e in range(f + 1, 46) if (f * e) % (e - f) == 0 and f * e // (e - f) <= 60]


@template("Time and Work", "Combined work rate", 1)
def together(rng):
    a, b = rng.choice(WORK_PAIRS)
    if rng.random() < 0.5:
        a, b = b, a
    t = a * b // (a + b)
    x, y = names(rng, 2)
    return mcq(
        rng,
        f"{x} can finish a piece of work in {a} days and {y} in {b} days. Working together, how many days will they take?",
        days(t),
        [days((a + b) / 2), days(a + b), days(abs(b - a))],
        f"1. {x}'s rate = 1/{a} of the work per day; {y}'s rate = 1/{b}.\n"
        f"2. Together = 1/{a} + 1/{b} = {a + b}/{a * b} = 1/{t}.\n3. They finish in {t} days.\n"
        f"Shortcut: ({a} × {b}) ÷ ({a} + {b}) = {a * b} ÷ {a + b} = {t}.",
        near(t, days),
    )


@template("Time and Work", "Combined work rate", 2)
def alone_from_together(rng):
    a, b = rng.choice(WORK_PAIRS)
    if rng.random() < 0.5:
        a, b = b, a
    t = a * b // (a + b)
    x, y = names(rng, 2)
    return mcq(
        rng,
        f"{x} and {y} together can do a job in {t} days. {x} alone can do it in {a} days. How many days will {y} alone take?",
        days(b),
        [days(a - t), days(a + t), days(2 * t)],
        f"1. Combined rate = 1/{t}; {x}'s rate = 1/{a}.\n"
        f"2. {y}'s rate = 1/{t} - 1/{a} = {a - t}/{a * t} = 1/{b}.\n3. {y} alone takes {b} days.",
        near(b, days),
    )


@template("Time and Work", "Combined work rate", 3)
def one_leaves(rng):
    while True:
        a, b, k = rng.randint(6, 30), rng.randint(6, 36), rng.randint(2, 6)
        rest = Fraction(1) - k * (Fraction(1, a) + Fraction(1, b))
        if a != b and rest > 0 and (rest * b).denominator == 1:
            break
    x, y = names(rng, 2)
    ans = rest * b
    rate = Fraction(1, a) + Fraction(1, b)
    return mcq(
        rng,
        f"{x} can do a job in {a} days and {y} in {b} days. They work together for {k} days, then {x} leaves. "
        f"How many more days will {y} take to finish the job?",
        days(ans),
        [days(b - k), days(ans + k), days(b)],
        f"1. Combined rate = 1/{a} + 1/{b} = {frac(rate)} of the job per day.\n"
        f"2. In {k} days they finish {k} × {frac(rate)} = {frac(k * rate)} of the job.\n"
        f"3. Remaining = {frac(rest)}. {y}'s rate is 1/{b}, so {y} needs {frac(rest)} × {b} = {num(ans)} days.",
        near(float(ans), days),
    )


@template("Time and Work", "Combined work rate", 3)
def fill_and_empty(rng):
    f, e = rng.choice(PIPE_PAIRS)
    t = f * e // (e - f)
    return mcq(
        rng,
        f"One pipe fills a tank in {f} hours and another empties it in {e} hours. "
        "If both are opened on an empty tank, how long will it take to fill?",
        hours(t),
        [hours(f * e / (f + e)), hours(e - f), hours(e + f)],
        f"1. Filling rate = 1/{f} per hour; emptying rate = 1/{e} per hour.\n"
        f"2. Net rate = 1/{f} - 1/{e} = {e - f}/{f * e} = 1/{t}.\n3. The tank fills in {t} hours.\n"
        "An emptying pipe is negative work: subtract its rate.",
        near(t, hours),
    )


@template("Time and Work", "Men and days", 1)
def men_and_days(rng):
    while True:
        m1, d1, m2 = rng.randint(4, 30), rng.randint(6, 40), rng.randint(3, 60)
        if m1 != m2 and (m1 * d1) % m2 == 0:
            break
    d2 = m1 * d1 // m2
    crew = rng.choice(["workers", "men", "labourers", "painters"])
    return mcq(
        rng,
        f"{m1} {crew} can finish a job in {d1} days. How many days will {m2} {crew} take to finish the same job?",
        days(d2),
        [days(d1 * m2 / m1), days(abs(d1 + m1 - m2)), days(d2 + d1)],
        f"1. Total work = {crew} × days = {m1} × {d1} = {m1 * d1} {crew[:-1]}-days.\n"
        f"2. With {m2} {crew}: {m1 * d1} ÷ {m2} = {d2} days.\n"
        f"{'Fewer' if m2 < m1 else 'More'} {crew} means {'more' if m2 < m1 else 'fewer'} days: they are inversely proportional.",
        near(d2, days),
    )


@template("Time and Work", "Men and days", 2)
def men_days_hours(rng):
    while True:
        m1, h1, d1 = rng.randint(4, 24), rng.randint(5, 10), rng.randint(6, 30)
        m2, h2 = rng.randint(4, 30), rng.randint(5, 10)
        total = m1 * h1 * d1
        if (m1, h1) != (m2, h2) and total % (m2 * h2) == 0 and total // (m2 * h2) != d1:
            break
    d2 = total // (m2 * h2)
    return mcq(
        rng,
        f"{m1} men working {h1} hours a day finish a job in {d1} days. "
        f"How many days will {m2} men take, working {h2} hours a day?",
        days(d2),
        [days(m1 * d1 / m2), days(d1 * m2 * h2 / (m1 * h1)), days(d2 + 2)],
        f"1. Total work = men × hours × days = {m1} × {h1} × {d1} = {total} man-hours.\n"
        f"2. Each day {m2} men do {m2} × {h2} = {m2 * h2} man-hours.\n3. Days = {total} ÷ {m2 * h2} = {d2}.",
        near(d2, days),
    )


@template("Time and Work", "Men and days", 3)
def more_men_join(rng):
    while True:
        m, d, k, extra = rng.randint(6, 30), rng.randint(10, 40), rng.randint(2, 9), rng.randint(2, 20)
        if k < d and (m * (d - k)) % (m + extra) == 0:
            break
    ans = m * (d - k) // (m + extra)
    return mcq(
        rng,
        f"{m} men can build a wall in {d} days. After {k} days, {extra} more men join them. "
        "How many more days are needed to finish the wall?",
        days(ans),
        [days(d - k), days(m * d / (m + extra)), days(m * (d - k) / extra)],
        f"1. Total work = {m} × {d} = {m * d} man-days.\n"
        f"2. In {k} days, {m} men do {m * k} man-days, leaving {m * (d - k)}.\n"
        f"3. Now {m + extra} men work: {m * (d - k)} ÷ {m + extra} = {ans} days.",
        near(ans, days),
    )


# ---------------------------------------------------------------- Time, Speed and Distance

def mps(speed_kmh) -> Fraction:
    return Fraction(speed_kmh * 5, 18)


@template("Time, Speed and Distance", "Relative speed", 1)
def pass_a_pole(rng):
    speed = rng.choice([36, 54, 72, 90, 108, 126, 144])
    v = mps(speed)
    t = rng.randint(6, 30)
    length = int(v * t)
    return mcq(
        rng,
        f"A train {length} m long runs at {speed} km/h. How long will it take to pass a pole?",
        seconds(t),
        [seconds(length / speed), seconds(length / (speed * 18 / 5)), seconds(t * 2)],
        f"1. Convert the speed: {speed} × 5/18 = {num(v)} m/s.\n"
        f"2. To pass a pole the train covers its own length, {length} m.\n3. Time = {length} ÷ {num(v)} = {t} seconds.",
        near(t, seconds),
    )


@template("Time, Speed and Distance", "Relative speed", 2)
def cross_a_platform(rng):
    speed = rng.choice([36, 54, 72, 90, 108])
    v = int(mps(speed))
    while True:
        t, length = rng.randint(15, 45), rng.randrange(100, 401, 10)
        platform = v * t - length
        if platform >= 100 and platform % 10 == 0:
            break
    return mcq(
        rng,
        f"A train {length} m long, running at {speed} km/h, crosses a platform in {t} seconds. How long is the platform?",
        f"{platform} m",
        [f"{v * t} m", f"{length} m" if length != platform else f"{platform + 50} m", f"{speed * t - length} m"],
        f"1. Convert the speed: {speed} × 5/18 = {v} m/s.\n2. Distance covered in {t} s = {v} × {t} = {v * t} m.\n"
        f"3. That distance is train + platform, so platform = {v * t} - {length} = {platform} m.",
        near(platform, lambda x: f"{num(x)} m", 20),
    )


@template("Time, Speed and Distance", "Relative speed", 2)
def opposite_directions(rng):
    total_speed = rng.choice([54, 72, 90, 108, 126, 144])
    s1 = rng.randrange(20, total_speed - 19, 2)
    s2 = total_speed - s1
    if s1 == s2:
        s1, s2 = s1 + 2, s2 - 2
    v = int(mps(total_speed))
    t = rng.randint(6, 20)
    l1 = rng.randrange(60, v * t - 50, 5) if v * t > 120 else v * t // 2
    l2 = v * t - l1
    return mcq(
        rng,
        f"Two trains, {l1} m and {l2} m long, run in opposite directions at {s1} km/h and {s2} km/h. "
        "How long do they take to cross each other?",
        seconds(t),
        [seconds((l1 + l2) / float(mps(abs(s1 - s2)))), seconds(l1 / v), seconds((l1 + l2) / total_speed)],
        f"1. Opposite directions: add the speeds. {s1} + {s2} = {total_speed} km/h.\n"
        f"2. Convert: {total_speed} × 5/18 = {v} m/s.\n3. Distance to cross = sum of lengths = {l1 + l2} m.\n"
        f"4. Time = {l1 + l2} ÷ {v} = {t} seconds.",
        near(t, seconds),
    )


@template("Time, Speed and Distance", "Relative speed", 3)
def same_direction(rng):
    diff = rng.choice([18, 36, 54, 72])
    slow = rng.randrange(30, 81, 6)
    fast = slow + diff
    v = int(mps(diff))
    t = rng.randint(10, 40)
    l1 = rng.randrange(50, v * t - 40, 5) if v * t > 100 else v * t // 2
    l2 = v * t - l1
    return mcq(
        rng,
        f"A {l1} m long train running at {fast} km/h overtakes a {l2} m long train running at {slow} km/h "
        "in the same direction. How long does it take to pass it completely?",
        seconds(t),
        [seconds((l1 + l2) / float(mps(fast + slow))), seconds(l1 / v), seconds(t * 2)],
        f"1. Same direction: subtract the speeds. {fast} - {slow} = {diff} km/h.\n"
        f"2. Convert: {diff} × 5/18 = {v} m/s.\n3. To pass completely it covers both lengths: {l1} + {l2} = {l1 + l2} m.\n"
        f"4. Time = {l1 + l2} ÷ {v} = {t} seconds.",
        near(t, seconds),
    )


ROUND_TRIPS = [(x, y) for x in range(20, 85, 5) for y in range(x + 10, 125, 5) if (2 * x * y) % (x + y) == 0]


@template("Time, Speed and Distance", "Average speed", 1)
def average_speed(rng):
    while True:
        speed = rng.choice([12, 16, 20, 24, 30, 36, 40, 48, 60])
        h, m = rng.randint(1, 4), rng.choice([0, 15, 30, 45])
        if (speed * m) % 60 == 0:
            break
    time = h + m / 60
    dist = int(speed * time)
    who = rng.choice(["A cyclist", "A bus", "A runner", "A car"])
    span = f"{h} hours {m} minutes" if m else f"{h} hours"
    return mcq(
        rng,
        f"{who} covers {dist} km in {span}. What is the average speed?",
        kmh(speed),
        [kmh(dist / (h + m / 100)), kmh(dist / h) if m else kmh(dist / (h + 1)), kmh(speed + 4)],
        f"1. {span} = {num(time)} hours" + (f" ({m} minutes = {num(m / 60)} hour)" if m else "") + ".\n"
        f"2. Speed = distance ÷ time = {dist} ÷ {num(time)} = {speed} km/h.",
        near(speed, kmh, 2),
    )


@template("Time, Speed and Distance", "Average speed", 2)
def there_and_back(rng):
    x, y = rng.choice(ROUND_TRIPS)
    ans = 2 * x * y // (x + y)
    a, b = rng.sample(["A", "P", "the city", "the village", "home", "the office"], 2)
    return mcq(
        rng,
        f"A car travels from {a} to {b} at {x} km/h and returns at {y} km/h. What is its average speed for the whole journey?",
        kmh(ans),
        [kmh((x + y) / 2), kmh(y - x), kmh(ans + 2)],
        f"1. For equal distances, average speed = 2xy ÷ (x + y), not (x + y) ÷ 2.\n"
        f"2. = 2 × {x} × {y} ÷ ({x} + {y}) = {2 * x * y} ÷ {x + y} = {ans} km/h.\n"
        f"The car spends more time at the slower speed, so the average is below {num((x + y) / 2)}.",
        near(ans, kmh, 2),
    )


@template("Time, Speed and Distance", "Average speed", 3)
def late_or_early(rng):
    p, q = rng.choice([(3, 4), (4, 5), (2, 3), (5, 6), (7, 8)])
    m = rng.choice([5, 6, 8, 10, 12, 15, 20])
    slower = rng.random() < 0.6
    if slower:
        usual = m * p // (q - p)
        body = f"Walking at {p}/{q} of her usual speed, a woman reaches her office {m} minutes late. What is her usual time for the journey?"
        steps = (
            f"1. Speed and time are inversely proportional, so at {p}/{q} speed she takes {q}/{p} of her usual time.\n"
            f"2. The extra time is {q}/{p} - 1 = {q - p}/{p} of her usual time.\n"
            f"3. {q - p}/{p} of usual time = {m} minutes, so usual time = {m} × {p}{f'/{q - p}' if q - p > 1 else ''} = {usual} minutes."
        )
        trap = m * q // (q - p)
    else:
        usual = m * q // (q - p)
        body = f"Driving at {q}/{p} of his usual speed, a man reaches {m} minutes early. What is his usual time for the journey?"
        steps = (
            f"1. At {q}/{p} speed he takes {p}/{q} of his usual time.\n"
            f"2. The time saved is 1 - {p}/{q} = {q - p}/{q} of his usual time.\n"
            f"3. {q - p}/{q} of usual time = {m} minutes, so usual time = {m} × {q}{f'/{q - p}' if q - p > 1 else ''} = {usual} minutes."
        )
        trap = m * p // (q - p)
    return mcq(
        rng, body, f"{usual} minutes", [f"{trap} minutes", f"{m * q} minutes", f"{usual + m} minutes"], steps,
        near(usual, lambda v: f"{num(v)} minutes", 5),
    )


# ---------------------------------------------------------------- Profit and Loss

@template("Profit and Loss", "Profit and loss percentage", 1)
def profit_percent(rng):
    p = rng.choice([5, 10, 12, 15, 20, 25, 30, 40, 50])
    cp = multiple(rng, 100 // gcd(p, 100), 100, 3000)
    profit = rng.random() < 0.6
    delta = cp * p // 100
    sp = cp + delta if profit else cp - delta
    word = "profit" if profit else "loss"
    return mcq(
        rng,
        f"An article bought for {rupees(cp)} is sold for {rupees(sp)}. What is the {word} percent?",
        pct(p),
        [pct(delta / sp * 100), pct(p + 5), pct(delta) if delta != p else pct(p * 2)],
        f"1. {word.capitalize()} = {rupees(max(cp, sp))} - {rupees(min(cp, sp))} = {rupees(delta)}.\n"
        f"2. {word.capitalize()} % is always on cost price: {num(delta)} ÷ {num(cp)} × 100 = {p}%.",
        near(p, pct, 5),
    )


@template("Profit and Loss", "Profit and loss percentage", 1)
def price_after_discount(rng):
    d = rng.choice([5, 10, 15, 20, 25, 30, 40])
    mp = multiple(rng, 100, 300, 9000)
    sp = mp * (100 - d) // 100
    item = rng.choice(["shirt", "pair of shoes", "school bag", "mixer grinder", "bicycle", "watch"])
    return mcq(
        rng,
        f"A {item} marked at {rupees(mp)} is sold at a {d}% discount. What is the selling price?",
        rupees(sp),
        [rupees(mp * d // 100), rupees(mp - d), rupees(mp * (100 + d) // 100)],
        f"1. Discount = {d}% of {rupees(mp)} = {rupees(mp * d // 100)}.\n2. Selling price = {rupees(mp)} - {rupees(mp * d // 100)} = {rupees(sp)}.\n"
        f"Shortcut: {rupees(mp)} × {num((100 - d) / 100)} = {rupees(sp)}.",
        near(sp, rupees),
    )


@template("Profit and Loss", "Profit and loss percentage", 2)
def loss_to_gain(rng):
    loss, want = rng.choice([5, 10, 15, 20, 25]), rng.choice([5, 10, 15, 20, 25])
    cp = multiple(rng, 100, 200, 5000)
    sp1 = cp * (100 - loss) // 100
    ans = cp * (100 + want) // 100
    return mcq(
        rng,
        f"By selling an article for {rupees(sp1)}, a shopkeeper loses {loss}%. At what price should it be sold to gain {want}%?",
        rupees(ans),
        [rupees(round(sp1 * (100 + want) / 100)), rupees(round(sp1 * (100 + loss + want) / 100)), rupees(cp)],
        f"1. A {loss}% loss means SP = {100 - loss}% of CP, so CP = {num(sp1)} ÷ {num((100 - loss) / 100)} = {rupees(cp)}.\n"
        f"2. For a {want}% gain, SP = {num(cp)} × {num((100 + want) / 100)} = {rupees(ans)}.\n"
        "The percentages are always on cost price, never on the old selling price.",
        near(ans, rupees),
    )


@template("Profit and Loss", "Profit and loss percentage", 3)
def mark_up_then_discount(rng):
    m, d = rng.choice([10, 20, 25, 30, 40, 50, 60]), rng.choice([5, 10, 15, 20, 25, 30])
    sp = (100 + m) * (100 - d) / 100
    return mcq(
        rng,
        f"A shopkeeper marks goods {m}% above cost price and then gives a {d}% discount. What is his profit or loss percent?",
        gain(sp - 100),
        [gain(m - d), gain(m * d / 100), gain(m + d)],
        f"1. Take CP = 100. Marked price = {100 + m}.\n2. After a {d}% discount, SP = {100 + m} × {num((100 - d) / 100)} = {num(sp)}.\n"
        f"3. On a cost of 100, that is {gain(sp - 100)}.\nThe discount is on the marked price, so you can't just subtract {d} from {m}.",
        near(sp - 100, gain, 2),
    )


@template("Profit and Loss", "Profit and loss percentage", 4)
def false_weight(rng):
    w = rng.choice([750, 800, 875, 900, 950, 960, 980])
    ans = (1000 - w) / w * 100
    return mcq(
        rng,
        f"A shopkeeper sells goods at cost price but uses {'an' if w in (800, 875) else 'a'} {w} g weight in place of 1 kg. What is his profit percent?",
        pct(ans),
        [pct((1000 - w) / 10), pct((1000 - w) / 1000 * 100 + 1), pct(ans * 2)],
        f"1. He charges for 1000 g but gives only {w} g, so he gains {1000 - w} g on every {w} g he hands over.\n"
        f"2. Profit % = {1000 - w} ÷ {w} × 100 = {pct(ans)}.\nThe gain is measured on what he really gives ({w} g), not on 1000 g.",
        near(ans, pct, 1),
    )


# ---------------------------------------------------------------- Ratio and Proportion

COPRIME = [(a, b) for a in range(1, 10) for b in range(1, 10) if a != b and gcd(a, b) == 1]


@template("Ratio and Proportion", "Dividing in a ratio", 1)
def share_of_two(rng):
    a, b = rng.choice(COPRIME)
    unit = rng.choice([10, 20, 25, 40, 50, 60, 75, 100, 150, 200])
    total = (a + b) * unit
    x, y = names(rng, 2)
    ask_second = rng.random() < 0.5
    share = (b if ask_second else a) * unit
    return mcq(
        rng,
        f"Divide {rupees(total)} between {x} and {y} in the ratio {a}:{b}. What is {y if ask_second else x}'s share?",
        rupees(share),
        [rupees((a if ask_second else b) * unit), rupees(total // (b if ask_second else a)), rupees(share + unit)],
        f"1. Total parts = {a} + {b} = {a + b}.\n2. One part = {num(total)} ÷ {a + b} = {rupees(unit)}.\n"
        f"3. {y if ask_second else x}'s share = {b if ask_second else a} × {num(unit)} = {rupees(share)}.",
        near(share, rupees, unit),
    )


@template("Ratio and Proportion", "Dividing in a ratio", 2)
def share_of_three(rng):
    while True:
        a, b, c = rng.sample(range(1, 9), 3)
        if gcd(a, b, c) == 1:
            break
    unit = rng.choice([20, 25, 50, 100, 120, 150])
    total = (a + b + c) * unit
    x, y, z = names(rng, 3)
    return mcq(
        rng,
        f"A prize of {rupees(total)} is shared among {x}, {y} and {z} in the ratio {a}:{b}:{c}. How much does {z} get?",
        rupees(c * unit),
        [rupees(a * unit), rupees(b * unit), rupees(total // c) if total % c == 0 else rupees(c * unit + unit)],
        f"1. Total parts = {a} + {b} + {c} = {a + b + c}.\n2. One part = {num(total)} ÷ {a + b + c} = {rupees(unit)}.\n"
        f"3. {z} gets {c} parts = {c} × {num(unit)} = {rupees(c * unit)}.",
        near(c * unit, rupees, unit),
    )


@template("Ratio and Proportion", "Dividing in a ratio", 2)
def total_from_difference(rng):
    a, b = rng.choice([(p, q) for p, q in COPRIME if p > q])
    k = rng.randint(3, 15)
    diff = (a - b) * k
    return mcq(
        rng,
        f"The ratio of boys to girls in a school club is {a}:{b}. There are {diff} more boys than girls. How many members are there in total?",
        num((a + b) * k),
        [num(diff * (a + b)), num(a * k), num((a + b) * k + diff)],
        f"1. The difference between boys and girls is {a} - {b} = {a - b} part{'s' if a - b > 1 else ''}.\n"
        + (f"2. 1 part = {diff} members.\n" if a - b == 1 else f"2. {a - b} parts = {diff} members, so 1 part = {k}.\n")
        + f"3. Total = {a + b} parts = {a + b} × {k} = {(a + b) * k}.",
        near((a + b) * k),
    )


@template("Ratio and Proportion", "Dividing in a ratio", 3)
def chain_ratios(rng):
    while True:
        a, b = rng.choice(COPRIME)
        c, d = rng.choice(COPRIME)
        if b != c and ratio(a * c, b * d) not in {f"{a}:{d}", ratio(a * d, b * c)}:
            break
    m = lcm(b, c)
    return mcq(
        rng,
        f"If A:B = {a}:{b} and B:C = {c}:{d}, what is A:C?",
        ratio(a * c, b * d),
        [f"{a}:{d}", ratio(a * d, b * c), f"{c}:{b}"],
        f"1. Make B equal in both ratios. The LCM of {b} and {c} is {m}.\n"
        f"2. A:B = {a * m // b}:{m} and B:C = {m}:{d * m // c}.\n"
        f"3. So A:B:C = {a * m // b}:{m}:{d * m // c}, and A:C = {ratio(a * c, b * d)}.",
        lambda s: f"{a + s}:{d + s}",
    )


@template("Ratio and Proportion", "Dividing in a ratio", 3)
def add_to_both(rng):
    while True:
        a, b = rng.choice([(p, q) for p, q in COPRIME if p < q])
        x, k = rng.randint(2, 9), rng.randint(2, 12)
        new = ratio(a * x + k, b * x + k)
        if new != ratio(a, b) and gcd(a * x + k, b * x + k) > 1:
            break
    n1, n2 = a * x, b * x
    return mcq(
        rng,
        f"Two numbers are in the ratio {a}:{b}. If {k} is added to each, the ratio becomes {new}. What are the numbers?",
        f"{n1} and {n2}",
        [f"{a * (x + 1)} and {b * (x + 1)}", f"{a * (x - 1)} and {b * (x - 1)}" if x > 2 else f"{a * (x + 2)} and {b * (x + 2)}", f"{n1 + k} and {n2 + k}"],
        f"1. Let the numbers be {a}x and {b}x.\n2. ({a}x + {k}) ÷ ({b}x + {k}) = {new.replace(':', '/')}.\n"
        f"3. Solving gives x = {x}, so the numbers are {n1} and {n2}.\nCheck: {n1 + k}:{n2 + k} = {new}.",
    )


# ---------------------------------------------------------------- Simple and Compound Interest

@template("Simple and Compound Interest", "Simple interest", 1)
def simple_interest(rng):
    p = multiple(rng, 500, 1000, 25000)
    r, t = rng.choice([4, 5, 6, 8, 10, 12]), rng.choice([2, 3, 4, 5])
    si = p * r * t // 100
    return mcq(
        rng,
        f"What is the simple interest on {rupees(p)} at {r}% per annum for {t} years?",
        rupees(si),
        [rupees(p + si), rupees(p * r // 100), rupees(si * 2)],
        f"1. Simple interest = P × R × T ÷ 100.\n2. = {num(p)} × {r} × {t} ÷ 100 = {rupees(si)}.",
        near(si, rupees),
    )


@template("Simple and Compound Interest", "Simple interest", 2)
def simple_amount(rng):
    p = multiple(rng, 1000, 2000, 30000)
    r, t = rng.choice([4, 5, 6, 8, 10, 12]), rng.choice([2, 2.5, 3, 4, 1.5])
    si = p * r * t / 100
    return mcq(
        rng,
        f"{rupees(p)} is lent at {r}% simple interest per annum. What is the total amount after {num(t)} years?",
        rupees(p + si),
        [rupees(si), rupees(round(p * (1 + r / 100) ** t)), rupees(p + p * r / 100)],
        f"1. Interest = {num(p)} × {r} × {num(t)} ÷ 100 = {rupees(si)}.\n"
        f"2. Amount = principal + interest = {num(p)} + {num(si)} = {rupees(p + si)}.\n{rupees(si)} is only the interest, not the amount.",
        near(p + si, rupees, 100),
    )


@template("Simple and Compound Interest", "Simple interest", 2)
def principal_from_amount(rng):
    p = multiple(rng, 500, 2000, 20000)
    r, t = rng.choice([4, 5, 6, 8, 10, 12, 15]), rng.choice([2, 3, 4, 5])
    total = p * (100 + r * t) // 100
    return mcq(
        rng,
        f"A sum becomes {rupees(total)} in {t} years at {r}% simple interest per annum. What is the sum?",
        rupees(p),
        [rupees(round(total * (100 - r * t) / 100)), rupees(round(total / (1 + r / 100))), rupees(p + 500)],
        f"1. Interest for {t} years at {r}% = {r * t}% of the principal.\n2. So amount = {100 + r * t}% of principal = {num(total)}.\n"
        f"3. Principal = {num(total)} ÷ {num((100 + r * t) / 100)} = {rupees(p)}.",
        near(p, rupees, 250),
    )


@template("Simple and Compound Interest", "Simple interest", 3)
def times_itself(rng):
    k = rng.choice([2, 3, 4])
    t = rng.choice([v for v in [4, 5, 8, 10, 12, 15, 16, 20, 25] if ((k - 1) * 100) % v == 0 or ((k - 1) * 100 / v * 2).is_integer()])
    r = (k - 1) * 100 / t
    word = {2: "double", 3: "triple", 4: "become four times"}[k]
    return mcq(
        rng,
        f"At what rate of simple interest per annum will a sum {word} itself in {t} years?",
        pct(r),
        [pct(k * 100 / t), pct(100 / t) if k > 2 else pct(r / 2), pct(r + 2)],
        f"1. To {word.replace('become ', '')}, the interest must equal {k - 1} × the principal, i.e. {(k - 1) * 100}% of P.\n"
        f"2. {(k - 1) * 100}% spread over {t} years = {(k - 1) * 100} ÷ {t} = {pct(r)} per year.",
        near(r, pct, 1),
    )


def ci_amount(p: int, r: int, years: int) -> Fraction:
    return Fraction(p) * Fraction(100 + r, 100) ** years


@template("Simple and Compound Interest", "Compound interest", 2)
def compound_two_years(rng):
    while True:
        p, r = multiple(rng, 1000, 2000, 40000), rng.choice([4, 5, 8, 10, 12, 15, 20])
        amount = ci_amount(p, r, 2)
        if amount.denominator == 1:
            break
    ci = int(amount) - p
    after1 = p * (100 + r) // 100
    return mcq(
        rng,
        f"Find the compound interest on {rupees(p)} at {r}% per annum for 2 years, compounded annually.",
        rupees(ci),
        [rupees(2 * p * r // 100), rupees(int(amount)), rupees(p * r // 100)],
        f"1. After year 1: {num(p)} × {num(1 + r / 100)} = {num(after1)}.\n2. After year 2: {num(after1)} × {num(1 + r / 100)} = {num(int(amount))}.\n"
        f"3. Compound interest = {num(int(amount))} - {num(p)} = {rupees(ci)}.\n"
        f"It is {rupees(ci - 2 * p * r // 100)} more than simple interest because year 2 earns interest on year 1's interest.",
        near(ci, rupees),
    )


@template("Simple and Compound Interest", "Compound interest", 3)
def ci_minus_si(rng):
    while True:
        p, r = multiple(rng, 1000, 2000, 50000), rng.choice([4, 5, 8, 10, 12, 15, 20])
        diff = Fraction(p * r * r, 10000)
        if diff.denominator == 1:
            break
    d = int(diff)
    return mcq(
        rng,
        f"The difference between compound and simple interest on a sum for 2 years at {r}% per annum is {rupees(d)}. What is the sum?",
        rupees(p),
        [rupees(d * 100 // r), rupees(p // 2), rupees(p * 2)],
        f"1. For 2 years, CI - SI = P × (R/100)².\n2. {num(d)} = P × ({r}/100)² = P × {dec(r * r / 10000)}.\n"
        f"3. P = {num(d)} ÷ {dec(r * r / 10000)} = {rupees(p)}.",
        near(p, rupees, 1000),
    )


@template("Simple and Compound Interest", "Compound interest", 4)
def compound_multiples(rng):
    k, m, n = rng.choice([2, 3]), rng.choice([2, 3, 4]), rng.randint(3, 10)
    word = {2: "doubles", 3: "triples"}[k]
    target = k ** m
    simple_trap = (target - 1) // (k - 1) * n
    return mcq(
        rng,
        f"A sum of money {word} itself in {n} years at compound interest. In how many years will it become {target} times?",
        f"{m * n} years",
        [f"{simple_trap} years", f"{target * n} years", f"{(m + 1) * n} years"],
        f"1. Under compound interest the sum is multiplied by the same factor every {n} years: ×{k}.\n"
        f"2. {target} = {' × '.join([str(k)] * m)}, which is {m} such steps.\n3. {m} × {n} = {m * n} years.\n"
        f"{simple_trap} years is the simple-interest trap.",
        near(m * n, lambda v: f"{num(v)} years", n),
    )


# ---------------------------------------------------------------- Averages

@template("Averages", "Average of a group", 1)
def average_of_numbers(rng):
    k = rng.randint(3, 6)
    values = [rng.randint(5, 99) for _ in range(k)]
    values[-1] += (-sum(values)) % k
    avg = sum(values) // k
    return mcq(
        rng,
        f"The average of {', '.join(map(str, values[:-1]))} and {values[-1]} is:",
        num(avg),
        [num(sum(values)), num(sorted(values)[k // 2]), num(avg + 2)],
        f"1. Sum = {' + '.join(map(str, values))} = {sum(values)}.\n2. Average = {sum(values)} ÷ {k} = {avg}.",
        near(avg),
    )


@template("Averages", "Average of a group", 2)
def newcomer_age(rng):
    n, a = rng.randint(15, 40), rng.randint(10, 30)
    rise = rng.choice([1, 1, 2])
    b = a + rise
    ans = (n + 1) * b - n * a
    group, who = rng.choice([("students", "the teacher"), ("players", "the coach"), ("workers", "the manager")])
    return mcq(
        rng,
        f"The average age of {n} {group} is {a} years. When {who}'s age is included, the average becomes {b} years. What is {who}'s age?",
        f"{ans} years",
        [f"{a + n * rise} years", f"{b} years", f"{ans + rise} years"],
        f"1. Total age of the {group} = {n} × {a} = {n * a}.\n2. Total with {who} = {n + 1} × {b} = {(n + 1) * b}.\n"
        f"3. {who.capitalize()}'s age = {(n + 1) * b} - {n * a} = {ans} years.",
        near(ans, lambda v: f"{num(v)} years", 2),
    )


@template("Averages", "Average of a group", 3)
def next_innings(rng):
    n, a, d = rng.randint(10, 25), rng.randint(25, 50), rng.randint(1, 4)
    ans = (n + 1) * (a + d) - n * a
    return mcq(
        rng,
        f"A batsman's average after {n} innings is {a}. After his {ordinal(n + 1)} innings, the average rises to {a + d}. "
        f"How many runs did he score in the {ordinal(n + 1)} innings?",
        num(ans),
        [num(a + n * d), num(a + d), num(ans + d)],
        f"1. Runs after {n} innings = {n} × {a} = {n * a}.\n2. Runs after {n + 1} innings = {n + 1} × {a + d} = {(n + 1) * (a + d)}.\n"
        f"3. Runs in the {ordinal(n + 1)} innings = {(n + 1) * (a + d)} - {n * a} = {ans}.",
        near(ans, gap=3),
    )


@template("Averages", "Average of a group", 3)
def replace_one(rng):
    n = rng.randint(5, 12)
    d = rng.choice([0.5, 1, 1.5, 2, 2.5, 3])
    w = rng.randint(45, 75)
    ans = w + n * d
    return mcq(
        rng,
        f"The average weight of {n} people increases by {num(d)} kg when a new person replaces one who weighs {w} kg. "
        "What is the weight of the new person?",
        f"{num(ans)} kg",
        [f"{num(w + d)} kg", f"{num(w - n * d)} kg", f"{num(w + (n + 1) * d)} kg"],
        f"1. The total weight rises by {n} × {num(d)} = {num(n * d)} kg.\n"
        f"2. That extra weight comes only from the swap, so the new person is {num(n * d)} kg heavier than {w} kg.\n"
        f"3. New person = {w} + {num(n * d)} = {num(ans)} kg.",
        near(ans, lambda v: f"{num(v)} kg", 2),
    )


# ---------------------------------------------------------------- Number System

@template("Number System", "Divisibility and remainders", 1)
def smallest_to_add(rng):
    d = rng.choice([3, 4, 6, 7, 8, 9, 11, 12, 13, 15, 17])
    while True:
        n = rng.randint(100, 9999)
        if n % d:
            break
    r = n % d
    add = d - r
    rule = f"\n(Check: {num(n + add)} = {d} × {num((n + add) // d)}.)"
    return mcq(
        rng,
        f"What is the smallest number that must be added to {num(n)} to make it exactly divisible by {d}?",
        str(add),
        [str(r), str(add + 1), str(d)],
        f"1. {num(n)} ÷ {d} leaves remainder {r}.\n2. To reach the next multiple of {d}, add {d} - {r} = {add}.{rule}\n"
        f"{r} is the trap: that is what you would subtract, not add.",
        near(add, str, 1),
    )


@template("Number System", "Divisibility and remainders", 2)
def remainder_of_power(rng):
    while True:
        a, m = rng.randint(2, 9), rng.randint(5, 13)
        if gcd(a, m) == 1 and a % m != 1:
            break
    cycle = [pow(a, i, m) for i in range(1, m + 1)]
    length = cycle.index(1) + 1
    n = rng.randint(15, 99)
    ans = pow(a, n, m)
    pos = n % length or length
    others = [r for r in range(m) if r != ans]
    rng.shuffle(others)
    return mcq(
        rng,
        f"What is the remainder when {power(a, n)} is divided by {m}?",
        str(ans),
        [str(r) for r in others[:3]],
        f"1. Remainders of {a}¹, {a}², {a}³… when divided by {m}: {', '.join(map(str, cycle[:length]))}, then they repeat every {length}.\n"
        f"2. {n} ÷ {length} leaves remainder {n % length}, so take position {pos} in the cycle.\n3. The remainder is {ans}.",
    )


@template("Number System", "Divisibility and remainders", 3)
def unit_digit(rng):
    last = rng.choice([2, 3, 4, 7, 8, 9])
    base = rng.choice([last, 10 + last, 20 + last, 30 + last, 100 + last, 1000 + last])
    n = rng.randint(21, 999)
    cycle = [pow(last, i, 10) for i in range(1, 5)]
    length = 4 if len(set(cycle)) == 4 else 2
    ans = pow(last, n, 10)
    pos = n % length or length
    others = [d for d in range(10) if d != ans]
    rng.shuffle(others)
    preferred = [d for d in cycle if d != ans] + others
    return mcq(
        rng,
        f"What is the unit digit of {power(base, n)}?",
        str(ans),
        [str(d) for d in dict.fromkeys(preferred)],
        f"1. Only the last digit of the base matters: {last}.\n"
        f"2. Unit digits of powers of {last} repeat every {length}: {', '.join(map(str, cycle[:length]))}.\n"
        f"3. {n} ÷ {length} leaves remainder {n % length}, so take position {pos} in the cycle: {ans}.",
    )


@template("Number System", "Divisibility and remainders", 2)
def largest_divisible(rng):
    d, k = rng.randint(7, 97), rng.choice([3, 4, 5])
    top = 10 ** k - 1
    ans = top - top % d
    return mcq(
        rng,
        f"What is the largest {k}-digit number exactly divisible by {d}?",
        num(ans),
        [num(ans - d), num(top - d), num(top - top % d + 1)],
        f"1. The largest {k}-digit number is {num(top)}.\n2. {num(top)} ÷ {d} leaves remainder {top % d}.\n"
        f"3. Subtract the remainder: {num(top)} - {top % d} = {num(ans)}.",
        lambda s: num(ans - d * (s + 1) - s),
    )


@template("Number System", "HCF and LCM", 1)
def lcm_of_three(rng):
    while True:
        nums = sorted(rng.sample([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 30], 3))
        l = lcm(*nums)
        if l <= 720 and l not in nums:
            break
    g = gcd(*nums)
    return mcq(
        rng,
        f"What is the LCM of {nums[0]}, {nums[1]} and {nums[2]}?",
        str(l),
        [str(l * 2), str(l // 2) if l % 2 == 0 and l // 2 not in nums else str(l + nums[0]), str(nums[0] * nums[1] * nums[2]) if g == 1 else str(g)],
        f"1. Break each into primes: {', '.join(f'{x} = {factorise(x)}' for x in nums)}.\n"
        f"2. The LCM takes the highest power of each prime: {factorise(l)} = {l}.",
        near(l, gap=nums[0]),
    )


def factorise(n: int) -> str:
    parts, p = [], 2
    while n > 1:
        e = 0
        while n % p == 0:
            n //= p
            e += 1
        if e:
            parts.append(p if e == 1 else power(p, e))
        p += 1
    return " × ".join(map(str, parts))


@template("Number System", "HCF and LCM", 2)
def hcf_of_three(rng):
    while True:
        g = rng.choice([4, 6, 8, 9, 12, 14, 15, 18, 21, 24])
        ms = rng.sample(range(2, 11), 3)
        if gcd(*ms) == 1:
            break
    nums = sorted(g * m for m in ms)
    divisors = [d for d in range(2, g) if g % d == 0]
    return mcq(
        rng,
        f"What is the HCF of {nums[0]}, {nums[1]} and {nums[2]}?",
        str(g),
        [str(g * 2), str(divisors[-1]) if divisors else str(g + 1), str(lcm(*nums)) if lcm(*nums) < 10000 else str(g * 3)],
        f"1. Break each into primes: {', '.join(f'{x} = {factorise(x)}' for x in nums)}.\n"
        f"2. The HCF takes the lowest power of the primes common to all three: {factorise(g)} = {g}.",
        near(g, gap=2),
    )


@template("Number System", "HCF and LCM", 2)
def other_number(rng):
    while True:
        h, x, y = rng.randint(2, 15), rng.randint(2, 12), rng.randint(2, 12)
        if x != y and gcd(x, y) == 1:
            break
    a, b, l = h * x, h * y, h * x * y
    return mcq(
        rng,
        f"The HCF of two numbers is {h} and their LCM is {l}. If one number is {a}, what is the other?",
        str(b),
        [str(l // a) if l // a != b else str(b + h), str(l // h), str(a + h)],
        f"1. For two numbers, HCF × LCM = product of the numbers.\n2. {h} × {l} = {a} × other, so other = {h * l} ÷ {a} = {b}.",
        near(b, gap=h),
    )


def clock_time(minutes_after_midnight: int) -> str:
    h, m = divmod(minutes_after_midnight % (24 * 60), 60)
    suffix = "AM" if h < 12 else "PM"
    return f"{(h % 12) or 12}:{m:02d} {suffix}"


@template("Number System", "HCF and LCM", 3)
def bells_together(rng):
    while True:
        ivs = sorted(rng.sample([6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30, 36, 40, 45], 3))
        l = lcm(*ivs)
        if 30 <= l <= 360:
            break
    start = rng.choice(range(7 * 60, 11 * 60 + 1, 30))
    return mcq(
        rng,
        f"Three bells ring at intervals of {ivs[0]}, {ivs[1]} and {ivs[2]} minutes. If they ring together at {clock_time(start)}, "
        "when will they next ring together?",
        clock_time(start + l),
        [clock_time(start + sum(ivs)), clock_time(start + ivs[2]), clock_time(start + 2 * l)],
        f"1. They ring together again after the LCM of {ivs[0]}, {ivs[1]} and {ivs[2]}.\n"
        f"2. LCM = {factorise(l)} = {l} minutes.\n3. {clock_time(start)} + {l} minutes = {clock_time(start + l)}.",
        lambda s: clock_time(start + l + 15 * s),
    )


# ---------------------------------------------------------------- Mixtures and Alligation

@template("Mixtures and Alligation", "Alligation and replacement", 2)
def alligation_ratio(rng):
    while True:
        c = rng.randrange(20, 120, 5)
        d = c + rng.randrange(10, 60, 5)
        m = rng.randrange(c + 5, d, 5)
        if ratio(d - m, m - c) != ratio(m - c, d - m):
            break
    goods = rng.choice(["rice", "sugar", "tea", "pulses", "wheat"])
    return mcq(
        rng,
        f"In what ratio must {goods} at ₹{c}/kg be mixed with {goods} at ₹{d}/kg to get a mixture worth ₹{m}/kg?",
        ratio(d - m, m - c),
        [ratio(m - c, d - m), ratio(d - m, d - c), ratio(c, d)],
        f"1. Alligation: cheaper : dearer = (dearer - mean) : (mean - cheaper).\n"
        f"2. = ({d} - {m}) : ({m} - {c}) = {d - m} : {m - c} = {ratio(d - m, m - c)}.",
        lambda s: f"{s + 1}:{s + 2}",
    )


@template("Mixtures and Alligation", "Alligation and replacement", 2)
def mixture_price(rng):
    while True:
        c = rng.randrange(40, 200, 10)
        d = c + rng.randrange(10, 80, 10)
        p, q = rng.choice(COPRIME)
        if (p * c + q * d) % (p + q) == 0 and p != q:
            break
    mean = (p * c + q * d) // (p + q)
    goods = rng.choice(["Tea", "Coffee", "Rice", "Dal"])
    wrong = Fraction(q * c + p * d, p + q)
    return mcq(
        rng,
        f"{goods} at ₹{c}/kg and {goods.lower()} at ₹{d}/kg are mixed in the ratio {p}:{q}. What is the price of the mixture per kg?",
        rupees(mean),
        [rupees((c + d) / 2), rupees(float(wrong)), rupees(mean + 5)],
        f"1. Cost of {p + q} kg = {p} × {c} + {q} × {d} = ₹{p * c + q * d}.\n2. Price per kg = {p * c + q * d} ÷ {p + q} = {rupees(mean)}.\n"
        f"It sits closer to the price there is more of.",
        near(mean, rupees, 5),
    )


@template("Mixtures and Alligation", "Alligation and replacement", 3)
def add_water(rng):
    while True:
        a, b = rng.choice([(p, q) for p, q in COPRIME if p > q])
        c, d = rng.choice([(p, q) for p, q in COPRIME if p > q])
        unit = rng.randint(2, 12)
        volume = (a + b) * unit
        milk, water = a * unit, b * unit
        target = Fraction(milk * d, c)
        if Fraction(a, b) > Fraction(c, d) and target.denominator == 1 and int(target) > water and volume <= 120:
            break
    add = int(target) - water
    return mcq(
        rng,
        f"A {volume}-litre mixture has milk and water in the ratio {a}:{b}. How much water must be added to make the ratio {c}:{d}?",
        f"{add} litres",
        [f"{int(target)} litres", f"{abs(volume * d // (c + d) - water) or add + 2} litres", f"{add * 2} litres"],
        f"1. Milk = {milk} L, water = {water} L.\n2. Milk stays {milk} L. For milk : water = {c} : {d}, water must be {milk} × {d}/{c} = {int(target)} L.\n"
        f"3. Water to add = {int(target)} - {water} = {add} litres.",
        near(add, lambda v: f"{num(v)} litres", 2),
    )


@template("Mixtures and Alligation", "Alligation and replacement", 4)
def repeated_replacement(rng):
    volume = rng.choice([40, 50, 60, 80, 100])
    out = volume // rng.choice([4, 5, 10])
    times = rng.choice([2, 3])
    left = volume * (1 - out / volume) ** times
    keep = Fraction(volume - out, volume)
    return mcq(
        rng,
        f"A container holds {volume} litres of pure milk. {out} litres are removed and replaced with water, "
        f"and this is done {times} times in all. How much milk is left?",
        f"{num(left)} litres",
        [f"{volume - times * out} litres", f"{num(volume * (1 - out / volume) ** (times - 1))} litres", f"{num(left + out / 2)} litres"],
        f"1. Each replacement keeps ({volume} - {out}) ÷ {volume} = {frac(keep)} of the milk.\n"
        f"2. After {times} replacements: {volume} × ({frac(keep)}){str(times).translate(SUP)} = {num(left)} litres.\n"
        f"{volume - times * out} litres is the trap: later removals take out a mixture, not pure milk.",
    )


# ---------------------------------------------------------------- Probability

def fraction_options(rng, answer: Fraction, candidates: list[Fraction]) -> list[str]:
    seen = []
    for c in candidates:
        if 0 < c <= 1 and c != answer and frac(c) not in seen:
            seen.append(frac(c))
    return seen


@template("Probability", "Basic probability", 1)
def one_die(rng):
    events = {
        "a number greater than 4": [5, 6], "a number greater than 3": [4, 5, 6], "a number greater than 2": [3, 4, 5, 6],
        "an even number": [2, 4, 6], "an odd number": [1, 3, 5], "a prime number": [2, 3, 5],
        "a multiple of 3": [3, 6], "a number less than 3": [1, 2], "a number less than 5": [1, 2, 3, 4], "a 6": [6],
        "a factor of 6": [1, 2, 3, 6],
    }
    name, good = rng.choice(list(events.items()))
    p = Fraction(len(good), 6)
    return mcq(
        rng,
        f"A fair die is thrown once. What is the probability of getting {name}?",
        frac(p),
        fraction_options(rng, p, [1 - p, Fraction(len(good), 5), Fraction(1, len(good)), Fraction(len(good) + 1, 6), Fraction(1, 6)]),
        f"1. Favourable outcomes: {', '.join(map(str, good))}, so {len(good)} outcome{'s' if len(good) > 1 else ''}.\n"
        f"2. Probability = {len(good)} ÷ 6 = {frac(p)}.",
        lambda s: frac(Fraction(s, 7 + s)),
    )


@template("Probability", "Basic probability", 2)
def coins(rng):
    n = rng.choice([2, 3])
    total = 2 ** n
    kind = rng.choice(["at least one", "exactly one", "no", "exactly two", "at most one"] if n == 3 else ["at least one", "exactly one", "no"])
    count = {"at least one": total - 1, "exactly one": comb(n, 1), "no": 1, "exactly two": comb(n, 2), "at most one": 1 + n}[kind]
    p = Fraction(count, total)
    word = {2: "Two", 3: "Three"}[n]
    return mcq(
        rng,
        f"{word} fair coins are tossed. What is the probability of getting {kind} head{'s' if kind in ('no', 'exactly two') else ''}?",
        frac(p),
        fraction_options(rng, p, [1 - p, Fraction(1, n + 1), Fraction(count, total + 1), Fraction(1, 2), Fraction(1, total)]),
        f"1. There are 2{str(n).translate(SUP)} = {total} equally likely outcomes.\n2. Outcomes with {kind} head{'s' if kind in ('no', 'exactly two') else ''}: {count}.\n"
        f"3. Probability = {count} ÷ {total} = {frac(p)}."
        + ("\nShortcut: P(at least one) = 1 - P(none)." if kind == "at least one" else ""),
        lambda s: frac(Fraction(s, total + s)),
    )


@template("Probability", "Basic probability", 2)
def cards(rng):
    events = [("a king", 4), ("a heart", 13), ("a face card (jack, queen or king)", 12), ("a red card", 26),
              ("a red king", 2), ("an ace or a king", 8), ("a black face card", 6), ("a spade or an ace", 16), ("the queen of hearts", 1)]
    name, count = rng.choice(events)
    p = Fraction(count, 52)
    return mcq(
        rng,
        f"A card is drawn at random from a standard 52-card deck. What is the probability that it is {name}?",
        frac(p),
        fraction_options(rng, p, [Fraction(1, 52) if count > 1 else Fraction(1, 13), Fraction(count, 13), 1 - p, Fraction(count + 4, 52), Fraction(1, 4)]),
        f"1. There are {count} card{'s' if count > 1 else ''} that count as {name} in 52 cards.\n2. Probability = {count} ÷ 52 = {frac(p)}.",
        lambda s: frac(Fraction(s, 52)),
    )


@template("Probability", "Basic probability", 3)
def two_dice(rng):
    rolls = [(a, b) for a in range(1, 7) for b in range(1, 7)]
    events = {f"the sum is {s}": (lambda s: lambda r: sum(r) == s)(s) for s in range(3, 12)}
    events.update({"the sum is more than 9": lambda r: sum(r) > 9, "both dice show the same number": lambda r: r[0] == r[1],
                   "the sum is even": lambda r: sum(r) % 2 == 0, "the product is 12": lambda r: r[0] * r[1] == 12})
    name, test = rng.choice(list(events.items()))
    good = [r for r in rolls if test(r)]
    p = Fraction(len(good), 36)
    listing = ", ".join(f"({a},{b})" for a, b in good) if len(good) <= 8 else f"{len(good)} pairs"
    return mcq(
        rng,
        f"Two fair dice are thrown. What is the probability that {name}?",
        frac(p),
        fraction_options(rng, p, [Fraction(len(good), 12), Fraction(len(good), 11) if len(good) < 11 else Fraction(1, 11), Fraction(len(good) + 1, 36), 1 - p, Fraction(len(good), 6)]),
        f"1. There are 6 × 6 = 36 equally likely outcomes.\n2. Favourable: {listing}, so {len(good)} outcomes.\n3. Probability = {len(good)} ÷ 36 = {frac(p)}.",
        lambda s: frac(Fraction(s, 36)),
    )


@template("Probability", "Basic probability", 3)
def two_balls(rng):
    r, b = rng.randint(3, 7), rng.randint(3, 8)
    n = r + b
    both = rng.random() < 0.6
    if both:
        p = Fraction(r * (r - 1), n * (n - 1))
        body = f"A bag has {r} red and {b} blue balls. Two balls are drawn at random without replacement. What is the probability that both are red?"
        steps = f"1. P(first red) = {r}/{n}.\n2. One red is gone, so P(second red) = {r - 1}/{n - 1}.\n3. P(both red) = {r}/{n} × {r - 1}/{n - 1} = {frac(p)}."
        traps = [Fraction(r * r, n * n), Fraction(r, n), Fraction(r - 1, n - 1)]
        tail = f"\n{frac(Fraction(r * r, n * n))} is the trap: that assumes the first ball is put back."
    else:
        p = Fraction(2 * r * b, n * (n - 1))
        body = f"A bag has {r} red and {b} blue balls. Two balls are drawn at random without replacement. What is the probability of getting one ball of each colour?"
        steps = f"1. Red then blue: {r}/{n} × {b}/{n - 1}. Blue then red: {b}/{n} × {r}/{n - 1}.\n2. Add both orders: 2 × {r * b}/{n * (n - 1)} = {frac(p)}."
        traps = [Fraction(r * b, n * (n - 1)), Fraction(2 * r * b, n * n), Fraction(1, 2)]
        tail = "\nForgetting that the order can be either way halves the answer."
    return mcq(rng, body, frac(p), fraction_options(rng, p, traps + [Fraction(1, n)]), steps + tail, lambda s: frac(Fraction(s, n + s)))


# ---------------------------------------------------------------- Permutations and Combinations

@template("Permutations and Combinations", "Counting arrangements and selections", 1)
def arrange_in_a_row(rng):
    n = rng.randint(3, 7)
    things = rng.choice(["different books be arranged on a shelf", "people stand in a row", "different flags be hung on a pole",
                         "students line up in a queue", "runners finish a race with no ties"])
    return mcq(
        rng,
        f"In how many ways can {n} {things}?",
        num(factorial(n)),
        [num(n * (n - 1)), num(factorial(n - 1)), num(n ** 2)],
        f"1. The first place has {n} choices, the next {n - 1}, and so on down to 1.\n2. {' × '.join(map(str, range(n, 0, -1)))} = {n}! = {num(factorial(n))}.",
        near(factorial(n), gap=n),
    )


@template("Permutations and Combinations", "Counting arrangements and selections", 2)
def digits_without_repeats(rng):
    n, r = rng.randint(4, 7), rng.choice([2, 3])
    digits = sorted(rng.sample(range(1, 10), n))
    return mcq(
        rng,
        f"How many {r}-digit numbers can be formed from the digits {', '.join(map(str, digits[:-1]))} and {digits[-1]} if no digit is repeated?",
        num(perm(n, r)),
        [num(n ** r), num(comb(n, r)), num(perm(n, r - 1))],
        f"1. First place: {n} choices. Next: {n - 1} left." + (f" Next: {n - 2} left." if r == 3 else "") + "\n"
        f"2. {' × '.join(str(n - i) for i in range(r))} = {perm(n, r)}.\n{n ** r} would allow repeated digits.",
        near(perm(n, r), gap=n),
    )


@template("Permutations and Combinations", "Counting arrangements and selections", 2)
def committee(rng):
    n, r = rng.randint(5, 12), rng.randint(2, 4)
    group = rng.choice(["committee", "team", "panel", "group"])
    return mcq(
        rng,
        f"How many different {group}s of {r} people can be chosen from {n} people?",
        num(comb(n, r)),
        [num(perm(n, r)), num(n * r), num(comb(n, r - 1)) if comb(n, r - 1) != comb(n, r) else num(comb(n, r) + n)],
        f"1. Order doesn't matter in a {group}, so use combinations.\n"
        f"2. C({n}, {r}) = {' × '.join(str(n - i) for i in range(r))} ÷ {r}! = {perm(n, r)} ÷ {factorial(r)} = {comb(n, r)}.\n"
        f"{perm(n, r)} counts ordered arrangements.",
        near(comb(n, r), gap=2),
    )


@template("Permutations and Combinations", "Counting arrangements and selections", 3)
def round_table(rng):
    n = rng.randint(4, 8)
    who = rng.choice(["people", "friends", "guests", "delegates", "family members", "players"])
    return mcq(
        rng,
        f"In how many ways can {n} {who} sit around a round table?",
        num(factorial(n - 1)),
        [num(factorial(n)), num(factorial(n - 1) // 2), num(factorial(n) // 2)],
        f"1. Around a circle, rotations of the same seating are identical.\n2. Fix one person's seat and arrange the other {n - 1}: {n - 1}! = {num(factorial(n - 1))}.",
    )


WORDS = ["LEVEL", "APPLE", "BANANA", "LETTER", "BALLOON", "COFFEE", "SUCCESS", "PEPPER", "CHEESE", "GOOGLE",
         "ASSESS", "COOKIE", "TATTOO", "DADDY", "PIZZA", "BUBBLE", "COMMITTEE", "ALLAHABAD", "MAMMAL", "TOFFEE"]


@template("Permutations and Combinations", "Counting arrangements and selections", 3)
def word_arrangements(rng):
    word = rng.choice(WORDS)
    counts = {c: word.count(c) for c in dict.fromkeys(word)}
    repeats = {c: k for c, k in counts.items() if k > 1}
    denom = 1
    for k in repeats.values():
        denom *= factorial(k)
    ans = factorial(len(word)) // denom
    first_only = factorial(len(word)) // factorial(next(iter(repeats.values())))
    described = ", ".join(f"{c} {'twice' if k == 2 else f'{k} times'}" for c, k in repeats.items())
    return mcq(
        rng,
        f"How many different arrangements of the letters of the word {word} are possible?",
        num(ans),
        [num(factorial(len(word))), num(first_only) if first_only != ans else num(ans * 2), num(ans // 2) if ans % 2 == 0 else num(ans * 3)],
        f"1. {word} has {len(word)} letters, with {described}.\n"
        f"2. Arrangements = {len(word)}! ÷ ({' × '.join(f'{k}!' for k in repeats.values())}) = {num(factorial(len(word)))} ÷ {denom} = {num(ans)}.\n"
        "Divide by the repeats because swapping identical letters gives the same word.",
        near(ans, gap=max(1, ans // 10)),
    )


@template("Permutations and Combinations", "Counting arrangements and selections", 4)
def mixed_committee(rng):
    men, women = rng.randint(4, 8), rng.randint(3, 7)
    size = rng.randint(3, 5)
    k = rng.randint(1, min(size - 1, women))
    if size - k > men:
        k = size - men
    ans = comb(women, k) * comb(men, size - k)
    return mcq(
        rng,
        f"A committee of {size} is to be chosen from {men} men and {women} women. In how many ways can it be done "
        f"if it must have exactly {k} wom{'a' if k == 1 else 'e'}n?",
        num(ans),
        [num(comb(men + women, size)), num(comb(women, k) + comb(men, size - k)), num(perm(women, k) * comb(men, size - k))],
        f"1. Choose the women: C({women}, {k}) = {comb(women, k)}.\n2. Choose the men: C({men}, {size - k}) = {comb(men, size - k)}.\n"
        f"3. Both choices happen together, so multiply: {comb(women, k)} × {comb(men, size - k)} = {num(ans)}.",
        near(ans, gap=5),
    )
