# Velat

A debt-tracking app between friends — add each other, log who owes whom, always see an up-to-date shared
balance. See [docs/PLAN.md](docs/PLAN.md) for the app plan and [docs/ROADMAP.md](docs/ROADMAP.md) for the
build order.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

The app is unusable until this is done — every protected route redirects to `/login`, and the database schema
can't be applied without a real project.

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) (or `npx supabase projects create`
   if you have the CLI authenticated).
2. Copy `.env.example` to `.env` and fill in the three values from **Project Settings → API**:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Configure Auth (Authentication → Providers/Policies in the dashboard) per
   [docs/tasks/authorization.md](docs/tasks/authorization.md#supabase-project-configuration-dashboard-one-time):
   email confirmation required, leaked-password protection on, minimum password length, redirect URLs, ~7 day
   session lifetime.
4. Link the CLI and apply the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   This applies `supabase/migrations/20260804120000_initial_schema.sql` — `profiles`, `friendships`,
   `transactions`, `balances`, `transaction_presets`, every RLS policy, and the `avatars` storage bucket. See
   [docs/tasks/authorization.md](docs/tasks/authorization.md) and
   [docs/tasks/debt-ledger.md](docs/tasks/debt-ledger.md) for what each part does and why.
5. Sanity-check RLS before building on top of it: in the SQL editor, run a couple of inserts/selects "as" two
   different `auth.uid()` values and confirm each user can only see their own data and their friends' shared
   rows — the check this repo's [ROADMAP.md](docs/ROADMAP.md) Phase 2 calls for.

## Docs

- [docs/PLAN.md](docs/PLAN.md) — app plan (stack, core flow, data model)
- [docs/ROADMAP.md](docs/ROADMAP.md) — build order across all tasks
- [docs/tasks/](docs/tasks/) — per-task detail (structure, authorization, debt ledger, UI)
