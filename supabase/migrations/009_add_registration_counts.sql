alter table public.events
  add column if not exists registered_count int not null default 0,
  add column if not exists waitlist_count int not null default 0;

create or replace function public.sync_registration_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events as e
  set registered_count = c.registered,
      waitlist_count = c.waitlisted
  from (
    select
      count(*) filter (where status = 'registered') as registered,
      count(*) filter (where status = 'waitlisted') as waitlisted
    from public.registrations
    where event_id = target_event
      and status in ('registered', 'waitlisted')
  ) as c
  where e.id = target_event;

  return null;
end;
$$;

create trigger registrations_sync_counts
after insert or update or delete on public.registrations
for each statement execute function public.sync_registration_counts();

update public.events as e
set registered_count = c.registered,
    waitlist_count = c.waitlisted
from (
  select
    event_id,
    count(*) filter (where status = 'registered') as registered,
    count(*) filter (where status = 'waitlisted') as waitlisted
  from public.registrations
  where status in ('registered', 'waitlisted')
  group by event_id
) as c
where e.id = c.event_id;
