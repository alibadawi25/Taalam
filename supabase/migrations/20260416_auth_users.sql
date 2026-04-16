-- Incremental migration to align the live Supabase project with the current app.
-- This file is intentionally idempotent so it can repair an existing project.

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
  add column if not exists furthest_position_seconds integer,
  add column if not exists is_completed boolean,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

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

grant select, insert, update, delete on public.profiles, public.favorite_courses, public.lesson_progress
to authenticated;

do $$
begin
  if to_regclass('public.lesson_progress_id_seq') is not null then
    execute 'grant usage, select on sequence public.lesson_progress_id_seq to authenticated';
  end if;
end
$$;
