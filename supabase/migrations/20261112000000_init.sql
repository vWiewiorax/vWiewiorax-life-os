-- Life OS: initial schema. Every table is owned by a user (user_id = auth.uid()) and protected by RLS.
-- Child rows use composite foreign keys (parent_id, user_id) so a row can never point at another user's data.

create extension if not exists vector with schema extensions;

-- Helpers -----------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create type public.priority as enum ('low', 'medium', 'high', 'urgent');
create type public.academic_kind as enum ('exam', 'test', 'assignment', 'project');
create type public.task_status as enum ('todo', 'in_progress', 'done', 'cancelled');
create type public.recurrence as enum ('none', 'daily', 'weekdays', 'weekly', 'monthly');
create type public.material_kind as enum ('pdf', 'audio', 'presentation', 'image', 'text', 'other');
create type public.material_status as enum ('uploaded', 'processing', 'ready', 'error');
create type public.goal_category as enum ('education', 'career', 'health', 'finances', 'relationships', 'personal', 'hobbies', 'other');
create type public.goal_status as enum ('active', 'paused', 'completed', 'abandoned');
create type public.habit_frequency as enum ('daily', 'weekly');
create type public.note_kind as enum ('lecture_notes', 'summary', 'explanation', 'exam_prep', 'study_plan', 'manual');

-- Profiles ----------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Warsaw',
  notification_email text,
  email_notifications boolean not null default false,
  push_notifications boolean not null default true,
  default_reminder_offsets integer[] not null default '{1440,4320}', -- minutes before deadline
  ai_journal_access boolean not null default false,
  ai_context_enabled boolean not null default true,
  day_start time not null default '07:00',
  day_end time not null default '23:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, notification_email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- University --------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  code text,
  color text not null default '#6366f1',
  professor text,
  professor_email text,
  professor_office_hours text,
  room text,
  ects numeric(4, 1),
  semester text,
  description text,
  progress integer not null default 0 check (progress between 0 and 100),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null,
  kind text not null default 'wykład',
  weekday smallint not null check (weekday between 1 and 7), -- 1 = Monday
  start_time time not null,
  end_time time not null,
  location text,
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  check (end_time > start_time)
);

create table public.academic_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  kind public.academic_kind not null,
  title text not null check (char_length(title) between 1 and 300),
  description text,
  due_at timestamptz not null,
  priority public.priority not null default 'medium',
  completed boolean not null default false,
  completed_at timestamptz,
  grade text,
  estimated_prep_minutes integer check (estimated_prep_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);

-- Goals & habits ----------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category public.goal_category not null default 'personal',
  title text not null check (char_length(title) between 1 and 300),
  description text,
  why text,
  target_date date,
  priority public.priority not null default 'medium',
  status public.goal_status not null default 'active',
  progress integer not null default 0 check (progress between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  title text not null check (char_length(title) between 1 and 300),
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);

create table public.goal_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  frequency public.habit_frequency not null default 'daily',
  target_per_week integer not null default 7 check (target_per_week between 1 and 7),
  color text not null default '#10b981',
  reminder_time time,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete set null (goal_id)
);

create table public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null,
  entry_date date not null,
  done boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, entry_date),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

-- Planner -----------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  description text,
  category text,
  priority public.priority not null default 'medium',
  status public.task_status not null default 'todo',
  scheduled_date date,
  due_at timestamptz,
  estimated_minutes integer check (estimated_minutes >= 0),
  recurrence public.recurrence not null default 'none',
  recurrence_source_id uuid references public.tasks (id) on delete set null,
  postponed_count integer not null default 0,
  completed_at timestamptz,
  subject_id uuid,
  goal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete set null (goal_id)
);

create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null,
  title text not null,
  kind text not null default 'focus', -- focus | study | class | break | personal
  task_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete set null (task_id)
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  subject_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);

create table public.quick_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 5000),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Study materials & AI learning ------------------------------------------

create table public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  title text not null,
  kind public.material_kind not null,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  status public.material_status not null default 'uploaded',
  error text,
  extracted_text text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);

create table public.material_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  material_id uuid not null,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  foreign key (material_id, user_id) references public.study_materials (id, user_id) on delete cascade
);

create table public.ai_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  material_id uuid,
  subject_id uuid,
  kind public.note_kind not null default 'manual',
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (material_id, user_id) references public.study_materials (id, user_id) on delete set null (material_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  material_id uuid,
  subject_id uuid,
  front text not null,
  back text not null,
  box smallint not null default 1 check (box between 1 and 5), -- Leitner box
  due_at timestamptz not null default now(),
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (material_id, user_id) references public.study_materials (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  material_id uuid,
  subject_id uuid,
  title text not null,
  questions jsonb not null, -- [{question, options[], correct_index, explanation}]
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (material_id, user_id) references public.study_materials (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id uuid not null,
  answers jsonb not null,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now(),
  foreign key (quiz_id, user_id) references public.quizzes (id, user_id) on delete cascade
);

-- Journal -----------------------------------------------------------------

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null default current_date,
  title text,
  mood smallint check (mood between 1 and 5),
  content text not null default '',
  answers jsonb not null default '{}'::jsonb, -- reflection template answers keyed by question id
  gratitude text,
  tags text[] not null default '{}',
  ai_reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notifications -----------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  body text,
  url text,
  scheduled_for timestamptz not null,
  channels text[] not null default '{push,email,in_app}',
  source_type text, -- academic_item | task | habit | goal | time_block | custom
  source_id uuid,
  sent_at timestamptz,
  read_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- AI ----------------------------------------------------------------------

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Nowa rozmowa',
  mode text not null default 'assistant', -- assistant | study | goals | reflection
  include_journal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content text not null default '',
  tool_calls jsonb,
  tool_call_id text,
  pending_actions jsonb, -- actions proposed by the assistant awaiting user confirmation
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id) references public.ai_conversations (id, user_id) on delete cascade
);

create table public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  briefing_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

-- Indexes -----------------------------------------------------------------

create index on public.subjects (user_id);
create index on public.class_sessions (user_id, weekday);
create index on public.academic_items (user_id, due_at);
create index on public.goals (user_id, status);
create index on public.milestones (goal_id, position);
create index on public.habits (user_id);
create index on public.habit_entries (user_id, entry_date);
create index on public.tasks (user_id, scheduled_date);
create index on public.tasks (user_id, status);
create index on public.time_blocks (user_id, block_date);
create index on public.calendar_events (user_id, starts_at);
create index on public.study_materials (user_id, subject_id);
create index on public.material_chunks (material_id);
create index on public.material_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index on public.ai_notes (user_id, subject_id);
create index on public.flashcards (user_id, due_at);
create index on public.journal_entries (user_id, entry_date desc);
create index notifications_due_idx on public.notifications (scheduled_for) where sent_at is null;
create index on public.notifications (user_id, scheduled_for desc);
create index on public.ai_messages (conversation_id, created_at);

-- updated_at triggers -----------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['profiles','subjects','academic_items','goals','habits','tasks','calendar_events','study_materials','ai_notes','journal_entries','ai_conversations']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Row Level Security ------------------------------------------------------

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['subjects','class_sessions','academic_items','goals','milestones','goal_reflections','habits','habit_entries','tasks','time_blocks','calendar_events','quick_notes','study_materials','material_chunks','ai_notes','flashcards','quizzes','quiz_attempts','journal_entries','notifications','push_subscriptions','ai_conversations','ai_messages','daily_briefings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Semantic search over the caller's own material chunks (RLS applies: security invoker).
create or replace function public.match_material_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 8,
  filter_subject uuid default null,
  filter_material uuid default null
)
returns table (id uuid, material_id uuid, content text, similarity double precision, material_title text)
language sql stable security invoker set search_path = public, extensions as $$
  select c.id, c.material_id, c.content, 1 - (c.embedding <=> query_embedding) as similarity, m.title
  from public.material_chunks c
  join public.study_materials m on m.id = c.material_id
  where c.embedding is not null
    and (filter_subject is null or m.subject_id = filter_subject)
    and (filter_material is null or c.material_id = filter_material)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Storage: private bucket, files live under "<user_id>/..." ----------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 52428800)
on conflict (id) do nothing;

create policy "materials: read own" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "materials: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "materials: update own" on storage.objects for update to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "materials: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
