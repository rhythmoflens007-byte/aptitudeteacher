-- Aptitude Teacher — initial schema
-- Run against the Supabase Postgres project (SQL Editor, or `supabase db push`).

create extension if not exists "pgcrypto";

-- Supabase Auth already creates auth.users; this table extends it with app-specific profile fields.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table if not exists public.subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  name text not null
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  name text not null
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  difficulty smallint not null check (difficulty between 1 and 5),
  body text not null,
  options jsonb,
  correct_option text,
  explanation text,
  source text not null default 'seed' check (source in ('seed', 'ai_generated')),
  created_at timestamptz not null default now()
);

create table if not exists public.question_skills (
  question_id uuid not null references public.questions (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (question_id, skill_id)
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  chosen_answer text,
  is_correct boolean not null,
  time_taken_ms integer,
  misconception_type text check (misconception_type in ('careless_slip', 'conceptual_gap', 'partial_method', 'no_attempt')),
  hint_used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.skill_mastery (
  user_id uuid not null references public.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  mastery_score numeric(5, 2) not null default 0,
  last_attempt_at timestamptz,
  streak_correct integer not null default 0,
  primary key (user_id, skill_id)
);

create table if not exists public.tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tutor_sessions (id) on delete cascade,
  role text not null check (role in ('student', 'tutor')),
  content text not null,
  audio_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_goals (
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  target_questions integer not null,
  completed_questions integer not null default 0,
  skill_ids uuid[] not null default '{}',
  primary key (user_id, date)
);

create table if not exists public.gamification (
  user_id uuid primary key references public.users (id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  last_active_date date
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text
);

create table if not exists public.user_badges (
  user_id uuid not null references public.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
