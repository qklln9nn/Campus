# Supabase Auth setup

The application uses Supabase email/password authentication and reads authorization roles from
`public.profiles`. Browser-supplied user metadata is never trusted for role assignment.

## 1. Apply migrations

Apply every migration in `supabase/migrations`, including
`008_extend_profiles_for_auth.sql`, to the target Supabase project. If migrations 001-007 were
already applied, only apply 008.

## 2. Configure frontend environment

Copy `.env.example` to `.env.local` and set the project URL and publishable key. Never expose a
`service_role` key in a `VITE_` variable or browser bundle.

## 3. Configure Auth URLs

In Supabase Dashboard → Authentication → URL Configuration, set the production Site URL and add
the local development redirects:

- `http://localhost:5173/login`
- `http://localhost:5173/reset-password`

Add the equivalent production URLs. Configure confirmation and password recovery email templates
and an SMTP provider before production use.

## 4. Bootstrap trusted roles

New registrations always receive the `student` role. Promote trusted accounts from the Supabase SQL
Editor or another server-side administration path:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@campus.edu';

update public.profiles
set role = 'organiser'
where email = 'organiser@campus.edu';
```

Do not let a browser client choose its role during registration.

## 5. Verify

1. Register a student and confirm that a matching profile is created.
2. Confirm the email, sign in, refresh the browser, and verify the session is restored.
3. Verify a student is redirected away from `/admin` and `/organiser/dashboard`.
4. Promote a test account to organiser, sign in again, and verify organiser routes are available.
5. Request a password reset and verify the link opens `/reset-password`.
6. Update a profile and confirm the new values are stored in `public.profiles`.
