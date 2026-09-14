-- Replace the remaining administrator demo data with persistent, protected data.

alter table public.profiles
  add column if not exists account_status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended'));

create index if not exists profiles_account_status_idx
  on public.profiles (account_status);

-- Suspended accounts keep their Auth identity but no longer receive an
-- application role, so every role-aware RLS policy rejects their writes.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = (select auth.uid())
    and profile.account_status = 'active';
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

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

  if new.email is distinct from old.email
    and new.email is distinct from (
      select auth_user.email from auth.users as auth_user where auth_user.id = old.id
    ) then
    raise exception 'Profile email must match the linked Auth user';
  end if;

  if (new.role is distinct from old.role
      or new.account_status is distinct from old.account_status)
    and public.current_user_role() is distinct from 'admin' then
    raise exception 'Only an administrator can change profile access';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_system_fields() from public;

-- Categories are readable by the public application. Administrators retain
-- inactive rows so a category can be restored without losing its identity.
create table if not exists public.event_categories (
  slug text primary key,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_categories_slug_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint event_categories_name_not_blank
    check (btrim(name) <> '')
);

create unique index if not exists event_categories_name_lower_idx
  on public.event_categories (lower(name));

drop trigger if exists event_categories_set_updated_at on public.event_categories;
create trigger event_categories_set_updated_at
before update on public.event_categories
for each row execute function public.set_updated_at();

insert into public.event_categories (slug, name, sort_order)
values
  ('academic', 'Academic', 10),
  ('tech', 'Tech', 20),
  ('sports', 'Sports', 30),
  ('cultural', 'Cultural', 40),
  ('club', 'Club', 50),
  ('career', 'Career', 60),
  ('competition', 'Competition', 70)
on conflict (slug) do nothing;

-- Preserve categories already used by existing events, including custom ones.
insert into public.event_categories (slug, name, sort_order)
select existing.slug, min(existing.name), 100
from (
  select
    trim(both '-' from regexp_replace(lower(btrim(event.category)), '[^a-z0-9]+', '-', 'g')) as slug,
    initcap(btrim(event.category)) as name
  from public.events as event
  where btrim(event.category) <> ''
) as existing
where existing.slug <> ''
group by existing.slug
on conflict (slug) do nothing;

alter table public.event_categories enable row level security;

grant select on table public.event_categories to anon, authenticated;

create policy event_categories_select_active
on public.event_categories
for select
to anon, authenticated
using (is_active);

create policy event_categories_admin_select
on public.event_categories
for select
to authenticated
using (public.current_user_role() = 'admin');

-- Browser clients may only create or change events to an active configured
-- category. Historical events keep their stored category when it is disabled.
create or replace function public.validate_event_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_slug text := trim(
    both '-' from regexp_replace(lower(btrim(coalesce(new.category, ''))), '[^a-z0-9]+', '-', 'g')
  );
begin
  if not exists (
    select 1
    from public.event_categories as category
    where category.slug = clean_slug
      and category.is_active
  ) then
    raise exception 'Select an active event category';
  end if;

  new.category := clean_slug;
  return new;
end;
$$;

revoke all on function public.validate_event_category() from public;

drop trigger if exists events_validate_category on public.events;
create trigger events_validate_category
before insert or update of category on public.events
for each row execute function public.validate_event_category();

-- A singleton row holds administrator-facing configuration. Manual approval
-- remains a non-optional security invariant in the current project workflow.
create table if not exists public.system_settings (
  id text primary key default 'global',
  require_manual_approval boolean not null default true,
  report_threshold integer not null default 3,
  admin_email text not null default '',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint system_settings_singleton_check check (id = 'global'),
  constraint system_settings_manual_approval_check check (require_manual_approval),
  constraint system_settings_report_threshold_check check (report_threshold between 1 and 10),
  constraint system_settings_admin_email_check
    check (admin_email = '' or admin_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

insert into public.system_settings (id, require_manual_approval, report_threshold, admin_email)
values ('global', true, 3, 'admin-safety@campus.edu')
on conflict (id) do nothing;

drop trigger if exists system_settings_set_updated_at on public.system_settings;
create trigger system_settings_set_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

alter table public.system_settings enable row level security;

grant select on table public.system_settings to authenticated;

create policy system_settings_admin_select
on public.system_settings
for select
to authenticated
using (public.current_user_role() = 'admin');

create or replace function public.admin_update_user_access(
  p_user_id uuid,
  p_role text,
  p_account_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Administrator role required';
  end if;
  if p_role not in ('student', 'organiser', 'admin') then
    raise exception 'Invalid user role';
  end if;
  if p_account_status not in ('active', 'suspended') then
    raise exception 'Invalid account status';
  end if;
  if p_user_id = auth.uid()
    and (p_role <> 'admin' or p_account_status <> 'active') then
    raise exception 'Administrators cannot remove or suspend their own access';
  end if;

  update public.profiles
  set role = p_role,
      account_status = p_account_status
  where id = p_user_id;

  if not found then
    raise exception 'User profile not found';
  end if;
end;
$$;

revoke all on function public.admin_update_user_access(uuid, text, text) from public;
grant execute on function public.admin_update_user_access(uuid, text, text) to authenticated;

create or replace function public.admin_save_system_settings(
  p_report_threshold integer,
  p_admin_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Administrator role required';
  end if;
  if p_report_threshold not between 1 and 10 then
    raise exception 'Report threshold must be between 1 and 10';
  end if;
  if btrim(coalesce(p_admin_email, '')) <> ''
    and btrim(p_admin_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid administrator email is required';
  end if;

  update public.system_settings
  set report_threshold = p_report_threshold,
      admin_email = btrim(coalesce(p_admin_email, '')),
      updated_by = auth.uid()
  where id = 'global';
end;
$$;

revoke all on function public.admin_save_system_settings(integer, text) from public;
grant execute on function public.admin_save_system_settings(integer, text) to authenticated;

create or replace function public.admin_set_event_category(
  p_slug text,
  p_name text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_slug text := lower(btrim(coalesce(p_slug, '')));
  clean_name text := btrim(coalesce(p_name, ''));
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Administrator role required';
  end if;
  if clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or clean_name = '' then
    raise exception 'A valid category name is required';
  end if;
  if not p_active
    and (select count(*) from public.event_categories where is_active and slug <> clean_slug) = 0 then
    raise exception 'At least one active category is required';
  end if;

  insert into public.event_categories (slug, name, is_active, sort_order)
  values (
    clean_slug,
    clean_name,
    p_active,
    coalesce((select max(category.sort_order) + 10 from public.event_categories as category), 10)
  )
  on conflict (slug) do update
  set name = excluded.name,
      is_active = excluded.is_active;
end;
$$;

revoke all on function public.admin_set_event_category(text, text, boolean) from public;
grant execute on function public.admin_set_event_category(text, text, boolean) to authenticated;

create or replace function public.admin_system_health()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Administrator role required';
  end if;

  return exists (select 1 from public.system_settings where id = 'global');
end;
$$;

revoke all on function public.admin_system_health() from public;
grant execute on function public.admin_system_health() to authenticated;
