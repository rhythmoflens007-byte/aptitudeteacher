# HANDOFF — Aptitude Teacher (read this first)

You are continuing a long Claude Code session that ran out of context. This document is the complete
memory of that session: who the user is, what they asked for, every decision made and why, what is
built, what is verified vs. untested, what is pending, and the traps we hit. Read it fully before
touching anything, then verify the current state of the repo (it may have moved on since this was written).

Written: 2026-09-17. Project folder: `C:\Users\fazil\aptitude-teacher` (Windows 11, Git Bash + PowerShell).

---

## 1. The user and how to work with them

- Non-technical founder/student building an **AI aptitude tutoring app**, based in India (IST, +05:30).
  Explain things in plain language; avoid jargon; short, clear summaries.
- Strong preference: **"build it in one go"** — they want complete, working features, not
  incremental check-ins. They get frustrated by stop-start work. Do the whole task, verify it, then report.
  But they rejected one unprompted action (a folder-picker tool call) with "ask before start developing",
  so **ask before big irreversible or setup decisions** (where to put things, accounts, design direction).
- Everything must be **free** (no paid APIs/services). Runs on **localhost only** for now (no deployment).
- They frequently say **"Commit the working tree changes with a sensible message."** Do exactly that:
  review `git status`, make sure no `.env`/`.db`/secrets are staged, write a why-focused message, end
  with the Co-Authored-By trailer your harness specifies. Never push (no remote exists). Never commit
  unless asked.
- They test in the browser themselves and sometimes stop servers or close windows mid-work — if a
  background server "was stopped by the user", don't silently restart it; ask or check.
- They do not know AI models — they delegated model/stack choices to Claude.
- Demo login for testing: **demo@example.com / practice123** (test data; its tutor is currently set to
  "Arjun", male — changed during testing). A real user account "vasi" also exists in the local DB — don't touch it.

## 2. What the product is (original requirements, paraphrased)

AI Aptitude Teacher: web app (mobile later) for Quantitative Aptitude, Logical Reasoning, Verbal.
Student login/profile, question bank with difficulty levels, practice/quizzes/mock tests, instant answers
with step-by-step explanations, AI doubt-solving tutor (text + voice), multilingual, OCR of question
photos, adaptive difficulty, misconception detection, personalised learning path, AI virtual teacher
avatar (lip-sync, natural voice, expressions/gestures, real-time, interruptible), progress & gamification
(topic mastery, accuracy + speed, weak-topic detection, history, streaks/XP/levels/badges, daily goals,
dashboard). Stated differentiator: **"AI shouldn't just answer questions. It should understand what the
student doesn't know, teach it, test them again, and continuously adapt the learning path."**

## 3. Timeline of the session (what was done, in order)

1. Explained the requirements back; discussed existing tools (Khanmigo, LearnLM, Squirrel AI, ALEKS;
   HeyGen/Tavus/D-ID for avatars; Deepgram/ElevenLabs/Whisper/Piper; Mathpix).
2. User wanted free options → recommended Gemini API free tier + browser Web Speech API + self-built avatar.
3. Wrote a full build spec, published as an Artifact: **"Aptitude Teacher Blueprint"**
   (https://claude.ai/artifact/EtLVxVS8iobdiWKvZQVU3Y), also saved as `aptitude-teacher-blueprint.html`
   in the repo. It describes a 12-phase plan (the plan originally assumed Supabase/Upstash; see §4 for what changed).
4. Asked setup questions → user chose folder `C:\Users\fazil\aptitude-teacher`, said Node + Python installed,
   said they'd create Supabase/Gemini accounts (they never did).
5. **Commit 9173b63** — Phase 00 scaffold: Next.js app, FastAPI app, SQL schema + seed.
6. **Commit 9025017** — blueprint HTML added.
7. User asked about Colab → advised against (sessions die, no localhost); stay local.
8. "Run on localhost and start developing now", then "I want the project in one go" → built **every phase**
   without accounts: switched to local SQLite + own JWT auth + AI fallbacks. Tested end to end in the
   browser; fixed bugs found (mobile sticky header overlap, UTC timestamps shown 5.5h off, offline tutor
   dumping raw text, options not shuffled). **Commit 9be5293**.
9. "What's next, do it" → pytest suite (with a fake Gemini that exercises the real SDK call shapes),
   question bank 53 → 140, incremental seeding, `start.bat` one-click launcher. **Commit 312d47d**.
10. "Enhance the UI, animations, responsive, make the AI tutor 3D, customise tutor by gender and name" →
    full UI redesign, three.js tutor (egg-shaped head, realistic-ish), tutor name/gender stored on user with
    DB migration, gendered AI persona and voice selection. **Commit 1b2579e**.
11. User sent **Family Guy images (Lois & Peter Griffin)** asking for those characters in 3D with speech,
    gestures, multilingual, auto-explaining doubts. Claude **declined to recreate copyrighted characters**,
    built original full-body **toon-shaded cartoon tutors** (ink outlines, jointed arms/fingers, gesture
    system), sentence-by-sentence speech with highlighted sentence, auto-explain, 14 languages.
    Verified in browser (speech + highlight + gestures per sentence rendered correctly).
12. User: **"I don't like both avatars; I want characters from cartoon shows, rendered properly, lip sync
    and body language."** Claude again explained copyright (no Family Guy/Doraemon/Chhota Bheem etc.) and
    offered **VRM characters** (VRoid). User chose **"Use free models from VRoid Hub"**.
    Built a VRM renderer (`TutorVRM.tsx`, `@pixiv/three-vrm`) that auto-activates when model files exist,
    and refactored all body-language logic into `lib/tutorMotion.ts`. **Not yet tested with a real model.**
13. User asked to commit → changes were **staged but the commit never completed** (interrupted). Then
    "run the server" (done, via `start.bat`), then "close everything" (servers were already stopped).
14. User asked for this handoff.

## 4. Key decisions (and why)

| Decision | Why |
| --- | --- |
| **SQLite + own JWT auth** instead of Supabase | User never created accounts; app must run now. Swap by setting `DATABASE_URL` to Postgres. |
| **No Redis/Upstash** | Not needed at this scale; removed. |
| **Gemini (`google-genai` SDK, model `gemini-3.6-flash`)** for all AI, optional | Only genuinely free tier; one key covers tutor, diagnosis, lessons, generation, OCR, translation. **No key has ever been added — every AI feature has only run against a fake in tests.** |
| **Deterministic fallbacks** for every AI call | App fully usable offline; e.g. time-based misconception heuristic. |
| **Browser Web Speech API** for STT/TTS | Free, no server. Voices depend on browser/OS; Edge has the best Indian-language natural voices. |
| **No copyrighted characters** | Hard line held twice. Offer originals "in the style of", or licensed VRoid models. |
| **VRM via VRoid Hub** (user's choice) | Real models give proper rendering, blendshape lip-sync, humanoid rig. User must download (needs pixiv account + license acceptance — Claude must not create accounts or accept terms). |
| Keep procedural tutors as **fallback** | App works before/without VRM files and if WebGL fails (then 2D SVG `Avatar.tsx`). |

## 5. How to run

- One click: double-click **`start.bat`** (creates venv / installs deps on first run, opens two server
  windows titled "Aptitude Teacher - backend/frontend", opens http://localhost:3000).
- Manual: `cd apps/api && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000`
  and `cd apps/web && npm run dev`.
- `.claude/launch.json` has `api` and `web` configs for the preview tool (preview servers get stopped by the
  app when the session idles — use `start.bat` for anything the user tests themselves).
- Backend tests: `cd apps/api && .venv/Scripts/python -m pip install -r requirements-dev.txt && .venv/Scripts/python -m pytest -q` → **59 passed** at last run.
- Frontend checks: `cd apps/web && npx tsc --noEmit && npx eslint src && npx next build` → all clean at last run.
- Reset data: delete `apps/api/aptitude.db` (auto-recreated and seeded on start).
- Enable AI: copy `apps/api/.env.example` → `apps/api/.env`, set `GEMINI_API_KEY` (free at aistudio.google.com/apikey), restart backend.

## 6. Architecture & file map

Monorepo: `apps/api` (FastAPI, Python 3.12, SQLAlchemy 2), `apps/web` (Next.js **16.3.5**, React 19.2,
Tailwind 4, TypeScript), root `README.md`, `start.bat`, `aptitude-teacher-blueprint.html`, `.claude/launch.json`.

### Backend `apps/api/app`
- `config.py` — pydantic-settings; `.env` path is absolute (`API_DIR/.env`); defaults: SQLite at
  `apps/api/aptitude.db`, `jwt_secret`, `gemini_api_key=""`, `gemini_model="gemini-3.6-flash"`, CORS localhost:3000.
- `db/session.py` — engine, `SessionLocal(expire_on_commit=False)`, `Base`, `get_db`.
- `db/models.py` — `UTCDateTime` TypeDecorator (SQLite drops tzinfo; reattach UTC). Tables: `users`
  (email, password_hash, display_name, locale, **tutor_name** default "Asha", **tutor_gender** default "female"),
  `topics`, `subtopics`, `skills`, `questions` (options JSON, correct_option, explanation, difficulty 1–5,
  source seed|ai_generated), `question_skills`, `attempts` (quiz_id nullable, misconception_type, time_taken_ms),
  `skill_mastery` (0–100 score, attempts_count, streak), `quizzes` (kind quiz|mock, question_ids JSON, duration, score),
  `tutor_sessions` (question_id or question_text), `tutor_messages`, `daily_goals`, `gamification` (xp, level, streaks),
  `badges`, `user_badges`. String UUID ids.
- `auth.py` — PBKDF2-SHA256 (390k iters) password hashing, PyJWT HS256 bearer tokens, `current_user` dependency.
- `schemas.py` — Pydantic models. `Locale` = en, hi, bn, te, mr, ta, ur, gu, kn, ml, pa, es, fr, ar.
  `ProfileIn.tutor_name` validator: 1–30 chars, letters/space/`.'-`/Unicode combining marks only (names go into
  the AI prompt — blocks injection-ish text; whitespace collapsed). `QuestionOut` **shuffles options** per request.
- `ai.py` — all Gemini calls with fallbacks: `persona(learner)` (name, woman/man, gendered self-reference in
  gendered languages), `explain` (translate explanation for non-English), `heuristic_misconception`
  (<5s or skip → no_attempt, <20s → careless_slip, else conceptual_gap), `classify_misconception` (JSON mode),
  `micro_lesson`, `tutor_reply` (trims history to start with a student turn; "Reply in X; if the student writes in
  another language other than X and English, reply in theirs"; offline reply = "I'm {name}, running in offline mode…"
  + worked solution), `generate_question` (validates 4 distinct options, answer in options), `ocr_question`
  (image Part; "NONE" → ValueError). `AIUnavailable` wraps SDK errors.
- `engine/mastery.py` — `updated_score` (gain scales with difficulty & diminishing; penalty by misconception:
  careless 3, no_attempt 6, partial 7, conceptual 12), `target_difficulty = min(5, 1 + score//20)`,
  `next_question` (pending retest skill first → weakest/unattempted skill with jitter; avoids solved & recent;
  AI-generates when seeds exhausted), `question_for_skill`, `daily_goal` (3 weakest + 1 recently mastered, target 10).
- `engine/gamification.py` — XP (10×difficulty correct, 2 wrong), level = 1 + xp//250, day streaks, 8 badges
  (first_attempt, streak_3, streak_7, mastery_50, mastery_80, hundred_attempts, goal_getter, mock_finisher).
- `routes/` — `auth` (register/login/me/PATCH me incl. tutor fields & locale), `practice` (GET /topics,
  /questions/next, /questions/{id}, POST /questions/generate, POST /attempts → correctness, misconception,
  micro_lesson + retest_question_id for conceptual/partial, XP, mastery, badges, goal), `quizzes` (create quiz/mock
  (mock = 5 per section = 15, 60s/question), list, submit (409 on resubmit), report with sections & weak skills),
  `tutor` (status, sessions CRUD, messages, POST /tutor/ocr ≤5MB png/jpeg/webp/heic), `progress` (GET /progress/dashboard: stats,
  gamification, daily goal, topics→skills mastery/accuracy/avg time, weak skills, badges, 7-day trend, recent 25).
- `seed.py` — `init_db()` = `create_all` + `add_missing_columns()` (ALTER TABLE for columns added later, e.g. tutor
  fields) + incremental `seed()` (adds missing topics/subtopics/skills/questions by body; idempotent).
- `seed_data.py` — **140 hand-verified questions, 28 subtopics** (Quant 59, Logical 43, Verbal 38).
- `main.py` — lifespan runs `init_db`; `/health` returns `ai_enabled`.
- `tests/` — `conftest.py` (temp SQLite DB set via env before imports, `fake_ai` fixture patching `ai.enabled`/`ai._generate`),
  `test_api.py`, `test_ai.py` (incl. `RecordingModels` fake SDK client verifying request shapes), `test_engine.py`, `test_seed_data.py`.

### Frontend `apps/web/src`
- `app/globals.css` — design tokens (green `--accent #178a63`, orange `--marker #e2761f`, violet), light/dark,
  graph-paper grid + drifting blobs background, animation utilities (`rise`, `pop`, `shake`, `pulse-good`, `lift`,
  `press`, `shine`, `grow-x/y`, `skeleton`, `flame`, `typing-dot`, `xp-float`, `confetti`, tutor stage glow/ring),
  full `prefers-reduced-motion` override.
- `app/layout.tsx` (IBM Plex Sans + Newsreader via next/font, AuthProvider), `manifest.ts` + `icon.svg` (PWA).
- Pages: `page.tsx` (landing; logged-in → /dashboard; tutor preview Meet Asha/Arjun; floating chat bubbles),
  `login`, `register` (AuthForm), `dashboard`, `practice`, `tests` (setup/runner/report), `tutor`, `profile`.
- `components/`: `AppShell` (glass header nav desktop, **bottom tab bar on mobile**, auth guard, page transition),
  `ui.tsx` (Button, Card, Label, ProgressBar, Ring, useCountUp/CountUp, Confetti, Pill, ErrorNote, Spinner, Skeleton,
  Icon set, MISCONCEPTION_LABEL, DIFFICULTY), `Modal`, `AuthForm`, `Avatar.tsx` (2D SVG fallback, gender variants),
  `TutorAvatar.tsx` (wrapper: WebGL detection via useSyncExternalStore, `next/dynamic` ssr:false, error boundary →
  2D fallback; props gender/speaking/viseme/wordTick/gestureTick/mood/framing "full"|"portrait"),
  `Tutor3D.tsx` (Canvas; **checks `HEAD /tutors/{gender}.vrm`** → `TutorVRM` if present else procedural toon `Figure`;
  toon materials + inverted-hull ink outlines; female: bun, mustard tunic, maroon neckline, cream trousers, bindi,
  earrings; male: side-parted hair, goatee + curved moustache, maroon vest over light-blue shirt, charcoal trousers),
  `TutorVRM.tsx` (GLTFLoader + VRMLoaderPlugin; rotateVRM0; camera framed from bounding box/head bone; applies
  `TutorMotion` to normalized humanoid bones — arms lowered from T-pose via `z = ∓(π/2 − 0.12 − sz)`, elbow
  `y = side*ex, z = −side*ez`, finger curls on z; spine/neck/head; lookAt target follows pointer; blends vowel
  expressions aa/ee/ih/ou/oh from mouth open/width; blink; happy/sad/relaxed/surprised by mood; `vrm.update(delta)`
  for spring bones), `TutorCustomizer` (live full-body preview, Female/Male, name + suggestions, "Say hello" in all
  14 languages using the previewed gender's voice).
- `lib/`: `api.ts` (fetch wrapper, token in localStorage `aptitude.token`, types incl. `Locale`, `User.tutor_*`),
  `auth.tsx` (AuthProvider), `i18n.ts` (`LANGUAGES` 14 entries {code,label,english,speech}; UI dictionaries only
  **en/hi/ta**, others fall back to English; `useT()` returns `t`, `locale`, `speechLang`, `language`; keys incl.
  `tutor.explainRequest`, `tutor.listeningFemale` (Hindi verb gender)), `speech.ts` (speech recognition hook;
  `visemeFor` across Latin/Indic/Arabic vowels; `sentenceLines`; `detectSpeechLang` by script;
  gender voice-name regexes incl. Edge natural voices; `pickVoice` with pitch fallback; **`speak()` queues one
  utterance per sentence** (Chrome cuts long utterances ~15s) with onSentence/onWord; generation counter for cancel),
  `useTutorVoice.ts` (speaking, viseme, wordTick, gestureTick, activeKey, sentence, missingVoice, say(text,key,gender?), stop),
  `tutorMotion.ts` (**shared body language**: pose tables idle (female hand-on-hip / male hand-in-pocket), 5
  explaining gestures cycled per sentence, thinking (hand to chin), listening, happy (thumbs up), concerned (shrug),
  2.6s hello wave; word "beats"; blink; mouth open/width), `tutor.ts` (defaults Asha/Arjun, name ideas, `useTutor`),
  `useMedia.ts`.
- Tutor page behaviour: full-body stage on ≥1024px, portrait on mobile; language dropdown (updates profile);
  speak-replies toggle; **auto-explain** when a session with a question (from practice "Ask the tutor" or a photo)
  has no messages; "Explain this question" button; **current sentence highlighted** while spoken; Listen/Stop per
  reply; missing-voice notice suggesting Edge; mic interrupts speech; `dir="auto"` for RTL.
- Practice: tutor reacts (thinking/happy/concerned), Listen buttons on explanation and micro-lesson with gestures.

## 7. Current state (at handoff)

- Git: 5 commits (latest `1b2579e`). **All work from steps 11–12 (languages, speech rewrite, auto-explain,
  toon tutors, VRM renderer, motion refactor) is STAGED BUT NOT COMMITTED** — 22 files:
  README.md, api ai.py/schemas.py/tests, web package.json/lock, pages (landing, practice, profile, tutor), components
  (AuthForm, Tutor3D, TutorAvatar, TutorCustomizer, **TutorVRM** new), lib (api, i18n, speech, **tutorMotion**,
  **useMedia**, **useTutorVoice** new). The user's pending request was to commit them. Confirm with `git status` and
  commit when they ask (or ask them).
- `HANDOFF.md` (this file) is new/untracked.
- `apps/web/public/tutors/` exists but is **empty** — no VRM files yet.
- No `.env`; AI offline. Servers are not running.
- Frontend deps: next 16.3.5, react 19.2.8, three ^0.186, @react-three/fiber ^9.7, @pixiv/three-vrm ^3.5.5
  (drei was installed then removed). Backend deps in `requirements.txt` (+ pytest/httpx dev).

## 8. What is verified vs. NOT verified

Verified: backend tests (59), tsc/eslint/build, full practice→diagnosis→lesson→retest loop in browser, quizzes/mocks,
dashboard, Hindi UI switch, migration on the real DB, procedural toon tutors rendering, sentence-by-sentence speech
with highlight and per-sentence gesture change, VRM fallback path (404 → procedural).

**Not verified:** anything with a real Gemini key (tutor conversation, AI diagnosis/lessons/generation, OCR,
translations); **`TutorVRM` with a real .vrm model** (bone angle signs, finger curl axes, framing, expressions
are reasoned from three-vrm conventions, expect tuning); audible voice quality/lip-sync by ear; most pages at
phone size after the latest changes; male toon tutor after the final goatee/moustache fix; non-English TTS voices.

## 9. Immediate next steps

1. Ask the user to commit the staged work (or commit if they ask).
2. User downloads two VRoid Hub models whose conditions allow app use (and commercial use if selling), saving to
   `apps/web/public/tutors/female.vrm` and `male.vrm`, and reports whether credit is required (add a credits
   line if so). Claude must not download/accept licenses on their behalf without explicit permission.
3. With the files present: run the app, visually verify and **tune `TutorVRM.tsx`** (arm/elbow/finger signs,
   gesture amplitude, camera framing for "full" and "portrait", expression names, look-at), test lip-sync while
   speaking, test both genders, test customiser preview.
4. Encourage adding a Gemini key to validate real AI paths.
5. Possible later work: Mixamo animation clips retargeted to VRM for richer body language; more questions;
   Postgres/Supabase migration; deployment (user said not needed yet).

## 10. Gotchas learned the hard way

- **Next.js 16 is not the Next you know**: read `apps/web/node_modules/next/dist/docs/` before using APIs.
  `next dev` re-creates `apps/web/AGENTS.md` + `CLAUDE.md` (they're committed; leave them).
- `create-next-app` made a **nested .git** in apps/web — was removed; watch for embedded repos when adding.
- React lint rule `react-hooks/set-state-in-effect` is strict: set state in promise callbacks/rAF, use
  `useSyncExternalStore`, or lazy `useState` initialisers instead of synchronous setState in effects.
- **uvicorn `--reload` did not reload reliably on this Windows setup** — restart the backend after Python edits.
- **Never `taskkill /IM node.exe` or `python.exe`** — once killed every Node/Python process on the machine.
  Kill by port-owning PID after checking its command line.
- **Git Bash mangles backticks/`${}` inside `node -e "..."` and heredocs** (twice produced broken TS). Use the
  Edit/Write tools for code containing template literals.
- Background/preview servers get **stopped by the app** when the session ends; the user may also stop them.
- The browser pane's **screenshots don't capture WebGL**; `readPixels` needs a rendered frame (pane visible) — a
  temporary debug hook `gl.render(scene,camera); gl.domElement.toDataURL()` was used and **removed**; don't commit debug hooks.
- Automated clicks in the pane can miss under viewport emulation/sticky headers; dispatching a `keydown` Enter via JS works.
- Chrome speech synthesis stops long utterances (~15s) → per-sentence queue (already implemented).
- Web Speech voices differ per browser/OS; Edge has natural voices for most Indian languages.
- SQLite `create_all` never alters existing tables → use `add_missing_columns()` when adding model columns.
- Copyright: user repeatedly wants famous cartoon characters (Family Guy). Do not recreate or use them; offer
  originals or properly licensed VRM models.
