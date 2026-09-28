alter table public.events
  add column if not exists rating_sum bigint not null default 0,
  add column if not exists rating_count bigint not null default 0;

create or replace function public.sync_rating_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events as e
  set rating_sum = c.r_sum,
      rating_count = c.r_count
  from (
    select
      coalesce(sum(rating), 0) as r_sum,
      count(*) as r_count
    from public.ratings
    where event_id = target_event
  ) as c
  where e.id = target_event;

  return null;
end;
$$;

create trigger ratings_sync_counts
after insert or update or delete on public.ratings
for each row execute function public.sync_rating_counts();

update public.events as e
set rating_sum = c.r_sum,
    rating_count = c.r_count
from (
  select
    event_id,
    coalesce(sum(rating), 0) as r_sum,
    count(*) as r_count
  from public.ratings
  group by event_id
) as c
where e.id = c.event_id;

-- RPC for submitting an event rating
create or replace function public.submit_event_rating(p_event_id uuid, p_rating smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  insert into public.ratings (event_id, student_id, rating)
  values (p_event_id, v_student_id, p_rating)
  on conflict (event_id, student_id)
  do update set rating = excluded.rating, updated_at = now();
end;
$$;
