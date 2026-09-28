create or replace function public.cancel_own_registration(
  p_event_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cancelled_status text;
  promoted_registration public.registrations%rowtype;
  promoted_student_id uuid := null;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.current_user_role() is distinct from 'student' then
    raise exception 'Student role required';
  end if;

  -- Delete only the current student's own registration.
  delete from public.registrations
  where event_id = p_event_id
    and student_id = auth.uid()
    and attendance_status = 'pending'
  returning status into cancelled_status;

  if not found then
    raise exception
      'No cancellable registration was found';
  end if;

  -- Leaving the waitlist does not free a confirmed place.
  if cancelled_status <> 'registered' then
    return null;
  end if;

  -- Find the earliest student in the queue.
  select registration.*
  into promoted_registration
  from public.registrations as registration
  where registration.event_id = p_event_id
    and registration.status = 'waitlisted'
  order by
    registration.created_at,
    registration.id
  limit 1
  for update skip locked;

  if found then
    promoted_student_id :=
      promoted_registration.student_id;

    -- Remove the old waitlist record.
    delete from public.registrations
    where id = promoted_registration.id;

    -- Reinsert it as a confirmed registration.
    -- The same ID and created_at are preserved.
    insert into public.registrations (
      id,
      event_id,
      student_id,
      status,
      attendance_status,
      created_at
    )
    values (
      promoted_registration.id,
      promoted_registration.event_id,
      promoted_registration.student_id,
      'registered',
      'pending',
      promoted_registration.created_at
    );
  end if;

  return promoted_student_id;
end;
$$;

revoke all
on function public.cancel_own_registration(uuid)
from public;

grant execute
on function public.cancel_own_registration(uuid)
to authenticated;