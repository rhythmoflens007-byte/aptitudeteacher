# Aptitude Teacher

AI-powered aptitude tutor for Quantitative Aptitude, Logical Reasoning and Verbal Ability.
It diagnoses *why* a student gets something wrong, teaches that exact gap, re-tests it with a
fresh question, and keeps adapting what comes next.

Runs entirely on localhost. No accounts or API keys are needed to start. Add a free Gemini
key when you want the full AI tutor.

## Run it

You need Node.js 20+ and Python 3.11+.

**Easiest (Windows):** double-click `start.bat`. The first run installs everything, then it
starts both servers in their own windows and opens http://localhost:3000. Close those two
windows to stop the app.

**Manually. First time only:**

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```

```bash
cd apps/web
npm install
```

**Every time.** Start the backend in one terminal:

```bash
cd apps/api
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Then start the frontend in a second terminal:

```bash
cd apps/web
npm run dev
```

Open http://localhost:3000 and create an account. The database (`apps/api/aptitude.db`) is
created automatically and loaded with 140 hand-checked questions across 28 subtopics. New
questions added to `app/seed_data.py` are picked up on the next start without touching
existing progress. Delete the database file to reset all data.

On macOS/Linux use `.venv/bin/python` instead of `.venv/Scripts/python`.

## Turning on the AI (free)

1. Get a key at https://aistudio.google.com/apikey.
2. Copy `apps/api/.env.example` to `apps/api/.env` and set `GEMINI_API_KEY`.
3. Restart the backend.

| Feature | Without a key | With a Gemini key |
| --- | --- | --- |
| Adaptive practice, quizzes, mock tests, dashboard, XP/streaks/badges | ✅ | ✅ |
| Step-by-step explanations | ✅ English, read aloud | ✅ In any of the 14 languages, read aloud |
| Misconception diagnosis | Time-based estimate | AI reads the wrong option chosen |
| Micro-lesson after a concept gap | Worked solution | Targeted lesson on that gap |
| Re-test question | Another seeded question on the skill | Fresh AI-generated question once seeds run out |
| Tutor chat (text + voice) | Worked solution, read aloud | Full conversation in the student's language |
| Photo of a question (OCR) | ❌ | ✅ |

## What's inside

**Backend: `apps/api` (FastAPI + SQLAlchemy)**
- `app/engine/mastery.py`: the adaptive loop. Per-skill mastery scores are weighted by misconception
  type, the next question comes from pending re-tests first and then the weakest skill, and the
  daily goal is built from the three weakest skills plus one to reinforce.
- `app/engine/gamification.py`: XP, levels, day streaks, badges.
- `app/ai.py`: every Gemini call (tutor persona, diagnosis, lessons, question generation, OCR),
  each with an offline fallback.
- `app/routes/`: `auth`, `practice` (questions + attempts), `quizzes` (quiz/mock + reports),
  `tutor` (chat + OCR), `progress` (dashboard).
- `app/seed_data.py`: the question bank. Add questions here; they load on a fresh database.
- API docs: http://localhost:8000/docs

**Frontend: `apps/web` (Next.js 16 + Tailwind 4, installable as a PWA)**
- `/dashboard`: level/XP, streak, accuracy, speed, daily goal, 7-day trend, topic/skill mastery,
  weak skills, badges, learning history.
- `/practice`: adaptive questions with a timer; results with diagnosis, micro-lesson, re-test.
- `/tests`: timed quizzes and 15-question section-wise mock tests with reports.
- `/tutor`: chat with the tutor by text, voice (browser speech-to-text), or photo. Questions opened
  from practice or a photo are explained automatically; replies are spoken sentence by sentence
  with lip-sync, gestures and the current sentence highlighted, and tapping the mic interrupts.
- `/profile`: tutor name and gender, display name, and language. 14 languages: English, Hindi,
  Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam, Punjabi, Spanish, French and
  Arabic. The tutor replies and speaks in the chosen language (and mirrors the student's language
  if they write in another one); app menus are translated into English, Hindi and Tamil.

Voice input works in Chrome and Edge.

## Tutor characters

The tutors (Asha and Arjun) are animated 2D vector characters, rigged the way apps like Duolingo
animate theirs: separate parts for the head, eyes, brows, mouth, torso, arms and hands, driven by
a small state machine in `apps/web/src/lib/tutorRig.ts` and drawn by
`apps/web/src/components/TutorFigure.tsx`. They need no downloads or WebGL and work on any phone.

- **Lip-sync:** each spoken word is broken into mouth shapes (visemes), including Indian scripts,
  and the mouth morphs smoothly between them.
- **Body language:** a different explaining gesture per sentence, beats and nods on words,
  and reactions for thinking, listening, correct (thumbs-up) and incorrect (concerned) answers.
- **Life:** breathing, blinking, eye movements that follow the pointer, and a wave hello.
- Animation pauses when the tutor is off-screen, and calms down for people who turn on
  "reduce motion" in their system settings.

Speech uses the voices installed in the browser. Microsoft Edge has natural voices for most
Indian languages; Chrome on Windows has fewer, and the app shows a note when a language has no
voice.

## Tests

```bash
cd apps/api
.venv/Scripts/python -m pip install -r requirements-dev.txt
.venv/Scripts/python -m pytest -q
```

The suite uses its own temporary database and never calls the real Gemini API. It covers the
mastery maths, the diagnose → teach → re-test loop, quizzes and mocks, access control, and
the seed bank (every answer must be among its options, no duplicates). Every AI path runs
against a stand-in for Gemini, including the exact requests sent to the SDK.

## Moving to Postgres later

Set `DATABASE_URL` in `apps/api/.env` to a Postgres URL (for example a free Supabase project).
Tables are created automatically on start.
