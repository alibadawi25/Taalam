-- Deen Learning database bootstrap and repair migration
--
-- Safe goals:
-- 1. Preserve existing content tables and rows
-- 2. Add the auth/profile tables the frontend now expects
-- 3. Upgrade lesson_progress from global rows to per-user rows
-- 4. Enable RLS on user-owned data
-- 5. Keep courses/categories/lessons publicly readable

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Content schema
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text,
  slug text,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.categories
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

create unique index if not exists categories_slug_uidx
  on public.categories (slug)
  where slug is not null;

create table if not exists public.tags (
  id bigint generated always as identity primary key,
  name text,
  type text
);

alter table public.tags
  add column if not exists name text,
  add column if not exists type text;

create table if not exists public.courses (
  id bigint generated always as identity primary key,
  title text,
  description text,
  youtube_playlist_id text,
  source_url text,
  language text,
  difficulty text,
  course_type text,
  thumbnail_url text,
  created_at timestamptz not null default timezone('utc', now()),
  category_id bigint
);

alter table public.courses
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists youtube_playlist_id text,
  add column if not exists source_url text,
  add column if not exists language text,
  add column if not exists difficulty text,
  add column if not exists course_type text,
  add column if not exists thumbnail_url text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists category_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_category_id_fkey'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_category_id_fkey
      foreign key (category_id) references public.categories(id);
  end if;
end
$$;

create index if not exists courses_created_at_idx on public.courses (created_at desc);
create index if not exists courses_category_id_idx on public.courses (category_id);
create index if not exists courses_difficulty_idx on public.courses (difficulty);
create index if not exists courses_course_type_idx on public.courses (course_type);

create table if not exists public.lessons (
  id bigint generated always as identity primary key,
  course_id bigint,
  title text,
  youtube_video_id text,
  source_url text,
  order_index integer,
  duration_seconds integer,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.lessons
  add column if not exists course_id bigint,
  add column if not exists title text,
  add column if not exists youtube_video_id text,
  add column if not exists source_url text,
  add column if not exists order_index integer,
  add column if not exists duration_seconds integer,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lessons_course_id_fkey'
      and conrelid = 'public.lessons'::regclass
  ) then
    alter table public.lessons
      add constraint lessons_course_id_fkey
      foreign key (course_id) references public.courses(id) on delete cascade;
  end if;
end
$$;

create index if not exists lessons_course_id_idx on public.lessons (course_id);
create index if not exists lessons_course_order_idx on public.lessons (course_id, order_index);

create table if not exists public.notes (
  id bigint generated always as identity primary key,
  lesson_id bigint,
  content text,
  timestamp_seconds integer,
  is_starred boolean,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.notes
  add column if not exists lesson_id bigint,
  add column if not exists content text,
  add column if not exists timestamp_seconds integer,
  add column if not exists is_starred boolean,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_lesson_id_fkey'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_lesson_id_fkey
      foreign key (lesson_id) references public.lessons(id) on delete cascade;
  end if;
end
$$;

create index if not exists notes_lesson_id_idx on public.notes (lesson_id);

create table if not exists public.course_tags (
  id bigint generated always as identity primary key,
  course_id bigint,
  tag_id bigint
);

alter table public.course_tags
  add column if not exists course_id bigint,
  add column if not exists tag_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_tags_course_id_fkey'
      and conrelid = 'public.course_tags'::regclass
  ) then
    alter table public.course_tags
      add constraint course_tags_course_id_fkey
      foreign key (course_id) references public.courses(id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_tags_tag_id_fkey'
      and conrelid = 'public.course_tags'::regclass
  ) then
    alter table public.course_tags
      add constraint course_tags_tag_id_fkey
      foreign key (tag_id) references public.tags(id) on delete cascade;
  end if;
end
$$;

create index if not exists course_tags_course_id_idx on public.course_tags (course_id);
create index if not exists course_tags_tag_id_idx on public.course_tags (tag_id);

create table if not exists public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  last_activity timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days')
);

create index if not exists guest_sessions_expires_idx on public.guest_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Auth and per-user data
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.favorite_courses (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, course_id)
);

alter table public.favorite_courses
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists course_id bigint references public.courses(id) on delete cascade,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

create unique index if not exists favorite_courses_user_course_uidx
  on public.favorite_courses (user_id, course_id);

create index if not exists favorite_courses_course_id_idx
  on public.favorite_courses (course_id);

create table if not exists public.lesson_progress (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  last_position_seconds integer not null default 0,
  furthest_position_seconds integer not null default 0,
  is_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.lesson_progress
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists lesson_id bigint,
  add column if not exists last_position_seconds integer,
  add column if not exists furthest_position_seconds integer,
  add column if not exists is_completed boolean,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_progress_lesson_id_fkey'
      and conrelid = 'public.lesson_progress'::regclass
  ) then
    alter table public.lesson_progress
      add constraint lesson_progress_lesson_id_fkey
      foreign key (lesson_id) references public.lessons(id) on delete cascade;
  end if;
end
$$;

update public.lesson_progress
set
  last_position_seconds = greatest(coalesce(last_position_seconds, 0), 0),
  furthest_position_seconds = greatest(
    coalesce(furthest_position_seconds, 0),
    coalesce(last_position_seconds, 0),
    0
  ),
  is_completed = coalesce(is_completed, false),
  created_at = coalesce(created_at, updated_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.lesson_progress
  alter column lesson_id set not null,
  alter column last_position_seconds set default 0,
  alter column last_position_seconds set not null,
  alter column furthest_position_seconds set default 0,
  alter column furthest_position_seconds set not null,
  alter column is_completed set default false,
  alter column is_completed set not null,
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null,
  alter column updated_at set default timezone('utc', now()),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_progress_last_position_nonnegative'
      and conrelid = 'public.lesson_progress'::regclass
  ) then
    alter table public.lesson_progress
      add constraint lesson_progress_last_position_nonnegative
      check (last_position_seconds >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_progress_furthest_position_nonnegative'
      and conrelid = 'public.lesson_progress'::regclass
  ) then
    alter table public.lesson_progress
      add constraint lesson_progress_furthest_position_nonnegative
      check (furthest_position_seconds >= 0);
  end if;
end
$$;

drop index if exists public.lesson_progress_user_lesson_uidx;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_progress_user_lesson_key'
      and conrelid = 'public.lesson_progress'::regclass
  ) then
    alter table public.lesson_progress
      add constraint lesson_progress_user_lesson_key
      unique (user_id, lesson_id);
  end if;
end
$$;

create index if not exists lesson_progress_user_id_idx
  on public.lesson_progress (user_id);

create index if not exists lesson_progress_lesson_id_idx
  on public.lesson_progress (lesson_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists lesson_progress_set_updated_at on public.lesson_progress;
create trigger lesson_progress_set_updated_at
before update on public.lesson_progress
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  updated_at = timezone('utc', now());

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.favorite_courses enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "favorite_courses_manage_own" on public.favorite_courses;
create policy "favorite_courses_manage_own"
on public.favorite_courses
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "lesson_progress_manage_own" on public.lesson_progress;
create policy "lesson_progress_manage_own"
on public.lesson_progress
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select on public.categories, public.courses, public.lessons, public.tags, public.course_tags, public.notes
to anon, authenticated;

grant select, insert, update, delete on public.profiles, public.favorite_courses, public.lesson_progress
to authenticated;

do $$
begin
  if to_regclass('public.lesson_progress_id_seq') is not null then
    execute 'grant usage, select on sequence public.lesson_progress_id_seq to authenticated';
  end if;
end
$$;

-- Legacy note:
-- Any old lesson_progress rows that existed before user_id was added are kept.
-- They remain in the table with user_id = null and are hidden by RLS.
-- After a user logs in, the app will sync fresh per-user rows from localStorage.
