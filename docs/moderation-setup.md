# Event moderation and reporting setup

## 1. Apply the database migration

Apply `supabase/migrations/013_restore_secure_moderation.sql` after migrations 001-012.

Migration 013 removes the permissive policies introduced by migration 012, restores server-controlled
roles, moves legacy directly-published events without review metadata back to `pending`, and creates the
`review_event` and `moderate_report` administrator functions.

For a new Supabase project, apply all migrations in filename order. For an existing project where 012
was already run, apply only 013. Do not rerun older migrations.

## 2. Create trusted organiser and administrator accounts

New self-registered accounts always receive the `student` role. Promote test accounts from the Supabase
SQL Editor or another trusted server-side process:

```sql
update public.profiles
set role = 'organiser'
where email = 'organiser@campus.edu';

update public.profiles
set role = 'admin'
where email = 'admin@campus.edu';
```

Sign out and sign in again after changing a role.

## 3. Verify event approval

1. Sign in as an organiser.
2. Create an event and select **Submit for Review**.
3. Confirm the database event status is `pending` and that a student cannot see it.
4. Sign in as an administrator and open `/admin/events`.
5. Approve the event and confirm its status becomes `published`.
6. Sign in as a student and confirm the event is visible.
7. Repeat with rejection and verify that a rejection reason is stored.

## 4. Verify reporting

1. As a student, open a published event and submit a report.
2. Confirm a row is created in `public.reports` with status `pending`.
3. As an administrator, open `/admin/reports` and mark the report as reviewing.
4. Dismiss the report, or resolve it and take down the event.
5. For a take-down action, confirm the report becomes `resolved` and the event becomes `cancelled`.

## 5. Security checks

- Anonymous users cannot insert, update, or delete events, profiles, registrations, or saved events.
- Students cannot access administrator event/report queues.
- Organisers can only modify their own events and cannot publish them directly.
- Only administrators can approve/reject events or resolve reports.
- A user can report the same event only once.
