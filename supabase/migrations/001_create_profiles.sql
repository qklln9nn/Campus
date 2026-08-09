-- User-facing profile data linked one-to-one with Supabase Auth users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check
    check (role in ('student', 'organiser', 'admin'))
);

create unique index profiles_email_lower_idx
  on public.profiles (lower(email))
  where email is not null;

create index profiles_role_idx on public.profiles (role);

-- Shared timestamp trigger used by the remaining migrations.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

-- SECURITY DEFINER avoids recursive profile RLS checks in role-aware policies.
create function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = (select auth.uid());
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- Identity and role fields must be changed through trusted administration paths.
create function public.protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- SQL migrations and service-role requests do not carry an end-user id.
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.created_at is distinct from old.created_at then
    raise exception 'Profile identity fields cannot be changed from the client';
  end if;

  -- Auth email changes are mirrored by 005_create_auth_trigger.sql.
  if new.email is distinct from old.email
    and new.email is distinct from (
      select auth_user.email
      from auth.users as auth_user
      where auth_user.id = old.id
    ) then
    raise exception 'Profile email must match the linked Auth user';
  end if;

  if new.role is distinct from old.role
    and public.current_user_role() is distinct from 'admin' then
    raise exception 'Only an administrator can change profile roles';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_system_fields() from public;

create trigger profiles_protect_system_fields
before update on public.profiles
for each row execute function public.protect_profile_system_fields();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

grant select, update on table public.profiles to authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.current_user_role() = 'admin'
);

create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or public.current_user_role() = 'admin'
)
with check (
  id = (select auth.uid())
  or public.current_user_role() = 'admin'
);
