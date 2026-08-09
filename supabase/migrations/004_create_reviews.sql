-- Reviews are limited to one per student and event.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null,
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_event_student_key unique (event_id, student_id),
  constraint reviews_rating_check check (rating between 1 and 5),
  constraint reviews_comment_length_check check (char_length(comment) <= 2000)
);

create index reviews_event_id_idx on public.reviews (event_id);
create index reviews_student_id_idx on public.reviews (student_id);

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create function public.protect_review_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.current_user_role() = 'admin' then
    return new;
  end if;

  if new.event_id is distinct from old.event_id
    or new.student_id is distinct from old.student_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Review identity fields cannot be changed';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_review_identity() from public;

create trigger reviews_protect_identity
before update on public.reviews
for each row execute function public.protect_review_identity();

alter table public.reviews enable row level security;

grant select on table public.reviews to authenticated;
grant insert, update, delete on table public.reviews to authenticated;

create policy reviews_select_published_events
on public.reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.events as event
    where event.id = reviews.event_id
      and event.status in ('published', 'completed')
  )
);

create policy reviews_select_own_or_admin
on public.reviews
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.current_user_role() = 'admin'
);

create policy reviews_insert_own_attended_event
on public.reviews
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
  and exists (
    select 1
    from public.registrations as registration
    join public.events as event on event.id = registration.event_id
    where registration.event_id = reviews.event_id
      and registration.student_id = (select auth.uid())
      and registration.status = 'registered'
      and registration.attendance_status = 'attended'
      and (
        event.event_date < current_date
        or (
          event.event_date = current_date
          and event.end_time <= localtime
        )
      )
  )
);

create policy reviews_update_own_attended_event
on public.reviews
for update
to authenticated
using (student_id = (select auth.uid()))
with check (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
  and exists (
    select 1
    from public.registrations as registration
    join public.events as event on event.id = registration.event_id
    where registration.event_id = reviews.event_id
      and registration.student_id = (select auth.uid())
      and registration.status = 'registered'
      and registration.attendance_status = 'attended'
      and (
        event.event_date < current_date
        or (
          event.event_date = current_date
          and event.end_time <= localtime
        )
      )
  )
);

create policy reviews_delete_own
on public.reviews
for delete
to authenticated
using (
  student_id = (select auth.uid())
  and public.current_user_role() = 'student'
);

create policy reviews_admin_all
on public.reviews
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
