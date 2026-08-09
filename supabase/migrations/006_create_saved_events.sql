-- A student can save an event once for later reference.
create table public.saved_events (
  student_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, event_id)
);

create index saved_events_event_id_idx on public.saved_events (event_id);

alter table public.saved_events enable row level security;

grant select, insert, delete on table public.saved_events to authenticated;

create policy saved_events_select_own
on public.saved_events
for select
to authenticated
using (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
);

create policy saved_events_insert_own
on public.saved_events
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
  and exists (
    select 1
    from public.events as event
    where event.id = saved_events.event_id
      and event.status in ('published', 'completed')
  )
);

create policy saved_events_delete_own
on public.saved_events
for delete
to authenticated
using (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
);
