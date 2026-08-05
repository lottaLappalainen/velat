-- Phase 6 (docs/ROADMAP.md) — categories, applied as a proper incremental migration
-- on top of the already-live 20260804120000_initial_schema.sql (see docs/PLAN.md's
-- "Live project status" — real users and transactions already exist, so this can't
-- just be folded into that file the way it could have been pre-launch).
-- Source of truth: docs/tasks/categories-dashboard.md.

-- =========================================================================
-- 1. categories — required on every transaction
-- =========================================================================
-- Belongs to owner_id (the *debtor* on any transaction using it, not
-- necessarily whoever created it — see categories-dashboard.md, "whose
-- category is it?"). created_by is an audit column: a friend can create one
-- on the owner's behalf, mirroring how transactions itself already lets
-- either participant act.
create table categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  name text not null check (char_length(trim(name)) > 0),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- case-insensitive per-owner uniqueness — two categories both named "Food"
-- (or "food") would silently split one person's stats across two rows
create unique index categories_owner_name_unique_idx on categories (owner_id, lower(name));

alter table categories enable row level security;

-- visible to the owner OR an accepted friend of the owner (not owner-only,
-- unlike transaction_presets) — see categories-dashboard.md, "whose category
-- is it?" No update/delete policy: no rename/delete in v1, enforced here,
-- not just missing from the UI.
create policy "categories visible to owner or accepted friend" on categories
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and least(f.requester_id, f.addressee_id) = least(owner_id, auth.uid())
        and greatest(f.requester_id, f.addressee_id) = greatest(owner_id, auth.uid())
    )
  );
create policy "categories insertable by owner or accepted friend" on categories
  for insert with check (
    created_by = auth.uid()
    and (
      auth.uid() = owner_id
      or exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and least(f.requester_id, f.addressee_id) = least(owner_id, auth.uid())
          and greatest(f.requester_id, f.addressee_id) = greatest(owner_id, auth.uid())
      )
    )
  );

-- =========================================================================
-- 2. transactions.category_id — added nullable, backfilled, then tightened
-- =========================================================================
-- Real transactions already exist (see docs/PLAN.md), so this can't go
-- straight to `not null` the way it could have pre-launch — existing rows
-- would violate the constraint immediately.
alter table transactions add column category_id uuid references categories(id);

-- Backfill: one "Uncategorized" category per distinct debtor_id that already
-- has transactions, owned by (and attributed to) that debtor. Every
-- pre-existing transaction is permanently attributed to this bucket — there's
-- no rename/retag UI (categories-dashboard.md, "no rename or delete in v1"),
-- so anyone who wants their historical spending properly categorized will
-- need that built later. Known, accepted trade-off, not an oversight.
insert into categories (owner_id, name, created_by)
select distinct t.debtor_id, 'Uncategorized', t.debtor_id
from transactions t;

update transactions t
set category_id = c.id
from categories c
where t.category_id is null
  and c.owner_id = t.debtor_id
  and c.name = 'Uncategorized';

-- Now safe: every existing row has a category_id.
alter table transactions alter column category_id set not null;

-- accelerates the Dashboard's "my spending" query (single-user, date-ranged)
-- — a different access pattern than transactions_pair_idx, which is built
-- for two-person ledger lookups
create index transactions_debtor_idx on transactions (debtor_id, created_at) where deleted_at is null;

-- =========================================================================
-- 3. Tighten the transactions insert policy
-- =========================================================================
-- Postgres has no "alter policy ... add condition" — drop and recreate with
-- the one extra check: category_id must actually belong to the debtor.
drop policy "transactions created by a participant who is a friend" on transactions;

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
    and exists (select 1 from categories c where c.id = category_id and c.owner_id = debtor_id)
  );
