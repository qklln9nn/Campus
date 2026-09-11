# Supabase Auth setup

Campus EventHub uses Supabase email/password authentication. Supabase owns the session, while the
authoritative application role is read from `public.profiles`. Browser-supplied user metadata is
never trusted for assigning organiser or administrator access.

## Apply migrations

Apply the migrations in `supabase/migrations` in numeric order. The authentication integration
requires `015_extend_profiles_for_auth.sql`; it adds the persistent profile fields used by the
profile page without replacing the previously applied migration `008`.

## Configure the frontend

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key. Never put a
`service_role` key in a `VITE_` variable because Vite exposes those values to the browser bundle.

## Configure Auth URLs

In Supabase Dashboard, open **Authentication > URL Configuration**. Set the production Site URL and
add these local redirect URLs:

- `http://localhost:5173/login`
- `http://localhost:5173/reset-password`

Add the equivalent production URLs before deployment. Configure confirmation and password recovery
email templates and an SMTP provider for production use.

## Assign trusted roles

Self-registration always creates a student. Promote trusted users through the Supabase SQL Editor or
another server-side administration path:

```sql
update public.profiles set role = 'organiser' where email = 'organiser@campus.edu';
update public.profiles set role = 'admin' where email = 'admin@campus.edu';
```

## Verify

1. Register a student and confirm a matching row is created in `public.profiles`.
2. Confirm the email, sign in, refresh the browser, and verify the session is restored.
3. Verify a student cannot open `/organiser/dashboard` or `/admin`.
4. Promote test accounts and verify each role is sent to the correct dashboard.
5. Request a password reset and verify the link opens `/reset-password`.
6. Edit the profile, refresh the page, and verify the changes were stored in `public.profiles`.
