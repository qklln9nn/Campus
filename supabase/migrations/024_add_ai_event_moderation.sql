-- AI results are advisory. Only the existing administrator workflow publishes events.
create table public.event_ai_reviews (
  event_id uuid primary key references public.events(id) on delete cascade,
  source_snapshot jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  claim_id uuid,
  result jsonb,
  error_message text,
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and result is not null) or (status <> 'completed' and result is null))
);
create table public.event_ai_review_actions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  action text not null check (action in ('description', 'reject')),
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.event_ai_reviews enable row level security;
alter table public.event_ai_review_actions enable row level security;
revoke all on public.event_ai_reviews, public.event_ai_review_actions from public, anon, authenticated;
grant select on public.event_ai_reviews, public.event_ai_review_actions to authenticated;
grant all on public.event_ai_reviews, public.event_ai_review_actions to service_role;
create policy event_ai_reviews_admin_select on public.event_ai_reviews
  for select to authenticated using (public.current_user_role() = 'admin');
create policy event_ai_actions_admin_select on public.event_ai_review_actions
  for select to authenticated using (public.current_user_role() = 'admin');

create function public.event_ai_snapshot(p_event public.events) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', p_event.id, 'organiser_id', p_event.organiser_id,
    'title', p_event.title, 'description', p_event.description, 'category', p_event.category,
    'event_date', p_event.event_date, 'start_time', p_event.start_time, 'end_time', p_event.end_time,
    'location', p_event.location, 'online_link', p_event.online_link,
    'capacity', p_event.capacity, 'image_url', p_event.image_url
  );
$$;
revoke all on function public.event_ai_snapshot(public.events) from public, anon, authenticated;

create function public.queue_event_ai_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' then
    if tg_op = 'INSERT' then
      insert into public.event_ai_reviews(event_id, source_snapshot)
      values (new.id, public.event_ai_snapshot(new));
    elsif old.status <> 'pending' or public.event_ai_snapshot(new) is distinct from public.event_ai_snapshot(old) then
      insert into public.event_ai_reviews(event_id, source_snapshot)
      values (new.id, public.event_ai_snapshot(new))
      on conflict (event_id) do update set
        source_snapshot = excluded.source_snapshot, status = 'queued', claim_id = null,
        result = null, error_message = null, updated_at = now();
    end if;
  elsif tg_op = 'UPDATE' then
    if public.event_ai_snapshot(new) is distinct from public.event_ai_snapshot(old) then
      delete from public.event_ai_reviews where event_id = new.id;
    else
      delete from public.event_ai_reviews where event_id = new.id and status <> 'completed';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.queue_event_ai_review() from public, anon, authenticated;
create trigger events_queue_ai_review after insert or update on public.events
for each row execute function public.queue_event_ai_review();
insert into public.event_ai_reviews(event_id, source_snapshot)
select e.id, public.event_ai_snapshot(e) from public.events e where e.status = 'pending';

-- The Edge Function authenticates the actor before using these service-only RPCs.
-- Event -> review lock order is shared by claim, finish and adoption.
create function public.claim_event_ai_review(p_event_id uuid, p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; r public.event_ai_reviews; token uuid := gen_random_uuid();
begin
  select * into e from public.events where id = p_event_id for update;
  if not found or e.status <> 'pending' then raise exception 'Event is not pending review'; end if;
  select * into r from public.event_ai_reviews where event_id = p_event_id for update;
  if r.source_snapshot = public.event_ai_snapshot(e) then
    if r.status = 'completed' and not p_force then
      return jsonb_build_object('cached', true, 'review', to_jsonb(r) - 'source_snapshot' - 'claim_id');
    end if;
    if r.status = 'processing' and r.updated_at > now() - interval '5 minutes' then
      return jsonb_build_object('busy', true);
    end if;
  end if;
  insert into public.event_ai_reviews(event_id, source_snapshot, status, claim_id)
  values (e.id, public.event_ai_snapshot(e), 'processing', token)
  on conflict (event_id) do update set source_snapshot = excluded.source_snapshot,
    status = 'processing', claim_id = token, result = null, error_message = null, updated_at = now();
  return jsonb_build_object('claimId', token, 'event', public.event_ai_snapshot(e));
end;
$$;

create function public.finish_event_ai_review(p_event_id uuid, p_claim_id uuid, p_result jsonb, p_error text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; r public.event_ai_reviews;
begin
  select * into e from public.events where id = p_event_id for update;
  if not found or e.status <> 'pending' then raise exception 'Event changed during analysis'; end if;
  update public.event_ai_reviews set
    status = case when p_error is null then 'completed' else 'failed' end,
    result = case when p_error is null then p_result else null end,
    error_message = p_error, claim_id = null, updated_at = now()
  where event_id = p_event_id and claim_id = p_claim_id
    and source_snapshot = public.event_ai_snapshot(e)
  returning * into r;
  if not found then raise exception 'Event changed during analysis'; end if;
  return to_jsonb(r) - 'source_snapshot' - 'claim_id';
end;
$$;
revoke all on function public.claim_event_ai_review(uuid, boolean) from public, anon, authenticated;
revoke all on function public.finish_event_ai_review(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.claim_event_ai_review(uuid, boolean) to service_role;
grant execute on function public.finish_event_ai_review(uuid, uuid, jsonb, text) to service_role;

create function public.adopt_event_ai_suggestion(p_event_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events; r public.event_ai_reviews; suggestion text;
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Administrator role required'; end if;
  select * into e from public.events where id = p_event_id for update;
  if not found or e.status <> 'pending' then raise exception 'Event is not pending review'; end if;
  select * into r from public.event_ai_reviews where event_id = p_event_id for update;
  if not found or r.status <> 'completed' or r.source_snapshot is distinct from public.event_ai_snapshot(e) then
    raise exception 'AI review is unavailable or stale. Run analysis again';
  end if;
  if p_action = 'description' then
    suggestion := nullif(btrim(r.result ->> 'suggestedDescription'), '');
    if suggestion is null or suggestion = e.description then raise exception 'No description suggestion available'; end if;
    update public.events set description = suggestion where id = e.id;
  elsif p_action = 'reject' then
    if r.result ->> 'recommendation' not in ('reject', 'request_changes') then raise exception 'AI did not recommend returning this event'; end if;
    suggestion := nullif(btrim(r.result ->> 'reason'), '');
    if suggestion is null then raise exception 'A rejection reason is required'; end if;
    perform public.review_event(e.id, 'reject', suggestion);
  else raise exception 'Invalid AI adoption action';
  end if;
  insert into public.event_ai_review_actions(event_id, admin_id, action, result)
  values (e.id, auth.uid(), p_action, r.result);
end;
$$;
revoke all on function public.adopt_event_ai_suggestion(uuid, text) from public, anon, authenticated;
grant execute on function public.adopt_event_ai_suggestion(uuid, text) to authenticated;
