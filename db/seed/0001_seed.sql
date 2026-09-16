-- Seed data: topics/subtopics/skills + a handful of real questions per section
-- to prove the schema end-to-end. Bulk content (150-200 questions) is a
-- separate content pass — see Phase 02 of the build workflow.

insert into public.topics (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Quantitative', 'quantitative'),
  ('22222222-2222-2222-2222-222222222222', 'Logical Reasoning', 'logical-reasoning'),
  ('33333333-3333-3333-3333-333333333333', 'Verbal', 'verbal')
on conflict (id) do nothing;

insert into public.subtopics (id, topic_id, name) values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Time & Work'),
  ('a2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Syllogisms'),
  ('a3333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Analogies')
on conflict (id) do nothing;

insert into public.skills (id, subtopic_id, name) values
  ('b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'combined-work-rate'),
  ('b2222222-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000001', 'two-premise-syllogism'),
  ('b3333333-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000001', 'relationship-analogy')
on conflict (id) do nothing;

insert into public.questions (id, subtopic_id, difficulty, body, options, correct_option, explanation, source) values
(
  'c0000000-0000-0000-0000-000000000001',
  'a1111111-0000-0000-0000-000000000001',
  1,
  'A can finish a piece of work in 10 days and B can finish it in 15 days. If they work together, how many days will they take?',
  '["4 days", "5 days", "6 days", "8 days"]',
  '6 days',
  'A''s rate is 1/10 of the work per day, B''s rate is 1/15 per day. Combined rate = 1/10 + 1/15 = 3/30 + 2/30 = 5/30 = 1/6 of the work per day, so together they finish it in 6 days.',
  'seed'
),
(
  'c0000000-0000-0000-0000-000000000002',
  'a1111111-0000-0000-0000-000000000001',
  2,
  'A and B together can do a job in 12 days. A alone can do it in 20 days. How many days will B alone take?',
  '["24 days", "28 days", "30 days", "36 days"]',
  '30 days',
  'Combined rate = 1/12. A''s rate = 1/20. B''s rate = 1/12 - 1/20 = 5/60 - 3/60 = 2/60 = 1/30, so B alone takes 30 days.',
  'seed'
),
(
  'c0000000-0000-0000-0000-000000000003',
  'a2222222-0000-0000-0000-000000000001',
  1,
  'All roses are flowers. Some flowers fade quickly. Which conclusion follows?',
  '["All roses fade quickly", "Some roses fade quickly", "No valid conclusion follows", "No roses fade quickly"]',
  'No valid conclusion follows',
  'The middle term "flowers" is not distributed in a way that links roses to the fading-quickly group — the two premises do not guarantee any rose is among the flowers that fade quickly.',
  'seed'
),
(
  'c0000000-0000-0000-0000-000000000004',
  'a2222222-0000-0000-0000-000000000001',
  2,
  'No fish are mammals. All whales are mammals. Which conclusion follows?',
  '["No whales are fish", "Some whales are fish", "All fish are whales", "Some fish are mammals"]',
  'No whales are fish',
  'Since all whales are mammals and no mammals are fish, no whales can be fish — a valid universal negative conclusion.',
  'seed'
),
(
  'c0000000-0000-0000-0000-000000000005',
  'a3333333-0000-0000-0000-000000000001',
  1,
  'PEN is to WRITE as KNIFE is to ____?',
  '["Sharp", "Cut", "Kitchen", "Metal"]',
  'Cut',
  'A pen is the instrument used to write; a knife is the instrument used to cut — matching tool-to-function relationship.',
  'seed'
),
(
  'c0000000-0000-0000-0000-000000000006',
  'a3333333-0000-0000-0000-000000000001',
  2,
  'DOCTOR is to HOSPITAL as TEACHER is to ____?',
  '["Student", "School", "Blackboard", "Book"]',
  'School',
  'A doctor works at a hospital; a teacher works at a school — matching profession-to-workplace relationship.',
  'seed'
)
on conflict (id) do nothing;

insert into public.question_skills (question_id, skill_id) values
  ('c0000000-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003', 'b2222222-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000004', 'b2222222-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000005', 'b3333333-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000006', 'b3333333-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.badges (code, name, description) values
  ('first_attempt', 'First Step', 'Answered your first practice question'),
  ('streak_7', 'Week Warrior', '7-day practice streak'),
  ('mastery_50', 'Half Mastered', 'Reached 50% mastery on a skill')
on conflict (code) do nothing;
