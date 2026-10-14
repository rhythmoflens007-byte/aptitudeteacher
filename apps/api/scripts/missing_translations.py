"""Lists question text that still needs translating.

Run from apps/api:  .venv/Scripts/python scripts/missing_translations.py
Each line is an English pattern (with {placeholders}) to add, with its translation, to
app/translations/<lang>.json. Placeholders must be kept; they may move. Grammar helpers available in
translations: {x:m-form/f-form} picks by gender, {x:of} the possessive, {x:to} the dative, and values
can carry them as "text|gender|possessive|dative".
"""

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import content_i18n as ci  # noqa: E402
from app.question_templates import TEMPLATES  # noqa: E402


def main() -> int:
    total = 0
    for lang in ci.LANGUAGES:
        missing: dict[str, str] = {}
        for tpl in TEMPLATES:
            for k in range(40):
                with ci.language(lang) as gaps:
                    try:
                        tpl.make(random.Random(f"{tpl.name}:{k}"))
                    except Exception as exc:  # a broken translation (bad placeholder) shows up here
                        missing.setdefault(f"<error in {tpl.name}: {exc}>", tpl.name)
                for pattern in gaps:
                    missing.setdefault(pattern, tpl.name)
        print(f"{lang}: {len(missing)} missing")
        for pattern, name in sorted(missing.items(), key=lambda kv: kv[1]):
            print(f"  [{name}] {pattern!r}")
        total += len(missing)
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
