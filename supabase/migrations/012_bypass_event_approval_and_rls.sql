-- Migration 012: Bypass admin approval for direct event publishing & draft saving, drop restrictive category constraints, and configure full universal RLS policies (authenticated + anon)

-- 1. Drop restrict review check constraints and category checks to allow direct publishing by organisers with any category
alter table public.events drop constraint if exists events_review_state_check;
alter table public.events drop constraint if exists events_category_check;

-- Add updated, flexible review state check constraint
alter table public.events add constraint events_review_state_check
  check (
    (status = 'rejected' and rejection_reason is not null and btrim(rejection_reason) <> '')
    or (status in ('draft', 'pending', 'published', 'completed', 'cancelled'))
  );

-- 2. Update authorize_event_write trigger to allow direct write access
create or replace function public.authorize_event_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.organiser_id is null and actor_id is not null then
      new.organiser_id := actor_id;
    end if;
    return new;
  end if;

  return new;
end;
$$;

-- 3. Configure Universal RLS Policies for Events Table (Allow Both Authenticated & Anon Insert/Update/Delete/Select)
alter table public.events enable row level security;

drop policy if exists events_select_policy on public.events;
create policy events_select_policy on public.events
for select to authenticated, anon
using (true);

drop policy if exists events_insert_policy on public.events;
create policy events_insert_policy on public.events
for insert to authenticated, anon
with check (true);

drop policy if exists events_update_policy on public.events;
create policy events_update_policy on public.events
for update to authenticated, anon
using (true);

drop policy if exists events_delete_policy on public.events;
create policy events_delete_policy on public.events
for delete to authenticated, anon
using (true);

-- 4. Configure RLS Policies for Profiles Table
alter table public.profiles enable row level security;

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy on public.profiles
for select to authenticated, anon
using (true);

drop policy if exists profiles_insert_policy on public.profiles;
create policy profiles_insert_policy on public.profiles
for insert to authenticated, anon
with check (true);

drop policy if exists profiles_update_policy on public.profiles;
create policy profiles_update_policy on public.profiles
for update to authenticated, anon
using (true);

-- 5. Configure RLS Policies for Registrations Table
alter table public.registrations enable row level security;

drop policy if exists registrations_select_policy on public.registrations;
create policy registrations_select_policy on public.registrations
for select to authenticated, anon
using (true);

drop policy if exists registrations_insert_policy on public.registrations;
create policy registrations_insert_policy on public.registrations
for insert to authenticated, anon
with check (true);

drop policy if exists registrations_update_policy on public.registrations;
create policy registrations_update_policy on public.registrations
for update to authenticated, anon
using (true);

drop policy if exists registrations_delete_policy on public.registrations;
create policy registrations_delete_policy on public.registrations
for delete to authenticated, anon
using (true);

-- 6. Configure RLS Policies for Saved Events (Bookmarks)
alter table public.saved_events enable row level security;

drop policy if exists saved_events_select_policy on public.saved_events;
create policy saved_events_select_policy on public.saved_events
for select to authenticated, anon
using (true);

drop policy if exists saved_events_insert_policy on public.saved_events;
create policy saved_events_insert_policy on public.saved_events
for insert to authenticated, anon
with check (true);

drop policy if exists saved_events_delete_policy on public.saved_events;
create policy saved_events_delete_policy on public.saved_events
for delete to authenticated, anon
using (true);
