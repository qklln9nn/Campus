-- Return the attendee list for an event to its organiser or an administrator.
-- This is a SECURITY DEFINER function because profiles are intentionally hidden
-- from organisers by the profiles table RLS policies.
create or replace function public.get_event_attendees(p_event_id uuid)
returns table (
  registration_id uuid,
  student_id uuid,
  full_name text,
  email text,
  registration_status text,
  attendance_status text,
  registered_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.current_user_role() is distinct from 'admin'
    and not exists (
      select 1
      from public.events as event
      where event.id = p_event_id
        and event.organiser_id = auth.uid()
    ) then
    raise exception 'Only the event organiser or an administrator can view attendees';
  end if;

  return query
  select
    registration.id as registration_id,
    registration.student_id,
    profile.full_name,
    profile.email,
    registration.status as registration_status,
    registration.attendance_status,
    registration.created_at as registered_at
  from public.registrations as registration
  join public.profiles as profile on profile.id = registration.student_id
  where registration.event_id = p_event_id
  order by
    case registration.status
      when 'registered' then 0
      when 'waitlisted' then 1
      else 2
    end,
    registration.created_at,
    registration.id;
end;
$$;

revoke all on function public.get_event_attendees(uuid) from public;
revoke all on function public.get_event_attendees(uuid) from anon;
grant execute on function public.get_event_attendees(uuid) to authenticated;
