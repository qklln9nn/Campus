create or replace function public.authorize_event_write () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_user_role();
  content_changed boolean := false;
begin
  if actor_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at then
      raise exception
        'Event identity fields cannot be changed from the client';
    end if;

    content_changed :=
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.category is distinct from old.category
      or new.location is distinct from old.location
      or new.online_link is distinct from old.online_link
      or new.image_url is distinct from old.image_url
      or new.event_date is distinct from old.event_date
      or new.start_time is distinct from old.start_time
      or new.end_time is distinct from old.end_time
      or new.capacity is distinct from old.capacity;
  end if;

  -- Administrator workflow
  if actor_role = 'admin' then
    if new.status = 'rejected'
      and (
        new.rejection_reason is null
        or btrim(new.rejection_reason) = ''
      ) then
      raise exception
        'A rejected event requires a rejection reason';
    end if;

    if tg_op = 'INSERT'
      or new.status is distinct from old.status then

      if new.status = 'rejected' then
        new.reviewed_by := actor_id;
        new.reviewed_at := now();

      elsif new.status in ('published', 'completed') then
        new.reviewed_by := actor_id;
        new.reviewed_at := now();
        new.rejection_reason := null;

      elsif new.status in ('draft', 'pending', 'cancelled') then
        new.reviewed_by := null;
        new.reviewed_at := null;
        new.rejection_reason := null;
      end if;
    end if;

    return new;
  end if;

  -- Organiser workflow
  if actor_role is distinct from 'organiser' then
    raise exception 'Only organisers can write events';
  end if;

  if tg_op = 'INSERT' then
    if new.organiser_id is distinct from actor_id then
      raise exception
        'An organiser can only create their own events';
    end if;

    if new.status not in ('draft', 'pending') then
      raise exception
        'A new event must be a draft or pending approval';
    end if;

    if new.reviewed_by is not null
      or new.reviewed_at is not null
      or new.rejection_reason is not null then
      raise exception
        'Only an administrator can set event review data';
    end if;

    return new;
  end if;

  if old.organiser_id is distinct from actor_id
    or new.organiser_id is distinct from old.organiser_id then
    raise exception
      'An organiser cannot transfer event ownership';
  end if;

  if new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.rejection_reason is distinct from old.rejection_reason then
    raise exception
      'Only an administrator can change review data';
  end if;

  if old.status in ('published', 'completed')
    and content_changed
    and new.status <> 'pending' then
    raise exception
      'Editing an approved event requires resubmission';
  end if;

  if new.status is distinct from old.status
    and not (
      (
        old.status = 'draft'
        and new.status in ('pending', 'cancelled')
      )
      or (
        old.status = 'pending'
        and new.status in ('draft', 'cancelled')
      )
      or (
        old.status = 'published'
        and new.status in ('pending', 'cancelled')
      )
      or (
        old.status = 'rejected'
        and new.status in ('draft', 'pending', 'cancelled')
      )
      or (
        old.status = 'cancelled'
        and new.status = 'draft'
      )
    ) then
    raise exception
      'This event status transition requires an administrator';
  end if;


  if new.status in ('draft', 'pending', 'cancelled')
    and new.status is distinct from old.status then
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
  end if;

  return new;
end;
$$;

revoke all on function public.authorize_event_write ()
from
  public;