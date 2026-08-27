-- Extend Auth profiles with the user-editable fields used by the application.
alter table public.profiles
  add column avatar_url text,
  add column student_id text,
  add column major text not null default '',
  add column grade text not null default '',
  add column bio text not null default '',
  add column interests text[] not null default '{}',
  add column clubs text[] not null default '{}',
  add column available_time text[] not null default '{}',
  add column notification_preferences jsonb not null default
    '{"emailAlerts":true,"pushNotifications":true,"eventReminders":true,"waitlistUpdates":true,"weeklyDigest":false}'::jsonb,
  add constraint profiles_notification_preferences_object_check
    check (jsonb_typeof(notification_preferences) = 'object');

create unique index profiles_student_id_lower_idx
  on public.profiles (lower(student_id))
  where student_id is not null and btrim(student_id) <> '';

-- Student identifiers are assigned through trusted administration paths.
create function public.protect_profile_student_id()
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

create trigger profiles_protect_student_id
before update on public.profiles
for each row execute function public.protect_profile_student_id();

-- Include non-privileged profile fields for future sign-ups. The role remains
-- server-controlled and is never copied from user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    major,
    grade
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
    ),
    'student',
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'major'), ''), ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'grade'), ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
