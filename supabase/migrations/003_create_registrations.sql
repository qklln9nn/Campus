-- A student can have at most one registration record per event.
-- Capacity is assigned under an event row lock so concurrent registrations
-- cannot all claim the final available place.
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'registered',
  attendance_status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint registrations_event_student_key unique (event_id, student_id),
  constraint registrations_status_check
    check (status in ('registered', 'waitlisted', 'cancelled')),
  constraint registrations_attendance_status_check
    check (attendance_status in ('pending', 'attended', 'absent')),
  constraint registrations_attendance_matches_registration_check
    check (status = 'registered' or attendance_status = 'pending')
);

create index registrations_student_id_idx on public.registrations (student_id);
create index registrations_event_status_idx on public.registrations (event_id, status);
create index registrations_event_attendance_status_idx
  on public.registrations (event_id, attendance_status);

create function public.assign_registration_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := public.current_user_role();
  event_capacity integer;
  registered_count bigint;
begin
  -- A student cannot choose a privileged status during insertion.
  if actor_role = 'student' then
    if tg_op = 'INSERT' then
      new.status := 'registered';
      new.attendance_status := 'pending';
    elsif tg_op = 'UPDATE'
      and old.status = 'cancelled'
      and new.status in ('registered', 'waitlisted') then
      new.status := 'registered';
      new.attendance_status := 'pending';
    end if;
  end if;

  -- Trusted administrators may deliberately override event capacity.
  if auth.uid() is null or actor_role = 'admin' then
    return new;
  end if;

  if new.status <> 'registered' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'registered' then
      return new;
    end if;
  end if;

  -- Locking the parent event serializes capacity checks for that event.
  select event.capacity
  into event_capacity
  from public.events as event
  where event.id = new.event_id
  for update;

  if event_capacity is null then
    return new;
  end if;

  select count(*)
  into registered_count
  from public.registrations as registration
  where registration.event_id = new.event_id
    and registration.status = 'registered'
    and registration.id <> new.id;

  if registered_count >= event_capacity then
    new.status := 'waitlisted';
  end if;

  return new;
end;
$$;

revoke all on function public.assign_registration_capacity() from public;

create trigger registrations_assign_capacity
before insert or update on public.registrations
for each row execute function public.assign_registration_capacity();

create function public.protect_registration_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := public.current_user_role();
begin
  if auth.uid() is null or actor_role = 'admin' then
    return new;
  end if;

  if new.event_id is distinct from old.event_id
    or new.student_id is distinct from old.student_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Registration identity fields cannot be changed';
  end if;

  if actor_role = 'student' then
    if new.attendance_status is distinct from old.attendance_status then
      raise exception 'Students cannot change attendance status';
    end if;

    if new.status is distinct from old.status and not (
      (old.status = 'registered' and new.status = 'cancelled')
      or (old.status = 'cancelled' and new.status = 'registered')
      or (old.status = 'cancelled' and new.status = 'waitlisted')
      or (old.status = 'waitlisted' and new.status = 'cancelled')
    ) then
      raise exception 'This registration status transition requires an organiser';
    end if;
  elsif actor_role not in ('student', 'organiser') then
    raise exception 'This role cannot update registrations';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_registration_identity() from public;

create trigger registrations_protect_identity
before update on public.registrations
for each row execute function public.protect_registration_identity();

alter table public.registrations enable row level security;

grant select, insert, update, delete on table public.registrations to authenticated;

create policy registrations_select_own
on public.registrations
for select
to authenticated
using (student_id = (select auth.uid()));

create policy registrations_select_event_organiser
on public.registrations
for select
to authenticated
using (
  public.current_user_role() = 'organiser'
  and exists (
    select 1
    from public.events as event
    where event.id = registrations.event_id
      and event.organiser_id = (select auth.uid())
  )
);

create policy registrations_insert_own
on public.registrations
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
  and status in ('registered', 'waitlisted')
  and attendance_status = 'pending'
  and exists (
    select 1
    from public.events as event
    where event.id = registrations.event_id
      and event.status = 'published'
      and (
        event.event_date > current_date
        or (
          event.event_date = current_date
          and event.start_time > localtime
        )
      )
  )
);

create policy registrations_update_own
on public.registrations
for update
to authenticated
using (student_id = (select auth.uid()))
with check (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
  and attendance_status = 'pending'
  and (
    status = 'cancelled'
    or (
      status in ('registered', 'waitlisted')
      and exists (
        select 1
        from public.events as event
        where event.id = registrations.event_id
          and event.status = 'published'
          and (
            event.event_date > current_date
            or (
              event.event_date = current_date
              and event.start_time > localtime
            )
          )
      )
    )
  )
);

create policy registrations_update_event_organiser
on public.registrations
for update
to authenticated
using (
  public.current_user_role() = 'organiser'
  and exists (
    select 1
    from public.events as event
    where event.id = registrations.event_id
      and event.organiser_id = (select auth.uid())
  )
)
with check (
  public.current_user_role() = 'organiser'
  and exists (
    select 1
    from public.events as event
    where event.id = registrations.event_id
      and event.organiser_id = (select auth.uid())
  )
);

create policy registrations_delete_own
on public.registrations
for delete
to authenticated
using (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
  and attendance_status = 'pending'
);

create policy registrations_admin_all
on public.registrations
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
