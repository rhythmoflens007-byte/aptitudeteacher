import random
from fractions import Fraction
from math import comb, factorial, gcd, lcm, perm

from app.question_templates.core import T, dec, frac, mcq, names, near, num, ordinal, pct, rupees, template

SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")


def power(base, exp) -> str:
    return f"{base}{str(exp).translate(SUP)}"


def days(v) -> str:
    return T("{v} days", v=num(v))


def hours(v) -> str:
    return T("{v} hours", v=num(v))


def seconds(v) -> str:
    return T("{v} seconds", v=num(v))


def kmh(v) -> str:
    return T("{v} km/h", v=num(v))


def change(v) -> str:
    if abs(v) < 1e-9:
        return T("No change")
    return f"{num(abs(v))}% {T("increase") if v > 0 else T("decrease")}"


def gain(v) -> str:
    if abs(v) < 1e-9:
        return T("No profit, no loss")
    return f"{num(abs(v))}% {T("profit") if v > 0 else T("loss")}"


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
        T("What is {p}% of {n}?", p=p, n=num(n)),
        num(ans),
        [num(ans * 10), num(n - ans), num(ans + p)],
        T("1. {p}% means {p}/100.\n2. {p}/100 × {n} = {ans}.", p=p, n=num(n), ans=num(ans)),
        near(ans),
    )


@template("Percentages", "Percentage change", 2)
def percentage_change(rng):
    p = rng.choice([5, 10, 15, 20, 25, 30, 40, 50, 60, 75])
    up = rng.random() < 0.6
    what, money = rng.choice([
        (T("The price of a bag"), True), (T("A worker's monthly salary"), True), (T("The price of a phone"), True),
        (T("A town's population"), False), (T("The number of students in a school"), False), (T("A website's daily visitors"), False),
    ])
    fmt = rupees if money else num
    base = multiple(rng, 100 // gcd(p, 100) * (10 if money else 1), 200, 60000 if money else 20000)
    delta = base * p // 100
    new = base + delta if up else base - delta
    word = T("increase") if up else T("decrease")
    return mcq(
        rng,
        T("{what} {x1} from {x2} to {x3}. What is the percentage {word}?", what=what, x1=T("rises") if up else T("falls"), x2=fmt(base), x3=fmt(new), word=word),
        pct(p),
        [pct(delta / new * 100), pct(p * 2), pct(100 - p)],
        T("1. Change = {x1} - {x2} = {x3}.\n"
            "2. Percentage {word} = change ÷ original × 100 = {delta} ÷ {base} × 100 = {p}%.\n"
            "Tip: always divide by the ORIGINAL value ({x4}), not the new one.", x1=fmt(max(base, new)), x2=fmt(min(base, new)), x3=fmt(delta), word=word, delta=num(delta), base=num(base), p=p, x4=fmt(base)),
        near(p, pct, 5),
    )


@template("Percentages", "Percentage change", 2)
def what_percent(rng):
    p = rng.choice([5, 8, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80, 125, 150])
    whole = multiple(rng, 100 // gcd(p, 100), 20, 900)
    part = whole * p // 100
    return mcq(
        rng,
        T("{part} is what percent of {whole}?", part=num(part), whole=num(whole)),
        pct(p),
        [pct(whole / part * 100), pct(abs(100 - p)), pct(p / 10)],
        T("1. Percent = part ÷ whole × 100.\n2. {part} ÷ {whole} × 100 = {p}%.", part=num(part), whole=num(whole), p=p),
        near(p, pct, 5),
    )


@template("Percentages", "Percentage change", 3)
def undo_a_change(rng):
    x = rng.choice([10, 20, 25, 40, 50, 60, 75, 80])
    down = rng.random() < 0.6
    after = 100 - x if down else 100 + x
    ans = Fraction(x * 100, after)
    first, back = (T("decreased"), T("increased")) if down else (T("increased"), T("decreased"))
    other = Fraction(x * 100, 100 + x if down else 100 - x)
    return mcq(
        rng,
        T("A number is {first} by {x}%. By what percent must the result be {back} to get back the original number?", first=first, x=x, back=back),
        pct(ans),
        [pct(x), pct(other), pct(x * 2)],
        T("1. Take the number as 100. After a {x}% {x1} it becomes {after}.\n"
            "2. To get back to 100 we need a change of {x} on a base of {after}.\n"
            "3. {x} ÷ {after} × 100 = {ans}.\n"
            "The base has changed, so the answer is not simply {x}%.", x=x, x1=T("decrease") if down else T("increase"), after=after, ans=pct(ans)),
        near(float(ans), pct, 5),
    )


@template("Percentages", "Successive percentage changes", 2)
def up_then_down(rng):
    a = rng.choice([5, 10, 15, 20, 25, 30, 40, 50])
    b = rng.choice([5, 10, 15, 20, 25, 30, 40, 50])
    rise_first = rng.random() < 0.5
    x, y = (a, -b) if rise_first else (-a, b)
    net = x + y + x * y / 100
    thing = rng.choice([T("The price of a TV"), T("A shop's rent"), T("The price of petrol"), T("A company's sales")])
    steps = T("increased by {a}% and then decreased by {b}%", a=a, b=b) if rise_first else T("decreased by {a}% and then increased by {b}%", a=a, b=b)
    f1, f2 = 1 + x / 100, 1 + y / 100
    return mcq(
        rng,
        T("{thing} is {steps}. What is the net change?", thing=thing, steps=steps),
        change(net),
        [change(x + y), change(x + y - x * y / 100), change(-net)],
        T("1. Multiply the factors: {f1} × {f2} = {x1}.\n"
            "2. {x2} means {x3}% of the original, so the result is: {net}.\n"
            "Shortcut: net % = x + y + xy/100 = {x} + ({y}) + ({x} × {y})/100 = {net2}%.", f1=dec(f1), f2=dec(f2), x1=dec(f1 * f2), x2=dec(f1 * f2), x3=num(f1 * f2 * 100), net=change(net), x=x, y=y, net2=num(net)),
        near(net, change, 1),
    )


@template("Percentages", "Successive percentage changes", 3)
def two_discounts(rng):
    d1, d2 = rng.sample([5, 10, 15, 20, 25, 30, 40, 50], 2)
    single = d1 + d2 - d1 * d2 / 100
    factor = (100 - d1) * (100 - d2) / 10000
    return mcq(
        rng,
        T("Two successive discounts of {d1}% and {d2}% are equivalent to a single discount of:", d1=d1, d2=d2),
        pct(single),
        [pct(d1 + d2), pct(d1 + d2 + d1 * d2 / 100), pct(max(d1, d2) + min(d1, d2) / 2)],
        T("1. Price factor = {x1} × {x2} = {factor}.\n"
            "2. The customer pays {x3}%, so the single discount is 100 - {x4} = {single}.\n"
            "Discounts never simply add up: the second one applies to an already reduced price.", x1=dec((100 - d1) / 100), x2=dec((100 - d2) / 100), factor=dec(factor), x3=num(factor * 100), x4=num(factor * 100), single=pct(single)),
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
        T("A town's population grows by {r1}% in the first year and {r2}% in the second. If it is now {now}, what was it two years ago?", r1=r1, r2=r2, now=num(now)),
        num(start),
        [num(round(now * (100 - r1 - r2) / 100)), num(round(now / (1 + (r1 + r2) / 100))), num(start * (100 + r1) // 100)],
        T("1. Growth factor over two years = {x1} × {x2} = {factor}.\n"
            "2. Original × {factor} = {now}.\n"
            "3. Original = {now} ÷ {factor} = {start}.\n"
            "Subtracting {x3}% from today's figure is the trap: the growth was on a smaller base.", x1=dec(1 + r1 / 100), x2=dec(1 + r2 / 100), factor=dec(factor), now=num(now), start=num(start), x3=r1 + r2),
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
        T("{x} can finish a piece of work in {a} days and {y} in {b} days. Working together, how many days will they take?", x=x, a=a, y=y, b=b),
        days(t),
        [days((a + b) / 2), days(a + b), days(abs(b - a))],
        T("1. {x}'s rate = 1/{a} of the work per day; {y}'s rate = 1/{b}.\n"
            "2. Together = 1/{a} + 1/{b} = {x1}/{x2} = 1/{t}.\n"
            "3. They finish in {t} days.\n"
            "Shortcut: ({a} × {b}) ÷ ({a} + {b}) = {x3} ÷ {x4} = {t}.", x=x, a=a, y=y, b=b, x1=a + b, x2=a * b, t=t, x3=a * b, x4=a + b),
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
        T("{x} and {y} together can do a job in {t} days. {x} alone can do it in {a} days. How many days will {y} alone take?", x=x, y=y, t=t, a=a),
        days(b),
        [days(a - t), days(a + t), days(2 * t)],
        T("1. Combined rate = 1/{t}; {x}'s rate = 1/{a}.\n"
            "2. {y}'s rate = 1/{t} - 1/{a} = {x1}/{x2} = 1/{b}.\n"
            "3. {y} alone takes {b} days.", t=t, x=x, a=a, y=y, x1=a - t, x2=a * t, b=b),
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
        T("{x} can do a job in {a} days and {y} in {b} days. They work together for {k} days, then {x} leaves. How many more days will {y} take to finish the job?", x=x, a=a, y=y, b=b, k=k),
        days(ans),
        [days(b - k), days(ans + k), days(b)],
        T("1. Combined rate = 1/{a} + 1/{b} = {rate} of the job per day.\n"
            "2. In {k} days they finish {k} × {rate} = {x1} of the job.\n"
            "3. Remaining = {rest}. {y}'s rate is 1/{b}, so {y} needs {rest} × {b} = {ans} days.", a=a, b=b, rate=frac(rate), k=k, x1=frac(k * rate), rest=frac(rest), y=y, ans=num(ans)),
        near(float(ans), days),
    )


@template("Time and Work", "Combined work rate", 3)
def fill_and_empty(rng):
    f, e = rng.choice(PIPE_PAIRS)
    t = f * e // (e - f)
    return mcq(
        rng,
        T("One pipe fills a tank in {f} hours and another empties it in {e} hours. If both are opened on an empty tank, how long will it take to fill?", f=f, e=e),
        hours(t),
        [hours(f * e / (f + e)), hours(e - f), hours(e + f)],
        T("1. Filling rate = 1/{f} per hour; emptying rate = 1/{e} per hour.\n"
            "2. Net rate = 1/{f} - 1/{e} = {x1}/{x2} = 1/{t}.\n"
            "3. The tank fills in {t} hours.\n"
            "An emptying pipe is negative work: subtract its rate.", f=f, e=e, x1=e - f, x2=f * e, t=t),
        near(t, hours),
    )


@template("Time and Work", "Men and days", 1)
def men_and_days(rng):
    while True:
        m1, d1, m2 = rng.randint(4, 30), rng.randint(6, 40), rng.randint(3, 60)
        if m1 != m2 and (m1 * d1) % m2 == 0:
            break
    d2 = m1 * d1 // m2
    crew, one = rng.choice([(T("workers"), T("worker")), (T("men"), T("man")), (T("labourers"), T("labourer")), (T("painters"), T("painter"))])
    return mcq(
        rng,
        T("{m1} {crew} can finish a job in {d1} days. How many days will {m2} {crew} take to finish the same job?", m1=m1, crew=crew, d1=d1, m2=m2),
        days(d2),
        [days(d1 * m2 / m1), days(abs(d1 + m1 - m2)), days(d2 + d1)],
        T("1. Total work = {crew} × days = {m1} × {d1} = {x1} {x2}-days.\n"
            "2. With {m2} {crew}: {x3} ÷ {m2} = {d2} days.\n"
            "{x4} {crew} means {x5} days: they are inversely proportional.", crew=crew, m1=m1, d1=d1, x1=m1 * d1, x2=one, m2=m2, x3=m1 * d1, d2=d2, x4=T("Fewer") if m2 < m1 else T("More"), x5=T("more") if m2 < m1 else T("fewer")),
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
        T("{m1} men working {h1} hours a day finish a job in {d1} days. How many days will {m2} men take, working {h2} hours a day?", m1=m1, h1=h1, d1=d1, m2=m2, h2=h2),
        days(d2),
        [days(m1 * d1 / m2), days(d1 * m2 * h2 / (m1 * h1)), days(d2 + 2)],
        T("1. Total work = men × hours × days = {m1} × {h1} × {d1} = {total} man-hours.\n"
            "2. Each day {m2} men do {m2} × {h2} = {x1} man-hours.\n"
            "3. Days = {total} ÷ {x2} = {d2}.", m1=m1, h1=h1, d1=d1, total=total, m2=m2, h2=h2, x1=m2 * h2, x2=m2 * h2, d2=d2),
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
        T("{m} men can build a wall in {d} days. After {k} days, {extra} more men join them. How many more days are needed to finish the wall?", m=m, d=d, k=k, extra=extra),
        days(ans),
        [days(d - k), days(m * d / (m + extra)), days(m * (d - k) / extra)],
        T("1. Total work = {m} × {d} = {x1} man-days.\n"
            "2. In {k} days, {m} men do {x2} man-days, leaving {x3}.\n"
            "3. Now {x4} men work: {x5} ÷ {x6} = {ans} days.", m=m, d=d, x1=m * d, k=k, x2=m * k, x3=m * (d - k), x4=m + extra, x5=m * (d - k), x6=m + extra, ans=ans),
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
        T("A train {length} m long runs at {speed} km/h. How long will it take to pass a pole?", length=length, speed=speed),
        seconds(t),
        [seconds(length / speed), seconds(length / (speed * 18 / 5)), seconds(t * 2)],
        T("1. Convert the speed: {speed} × 5/18 = {v} m/s.\n"
            "2. To pass a pole the train covers its own length, {length} m.\n"
            "3. Time = {length} ÷ {v} = {t} seconds.", speed=speed, v=num(v), length=length, t=t),
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
        T("A train {length} m long, running at {speed} km/h, crosses a platform in {t} seconds. How long is the platform?", length=length, speed=speed, t=t),
        T("{v} m", v=platform),
        [T("{v} m", v=v * t), T("{v} m", v=length) if length != platform else T("{v} m", v=platform + 50), T("{v} m", v=speed * t - length)],
        T("1. Convert the speed: {speed} × 5/18 = {v} m/s.\n"
            "2. Distance covered in {t} s = {v} × {t} = {x1} m.\n"
            "3. That distance is train + platform, so platform = {x2} - {length} = {platform} m.", speed=speed, v=v, t=t, x1=v * t, x2=v * t, length=length, platform=platform),
        near(platform, lambda x: T("{v} m", v=num(x)), 20),
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
        T("Two trains, {l1} m and {l2} m long, run in opposite directions at {s1} km/h and {s2} km/h. How long do they take to cross each other?", l1=l1, l2=l2, s1=s1, s2=s2),
        seconds(t),
        [seconds((l1 + l2) / float(mps(abs(s1 - s2)))), seconds(l1 / v), seconds((l1 + l2) / total_speed)],
        T("1. Opposite directions: add the speeds. {s1} + {s2} = {total_speed} km/h.\n"
            "2. Convert: {total_speed} × 5/18 = {v} m/s.\n"
            "3. Distance to cross = sum of lengths = {x1} m.\n"
            "4. Time = {x2} ÷ {v} = {t} seconds.", s1=s1, s2=s2, total_speed=total_speed, v=v, x1=l1 + l2, x2=l1 + l2, t=t),
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
        T("A {l1} m long train running at {fast} km/h overtakes a {l2} m long train running at {slow} km/h in the same direction. How long does it take to pass it completely?", l1=l1, fast=fast, l2=l2, slow=slow),
        seconds(t),
        [seconds((l1 + l2) / float(mps(fast + slow))), seconds(l1 / v), seconds(t * 2)],
        T("1. Same direction: subtract the speeds. {fast} - {slow} = {diff} km/h.\n"
            "2. Convert: {diff} × 5/18 = {v} m/s.\n"
            "3. To pass completely it covers both lengths: {l1} + {l2} = {x1} m.\n"
            "4. Time = {x2} ÷ {v} = {t} seconds.", fast=fast, slow=slow, diff=diff, v=v, l1=l1, l2=l2, x1=l1 + l2, x2=l1 + l2, t=t),
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
    who = rng.choice([T("A cyclist"), T("A bus"), T("A runner"), T("A car")])
    span = T("{h} hours {m} minutes", h=h, m=m) if m else T("{h} hours", h=h)
    return mcq(
        rng,
        T("{who} covers {dist} km in {span}. What is the average speed?", who=who, dist=dist, span=span),
        kmh(speed),
        [kmh(dist / (h + m / 100)), kmh(dist / h) if m else kmh(dist / (h + 1)), kmh(speed + 4)],
        T("1. {span} = {time} hours", span=span, time=num(time)) + (T(" ({m} minutes = {x1} hour)", m=m, x1=num(m / 60)) if m else "") + T(".\n2. Speed = distance ÷ time = {dist} ÷ {time} = {speed} km/h.", dist=dist, time=num(time), speed=speed),
        near(speed, kmh, 2),
    )


@template("Time, Speed and Distance", "Average speed", 2)
def there_and_back(rng):
    x, y = rng.choice(ROUND_TRIPS)
    ans = 2 * x * y // (x + y)
    a, b = rng.sample(["A", "P", T("the city"), T("the village"), T("home"), T("the office")], 2)
    return mcq(
        rng,
        T("A car travels from {a} to {b} at {x} km/h and returns at {y} km/h. What is its average speed for the whole journey?", a=a, b=b, x=x, y=y),
        kmh(ans),
        [kmh((x + y) / 2), kmh(y - x), kmh(ans + 2)],
        T("1. For equal distances, average speed = 2xy ÷ (x + y), not (x + y) ÷ 2.\n"
            "2. = 2 × {x} × {y} ÷ ({x} + {y}) = {x1} ÷ {x2} = {ans} km/h.\n"
            "The car spends more time at the slower speed, so the average is below {x3}.", x=x, y=y, x1=2 * x * y, x2=x + y, ans=ans, x3=num((x + y) / 2)),
        near(ans, kmh, 2),
    )


@template("Time, Speed and Distance", "Average speed", 3)
def late_or_early(rng):
    p, q = rng.choice([(3, 4), (4, 5), (2, 3), (5, 6), (7, 8)])
    m = rng.choice([5, 6, 8, 10, 12, 15, 20])
    slower = rng.random() < 0.6
    if slower:
        usual = m * p // (q - p)
        body = T("Walking at {p}/{q} of her usual speed, a woman reaches her office {m} minutes late. What is her usual time for the journey?", p=p, q=q, m=m)
        steps = (
            T("1. Speed and time are inversely proportional, so at {p}/{q} speed she takes {q}/{p} of her usual time.\n"
                "2. The extra time is {q}/{p} - 1 = {x1}/{p} of her usual time.\n"
                "3. {x2}/{p} of usual time = {m} minutes, so usual time = {m} × {p}{x3} = {usual} minutes.", p=p, q=q, x1=q - p, x2=q - p, m=m, x3=f'/{q - p}' if q - p > 1 else '', usual=usual)
        )
        trap = m * q // (q - p)
    else:
        usual = m * q // (q - p)
        body = T("Driving at {q}/{p} of his usual speed, a man reaches {m} minutes early. What is his usual time for the journey?", q=q, p=p, m=m)
        steps = (
            T("1. At {q}/{p} speed he takes {p}/{q} of his usual time.\n"
                "2. The time saved is 1 - {p}/{q} = {x1}/{q} of his usual time.\n"
                "3. {x2}/{q} of usual time = {m} minutes, so usual time = {m} × {q}{x3} = {usual} minutes.", q=q, p=p, x1=q - p, x2=q - p, m=m, x3=f'/{q - p}' if q - p > 1 else '', usual=usual)
        )
        trap = m * p // (q - p)
    return mcq(
        rng, body, T("{usual} minutes", usual=usual), [T("{trap} minutes", trap=trap), T("{x1} minutes", x1=m * q), T("{x1} minutes", x1=usual + m)], steps,
        near(usual, lambda v: T("{v} minutes", v=num(v)), 5),
    )


# ---------------------------------------------------------------- Profit and Loss

@template("Profit and Loss", "Profit and loss percentage", 1)
def profit_percent(rng):
    p = rng.choice([5, 10, 12, 15, 20, 25, 30, 40, 50])
    cp = multiple(rng, 100 // gcd(p, 100), 100, 3000)
    profit = rng.random() < 0.6
    delta = cp * p // 100
    sp = cp + delta if profit else cp - delta
    word = T("profit") if profit else T("loss")
    return mcq(
        rng,
        T("An article bought for {cp} is sold for {sp}. What is the {word} percent?", cp=rupees(cp), sp=rupees(sp), word=word),
        pct(p),
        [pct(delta / sp * 100), pct(p + 5), pct(delta) if delta != p else pct(p * 2)],
        T("1. {x1} = {x2} - {x3} = {delta}.\n"
            "2. {x4} % is always on cost price: {delta2} ÷ {cp} × 100 = {p}%.", x1=word.capitalize(), x2=rupees(max(cp, sp)), x3=rupees(min(cp, sp)), delta=rupees(delta), x4=word.capitalize(), delta2=num(delta), cp=num(cp), p=p),
        near(p, pct, 5),
    )


@template("Profit and Loss", "Profit and loss percentage", 1)
def price_after_discount(rng):
    d = rng.choice([5, 10, 15, 20, 25, 30, 40])
    mp = multiple(rng, 100, 300, 9000)
    sp = mp * (100 - d) // 100
    item = rng.choice([T("shirt"), T("pair of shoes"), T("school bag"), T("mixer grinder"), T("bicycle"), T("watch")])
    return mcq(
        rng,
        T("A {item} marked at {mp} is sold at a {d}% discount. What is the selling price?", item=item, mp=rupees(mp), d=d),
        rupees(sp),
        [rupees(mp * d // 100), rupees(mp - d), rupees(mp * (100 + d) // 100)],
        T("1. Discount = {d}% of {mp} = {x1}.\n"
            "2. Selling price = {mp} - {x2} = {sp}.\n"
            "Shortcut: {mp} × {x3} = {sp}.", d=d, mp=rupees(mp), x1=rupees(mp * d // 100), x2=rupees(mp * d // 100), sp=rupees(sp), x3=num((100 - d) / 100)),
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
        T("By selling an article for {sp1}, a shopkeeper loses {loss}%. At what price should it be sold to gain {want}%?", sp1=rupees(sp1), loss=loss, want=want),
        rupees(ans),
        [rupees(round(sp1 * (100 + want) / 100)), rupees(round(sp1 * (100 + loss + want) / 100)), rupees(cp)],
        T("1. A {loss}% loss means SP = {x1}% of CP, so CP = {sp1} ÷ {x2} = {cp}.\n"
            "2. For a {want}% gain, SP = {cp2} × {x3} = {ans}.\n"
            "The percentages are always on cost price, never on the old selling price.", loss=loss, x1=100 - loss, sp1=num(sp1), x2=num((100 - loss) / 100), cp=rupees(cp), want=want, cp2=num(cp), x3=num((100 + want) / 100), ans=rupees(ans)),
        near(ans, rupees),
    )


@template("Profit and Loss", "Profit and loss percentage", 3)
def mark_up_then_discount(rng):
    m, d = rng.choice([10, 20, 25, 30, 40, 50, 60]), rng.choice([5, 10, 15, 20, 25, 30])
    sp = (100 + m) * (100 - d) / 100
    return mcq(
        rng,
        T("A shopkeeper marks goods {m}% above cost price and then gives a {d}% discount. What is his profit or loss percent?", m=m, d=d),
        gain(sp - 100),
        [gain(m - d), gain(m * d / 100), gain(m + d)],
        T("1. Take CP = 100. Marked price = {x1}.\n"
            "2. After a {d}% discount, SP = {x2} × {x3} = {sp}.\n"
            "3. On a cost of 100, that is {x4}.\n"
            "The discount is on the marked price, so you can't just subtract {d} from {m}.", x1=100 + m, d=d, x2=100 + m, x3=num((100 - d) / 100), sp=num(sp), x4=gain(sp - 100), m=m),
        near(sp - 100, gain, 2),
    )


@template("Profit and Loss", "Profit and loss percentage", 4)
def false_weight(rng):
    w = rng.choice([750, 800, 875, 900, 950, 960, 980])
    ans = (1000 - w) / w * 100
    return mcq(
        rng,
        T("A shopkeeper sells goods at cost price but uses {x1} {w} g weight in place of 1 kg. What is his profit percent?", x1='an' if w in (800, 875) else 'a', w=w),
        pct(ans),
        [pct((1000 - w) / 10), pct((1000 - w) / 1000 * 100 + 1), pct(ans * 2)],
        T("1. He charges for 1000 g but gives only {w} g, so he gains {x1} g on every {w} g he hands over.\n"
            "2. Profit % = {x2} ÷ {w} × 100 = {ans}.\n"
            "The gain is measured on what he really gives ({w} g), not on 1000 g.", w=w, x1=1000 - w, x2=1000 - w, ans=pct(ans)),
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
        T("Divide {total} between {x} and {y} in the ratio {a}:{b}. What is {x1}'s share?", total=rupees(total), x=x, y=y, a=a, b=b, x1=y if ask_second else x),
        rupees(share),
        [rupees((a if ask_second else b) * unit), rupees(total // (b if ask_second else a)), rupees(share + unit)],
        T("1. Total parts = {a} + {b} = {x1}.\n"
            "2. One part = {total} ÷ {x2} = {unit}.\n"
            "3. {x3}'s share = {x4} × {unit2} = {share}.", a=a, b=b, x1=a + b, total=num(total), x2=a + b, unit=rupees(unit), x3=y if ask_second else x, x4=b if ask_second else a, unit2=num(unit), share=rupees(share)),
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
        T("A prize of {total} is shared among {x}, {y} and {z} in the ratio {a}:{b}:{c}. How much does {z} get?", total=rupees(total), x=x, y=y, z=z, a=a, b=b, c=c),
        rupees(c * unit),
        [rupees(a * unit), rupees(b * unit), rupees(total // c) if total % c == 0 else rupees(c * unit + unit)],
        T("1. Total parts = {a} + {b} + {c} = {x1}.\n"
            "2. One part = {total} ÷ {x2} = {unit}.\n"
            "3. {z} gets {c} parts = {c} × {unit2} = {x3}.", a=a, b=b, c=c, x1=a + b + c, total=num(total), x2=a + b + c, unit=rupees(unit), z=z, unit2=num(unit), x3=rupees(c * unit)),
        near(c * unit, rupees, unit),
    )


@template("Ratio and Proportion", "Dividing in a ratio", 2)
def total_from_difference(rng):
    a, b = rng.choice([(p, q) for p, q in COPRIME if p > q])
    k = rng.randint(3, 15)
    diff = (a - b) * k
    return mcq(
        rng,
        T("The ratio of boys to girls in a school club is {a}:{b}. There are {diff} more boys than girls. How many members are there in total?", a=a, b=b, diff=diff),
        num((a + b) * k),
        [num(diff * (a + b)), num(a * k), num((a + b) * k + diff)],
        T("1. The difference between boys and girls is {a} - {b} = {x1} part{x2}.\n", a=a, b=b, x1=a - b, x2='s' if a - b > 1 else '')
        + (T("2. 1 part = {diff} members.\n", diff=diff) if a - b == 1 else T("2. {x1} parts = {diff} members, so 1 part = {k}.\n", x1=a - b, diff=diff, k=k))
        + T("3. Total = {x1} parts = {x2} × {k} = {x3}.", x1=a + b, x2=a + b, k=k, x3=(a + b) * k),
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
        T("If A:B = {a}:{b} and B:C = {c}:{d}, what is A:C?", a=a, b=b, c=c, d=d),
        ratio(a * c, b * d),
        [f"{a}:{d}", ratio(a * d, b * c), f"{c}:{b}"],
        T("1. Make B equal in both ratios. The LCM of {b} and {c} is {m}.\n"
            "2. A:B = {x1}:{m} and B:C = {m}:{x2}.\n"
            "3. So A:B:C = {x3}:{m}:{x4}, and A:C = {x5}.", b=b, c=c, m=m, x1=a * m // b, x2=d * m // c, x3=a * m // b, x4=d * m // c, x5=ratio(a * c, b * d)),
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
        T("Two numbers are in the ratio {a}:{b}. If {k} is added to each, the ratio becomes {new}. What are the numbers?", a=a, b=b, k=k, new=new),
        T("{n1} and {n2}", n1=n1, n2=n2),
        [T("{x1} and {x2}", x1=a * (x + 1), x2=b * (x + 1)), T("{x1} and {x2}", x1=a * (x - 1), x2=b * (x - 1)) if x > 2 else T("{x1} and {x2}", x1=a * (x + 2), x2=b * (x + 2)), T("{x1} and {x2}", x1=n1 + k, x2=n2 + k)],
        T("1. Let the numbers be {a}x and {b}x.\n"
            "2. ({a}x + {k}) ÷ ({b}x + {k}) = {x1}.\n"
            "3. Solving gives x = {x}, so the numbers are {n1} and {n2}.\n"
            "Check: {x2}:{x3} = {new}.", a=a, b=b, k=k, x1=new.replace(':', '/'), x=x, n1=n1, n2=n2, x2=n1 + k, x3=n2 + k, new=new),
    )


# ---------------------------------------------------------------- Simple and Compound Interest

@template("Simple and Compound Interest", "Simple interest", 1)
def simple_interest(rng):
    p = multiple(rng, 500, 1000, 25000)
    r, t = rng.choice([4, 5, 6, 8, 10, 12]), rng.choice([2, 3, 4, 5])
    si = p * r * t // 100
    return mcq(
        rng,
        T("What is the simple interest on {p} at {r}% per annum for {t} years?", p=rupees(p), r=r, t=t),
        rupees(si),
        [rupees(p + si), rupees(p * r // 100), rupees(si * 2)],
        T("1. Simple interest = P × R × T ÷ 100.\n2. = {p} × {r} × {t} ÷ 100 = {si}.", p=num(p), r=r, t=t, si=rupees(si)),
        near(si, rupees),
    )


@template("Simple and Compound Interest", "Simple interest", 2)
def simple_amount(rng):
    p = multiple(rng, 1000, 2000, 30000)
    r, t = rng.choice([4, 5, 6, 8, 10, 12]), rng.choice([2, 2.5, 3, 4, 1.5])
    si = p * r * t / 100
    return mcq(
        rng,
        T("{p} is lent at {r}% simple interest per annum. What is the total amount after {t} years?", p=rupees(p), r=r, t=num(t)),
        rupees(p + si),
        [rupees(si), rupees(round(p * (1 + r / 100) ** t)), rupees(p + p * r / 100)],
        T("1. Interest = {p} × {r} × {t} ÷ 100 = {si}.\n"
            "2. Amount = principal + interest = {p} + {si2} = {x1}.\n"
            "{si} is only the interest, not the amount.", p=num(p), r=r, t=num(t), si=rupees(si), si2=num(si), x1=rupees(p + si)),
        near(p + si, rupees, 100),
    )


@template("Simple and Compound Interest", "Simple interest", 2)
def principal_from_amount(rng):
    p = multiple(rng, 500, 2000, 20000)
    r, t = rng.choice([4, 5, 6, 8, 10, 12, 15]), rng.choice([2, 3, 4, 5])
    total = p * (100 + r * t) // 100
    return mcq(
        rng,
        T("A sum becomes {total} in {t} years at {r}% simple interest per annum. What is the sum?", total=rupees(total), t=t, r=r),
        rupees(p),
        [rupees(round(total * (100 - r * t) / 100)), rupees(round(total / (1 + r / 100))), rupees(p + 500)],
        T("1. Interest for {t} years at {r}% = {x1}% of the principal.\n"
            "2. So amount = {x2}% of principal = {total}.\n"
            "3. Principal = {total} ÷ {x3} = {p}.", t=t, r=r, x1=r * t, x2=100 + r * t, total=num(total), x3=num((100 + r * t) / 100), p=rupees(p)),
        near(p, rupees, 250),
    )


@template("Simple and Compound Interest", "Simple interest", 3)
def times_itself(rng):
    k = rng.choice([2, 3, 4])
    t = rng.choice([v for v in [4, 5, 8, 10, 12, 15, 16, 20, 25] if ((k - 1) * 100) % v == 0 or ((k - 1) * 100 / v * 2).is_integer()])
    r = (k - 1) * 100 / t
    word = {2: T("double"), 3: T("triple"), 4: T("become four times")}[k]
    return mcq(
        rng,
        T("At what rate of simple interest per annum will a sum {word} itself in {t} years?", word=word, t=t),
        pct(r),
        [pct(k * 100 / t), pct(100 / t) if k > 2 else pct(r / 2), pct(r + 2)],
        T("1. To {x1}, the interest must equal {x2} × the principal, i.e. {x3}% of P.\n"
            "2. {x4}% spread over {t} years = {x5} ÷ {t} = {r} per year.", x1=word.replace('become ', ''), x2=k - 1, x3=(k - 1) * 100, x4=(k - 1) * 100, t=t, x5=(k - 1) * 100, r=pct(r)),
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
        T("Find the compound interest on {p} at {r}% per annum for 2 years, compounded annually.", p=rupees(p), r=r),
        rupees(ci),
        [rupees(2 * p * r // 100), rupees(int(amount)), rupees(p * r // 100)],
        T("1. After year 1: {p} × {x1} = {after1}.\n"
            "2. After year 2: {after1} × {x2} = {x3}.\n"
            "3. Compound interest = {x4} - {p} = {ci}.\n"
            "It is {x5} more than simple interest because year 2 earns interest on year 1's interest.", p=num(p), x1=num(1 + r / 100), after1=num(after1), x2=num(1 + r / 100), x3=num(int(amount)), x4=num(int(amount)), ci=rupees(ci), x5=rupees(ci - 2 * p * r // 100)),
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
        T("The difference between compound and simple interest on a sum for 2 years at {r}% per annum is {d}. What is the sum?", r=r, d=rupees(d)),
        rupees(p),
        [rupees(d * 100 // r), rupees(p // 2), rupees(p * 2)],
        T("1. For 2 years, CI - SI = P × (R/100)².\n"
            "2. {d} = P × ({r}/100)² = P × {x1}.\n"
            "3. P = {d} ÷ {x2} = {p}.", d=num(d), r=r, x1=dec(r * r / 10000), x2=dec(r * r / 10000), p=rupees(p)),
        near(p, rupees, 1000),
    )


@template("Simple and Compound Interest", "Compound interest", 4)
def compound_multiples(rng):
    k, m, n = rng.choice([2, 3]), rng.choice([2, 3, 4]), rng.randint(3, 10)
    word = {2: T("doubles"), 3: T("triples")}[k]
    target = k ** m
    simple_trap = (target - 1) // (k - 1) * n
    return mcq(
        rng,
        T("A sum of money {word} itself in {n} years at compound interest. In how many years will it become {target} times?", word=word, n=n, target=target),
        T("{x1} years", x1=m * n),
        [T("{simple_trap} years", simple_trap=simple_trap), T("{x1} years", x1=target * n), T("{x1} years", x1=(m + 1) * n)],
        T("1. Under compound interest the sum is multiplied by the same factor every {n} years: ×{k}.\n"
            "2. {target} = {x1}, which is {m} such steps.\n"
            "3. {m} × {n} = {x2} years.\n"
            "{simple_trap} years is the simple-interest trap.", n=n, k=k, target=target, x1=' × '.join([str(k)] * m), m=m, x2=m * n, simple_trap=simple_trap),
        near(m * n, lambda v: T("{v} years", v=num(v)), n),
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
        T("The average of {x1} and {x2} is:", x1=', '.join(map(str, values[:-1])), x2=values[-1]),
        num(avg),
        [num(sum(values)), num(sorted(values)[k // 2]), num(avg + 2)],
        T("1. Sum = {x1} = {x2}.\n2. Average = {x3} ÷ {k} = {avg}.", x1=' + '.join(map(str, values)), x2=sum(values), x3=sum(values), k=k, avg=avg),
        near(avg),
    )


@template("Averages", "Average of a group", 2)
def newcomer_age(rng):
    n, a = rng.randint(15, 40), rng.randint(10, 30)
    rise = rng.choice([1, 1, 2])
    b = a + rise
    ans = (n + 1) * b - n * a
    group, who = rng.choice([(T("students"), T("the teacher")), (T("players"), T("the coach")), (T("workers"), T("the manager"))])
    return mcq(
        rng,
        T("The average age of {n} {group} is {a} years. When {who}'s age is included, the average becomes {b} years. What is {who}'s age?", n=n, group=group, a=a, who=who, b=b),
        T("{ans} years", ans=ans),
        [T("{x1} years", x1=a + n * rise), T("{b} years", b=b), T("{x1} years", x1=ans + rise)],
        T("1. Total age of the {group} = {n} × {a} = {x1}.\n"
            "2. Total with {who} = {x2} × {b} = {x3}.\n"
            "3. {x4}'s age = {x5} - {x6} = {ans} years.", group=group, n=n, a=a, x1=n * a, who=who, x2=n + 1, b=b, x3=(n + 1) * b, x4=who.capitalize(), x5=(n + 1) * b, x6=n * a, ans=ans),
        near(ans, lambda v: T("{v} years", v=num(v)), 2),
    )


@template("Averages", "Average of a group", 3)
def next_innings(rng):
    n, a, d = rng.randint(10, 25), rng.randint(25, 50), rng.randint(1, 4)
    ans = (n + 1) * (a + d) - n * a
    return mcq(
        rng,
        T("A batsman's average after {n} innings is {a}. After his {x1} innings, the average rises to {x2}. How many runs did he score in the {x3} innings?", n=n, a=a, x1=ordinal(n + 1), x2=a + d, x3=ordinal(n + 1)),
        num(ans),
        [num(a + n * d), num(a + d), num(ans + d)],
        T("1. Runs after {n} innings = {n} × {a} = {x1}.\n"
            "2. Runs after {x2} innings = {x3} × {x4} = {x5}.\n"
            "3. Runs in the {x6} innings = {x7} - {x8} = {ans}.", n=n, a=a, x1=n * a, x2=n + 1, x3=n + 1, x4=a + d, x5=(n + 1) * (a + d), x6=ordinal(n + 1), x7=(n + 1) * (a + d), x8=n * a, ans=ans),
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
        T("The average weight of {n} people increases by {d} kg when a new person replaces one who weighs {w} kg. What is the weight of the new person?", n=n, d=num(d), w=w),
        T("{ans} kg", ans=num(ans)),
        [T("{x1} kg", x1=num(w + d)), T("{x1} kg", x1=num(w - n * d)), T("{x1} kg", x1=num(w + (n + 1) * d))],
        T("1. The total weight rises by {n} × {d} = {x1} kg.\n"
            "2. That extra weight comes only from the swap, so the new person is {x2} kg heavier than {w} kg.\n"
            "3. New person = {w} + {x3} = {ans} kg.", n=n, d=num(d), x1=num(n * d), x2=num(n * d), w=w, x3=num(n * d), ans=num(ans)),
        near(ans, lambda v: T("{v} kg", v=num(v)), 2),
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
    rule = T("\n(Check: {x1} = {d} × {x2}.)", x1=num(n + add), d=d, x2=num((n + add) // d))
    return mcq(
        rng,
        T("What is the smallest number that must be added to {n} to make it exactly divisible by {d}?", n=num(n), d=d),
        str(add),
        [str(r), str(add + 1), str(d)],
        T("1. {n} ÷ {d} leaves remainder {r}.\n"
            "2. To reach the next multiple of {d}, add {d} - {r} = {add}.{rule}\n"
            "{r} is the trap: that is what you would subtract, not add.", n=num(n), d=d, r=r, add=add, rule=rule),
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
        T("What is the remainder when {a} is divided by {m}?", a=power(a, n), m=m),
        str(ans),
        [str(r) for r in others[:3]],
        T("1. Remainders of {a}¹, {a}², {a}³… when divided by {m}: {x1}, then they repeat every {length}.\n"
            "2. {n} ÷ {length} leaves remainder {x2}, so take position {pos} in the cycle.\n"
            "3. The remainder is {ans}.", a=a, m=m, x1=', '.join(map(str, cycle[:length])), length=length, n=n, x2=n % length, pos=pos, ans=ans),
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
        T("What is the unit digit of {base}?", base=power(base, n)),
        str(ans),
        [str(d) for d in dict.fromkeys(preferred)],
        T("1. Only the last digit of the base matters: {last}.\n"
            "2. Unit digits of powers of {last} repeat every {length}: {x1}.\n"
            "3. {n} ÷ {length} leaves remainder {x2}, so take position {pos} in the cycle: {ans}.", last=last, length=length, x1=', '.join(map(str, cycle[:length])), n=n, x2=n % length, pos=pos, ans=ans),
    )


@template("Number System", "Divisibility and remainders", 2)
def largest_divisible(rng):
    d, k = rng.randint(7, 97), rng.choice([3, 4, 5])
    top = 10 ** k - 1
    ans = top - top % d
    return mcq(
        rng,
        T("What is the largest {k}-digit number exactly divisible by {d}?", k=k, d=d),
        num(ans),
        [num(ans - d), num(top - d), num(top - top % d + 1)],
        T("1. The largest {k}-digit number is {top}.\n"
            "2. {top} ÷ {d} leaves remainder {x1}.\n"
            "3. Subtract the remainder: {top} - {x2} = {ans}.", k=k, top=num(top), d=d, x1=top % d, x2=top % d, ans=num(ans)),
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
        T("What is the LCM of {x1}, {x2} and {x3}?", x1=nums[0], x2=nums[1], x3=nums[2]),
        str(l),
        [str(l * 2), str(l // 2) if l % 2 == 0 and l // 2 not in nums else str(l + nums[0]), str(nums[0] * nums[1] * nums[2]) if g == 1 else str(g)],
        T("1. Break each into primes: {x1}.\n"
            "2. The LCM takes the highest power of each prime: {x2} = {l}.", x1=', '.join(f'{x} = {factorise(x)}' for x in nums), x2=factorise(l), l=l),
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
        T("What is the HCF of {x1}, {x2} and {x3}?", x1=nums[0], x2=nums[1], x3=nums[2]),
        str(g),
        [str(g * 2), str(divisors[-1]) if divisors else str(g + 1), str(lcm(*nums)) if lcm(*nums) < 10000 else str(g * 3)],
        T("1. Break each into primes: {x1}.\n"
            "2. The HCF takes the lowest power of the primes common to all three: {x2} = {g}.", x1=', '.join(f'{x} = {factorise(x)}' for x in nums), x2=factorise(g), g=g),
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
        T("The HCF of two numbers is {h} and their LCM is {l}. If one number is {a}, what is the other?", h=h, l=l, a=a),
        str(b),
        [str(l // a) if l // a != b else str(b + h), str(l // h), str(a + h)],
        T("1. For two numbers, HCF × LCM = product of the numbers.\n"
            "2. {h} × {l} = {a} × other, so other = {x1} ÷ {a} = {b}.", h=h, l=l, a=a, x1=h * l, b=b),
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
        T("Three bells ring at intervals of {x1}, {x2} and {x3} minutes. If they ring together at {x4}, when will they next ring together?", x1=ivs[0], x2=ivs[1], x3=ivs[2], x4=clock_time(start)),
        clock_time(start + l),
        [clock_time(start + sum(ivs)), clock_time(start + ivs[2]), clock_time(start + 2 * l)],
        T("1. They ring together again after the LCM of {x1}, {x2} and {x3}.\n"
            "2. LCM = {x4} = {l} minutes.\n"
            "3. {x5} + {l} minutes = {x6}.", x1=ivs[0], x2=ivs[1], x3=ivs[2], x4=factorise(l), l=l, x5=clock_time(start), x6=clock_time(start + l)),
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
    goods = rng.choice([T("rice"), T("sugar"), T("tea"), T("pulses"), T("wheat")])
    return mcq(
        rng,
        T("In what ratio must {goods} at ₹{c}/kg be mixed with {goods} at ₹{d}/kg to get a mixture worth ₹{m}/kg?", goods=goods, c=c, d=d, m=m),
        ratio(d - m, m - c),
        [ratio(m - c, d - m), ratio(d - m, d - c), ratio(c, d)],
        T("1. Alligation: cheaper : dearer = (dearer - mean) : (mean - cheaper).\n"
            "2. = ({d} - {m}) : ({m} - {c}) = {x1} : {x2} = {x3}.", d=d, m=m, c=c, x1=d - m, x2=m - c, x3=ratio(d - m, m - c)),
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
    goods = rng.choice([T("Tea"), T("Coffee"), T("Rice"), T("Dal")])
    wrong = Fraction(q * c + p * d, p + q)
    return mcq(
        rng,
        T("{goods} at ₹{c}/kg and {x1} at ₹{d}/kg are mixed in the ratio {p}:{q}. What is the price of the mixture per kg?", goods=goods, c=c, x1=goods.lower(), d=d, p=p, q=q),
        rupees(mean),
        [rupees((c + d) / 2), rupees(float(wrong)), rupees(mean + 5)],
        T("1. Cost of {x1} kg = {p} × {c} + {q} × {d} = ₹{x2}.\n"
            "2. Price per kg = {x3} ÷ {x4} = {mean}.\n"
            "It sits closer to the price there is more of.", x1=p + q, p=p, c=c, q=q, d=d, x2=p * c + q * d, x3=p * c + q * d, x4=p + q, mean=rupees(mean)),
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
        T("A {volume}-litre mixture has milk and water in the ratio {a}:{b}. How much water must be added to make the ratio {c}:{d}?", volume=volume, a=a, b=b, c=c, d=d),
        T("{add} litres", add=add),
        [T("{target} litres", target=int(target)), T("{x1} litres", x1=abs(volume * d // (c + d) - water) or add + 2), T("{x1} litres", x1=add * 2)],
        T("1. Milk = {milk} L, water = {water} L.\n"
            "2. Milk stays {milk} L. For milk : water = {c} : {d}, water must be {milk} × {d}/{c} = {target} L.\n"
            "3. Water to add = {target} - {water} = {add} litres.", milk=milk, water=water, c=c, d=d, target=int(target), add=add),
        near(add, lambda v: T("{v} litres", v=num(v)), 2),
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
        T("A container holds {volume} litres of pure milk. {out} litres are removed and replaced with water, and this is done {times} times in all. How much milk is left?", volume=volume, out=out, times=times),
        T("{left} litres", left=num(left)),
        [T("{x1} litres", x1=volume - times * out), T("{x1} litres", x1=num(volume * (1 - out / volume) ** (times - 1))), T("{x1} litres", x1=num(left + out / 2))],
        T("1. Each replacement keeps ({volume} - {out}) ÷ {volume} = {keep} of the milk.\n"
            "2. After {times} replacements: {volume} × ({keep}){x1} = {left} litres.\n"
            "{x2} litres is the trap: later removals take out a mixture, not pure milk.", volume=volume, out=out, keep=frac(keep), times=times, x1=str(times).translate(SUP), left=num(left), x2=volume - times * out),
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
        T("A fair die is thrown once. What is the probability of getting {name}?", name=name),
        frac(p),
        fraction_options(rng, p, [1 - p, Fraction(len(good), 5), Fraction(1, len(good)), Fraction(len(good) + 1, 6), Fraction(1, 6)]),
        T("1. Favourable outcomes: {x1}, so {x2} outcome{x3}.\n"
            "2. Probability = {x4} ÷ 6 = {p}.", x1=', '.join(map(str, good)), x2=len(good), x3='s' if len(good) > 1 else '', x4=len(good), p=frac(p)),
        lambda s: frac(Fraction(s, 7 + s)),
    )


@template("Probability", "Basic probability", 2)
def coins(rng):
    n = rng.choice([2, 3])
    total = 2 ** n
    kind = rng.choice(["at least one", "exactly one", "no", "exactly two", "at most one"] if n == 3 else ["at least one", "exactly one", "no"])
    count = {"at least one": total - 1, "exactly one": comb(n, 1), "no": 1, "exactly two": comb(n, 2), "at most one": 1 + n}[kind]
    p = Fraction(count, total)
    word = {2: T("Two"), 3: T("Three")}[n]
    return mcq(
        rng,
        T("{word} fair coins are tossed. What is the probability of getting {kind} head{x1}?", word=word, kind=kind, x1='s' if kind in ('no', 'exactly two') else ''),
        frac(p),
        fraction_options(rng, p, [1 - p, Fraction(1, n + 1), Fraction(count, total + 1), Fraction(1, 2), Fraction(1, total)]),
        T("1. There are 2{x1} = {total} equally likely outcomes.\n"
            "2. Outcomes with {kind} head{x2}: {count}.\n"
            "3. Probability = {count} ÷ {total} = {p}.", x1=str(n).translate(SUP), total=total, kind=kind, x2='s' if kind in ('no', 'exactly two') else '', count=count, p=frac(p))
        + (T("\nShortcut: P(at least one) = 1 - P(none).") if kind == "at least one" else ""),
        lambda s: frac(Fraction(s, total + s)),
    )


@template("Probability", "Basic probability", 2)
def cards(rng):
    events = [(T("a king"), 4), (T("a heart"), 13), (T("a face card (jack, queen or king)"), 12), (T("a red card"), 26),
              (T("a red king"), 2), (T("an ace or a king"), 8), (T("a black face card"), 6), (T("a spade or an ace"), 16), (T("the queen of hearts"), 1)]
    name, count = rng.choice(events)
    p = Fraction(count, 52)
    return mcq(
        rng,
        T("A card is drawn at random from a standard 52-card deck. What is the probability that it is {name}?", name=name),
        frac(p),
        fraction_options(rng, p, [Fraction(1, 52) if count > 1 else Fraction(1, 13), Fraction(count, 13), 1 - p, Fraction(count + 4, 52), Fraction(1, 4)]),
        T("1. There are {count} card{x1} that count as {name} in 52 cards.\n"
            "2. Probability = {count} ÷ 52 = {p}.", count=count, x1='s' if count > 1 else '', name=name, p=frac(p)),
        lambda s: frac(Fraction(s, 52)),
    )


@template("Probability", "Basic probability", 3)
def two_dice(rng):
    rolls = [(a, b) for a in range(1, 7) for b in range(1, 7)]
    events = {T("the sum is {s}", s=s): (lambda s: lambda r: sum(r) == s)(s) for s in range(3, 12)}
    events.update({"the sum is more than 9": lambda r: sum(r) > 9, "both dice show the same number": lambda r: r[0] == r[1],
                   "the sum is even": lambda r: sum(r) % 2 == 0, "the product is 12": lambda r: r[0] * r[1] == 12})
    name, test = rng.choice(list(events.items()))
    good = [r for r in rolls if test(r)]
    p = Fraction(len(good), 36)
    listing = ", ".join(f"({a},{b})" for a, b in good) if len(good) <= 8 else T("{x1} pairs", x1=len(good))
    return mcq(
        rng,
        T("Two fair dice are thrown. What is the probability that {name}?", name=name),
        frac(p),
        fraction_options(rng, p, [Fraction(len(good), 12), Fraction(len(good), 11) if len(good) < 11 else Fraction(1, 11), Fraction(len(good) + 1, 36), 1 - p, Fraction(len(good), 6)]),
        T("1. There are 6 × 6 = 36 equally likely outcomes.\n"
            "2. Favourable: {listing}, so {x1} outcomes.\n"
            "3. Probability = {x2} ÷ 36 = {p}.", listing=listing, x1=len(good), x2=len(good), p=frac(p)),
        lambda s: frac(Fraction(s, 36)),
    )


@template("Probability", "Basic probability", 3)
def two_balls(rng):
    r, b = rng.randint(3, 7), rng.randint(3, 8)
    n = r + b
    both = rng.random() < 0.6
    if both:
        p = Fraction(r * (r - 1), n * (n - 1))
        body = T("A bag has {r} red and {b} blue balls. Two balls are drawn at random without replacement. What is the probability that both are red?", r=r, b=b)
        steps = T("1. P(first red) = {r}/{n}.\n"
            "2. One red is gone, so P(second red) = {x1}/{x2}.\n"
            "3. P(both red) = {r}/{n} × {x3}/{x4} = {p}.", r=r, n=n, x1=r - 1, x2=n - 1, x3=r - 1, x4=n - 1, p=frac(p))
        traps = [Fraction(r * r, n * n), Fraction(r, n), Fraction(r - 1, n - 1)]
        tail = T("\n{x1} is the trap: that assumes the first ball is put back.", x1=frac(Fraction(r * r, n * n)))
    else:
        p = Fraction(2 * r * b, n * (n - 1))
        body = T("A bag has {r} red and {b} blue balls. Two balls are drawn at random without replacement. What is the probability of getting one ball of each colour?", r=r, b=b)
        steps = T("1. Red then blue: {r}/{n} × {b}/{x1}. Blue then red: {b}/{n} × {r}/{x2}.\n"
            "2. Add both orders: 2 × {x3}/{x4} = {p}.", r=r, n=n, b=b, x1=n - 1, x2=n - 1, x3=r * b, x4=n * (n - 1), p=frac(p))
        traps = [Fraction(r * b, n * (n - 1)), Fraction(2 * r * b, n * n), Fraction(1, 2)]
        tail = T("\nForgetting that the order can be either way halves the answer.")
    return mcq(rng, body, frac(p), fraction_options(rng, p, traps + [Fraction(1, n)]), steps + tail, lambda s: frac(Fraction(s, n + s)))


# ---------------------------------------------------------------- Permutations and Combinations

@template("Permutations and Combinations", "Counting arrangements and selections", 1)
def arrange_in_a_row(rng):
    n = rng.randint(3, 7)
    things = rng.choice([T("different books be arranged on a shelf"), T("people stand in a row"), T("different flags be hung on a pole"),
                         T("students line up in a queue"), T("runners finish a race with no ties")])
    return mcq(
        rng,
        T("In how many ways can {n} {things}?", n=n, things=things),
        num(factorial(n)),
        [num(n * (n - 1)), num(factorial(n - 1)), num(n ** 2)],
        T("1. The first place has {n} choices, the next {x1}, and so on down to 1.\n"
            "2. {x2} = {n}! = {x3}.", n=n, x1=n - 1, x2=' × '.join(map(str, range(n, 0, -1))), x3=num(factorial(n))),
        near(factorial(n), gap=n),
    )


@template("Permutations and Combinations", "Counting arrangements and selections", 2)
def digits_without_repeats(rng):
    n, r = rng.randint(4, 7), rng.choice([2, 3])
    digits = sorted(rng.sample(range(1, 10), n))
    return mcq(
        rng,
        T("How many {r}-digit numbers can be formed from the digits {x1} and {x2} if no digit is repeated?", r=r, x1=', '.join(map(str, digits[:-1])), x2=digits[-1]),
        num(perm(n, r)),
        [num(n ** r), num(comb(n, r)), num(perm(n, r - 1))],
        T("1. First place: {n} choices. Next: {x1} left.", n=n, x1=n - 1) + (T(" Next: {x1} left.", x1=n - 2) if r == 3 else "") + T("\n2. {x1} = {x2}.\n{x3} would allow repeated digits.", x1=' × '.join(str(n - i) for i in range(r)), x2=perm(n, r), x3=n ** r),
        near(perm(n, r), gap=n),
    )


@template("Permutations and Combinations", "Counting arrangements and selections", 2)
def committee(rng):
    n, r = rng.randint(5, 12), rng.randint(2, 4)
    group = rng.choice([T("committee"), T("team"), T("panel"), T("group")])
    return mcq(
        rng,
        T("How many different {group}s of {r} people can be chosen from {n} people?", group=group, r=r, n=n),
        num(comb(n, r)),
        [num(perm(n, r)), num(n * r), num(comb(n, r - 1)) if comb(n, r - 1) != comb(n, r) else num(comb(n, r) + n)],
        T("1. Order doesn't matter in a {group}, so use combinations.\n"
            "2. C({n}, {r}) = {x1} ÷ {r}! = {x2} ÷ {x3} = {x4}.\n"
            "{x5} counts ordered arrangements.", group=group, n=n, r=r, x1=' × '.join(str(n - i) for i in range(r)), x2=perm(n, r), x3=factorial(r), x4=comb(n, r), x5=perm(n, r)),
        near(comb(n, r), gap=2),
    )


@template("Permutations and Combinations", "Counting arrangements and selections", 3)
def round_table(rng):
    n = rng.randint(4, 8)
    who = rng.choice([T("people"), T("friends"), T("guests"), T("delegates"), T("family members"), T("players")])
    return mcq(
        rng,
        T("In how many ways can {n} {who} sit around a round table?", n=n, who=who),
        num(factorial(n - 1)),
        [num(factorial(n)), num(factorial(n - 1) // 2), num(factorial(n) // 2)],
        T("1. Around a circle, rotations of the same seating are identical.\n"
            "2. Fix one person's seat and arrange the other {x1}: {x2}! = {x3}.", x1=n - 1, x2=n - 1, x3=num(factorial(n - 1))),
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
    described = ", ".join(f"{c} {T("twice") if k == 2 else T("{k} times", k=k)}" for c, k in repeats.items())
    return mcq(
        rng,
        T("How many different arrangements of the letters of the word {word} are possible?", word=word),
        num(ans),
        [num(factorial(len(word))), num(first_only) if first_only != ans else num(ans * 2), num(ans // 2) if ans % 2 == 0 else num(ans * 3)],
        T("1. {word} has {x1} letters, with {described}.\n"
            "2. Arrangements = {x2}! ÷ ({x3}) = {x4} ÷ {denom} = {ans}.\n"
            "Divide by the repeats because swapping identical letters gives the same word.", word=word, x1=len(word), described=described, x2=len(word), x3=' × '.join(f'{k}!' for k in repeats.values()), x4=num(factorial(len(word))), denom=denom, ans=num(ans)),
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
        T("A committee of {size} is to be chosen from {men} men and {women} women. In how many ways can it be done if it must have exactly {k} wom{x1}n?", size=size, men=men, women=women, k=k, x1='a' if k == 1 else 'e'),
        num(ans),
        [num(comb(men + women, size)), num(comb(women, k) + comb(men, size - k)), num(perm(women, k) * comb(men, size - k))],
        T("1. Choose the women: C({women}, {k}) = {x1}.\n"
            "2. Choose the men: C({men}, {x2}) = {x3}.\n"
            "3. Both choices happen together, so multiply: {x4} × {x5} = {ans}.", women=women, k=k, x1=comb(women, k), men=men, x2=size - k, x3=comb(men, size - k), x4=comb(women, k), x5=comb(men, size - k), ans=num(ans)),
        near(ans, gap=5),
    )
