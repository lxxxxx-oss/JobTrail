# Supabase setup

JobTrail can run in two modes:

- Local mode: no Supabase environment variables, data stays in browser localStorage.
- Cloud mode: Supabase is configured and the user is signed in, data is saved to Supabase.

## 1. Create tables

Open the Supabase SQL editor and run:

```sql
-- docs/supabase/schema.sql
```

The schema enables Row Level Security. Every row has `user_id`, and policies use `auth.uid()` so a signed-in user can only read and write their own records.

## 2. Configure environment

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Restart `npm run dev` after changing environment variables.

## 3. Sign in

Use the email login in the top bar. After signing in, new changes are saved to Supabase. Use "同步本机数据" once if you want to copy the current browser data into the cloud account.
