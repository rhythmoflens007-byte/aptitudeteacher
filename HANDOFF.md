# MASTER HANDOFF — Aptitude Teacher (read this completely before doing anything)

You are continuing a very long Claude Code project that ran out of context twice. This document is
the complete memory of both sessions: who the user is, how to work with them, what was asked, every
decision and why, what is built, what is verified or untested, and the traps we hit. After reading it,
check the real state of the repo (`git status`, `git log`), because things may have changed.

Last updated: 2026-09-17 (session 3: full test pass). Project folder: `C:\Users\fazil\aptitude-teacher` (Windows 11; Git Bash and
PowerShell both available). Latest commit when written: `3a7ada8`.

---

## 1. The user and how to work with them

- **Who:** a non-technical founder/student in India (IST, +05:30) building an AI aptitude tutoring app.
  They write short, informal messages with typos. They don't know AI models or frameworks and delegate
  technical choices to Claude.
- **Language:** explain in plain words, short and clear. No jargon. Say file names and commands simply.
- **Style they want:** "build it in one go". Complete, working features, then a report. They get frustrated
  by stop-start work. BUT ask before big irreversible or setup decisions (accounts, installing big
  software, design direction). They once rejected an unprompted folder-picker with "ask before start
  developing". When they say "say your plan, don't build", give only a plan in text and wait for "go".
- **Constraints:** everything must be **free**; runs on **localhost only** (no deployment yet).
- **Design taste:** they repeatedly push for "high-end, professional, not generic". History:
  generic → SaaS → Oxford university → Apple-inspired light playful "Spark" (current). They want many
  animations and effects and a lively character.
- **Commits:** they often say "Commit the working tree changes with a sensible message." Then: review
  `git status`, never stage `.env` / `.db` / secrets, write a why-focused message, end with the
  `Co-Authored-By:` trailer your harness specifies. Never push (no remote exists). Never commit unless asked.
  If the tree is broken mid-work when asked, finish to a building state first and say so.
- **Servers:** they test themselves via `start.bat`. They sometimes stop servers mid-work; don't silently
  restart servers they stopped. Preview servers started by Claude get stopped when the session idles.
- **Secrets:** they have a Gemini API key. Claude must NEVER ask them to paste keys in chat or type keys
  into files itself. Claude created `apps/api/.env` with an empty `GEMINI_API_KEY=` line and the user pasted
  the key themselves. Verify the key only by length/format without printing it.
- **Copyright line held repeatedly:** they asked for Family Guy / famous cartoon characters. Never recreate
  copyrighted characters. Also: don't copy Apple's logo/pages/SF Pro font; "Apple-inspired" style only.
  Headline "in Steve Jobs' style" is fine, but never quote him or imply endorsement.
- **Test accounts:** demo login `demo@example.com` / `practice123` (test data; tutor currently Arjun, male;
  many test chats/attempts exist). A real account **"vasi"** exists in the local DB — don't touch it.

## 2. The product (original requirements)

AI Aptitude Teacher web app (mobile later) for Quantitative Aptitude, Logical Reasoning and Verbal Ability.
Login/profile; question bank with difficulty; practice, quizzes, mock tests; instant step-by-step
explanations; AI doubt-solving tutor (text + voice + photo/OCR); multilingual; adaptive difficulty;
misconception detection; personalised path; animated AI teacher avatar (lip-sync, voice, expressions,
gestures, interruptible); progress and gamification (mastery, accuracy, speed, weak topics, history,
streaks, XP, levels, badges, daily goals, dashboard). Differentiator in the user's words: "AI shouldn't
just answer questions. It should understand what the student doesn't know, teach it, test them again,
and continuously adapt the learning path."

## 3. Full timeline of what was done (both sessions)

### Session 1 (commits 9173b63 → 1b2579e, plus staged work)
1. Explained requirements and existing tools; user chose free options: Gemini free tier + browser Web
   Speech API + self-built avatar.
2. Wrote a 12-phase build spec, published as artifact "Aptitude Teacher Blueprint" and saved as
   `aptitude-teacher-blueprint.html`.
3. `9173b63` scaffold (Next.js + FastAPI, SQL schema, seed). `9025017` blueprint added.
4. Advised against Google Colab; stay local.
5. `9be5293` built every phase without accounts: SQLite + own JWT auth + AI fallbacks. Browser-tested and
   fixed bugs (mobile sticky header, UTC 5.5h offset, offline tutor dump, options not shuffled).
6. `312d47d` pytest suite (fake Gemini exercising real SDK shapes), question bank 53 → 140, incremental
   seeding, `start.bat`.
7. `1b2579e` UI redesign, three.js 3D tutor, tutor name/gender on user (DB migration), gendered persona/voice.
8. Original toon 3D tutors, sentence-by-sentence speech with highlight, auto-explain, 14 languages.
   Declined Family Guy characters.
9. VRM renderer via @pixiv/three-vrm (VRoid) — never tested with a real model; later removed.

### Session 2 (this one)
10. `47ae988` committed the staged multilingual talking tutor + VRM support.
11. User asked about existing open-source projects → explained (Khanmigo, Squirrel AI, OATutor, pyBKT,
    Open TutorAI, DeepTutor, ChatVRM, TalkingHead, AptiQuest, GetVidyaAI…). Nothing combines the full idea.
12. `2acbcfd` "clean premium SaaS" redesign (Geist font, emerald accent, sidebar shell, landing rebuilt).
13. `56211b4` "Modern Oxford" design (navy/crimson/gold, serif, crest logo) + cinematic motion: added
    `motion` (Framer Motion) and `lenis` (smooth scroll), React `<ViewTransition>` page transitions,
    pinned scroll story, intro curtain, magnetic buttons, etc.
14. `b59d529` committed the session-1 HANDOFF.md notes.
15. User found 3D cartoons childish. Planned realistic 3D (Microsoft Rocketbox + TalkingHead + Mixamo);
    showed Rocketbox candidates (picked F1 + M5). Before downloading Blender, user changed direction:
    **2D Duolingo-style animated human**.
16. `65f0feb` 2D rigged tutors: `lib/tutorRig.ts` (state machine) + `components/TutorFigure.tsx` (layered
    SVG, transforms written per frame via refs). Removed Tutor3D/TutorVRM/Avatar/tutorMotion and three.js
    deps. Text-driven visemes lip-sync.
17. Connected Gemini for real (user added key). `e0f88d8`:
    - `gemini-2.5-flash` is retired for new users → default **`gemini-3.6-flash`**, fallback
      **`gemini-3.5-flash`** (`GEMINI_FALLBACK_MODEL`). Transient 429/5xx retried, then fallback model.
    - Native-script instruction (no romanised Hindi), digits 0–9, no greeting in explanations.
    - Diagnosis + micro-lesson merged into ONE JSON call (`ai.diagnose`), explanation translated in a
      parallel thread → answer check ~20s → ~10s.
    - OCR 503 message now says "busy" when a key exists.
    - Live smoke test passed: tutor EN/HI/TA, diagnosis+lesson in Hindi, question generation, photo OCR.
18. User asked for Apple-level redesign → plan approved with choices: **light mode, own colour-wheel
    palette (not Apple's), playful tutor with emotions on by default, Steve-Jobs-style simple headline,
    keep only EN/HI/TA/TE**. `3a7ada8` (current) implements all of it (details below).
19. This master handoff was written at the user's request.

## 4. Key decisions and why

| Decision | Why |
|---|---|
| SQLite + own JWT auth (no Supabase) | User never created accounts; must run locally now. Swap via `DATABASE_URL`. |
| Gemini (`google-genai`) for all AI, optional | Genuinely free tier; one key covers tutor, diagnosis, lessons, generation, OCR, translation. |
| Deterministic fallbacks for every AI call | App works offline (heuristic misconception by time, worked solution in chat). |
| Browser Web Speech API for STT/TTS | Free, no server. Voices vary; Edge has best Indian voices. |
| 2D rigged SVG tutor (not 3D/VRM) | User found 3D childish; realistic 3D needed accounts/Blender/large files. 2D loads instantly, works on all phones, fully animatable. |
| No copyrighted characters; Apple-inspired only | Legal/brand risk. |
| Only 4 languages (en, hi, ta, te) | User request; full-quality menus in all four. |
| Light mode only | User request; dark-mode CSS removed. |
| Emotion tags from the AI | One extra instruction in the same request (no extra cost) → tutor acts out intended tone. |

## 5. How to run and check

- **One click:** double-click `start.bat` (creates venv/installs deps first time, opens "Aptitude Teacher -
  backend/frontend" windows, opens http://localhost:3000).
- **Manual:** `apps/api`: `.venv/Scripts/python -m uvicorn app.main:app --port 8000`; `apps/web`: `npm run dev`.
- **Claude preview:** `.claude/launch.json` has `api` and `web` configs (preview_start by name).
- **Backend tests:** `cd apps/api && .venv/Scripts/python -m pytest -q` → **70 passed** at last run.
- **Frontend checks:** `cd apps/web && npx tsc --noEmit && npx eslint src && npx next build` → all clean.
  If tsc complains about a deleted route in `.next/dev/types`, delete `apps/web/.next/dev/types`.
- **AI key:** `apps/api/.env` (git-ignored) has `GEMINI_API_KEY` (user-provided, 53 chars, works),
  `GEMINI_MODEL=gemini-3.6-flash`, random `JWT_SECRET`. `.env.example` documents all incl. fallback model.
- **Reset data:** delete `apps/api/aptitude.db` (recreated + seeded on start). Don't do this casually — the
  user's "vasi" account lives there.
- `/health` returns `ai_enabled`.

## 6. Architecture and file map

Monorepo: `apps/api` (FastAPI, Python 3.12, SQLAlchemy 2), `apps/web` (Next.js 16.3.5, React 19.2, Tailwind 4,
TypeScript), root `README.md`, `start.bat`, `aptitude-teacher-blueprint.html`, `.claude/launch.json`, `HANDOFF.md`.

### Backend `apps/api/app`
- `config.py` — pydantic-settings, absolute `.env` path; `gemini_model="gemini-3.6-flash"`,
  `gemini_fallback_models` (comma list: 3.8-flash, flash-latest, 3.5-flash, 3.5-flash-lite, 3.1-flash-lite),
  `gemini_models()`, SQLite default (15 s busy timeout), CORS localhost:3000.
- `db/models.py` — UTCDateTime decorator; tables users (tutor_name default "Asha", tutor_gender "female",
  locale), topics/subtopics/skills/questions/question_skills, attempts, skill_mastery, quizzes,
  tutor_sessions, **tutor_messages (content + `emotions` JSON, nullable)**, daily_goals, gamification,
  badges, user_badges. String UUID ids.
- `routes/tutor.py` `send_message` calls the AI BEFORE writing anything (an open SQLite write during the
  AI wait locked the whole DB → "database is locked" 500s elsewhere).
- `auth.py` — PBKDF2-SHA256 hashing, PyJWT HS256 bearer tokens.
- `schemas.py` — `Locale = Literal["en","hi","ta","te"]`; ProfileIn tutor_name validator (letters/space/.'-,
  blocks prompt-injection-like text); QuestionOut shuffles options; **TutorMessageOut.emotions: list[str]**.
- `ai.py` — `LANGUAGES` (4); `persona()` = playful, witty, kind-on-mistakes tutor, gendered forms in Hindi/Telugu;
  `_generate()` with retries (`RETRY_PAUSES=(1.5,)`) and fallback model; `_write_in()` native script + digits;
  `NO_GREETING`; `explain()` (translate for non-English); `heuristic_misconception()`; **`diagnose()`**
  (one JSON call → type + micro-lesson for conceptual_gap/partial_method, fallbacks); **`EMOTIONS`**
  (excited, proud, encouraging, curious, careful, empathetic, playful, thinking, neutral),
  **`split_emotions()`** removes `[tag]` markers → (clean text, emotions list); **`tutor_reply()` returns
  `(content, emotions)`** and instructs a tag at the start of every sentence; `generate_question()` (validated);
  `ocr_question()`. `AIUnavailable` wraps SDK errors.
- `engine/mastery.py` — mastery scores, target difficulty, next question (retest first → weakest skill),
  `NEEDS_RETEST`, daily goal. `engine/gamification.py` — XP, levels (250 XP), streaks, 8 badges.
- `routes/` — auth; practice (`POST /attempts` builds a `SimpleNamespace` learner/question snapshot, runs
  `ai.explain` in a thread pool alongside `ai.diagnose`); quizzes; tutor (messages store emotions; OCR);
  progress dashboard.
- `seed.py` — `init_db()` = create_all + `add_missing_columns()` (ALTER TABLE for new columns, e.g. emotions)
  + **`retire_unsupported_locales()`** (non-supported locales → en) + incremental seed.
- `seed_data.py` — 140 questions, 28 subtopics (Quant 11, Logical 9, Verbal 8).
- `tests/` — conftest (temp DB, `fake_ai` patches `_generate`), test_api, test_ai (SDK recording fake, retry,
  fallback, diagnose, emotion split), test_engine, test_seed_data.

### Frontend `apps/web/src` — "Spark" design system
- `app/globals.css` — tokens: canvas `#fbfaf7`, surface white, surface-2 `#f5f3ef`, ink `#17171f`,
  ink-soft `#62636f`; **Iris `#5b5bf5`**, **Coral `#ff6b5c`**, **Lagoon `#16c2c2`**, **Sunbeam `#ffc53d`**,
  violet `#9b5cf6`, success `#12b886`, danger `#f0525a`; `--spark` gradient. Tailwind names: `iris`, `coral`,
  `lagoon`, `sun`, `*-soft`, `*-600`, plus aliases (accent/primary/marker/good/bad). Radii enlarged.
  Classes: `.glass`, `.text-spark`, `.bg-spark`, `.shine`, **`.spark-glow[data-active]`** (conic ring + halo),
  `.blobs/.blob`, `.eyebrow`, `.font-display` (Inter 700, tight), motion utilities (rise, pop, fade, float,
  shake, lift, press, link-draw, grow-x/y, skeleton, shimmer-text, flame, typing-dot, marquee, wiggle-hover),
  tutor stage glow/ring, view-transition keyframes (page-forward/back/fade; app-sidebar/topbar/tabbar held
  still), reduced-motion overrides. Light only. `.grain`/`.shine`/`.glass`/`.spark-glow` live in
  `@layer components` so utilities like `fixed` override them.
- `app/layout.tsx` — Inter + JetBrains Mono; MotionProvider → AuthProvider → ToastProvider.
- `app/page.tsx` — landing: floating glass pill nav (hides on scroll down); hero "Learn what you **don't
  know.**" (TextReveal, gradient words), orb + blobs, CTAs, SparkGlow stage with tutor (Asha/Arjun toggle)
  + self-typing chat; pinned 4-step story ("It notices." / "It explains. Out loud." / "Then it checks." /
  "Every day, a little smarter."); bento SpotlightCards; "One tutor. Four languages." (click a language →
  tutor speaks hello); stat counters; FAQ accordion; gradient final CTA "Your first lesson starts now."; footer.
- `app/dashboard` — greeting, gradient tutor tip card, ActivityRings (goal/accuracy/streak), stat tiles,
  topic mastery accordion, 7-day chart, weak skills, badges, history.
- `app/practice` — Segmented topic filter, focus question card wrapped in SparkGlow while checking, colourful
  option pills, result sheet sliding up, playful lesson card, Confetti particle burst, XP/badge/goal toasts,
  tutor aside with SparkGlow and mood.
- `app/tests` — quiz card + gradient mock card, glass pill timer bar with ring, question grid, animated report.
- `app/tutor` — tutor card with SparkGlow (speaking/thinking/listening), language select (4), speak toggle,
  iMessage-style bubbles, highlighted spoken sentence, emotions passed to `voice.say`, glowing input bar,
  typing makes tutor "listening".
- `app/profile` — iOS-style grouped settings, tutor customiser, colourful 4-language picker, sign out row.
- `components/`: `AppShell` (floating glass sidebar, glass top bar < lg, floating glass tab bar on phones,
  layoutId sliding highlights, PageTransition as outermost element); `AuthForm` (glass card, tutor avatar
  peeking, language chips); `Logo` (`LogoMark` gradient tile with 4-point spark; `public/icon.svg` +
  `app/icon.svg` same); `Modal` (spring sheet); `Toast` (`ToastProvider`, `useToast`); `ui.tsx` (Button
  variants primary/secondary/ghost/spark/marker, `buttonClass`, Card, **SpotlightCard**, **SparkGlow**,
  **Blobs**, Label, IconTile, Segmented, PageHeader, Reveal, ProgressBar, Ring (supports `spark` tone),
  **ActivityRings**, CountUp, Confetti (particle burst), Pill, ErrorNote, Spinner, Skeleton, Icon set);
  `motion.tsx` (TextReveal, FadeIn, Parallax, Magnetic, CountOnView, ScrollFillText, SmoothScroll (Lenis),
  **Orb**); `MotionProvider`; `PageTransition` (React `ViewTransition`, classes per transition type);
  `TutorAvatar` (props: gender, `voice` = whole useTutorVoice result, mood, framing, stage);
  `TutorCustomizer`; **`TutorFigure`**.
- `lib/`: `i18n.ts` (LANGUAGES en/hi/ta/te, full dictionaries en/hi/ta/**te**); `api.ts` (Locale 4 codes,
  TutorMessage.emotions); `speech.ts` (recognition hook, sentence splitting, script detection for 4
  languages, gendered voice picking, per-sentence speak queue); **`useTutorVoice.ts`** (speaking, word,
  wordTick, gestureTick, **sentenceText**, **emotion**, activeKey, sentence, missingVoice,
  `say(text, key, gender, emotions)`, stop); `tutor.ts` (defaults Asha/Arjun, name ideas); `useMedia.ts`;
  **`tutorRig.ts`**.

### The tutor rig (`lib/tutorRig.ts` + `components/TutorFigure.tsx`)
- Canvas 360×440, framings `full` (waist-up) / `portrait` (head & shoulders).
- Outfits: **Asha** Iris blazer over Coral top, gold earrings/bun band, bindi; **Arjun** Lagoon V-neck sweater
  over white collared shirt, glasses, light beard. Warm brown skin tones.
- Layers from highest priority: word cues (number words/digits 1–5 in 4 languages → finger count; negation
  → head shake; praise words → brow pop + bounce) > sentence cues (`cueForSentence`: ordinals → count,
  praise → clap/thumbs/fist pump, tip → temple tap + wink, careful → finger wag, empathy → hand on chest,
  join → hands together, split → weighing hands, AI emotion tag mapping, "?" curious, "!" excited) > mood
  reactions (happy: clap → jazz hands + laugh, then thumbs-up/proud; concerned: "oops" shrug, then
  encouraging open palms; thinking: hand on chin; listening: hands together + nods) > idle (greeting wave on
  mount, periodic happy/playful wink/curious glance/hair tuck (Asha) or chin stroke (Arjun)).
- 15 expressions, 20 gestures, 8 hand shapes (open, fist, point, two, three, four, thumb, ok),
  12 mouth shapes (incl. GRIN), blink/double blink, wink, eye widen, one-brow raise, pointer-following gaze,
  breathing, sway, bounce spring. Pauses off-screen/hidden tab; calm under reduced motion.

## 7. Verified vs NOT verified

**Verified (browser + tests):** backend 66 tests; tsc/eslint/build clean; landing (all sections), dashboard,
practice (thinking glow, wrong-answer diagnosis with playful lesson), tests setup, profile, tutor chat with live
Gemini returning playful text + 8 emotion tags; tutor acting out sentences (jazz hands, temple tap) with
highlight; phone width 375 has no horizontal overflow; language retirement migration tested.
**Earlier verified (session 2):** live AI in EN/HI/TA, Hindi native script, OCR, question generation, fallback/retry.

**Not verified / known gaps:**
- Every gesture/expression individually by eye (clap, OK sign, count 2–4 fingers, jazz hands framing, laugh
  mouth, wink) — expect small angle tuning.
- Telugu end-to-end with live AI and Telugu TTS voice; Tamil/Telugu voices in Chrome.
- Tests runner and report pages after the Spark redesign (setup page seen; runner/report not clicked through).
- Register flow in new AuthForm (login page renders); customiser save.
- Gemini latency was 15–20 s at times (free tier); Google occasionally 503s (retry + fallback exist).
- Old procedural blueprint HTML still describes the original plan (not updated).

### Session 3 full test (2026-09-17)
Live-tested all 4 languages via API + browser: tutor chat, question-linked tutor, wrong answer → diagnosis +
lesson + translated explanation, question generation, quiz + mock submit/report, dashboard, register (Telugu),
tutor customiser save, missing-voice notice. Fixed: model quota chain, DB lock during tutor AI call, localized
busy reply + fallback lesson, English replies spelling numbers as words, negative SVG mouth width, "trys",
maths-only careless-slip copy, report note shown with no misses, Telugu save button clipping. Test accounts
`qa-*@example.com` (password `qa-password-1`) were created. Still open: most page body text is English in
hi/ta/te (only nav/headings translated); TTS voices untested (pane has none); suggestion chips English.

## 8. Gotchas learned the hard way

- **Next.js 16 is not the Next you know** — read `apps/web/node_modules/next/dist/docs/` before using APIs.
  `next dev` recreates `apps/web/AGENTS.md` + `CLAUDE.md` (committed; leave them).
- **ViewTransition must be the page's outermost element** or React won't animate; AppShell wraps everything
  in `PageTransition`. Persistent chrome uses `viewTransitionName` to stay still.
- **Unlayered custom CSS overrides Tailwind utilities** (a `position: relative` in `.grain` silently broke
  `fixed`). Put component classes in `@layer components`.
- **3D rotateX with tall elements flips** when the far edge crosses the camera — tilt top-away only.
- ESLint `react-hooks/set-state-in-effect` and `react-hooks/refs` are strict: no sync setState in effects,
  don't read refs during render (don't store refs inside objects passed as props).
- `uvicorn --reload` doesn't reload reliably on this Windows setup — restart the backend after Python edits.
- NEVER `taskkill /IM node.exe` or `python.exe` (kills everything). Kill by port-owning PID.
- **Escaping:** Git Bash heredocs + `python -` sometimes turn `\n` in replacement strings into real newlines,
  breaking Python/TS strings. Use the Edit/Write tools for code with escapes or template literals.
- The Write tool refuses if a file changed since last Read — re-Read (even 2 lines) first.
- Browser pane: first screenshots after navigation often show mid-compile or mid-transition blur — wait and
  re-screenshot. Enter key in forms sometimes doesn't submit in the pane; click the button. Pane viewport
  emulation resets at turn end; screenshots may be cropped when emulating 1280px.
- Windows console can't print Hindi/Tamil (`charmap` errors) — write results to a UTF-8 file and Read it.
- System Python (not the venv) has Pillow and httpx for scratch scripts.
- SQLite `create_all` never alters tables → `add_missing_columns()`.
- Chrome cuts long utterances (~15 s) → per-sentence speech queue (implemented).
- Gemini free tier: `gemini-2.5-flash` unavailable to new keys; 503 "high demand" happens. **Newer flash
  models allow only ~20 requests/DAY each** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). `_generate`
  walks the model chain and rests a model for 1 h after a daily-quota 429 (60 s for per-minute). Lite models
  answer but are weaker (seen: muddled Telugu reasoning, a Tamil letter inside Telugu text).
- AI `info` logs are not shown by uvicorn; only warnings reach the console.

## 9. Possible next steps (ask the user which)

1. Tune individual gestures/expressions by eye; click through tests runner/report and registration.
2. Test Telugu fully with live AI and voices (Edge).
3. Speed up AI responses (streaming replies, shorter prompts) — free tier latency is the main UX issue.
4. Optional: natural neural TTS (e.g. HeadTTS/Kokoro for English), more questions, Postgres/Supabase,
   deployment (user said not needed yet), mobile app.
5. Update `aptitude-teacher-blueprint.html` or README screenshots if the user wants documentation.
