# Coyotes-Synthesis

Chemical synthesis protocol database for [coyotessynthesis.com](https://coyotessynthesis.com).
Next.js app (originally generated with v0) backed by Supabase.

## Who can do what

- **Everyone:** browse protocols, view inventory, export PDFs.
- **Admin (signed in via the "Admin" button):** add, edit and delete protocols, and manage inventory.

The rule is enforced in the database (Supabase row-level security), not just by hiding buttons.

## Database

Supabase project `hvewliqztlbyrafakfjp`. Schema and access rules live in
`supabase/migrations/` (base tables first, then the admin-only write rules).

## One-time admin setup

1. **Create your login.** *Authentication → Users → Add user → Create new user*,
   with your email and a strong password (tick "Auto confirm user").
2. **Make that user an admin.** In the SQL Editor:
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
3. **Turn off public sign-ups.** *Authentication → Sign In / Providers →* disable
   "Allow new users to sign up", so nobody else can create an account.

## Development

```bash
pnpm install
pnpm dev
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
