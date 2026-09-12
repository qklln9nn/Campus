-- Add the persistent profile fields used by the authenticated profile page.
-- This is a new migration instead of replacing migration 008, so databases
-- that already applied the existing migration history remain consistent.
alter table public.profiles
  add column if not exists student_id text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists clubs text[] not null default '{}',
  add column if not exists available_time text[] not null default '{}',
  add column if not exists notification_preferences jsonb not null default
    '{"emailAlerts":true,"pushNotifications":true,"eventReminders":true,"waitlistUpdates":true,"weeklyDigest":false}'::jsonb;

create unique index if not exists profiles_student_id_lower_idx
  on public.profiles (lower(student_id))
  where student_id is not null and btrim(student_id) <> '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_notification_preferences_object_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_notification_preferences_object_check
      check (jsonb_typeof(notification_preferences) = 'object');
  end if;
end;
$$;

-- Student identifiers are assigned through trusted administration paths.
create or replace function public.protect_profile_student_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
    and new.student_id is distinct from old.student_id
    and public.current_user_role() is distinct from 'admin' then
    raise exception 'Only an administrator can change a student identifier';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_student_id() from public;

drop trigger if exists profiles_protect_student_id on public.profiles;
create trigger profiles_protect_student_id
before update on public.profiles
for each row execute function public.protect_profile_student_id();
