-- Migration 009 created a statement-level trigger but its function reads NEW
-- and OLD records. Those records only exist for row-level triggers, so writes
-- to registrations can fail before they are committed.
drop trigger if exists registrations_sync_counts on public.registrations;

-- Registration counters are maintained by the function below. A counter-only
-- update must not run the organiser/admin content-authorization trigger, while
-- direct browser clients must not be able to edit the counters themselves.
drop trigger if exists events_authorize_write on public.events;
drop trigger if exists events_authorize_insert on public.events;

create trigger events_authorize_insert
before insert on public.events
for each row execute function public.authorize_event_write();

create trigger events_authorize_write
before update of
  id,
  title,
  description,
  category,
  event_date,
  start_time,
  end_time,
  location,
  online_link,
  capacity,
  image_url,
  status,
  organiser_id,
  reviewed_by,
  reviewed_at,
  rejection_reason,
  created_at,
  updated_at
on public.events
for each row execute function public.authorize_event_write();

revoke update on table public.events from authenticated;
grant update (
  title,
  description,
  category,
  event_date,
  start_time,
  end_time,
  location,
  online_link,
  capacity,
  image_url,
  status,
  organiser_id
) on table public.events to authenticated;

create or replace function public.sync_registration_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.events as event
    set registered_count = event.registered_count
          + case when new.status = 'registered' then 1 else 0 end,
        waitlist_count = event.waitlist_count
          + case when new.status = 'waitlisted' then 1 else 0 end
    where event.id = new.event_id;
  elsif tg_op = 'DELETE' then
    update public.events as event
    set registered_count = greatest(
          0,
          event.registered_count - case when old.status = 'registered' then 1 else 0 end
        ),
        waitlist_count = greatest(
          0,
          event.waitlist_count - case when old.status = 'waitlisted' then 1 else 0 end
        )
    where event.id = old.event_id;
  elsif old.event_id = new.event_id then
    if old.status is distinct from new.status then
      update public.events as event
      set registered_count = greatest(
            0,
            event.registered_count
              - case when old.status = 'registered' then 1 else 0 end
              + case when new.status = 'registered' then 1 else 0 end
          ),
          waitlist_count = greatest(
            0,
            event.waitlist_count
              - case when old.status = 'waitlisted' then 1 else 0 end
              + case when new.status = 'waitlisted' then 1 else 0 end
          )
      where event.id = new.event_id;
    end if;
  else
    -- Trusted administration paths may move a registration to another event.
    update public.events as event
    set registered_count = greatest(
          0,
          event.registered_count - case when old.status = 'registered' then 1 else 0 end
        ),
        waitlist_count = greatest(
          0,
          event.waitlist_count - case when old.status = 'waitlisted' then 1 else 0 end
        )
    where event.id = old.event_id;

    update public.events as event
    set registered_count = event.registered_count
          + case when new.status = 'registered' then 1 else 0 end,
        waitlist_count = event.waitlist_count
          + case when new.status = 'waitlisted' then 1 else 0 end
    where event.id = new.event_id;
  end if;

  return null;
end;
$$;

revoke all on function public.sync_registration_counts() from public;

create trigger registrations_sync_counts
after insert or update or delete on public.registrations
for each row execute function public.sync_registration_counts();

-- Recalculate existing values in case earlier failed writes or manual changes
-- left the cached counters out of sync.
update public.events as event
set registered_count = (
      select count(*)::integer
      from public.registrations as registration
      where registration.event_id = event.id
        and registration.status = 'registered'
    ),
    waitlist_count = (
      select count(*)::integer
      from public.registrations as registration
      where registration.event_id = event.id
        and registration.status = 'waitlisted'
    );
