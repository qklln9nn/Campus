-- 1. Add avatar_url, bio, major, and grade columns to public.profiles table
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists major text;
alter table public.profiles add column if not exists grade text;

-- 2. Update handle_new_user trigger function to populate role, major, and grade directly from user metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_role text;
  user_major text;
  user_grade text;
begin
  user_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'student'));
  if user_role not in ('student', 'organiser', 'admin') then
    user_role := 'student';
  end if;

  user_major := coalesce(new.raw_user_meta_data ->> 'major', '');
  user_grade := coalesce(new.raw_user_meta_data ->> 'grade', '');

  insert into public.profiles (id, email, full_name, role, major, grade)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
    ),
    user_role,
    user_major,
    user_grade
  )
  on conflict (id) do update
  set role = excluded.role,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      major = excluded.major,
      grade = excluded.grade;

  return new;
end;
$$;

-- 3. Allow system profile sync during initial registration
create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.created_at is distinct from old.created_at then
    raise exception 'Profile identity fields cannot be changed from the client';
  end if;

  if new.role is distinct from old.role
    and public.current_user_role() is distinct from 'admin'
    and old.role = 'student' then
    return new;
  elsif new.role is distinct from old.role
    and public.current_user_role() is distinct from 'admin' then
    raise exception 'Only an administrator can change profile roles';
  end if;

  return new;
end;
$$;
