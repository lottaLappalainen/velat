# Task: Debt ledger — database model + how debt is expressed in the UI

Status: **planned, not yet implemented**

This task covers three things the user asked for, which are three different concepts that must not get
merged into one:
1. **User information** — already covered by `profiles` in [authorization.md](authorization.md); nothing new needed here.
2. **The overall debt between two people, and which way it goes** — a *derived* number (netted from the log), not something we store and can get out of sync.
3. **The log** — every individual transaction, immutable-ish, with a name, a price, a timestamp, and a direction.

Naming decision: the table planned as `debts` in authorization.md is renamed **`transactions`** here — "debts"
was being used for both the log table and the netted total, which is exactly the ambiguity this task needs to
resolve. From now on: **`transactions` = the log, `balances` = the derived total.** authorization.md's RLS
section should be read with `debts` → `transactions` renamed; see the note at the bottom of this doc for the
exact diff.

## Core principle: store facts, never store "+/-"

The biggest way this kind of feature goes wrong is storing amounts as signed numbers from "the" perspective —
there is no single perspective, there are two people and each sees the opposite sign. So:

- **Storage** records a fact with no ambiguity: `creditor_id` (who is owed), `debtor_id` (who owes), and a
  positive `amount`. Never a signed amount, never "current user's" viewpoint.
- **Direction (+/-) only exists at the UI layer**, computed at render time relative to whoever is looking at
  the screen. The same row shows as "+12,50 €" to the creditor and "-12,50 €" to the debtor. This is the only
  way the sign is guaranteed to always be correct for both people simultaneously.

## Schema

```sql
-- the log: one row per transaction
create table transactions (
  id uuid primary key default gen_random_uuid(),
  creditor_id uuid not null references profiles(id),   -- who is owed money by this entry
  debtor_id   uuid not null references profiles(id),   -- who owes money by this entry
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR',
  name text not null check (char_length(trim(name)) > 0),  -- e.g. "Pizza", "Concert tickets"
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                                -- soft delete, keeps audit trail
  check (creditor_id <> debtor_id)
);

create index transactions_pair_idx on transactions
  (least(creditor_id, debtor_id), greatest(creditor_id, debtor_id), created_at desc);

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger transactions_set_updated_at
  before update on transactions
  for each row execute function set_updated_at();
```

```sql
-- the overall debt: netted at read time, never stored, can't drift from the log
create view balances as
select
  least(creditor_id, debtor_id)    as user_a,
  greatest(creditor_id, debtor_id) as user_b,
  sum(case when creditor_id = least(creditor_id, debtor_id) then amount else -amount end) as net_amount,
  max(created_at) as last_activity_at
from transactions
where deleted_at is null
group by 1, 2;
-- net_amount > 0  ->  user_a is owed by user_b
-- net_amount < 0  ->  user_b is owed by user_a
-- net_amount = 0  ->  settled up
-- user_a/user_b here are just the pair sorted by uuid for grouping — application
-- code must translate this into "you"/"friend" before showing it to anyone.
```

Why a view and not a maintained running-total column: at the expected scale here (transactions between two
friends, not thousands/day), `sum()` over an indexed pair is effectively instant, and a view can never drift
from the log by definition. Revisit only if this measurably becomes a bottleneck — don't pre-optimize it.

**Single currency for now.** The `currency` column exists so it isn't a migration later, but the `balances`
view intentionally nets across all currencies for a pair as if they were the same unit. Until there's an
actual need for multi-currency, the app should default every transaction to `EUR` and not expose a currency
picker. If that changes, the view needs `group by 1, 2, currency` and the UI needs to show one balance line
per currency instead of one number.

## RLS (same shape as authorization.md, renamed)

```sql
alter table transactions enable row level security;

create policy "transactions visible to participants" on transactions
  for select using (auth.uid() in (creditor_id, debtor_id));

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

create policy "transactions editable by participants" on transactions
  for update using (auth.uid() in (creditor_id, debtor_id));
```

`balances` is a plain view over `transactions`, so it inherits `transactions`' RLS automatically — no separate
policy needed, and it can only ever return rows either party is legitimately part of.

## How direction is expressed in the UI

### Logging a transaction (input)

On a friend's page (`/friends/[friendId]`), the form is always framed from **"me and this one friend"** —
never a global perspective, since that's the only frame the person filling it in actually thinks in.

Fields:
- **Name** — required text, e.g. "Pizza".
- **Amount** — required positive number.
- **Direction** — a two-option segmented control, not a checkbox or free-typed sign, so it's impossible to
  submit with an ambiguous or missing direction:

  ```
  ┌─────────────────┬─────────────────┐
  │  + They owe me   │  − I owe them   │
  └─────────────────┴─────────────────┘
  ```

  - "+ They owe me" selected → on submit: `creditor_id = currentUser`, `debtor_id = friend`.
  - "− I owe them" selected → on submit: `creditor_id = friend`, `debtor_id = currentUser`.
  - Use both a color **and** the +/− glyph **and** the text label together (not color alone) — red/green-only
    is a common accessibility miss for colorblind users. Green + "+" + "They owe me"; red + "−" + "I owe them".
  - No default selection pre-checked; require an explicit choice so nobody accidentally logs the wrong direction
    by leaving a default in place.

### Reading the ledger (output) — always relative to the viewer

Everywhere an amount or balance is shown, it is computed relative to whoever is logged in, never to `user_a`/
`user_b` from the view:

- **Friend page balance header**: compare the friend-pair's `balances.net_amount` sign against
  `auth.uid()`'s position (`user_a` vs `user_b`) to render one of:
  - "**{Friend} owes you {amount}**" — green
  - "**You owe {Friend} {amount}**" — red
  - "**You're settled up**" — neutral gray, no amount
- **Dashboard (home) list**: same computation, one line per friend, so the whole app uses one shared
  `getViewerRelativeBalance(viewerId, friendId)` helper instead of re-deriving the sign in multiple places.
- **Transaction log list** (per entry, newest first): name, amount, Finnish-formatted timestamp, and a small
  +/− badge computed per-row (`creditor_id === viewer ? '+' : '-'`), plus a subtle "added by {name}" line using
  `created_by` — this is the audit trail authorization.md relies on in place of a confirmation step, so it needs
  to actually be visible, not just stored.

## Finnish formatting

Two shared helpers in `src/lib/format.ts`, used everywhere a transaction is rendered — never format ad hoc in
a component, or the date/number style will drift between screens.

```ts
export function formatFinnishDateTime(date: Date): string {
  return new Intl.DateTimeFormat('fi-FI', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  }).format(date);
  // -> "04.08.2026 14.30" (Finnish convention: dd.mm.yyyy, 24h clock)
}

export function formatMoney(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fi-FI', { style: 'currency', currency }).format(amount);
  // -> "12,50 €" (comma decimal separator, € suffix)
}
```

Store every timestamp as `timestamptz` (UTC) in Postgres, as already planned — only convert to Finnish
display format at render time, never in the database or in stored strings.

## Component / build plan (matches structure.md's existing layout)

1. `src/lib/format.ts` — `formatMoney`, `formatFinnishDateTime`, `getViewerRelativeBalance`.
2. Migration: `transactions` table + `set_updated_at` trigger + pair index (SQL above).
3. Migration: `balances` view (SQL above).
4. Migration: RLS policies on `transactions` (SQL above) — `balances` needs none, it inherits.
5. `friends/[friendId]/_components/balance-header.tsx` — viewer-relative balance line, three states (owed /
   owes / settled).
6. `friends/[friendId]/_components/debt-form.tsx` — name + amount + +/− segmented control described above.
7. `friends/[friendId]/_components/debt-list.tsx` — per-row name, `formatMoney`, `formatFinnishDateTime`,
   viewer-relative +/− badge, "added by" attribution.
8. `friends/[friendId]/actions.ts` — `createTransaction` / `updateTransaction` / `deleteTransaction`, each
   resolving the form's +/− choice into `creditor_id`/`debtor_id` before touching the database.
9. Reuse `balance-header`'s viewer-relative logic on the dashboard (`(dashboard)/page.tsx`) so the friend list
   shows the same per-friend balance line.
10. Manual two-account test: log transactions both directions, confirm the sign flips correctly when the same
    row is viewed from each account, and that `balances.net_amount` matches a hand-computed sum.

## Diff this implies for authorization.md

Rename throughout that doc: `debts` table → `transactions`, policy names `"debts ..."` → `"transactions ...".`
The full column list and the `balances` view are now defined here, not duplicated there — authorization.md
should keep only the RLS angle and link here for the schema.

## Open items (not blocking)
- Multi-currency netting — deferred, see the currency note above.
- Whether transaction edits should be time-limited (e.g. only editable within 24h) — still unresolved from
  authorization.md, applies here too since it's the same table.
- Whether the dashboard should show a grand total across all friends, or only per-friend numbers — leaning
  per-friend only for now, since a single summed number across different people isn't actually meaningful
  (owing Alice and being owed by Bob don't net against each other in real life).
