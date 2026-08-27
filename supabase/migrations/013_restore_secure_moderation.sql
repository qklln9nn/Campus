-- Restore secure approval and moderation after migration 012 opened broad access.

-- Remove the permissive policies introduced by migration 012. The original
-- role-aware policies from migrations 001-007 remain in place.
drop policy if exists events_select_policy on public.events;
drop policy if exists events_insert_policy on public.events;
drop policy if exists events_update_policy on public.events;
drop policy if exists events_delete_policy on public.events;
drop policy if exists profiles_select_policy on public.profiles;
drop policy if exists profiles_insert_policy on public.profiles;
drop policy if exists profiles_update_policy on public.profiles;
drop policy if exists registrations_select_policy on public.registrations;
drop policy if exists registrations_insert_policy on public.registrations;
drop policy if exists registrations_update_policy on public.registrations;
drop policy if exists registrations_delete_policy on public.registrations;
drop policy if exists saved_events_select_policy on public.saved_events;
drop policy if exists saved_events_insert_policy on public.saved_events;
drop policy if exists saved_events_delete_policy on public.saved_events;

revoke insert, update, delete on public.events from anon;
revoke all on public.profiles from anon;
revoke all on public.registrations from anon;
revoke all on public.saved_events from anon;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
on public.reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and public.current_user_role() = 'student'
  and exists (
    select 1 from public.events as event
    where event.id = reports.event_id
      and event.status in ('published', 'completed')
  )
);

-- Browser metadata must never be able to assign privileged roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, major, grade)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
    ),
    'student',
    coalesce(new.raw_user_meta_data ->> 'major', ''),
    coalesce(new.raw_user_meta_data ->> 'grade', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      major = excluded.major,
      grade = excluded.grade;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

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

  if new.role is distinct from old.role
    and public.current_user_role() is distinct from 'admin' then
    raise exception 'Only an administrator can change profile roles';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_system_fields() from public;

-- Restore the review-state invariant while supporting an extensible category list.
alter table public.events drop constraint if exists events_category_check;
alter table public.events add constraint events_category_check
  check (btrim(category) <> '');

alter table public.events drop constraint if exists events_review_state_check;

-- Direct publishing under migration 012 did not record an administrator. Move
-- those legacy rows back to review instead of inventing audit metadata.
update public.events
set status = 'pending', reviewed_by = null, reviewed_at = null, rejection_reason = null
where status in ('published', 'completed')
  and (reviewed_by is null or reviewed_at is null);

update public.events
set status = 'pending', reviewed_by = null, reviewed_at = null, rejection_reason = null
where status = 'rejected'
  and (
    reviewed_by is null
    or reviewed_at is null
    or rejection_reason is null
    or btrim(rejection_reason) = ''
  );

update public.events
set reviewed_by = null, reviewed_at = null, rejection_reason = null
where status in ('draft', 'pending', 'cancelled');

update public.events set rejection_reason = null
where status in ('published', 'completed');

alter table public.events add constraint events_review_state_check
  check (
    (
      status = 'rejected'
      and reviewed_by is not null
      and reviewed_at is not null
      and rejection_reason is not null
      and btrim(rejection_reason) <> ''
    )
    or (
      status in ('published', 'completed')
      and reviewed_by is not null
      and reviewed_at is not null
      and rejection_reason is null
    )
    or (
      status in ('draft', 'pending', 'cancelled')
      and reviewed_by is null
      and reviewed_at is null
      and rejection_reason is null
    )
  );

-- Organisers own their proposals; only administrators can make review decisions.
create or replace function public.authorize_event_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_user_role();
  content_changed boolean := false;
begin
  if actor_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'Event identity fields cannot be changed from the client';
    end if;

    content_changed := new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.category is distinct from old.category
      or new.location is distinct from old.location
      or new.online_link is distinct from old.online_link
      or new.image_url is distinct from old.image_url
      or new.event_date is distinct from old.event_date
      or new.start_time is distinct from old.start_time
      or new.end_time is distinct from old.end_time
      or new.capacity is distinct from old.capacity;
  end if;

  if actor_role = 'admin' then
    if new.status = 'rejected' and (new.rejection_reason is null or btrim(new.rejection_reason) = '') then
      raise exception 'A rejected event requires a rejection reason';
    end if;

    if tg_op = 'INSERT' or new.status is distinct from old.status then
      if new.status = 'rejected' then
        new.reviewed_by := actor_id;
        new.reviewed_at := now();
      elsif new.status in ('published', 'completed') then
        new.reviewed_by := actor_id;
        new.reviewed_at := now();
        new.rejection_reason := null;
      elsif new.status in ('draft', 'pending', 'cancelled') then
        new.reviewed_by := null;
        new.reviewed_at := null;
        new.rejection_reason := null;
      end if;
    end if;

    return new;
  end if;

  if actor_role is distinct from 'organiser' then
    raise exception 'Only organisers can write events';
  end if;

  if tg_op = 'INSERT' then
    if new.organiser_id is distinct from actor_id then
      raise exception 'An organiser can only create their own events';
    end if;
    if new.status not in ('draft', 'pending') then
      raise exception 'A new event must be a draft or pending approval';
    end if;
    if new.reviewed_by is not null or new.reviewed_at is not null or new.rejection_reason is not null then
      raise exception 'Only an administrator can set event review data';
    end if;
    return new;
  end if;

  if old.organiser_id is distinct from actor_id or new.organiser_id is distinct from old.organiser_id then
    raise exception 'An organiser cannot transfer event ownership';
  end if;

  if new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Only an administrator can change review data';
  end if;

  if old.status in ('published', 'completed') and content_changed and new.status <> 'pending' then
    raise exception 'Editing an approved event requires resubmission';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('pending', 'cancelled'))
    or (old.status = 'pending' and new.status in ('draft', 'cancelled'))
    or (old.status = 'published' and new.status in ('pending', 'cancelled'))
    or (old.status = 'rejected' and new.status in ('draft', 'pending', 'cancelled'))
    or (old.status = 'cancelled' and new.status = 'draft')
  ) then
    raise exception 'This event status transition requires an administrator';
  end if;

  if new.status in ('draft', 'pending') and new.status is distinct from old.status then
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
  end if;

  return new;
end;
$$;

revoke all on function public.authorize_event_write() from public;

-- Transactional administrator APIs used by the frontend.
create or replace function public.review_event(
  p_event_id uuid,
  p_decision text,
  p_rejection_reason text default null
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
  if p_decision not in ('approve', 'reject') then
    raise exception 'Invalid review decision';
  end if;
  if p_decision = 'reject' and coalesce(btrim(p_rejection_reason), '') = '' then
    raise exception 'A rejection reason is required';
  end if;

  update public.events
  set status = case when p_decision = 'approve' then 'published' else 'rejected' end,
      rejection_reason = case when p_decision = 'reject' then btrim(p_rejection_reason) else null end
  where id = p_event_id and status in ('pending', 'rejected', 'cancelled');

  if not found then
    raise exception 'Event is not available for review';
  end if;
end;
$$;

create or replace function public.moderate_report(
  p_report_id uuid,
  p_resolution text,
  p_take_down_event boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event_id uuid;
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Administrator role required';
  end if;
  if p_resolution not in ('reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report resolution';
  end if;

  select event_id into target_event_id
  from public.reports
  where id = p_report_id
  for update;

  if target_event_id is null then
    raise exception 'Report not found';
  end if;

  if p_take_down_event then
    update public.events set status = 'cancelled' where id = target_event_id;
  end if;

  update public.reports set status = p_resolution where id = p_report_id;
end;
$$;

revoke all on function public.review_event(uuid, text, text) from public;
revoke all on function public.moderate_report(uuid, text, boolean) from public;
grant execute on function public.review_event(uuid, text, text) to authenticated;
grant execute on function public.moderate_report(uuid, text, boolean) to authenticated;
