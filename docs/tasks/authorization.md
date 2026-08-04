# Task: Authorization & Auth foundation

Status: **planned, not yet implemented**

## Decisions made
- Login is **email + password** via Supabase Auth (not username-login). Username is a separate profile field used for display only, never for login.
- Transactions **apply immediately** when created — no confirmation step from the other party. To keep this safe, every transaction row records who created/last edited it, and edits are visible to both parties (audit trail, not silent mutation).

> Naming note: the log table is called **`transactions`** (originally sketched here as `debts`) —
> full column list, the `balances` view, and the whole "how debt is expressed" design now live in
> [debt-ledger.md](debt-ledger.md). This doc keeps only the RLS/authorization angle on that table.

## Why Supabase Auth + RLS
The project already depends on `@supabase/ssr` and `@supabase/supabase-js`, with `.env.example` set up for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and a server-only `SUPABASE_SERVICE_ROLE_KEY`. Supabase gives us:
- Password hashing, session issuance, email verification, password reset — we don't hand-roll any of this.
- Row Level Security (RLS) in Postgres as the actual authorization boundary. Every query — from the browser, from server components, from server actions — goes through RLS, so even a bug in app code can't leak another user's data. This matters a lot for a debts app: profile data and money amounts between two specific people must never be readable by a third party.

## Supabase project configuration (dashboard, one-time)
- Auth provider: Email enabled, **confirm email required** before login.
- Enable **leaked password protection** (HaveIBeenPwned check).
- Set minimum password length (recommend 10+) under Auth > Policies.
- Set the Site URL / redirect URLs for email confirmation links to match the deployed + local dev URLs.

## Next.js integration (`@supabase/ssr`)
- `src/lib/supabase/client.ts` — browser client (uses anon key).
- `src/lib/supabase/server.ts` — server client that reads/writes cookies via Next's `cookies()`, used in Server Components / Server Actions / Route Handlers.
- `src/lib/supabase/middleware.ts` + root `middleware.ts` — refreshes the session cookie on every request; redirects:
  - unauthenticated users away from protected routes (e.g. `/app/*`) to `/login`
  - authenticated users away from `/login` and `/signup` to `/app`
- Routes: `/signup`, `/login`, a logout Server Action, and `/auth/callback` (exchanges the email-confirmation link for a session).

## Database schema

```sql
-- profiles: 1:1 with auth.users, public-ish (name/photo only, no secrets)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- auto-create a profile row when someone signs up
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, username, display_name)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- friendships: one row per requested/accepted relationship
create type friendship_status as enum ('pending', 'accepted', 'declined', 'blocked');

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id),
  addressee_id uuid not null references profiles(id),
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
-- prevent duplicate/opposite-direction pending requests between the same pair
create unique index one_friendship_per_pair on friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- transactions (the log) + balances (the derived, netted total):
-- see debt-ledger.md for the full CREATE TABLE / CREATE VIEW and the
-- direction/sign design. Only the RLS for `transactions` is repeated below.
```

## Row Level Security policies

RLS is **default deny** — enable it on all three tables, then add only these policies.

```sql
alter table profiles enable row level security;
alter table friendships enable row level security;
alter table transactions enable row level security;

-- profiles: readable by any authenticated user (name/photo aren't sensitive,
-- and you need to see a friend's name before you've even added them);
-- writable only by the owner
create policy "profiles readable by authenticated" on profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles editable by owner" on profiles
  for update using (auth.uid() = id);

-- friendships: only the two people involved can see the row
create policy "friendships visible to participants" on friendships
  for select using (auth.uid() in (requester_id, addressee_id));
-- only the requester can create, and can't friend themselves
create policy "friendships created by requester" on friendships
  for insert with check (auth.uid() = requester_id);
-- only the addressee can accept/decline; requester can cancel their own pending request
create policy "friendships updated by participants" on friendships
  for update using (auth.uid() in (requester_id, addressee_id));

-- transactions: only the two people on the entry can see it
create policy "transactions visible to participants" on transactions
  for select using (auth.uid() in (creditor_id, debtor_id));
-- either party can log a transaction involving themselves, but only if they're
-- accepted friends with the other party
create policy "transactions created by a participant who is a friend" on transactions
  for insert with check (
    auth.uid() in (creditor_id, debtor_id)
    and created_by = auth.uid()
    and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and least(f.requester_id, f.addressee_id) = least(creditor_id, debtor_id)
        and greatest(f.requester_id, f.addressee_id) = greatest(creditor_id, debtor_id)
    )
  );
-- either party can edit/soft-delete an entry involving them (apply-immediately
-- model chosen over confirmation) — audit trail (created_by/updated_at) keeps
-- this honest since both sides can always see who touched it
create policy "transactions editable by participants" on transactions
  for update using (auth.uid() in (creditor_id, debtor_id));
```

`balances` is a view over `transactions` and needs no policy of its own — see debt-ledger.md.

## Storage (avatar photos)
- Bucket `avatars`, path convention `{user_id}/avatar.<ext>`.
- Policy: a user can insert/update/delete only objects under their own `{user_id}/` prefix; read can be public (photos aren't sensitive) or signed-URL if you want them fully private.

## Defense in depth (beyond RLS)
- RLS is the real boundary, but Server Actions should still check preconditions (e.g. "are we friends?") before attempting an insert, purely to return a clean error message instead of a raw Postgres RLS rejection.
- The anon key + user session is used for all user-facing reads/writes. The service-role key (already isolated server-side per `.env.example`) is never imported into any client component or exposed route — reserve it for one-off admin/maintenance scripts only.
- Cookies from `@supabase/ssr` are httpOnly + secure + sameSite=lax by default — don't override this.
- State-changing operations go through Server Actions / POST route handlers only, never GET, to avoid CSRF-via-navigation.

## Build order
1. `src/lib/supabase/{client,server,middleware}.ts` + root `middleware.ts` (route protection + session refresh).
2. Signup / login pages + `/auth/callback` route + logout action.
3. `profiles` table + trigger + RLS → profile page (edit name/photo, upload avatar to Storage).
4. `friendships` table + RLS → add-friend / requests-inbox / accept-decline UI.
5. `transactions` table + `balances` view + RLS (full design in [debt-ledger.md](debt-ledger.md)) → add-transaction form + per-friend balance display.
6. Manual two-account test pass: confirm account A can never read/write account B's profile edits, pending friend requests, or transactions with a third party — only what RLS should allow.

## Open items to revisit later (not blocking)
- Multi-currency netting — see debt-ledger.md, deferred there.
- Blocking a friend after transactions exist (data retention question).
- Whether transaction edits should be time-limited (e.g. only editable within 24h) — currently unrestricted for either party; tracked in debt-ledger.md too since it's the same table.
