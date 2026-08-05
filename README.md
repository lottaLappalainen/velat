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

**⚠️ A real Supabase project is already live and linked**, with real user accounts and real transactions in
it — this is not first-time setup. See [docs/PLAN.md](docs/PLAN.md)'s "Live project status" before changing
anything database-related. `supabase/migrations/20260804120000_initial_schema.sql` (`profiles`, `friendships`,
`transactions`, `balances`, `transaction_presets`, RLS, `avatars` storage) has already been applied — treat
that file as history, not a draft.

**Outstanding right now:** `supabase/migrations/20260805130000_categories.sql` (adds `categories` +
`transactions.category_id`, with a backfill for existing transactions — see
[docs/tasks/categories-dashboard.md](docs/tasks/categories-dashboard.md)) has **not** been applied to the live
project yet. Apply it the same way any future migration gets applied:
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # if not already linked in this environment
npx supabase db push
```
Or paste the file's contents into the Supabase dashboard's SQL Editor and run it directly — either works, `db
push` just applies whichever migration files haven't been recorded as run yet.

**Going forward:** any further schema change is a **new** migration file (`supabase/migrations/<timestamp>_
<name>.sql`) doing an incremental `alter table`/`create table` against what's already live — never an edit to
an already-applied file, and always with a backfill plan for any `not null` column added to a table that
already has rows (both migration files above are the reference example for this).

One-time Auth configuration (Authentication → Providers/Policies in the dashboard), if not already done — see
[docs/tasks/authorization.md](docs/tasks/authorization.md#supabase-project-configuration-dashboard-one-time):
leaked-password protection on, minimum password length, redirect URLs, ~7 day session lifetime, **"Confirm
email" off** (deliberate — see that doc for why).

Sanity-check RLS after applying any migration: in the SQL editor, run a couple of inserts/selects "as" two
different `auth.uid()` values and confirm each user can only see their own data and their friends' shared
rows — the check this repo's [ROADMAP.md](docs/ROADMAP.md) Phase 2 and Phase 6 both call for.

## Docs

- [docs/PLAN.md](docs/PLAN.md) — app plan (stack, core flow, data model)
- [docs/ROADMAP.md](docs/ROADMAP.md) — build order across all tasks
- [docs/tasks/](docs/tasks/) — per-task detail (structure, authorization, debt ledger, UI)
