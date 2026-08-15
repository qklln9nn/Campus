-- Campus events created by organisers and approved by administrators.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  location text,
  online_link text,
  capacity integer not null,
  image_url text,
  status text not null default 'draft',
  organiser_id uuid not null references public.profiles (id) on delete cascade,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_title_not_blank check (btrim(title) <> ''),
  constraint events_location_or_online_link_check
    check (
      nullif(btrim(location), '') is not null
      or nullif(btrim(online_link), '') is not null
    ),
  constraint events_category_check
    check (category in ('academic', 'sports', 'cultural', 'tech')),
  constraint events_status_check
    check (status in ('draft', 'pending', 'published', 'rejected', 'cancelled', 'completed')),
  constraint events_time_range_check
    check (end_time > start_time),
  constraint events_capacity_check
    check (capacity > 0),
  constraint events_review_state_check
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
      or status in ('draft', 'pending', 'cancelled')
    )
);

create index events_organiser_id_idx on public.events (organiser_id);
create index events_status_event_date_start_time_idx
  on public.events (status, event_date, start_time);
create index events_category_idx on public.events (category);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- Prevent an organiser from approving their own event or forging review data.
create function public.authorize_event_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_user_role();
begin
  -- SQL migrations and service-role requests are trusted administration paths.
  if actor_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at then
      raise exception 'Event identity fields cannot be changed from the client';
    end if;
  end if;

  -- Record the authenticated administrator responsible for each review decision.
  if actor_role = 'admin' then
    if tg_op = 'INSERT' then
      if new.status = 'rejected' then
        if new.rejection_reason is null or btrim(new.rejection_reason) = '' then
          raise exception 'A rejected event requires a rejection reason';
        end if;
        new.reviewed_by := actor_id;
        new.reviewed_at := now();
      elsif new.status in ('published', 'completed') then
        new.reviewed_by := actor_id;
        new.reviewed_at := now();
        new.rejection_reason := null;
      else
        new.reviewed_by := null;
        new.reviewed_at := null;
        new.rejection_reason := null;
      end if;
    elsif new.status is distinct from old.status then
      if new.status = 'rejected' then
        if new.rejection_reason is null or btrim(new.rejection_reason) = '' then
          raise exception 'A rejected event requires a rejection reason';
        end if;
        new.reviewed_by := actor_id;
        new.reviewed_at := now();
      elsif new.status = 'published'
        or (new.status = 'completed' and old.status <> 'published') then
        new.reviewed_by := actor_id;
        new.reviewed_at := now();
        new.rejection_reason := null;
      elsif new.status in ('draft', 'pending') then
        new.reviewed_by := null;
        new.reviewed_at := null;
        new.rejection_reason := null;
      elsif new.reviewed_by is distinct from old.reviewed_by
        or new.reviewed_at is distinct from old.reviewed_at
        or new.rejection_reason is distinct from old.rejection_reason then
        raise exception 'A status-only transition cannot rewrite existing review data';
      end if;
    elsif new.status = 'rejected'
      and new.rejection_reason is distinct from old.rejection_reason then
      if new.rejection_reason is null or btrim(new.rejection_reason) = '' then
        raise exception 'A rejected event requires a rejection reason';
      end if;
      new.reviewed_by := actor_id;
      new.reviewed_at := now();
    elsif new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Review data must be changed through an event review decision';
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

    if new.reviewed_by is not null
      or new.reviewed_at is not null
      or new.rejection_reason is not null then
      raise exception 'Only an administrator can set event review data';
    end if;
  elsif tg_op = 'UPDATE' then
    if old.organiser_id is distinct from actor_id
      or new.organiser_id is distinct from old.organiser_id then
      raise exception 'An organiser cannot transfer event ownership';
    end if;

    if new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Only an administrator can change event review data';
    end if;

    if old.status in ('published', 'completed') and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.category is distinct from old.category
      or new.location is distinct from old.location
      or new.online_link is distinct from old.online_link
      or new.image_url is distinct from old.image_url
      or new.event_date is distinct from old.event_date
      or new.start_time is distinct from old.start_time
      or new.end_time is distinct from old.end_time
      or new.capacity is distinct from old.capacity
    ) then
      raise exception 'An approved event must be resubmitted before its content can change';
    end if;

    if new.status is distinct from old.status and not (
      (old.status = 'draft' and new.status in ('pending', 'cancelled'))
      or (old.status = 'pending' and new.status in ('draft', 'cancelled'))
      or (old.status = 'published' and new.status = 'cancelled')
      or (old.status = 'rejected' and new.status in ('draft', 'pending', 'cancelled'))
      or (old.status = 'cancelled' and new.status = 'draft')
    ) then
      raise exception 'This event status transition requires an administrator';
    end if;

    if new.status in ('draft', 'pending')
      and new.status is distinct from old.status then
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.rejection_reason := null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.authorize_event_write() from public;

create trigger events_authorize_write
before insert or update on public.events
for each row execute function public.authorize_event_write();

alter table public.events enable row level security;

grant select on table public.events to anon, authenticated;
grant insert, update, delete on table public.events to authenticated;

create policy events_select_public
on public.events
for select
to anon, authenticated
using (status in ('published', 'completed'));

create policy events_select_own_or_admin
on public.events
for select
to authenticated
using (
  organiser_id = (select auth.uid())
  or public.current_user_role() = 'admin'
);

create policy events_insert_own
on public.events
for insert
to authenticated
with check (
  organiser_id = (select auth.uid())
  and public.current_user_role() = 'organiser'
);

create policy events_update_own
on public.events
for update
to authenticated
using (
  organiser_id = (select auth.uid())
  and public.current_user_role() = 'organiser'
)
with check (
  organiser_id = (select auth.uid())
  and public.current_user_role() = 'organiser'
);

create policy events_delete_own
on public.events
for delete
to authenticated
using (
  organiser_id = (select auth.uid())
  and public.current_user_role() = 'organiser'
  and status in ('draft', 'rejected', 'cancelled')
);

create policy events_admin_write
on public.events
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
