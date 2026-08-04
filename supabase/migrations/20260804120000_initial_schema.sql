-- Phase 2 (docs/ROADMAP.md) — initial schema, applied as one pass in dependency order.
-- Source of truth for each block: docs/tasks/authorization.md and docs/tasks/debt-ledger.md.
-- Run this against a fresh Supabase project via the SQL editor, or `supabase db push`
-- once the project is linked (see README for setup).

-- =========================================================================
-- 1. profiles — 1:1 with auth.users (docs/tasks/authorization.md)
-- =========================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- case-insensitive uniqueness: "Alice" and "alice" are the same account
create unique index profiles_username_unique_idx on profiles (lower(username));

-- auto-create a profile row when someone signs up
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================================
-- 2. friendships (docs/tasks/authorization.md)
-- =========================================================================
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

-- =========================================================================
-- 3. transactions — the log (docs/tasks/debt-ledger.md)
-- =========================================================================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  creditor_id uuid not null references profiles(id),   -- who is owed money by this entry
  debtor_id   uuid not null references profiles(id),   -- who owes money by this entry
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR',
  name text not null check (char_length(trim(name)) > 0),  -- e.g. "Pizza"
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

-- =========================================================================
-- 4. balances — the derived, netted total (docs/tasks/debt-ledger.md)
-- =========================================================================
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
-- application code translates user_a/user_b into "you"/"friend" before display

-- =========================================================================
-- 5. transaction_presets — personal quick-fill shortcuts (docs/tasks/debt-ledger.md, "Saved presets")
-- =========================================================================
create table transaction_presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  name text not null check (char_length(trim(name)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

create index transaction_presets_owner_idx on transaction_presets (owner_id, created_at desc);

-- =========================================================================
-- 6. Row Level Security — default deny, then only these policies
-- =========================================================================
alter table profiles enable row level security;
alter table friendships enable row level security;
alter table transactions enable row level security;
alter table transaction_presets enable row level security;

-- profiles: readable by any authenticated user, writable only by the owner
create policy "profiles readable by authenticated" on profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles editable by owner" on profiles
  for update using (auth.uid() = id);

-- friendships: only the two people involved can see/act on the row
create policy "friendships visible to participants" on friendships
  for select using (auth.uid() in (requester_id, addressee_id));
create policy "friendships created by requester" on friendships
  for insert with check (auth.uid() = requester_id);
create policy "friendships updated by participants" on friendships
  for update using (auth.uid() in (requester_id, addressee_id));

-- transactions: only the two people on the entry can see it; either can log
-- one involving themselves, but only if they're accepted friends
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
-- balances is a plain view over transactions — inherits its RLS, needs no policy of its own

-- transaction_presets: owner-only in every direction, never shared with a friend
create policy "presets visible to owner" on transaction_presets
  for select using (auth.uid() = owner_id);
create policy "presets insertable by owner" on transaction_presets
  for insert with check (auth.uid() = owner_id);
create policy "presets editable by owner" on transaction_presets
  for update using (auth.uid() = owner_id);
create policy "presets deletable by owner" on transaction_presets
  for delete using (auth.uid() = owner_id);

-- =========================================================================
-- 7. Storage — avatar photos (docs/tasks/authorization.md)
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- public read chosen over signed-URL: avatar photos aren't sensitive (authorization.md)
create policy "avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

-- path convention: {user_id}/avatar.<ext> — a user may only write under their own prefix
create policy "users can upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "users can update their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "users can delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
