-- Reports are private moderation records for inappropriate event content.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  reason text not null,
  description text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint reports_reporter_event_key unique (reporter_id, event_id),
  constraint reports_reason_not_blank check (btrim(reason) <> ''),
  constraint reports_description_length_check check (char_length(description) <= 2000),
  constraint reports_status_check
    check (status in ('pending', 'reviewing', 'resolved', 'dismissed'))
);

create index reports_event_status_idx on public.reports (event_id, status);
create index reports_reporter_id_idx on public.reports (reporter_id);

alter table public.reports enable row level security;

grant select, insert, update on table public.reports to authenticated;

create policy reports_select_own
on public.reports
for select
to authenticated
using (reporter_id = (select auth.uid()));

create policy reports_insert_own
on public.reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1
    from public.events as event
    where event.id = reports.event_id
      and event.status in ('published', 'completed')
  )
);

create policy reports_admin_all
on public.reports
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
