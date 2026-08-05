# Build order

Sequencing across [tasks/structure.md](tasks/structure.md), [tasks/authorization.md](tasks/authorization.md), and
[tasks/debt-ledger.md](tasks/debt-ledger.md). Each of those docs has its own internal build order for its slice;
this is the order to move *between* them, based on what actually depends on what. Do phases top to bottom —
later phases assume everything above them exists.

## Phase 0 — Folder & component structure ✅ (needs a small follow-up)
**From:** structure.md, entire doc.
Reorganize routes into `(auth)`/`(dashboard)` groups, delete placeholder pages, put shell layouts in place
(can be empty/stubbed). Do this **first, before any feature code**, so nothing gets written into the old flat
structure and then has to be moved. Nothing here touches Supabase or the database.

Shipped with 2 tabs (Home, Profile) and no `transactions/` route, before
[transactions-ui.md](tasks/transactions-ui.md) existed. Small follow-up needed, not a redesign: add a
`transactions/` route stub and a third `NAV_ITEMS` entry in `bottom-nav.tsx` — fold this into Phase 5 rather
than reopening Phase 0, since it's the same change either way.

**Done when:** route groups exist with stub `page.tsx` files, `BottomNav` shows 3 real tabs (Home,
Transactions, Profile), old placeholder routes are gone.

## Phase 1 — Supabase plumbing
**From:** authorization.md, "Next.js integration" + "Supabase project configuration" sections.
- Supabase dashboard: enable email auth with **"Confirm email" turned off** (instant session on signup, no
  email-link step), leaked-password protection, min password length. (Manual, one-time, not code.)
- `src/lib/supabase/{client,server,proxy}.ts` + root `src/proxy.ts` (Next.js 16 renamed `middleware.ts` →
  `proxy.ts` — same behavior, new file/export name).

Nothing to test yet in the browser (no tables, no auth pages) — this phase is infrastructure only.

**Status: code done** — `client.ts`, `server.ts`, `lib/supabase/proxy.ts`, and root `src/proxy.ts` all exist
and type-check/lint clean. Only the manual, one-time Supabase dashboard configuration (email auth with
"Confirm email" off, leaked-password protection, min password length, ~7-day session lifetime) remains.

**Done when:** proxy runs without error on every route (it'll just always treat everyone as unauthenticated
until Phase 3 exists) — true as of the code above, not yet exercised against a real session.

## Phase 2 — Database schema, in dependency order
**From:** authorization.md ("Database schema") + debt-ledger.md ("Schema" + "RLS").
Apply as one migration pass, in this exact order since later tables reference earlier ones:
1. `profiles` table + `handle_new_user` trigger.
2. `friendships` table + unique pair index.
3. `transactions` table + `set_updated_at` trigger + pair index (debt-ledger.md).
4. `balances` view (debt-ledger.md).
5. `transaction_presets` table + index (debt-ledger.md, "Saved presets") — depends only on `profiles`, so it
   could technically move earlier, but grouping it here keeps all transaction-related schema together.
6. RLS: enable on `profiles`, `friendships`, `transactions`, `transaction_presets` and add every policy from
   both docs. `balances` needs no policy — it inherits from `transactions`.
7. Storage: `avatars` bucket + path-scoped policy (authorization.md).

Doing schema in one pass instead of interleaved with UI work (e.g. "profiles table, then profile page, then
friendships table, then friends page...") means RLS can be sanity-checked against the full schema at once via
the Supabase SQL editor, before any app code exists to mask a bad policy.

SQL for all 7 steps is drafted in `supabase/migrations/20260804120000_initial_schema.sql`, in this exact
order. **Not yet applied** — there's no live Supabase project linked (`.env` is still empty). Once a project
exists, either paste the file into the SQL editor or `supabase link` + `supabase db push`.

**Done when:** all tables/views/policies exist in Supabase; a hand-written test insert as two different
`auth.uid()`s (via SQL editor "run as user") confirms the RLS boundaries from both docs.

## Phase 3 — Auth UI
**From:** authorization.md, remainder of "Build order" steps 2 and 6 (test pass deferred to Phase 7).
Signup/login pages in `(auth)/`, `/auth/callback` route, logout Server Action. Wire the root `src/proxy.ts`
redirect logic (Phase 1) against real session state now that there's something to redirect to/from.

**Status: code done** — `(auth)/login/page.tsx` and `(auth)/signup/page.tsx` call the browser Supabase client
directly (no Server Action needed for plain sign-in/sign-up, per login-profile-ui.md); `/auth/callback/route.ts`
exchanges the PKCE code for a session; `(dashboard)/actions.ts` has the `logout` Server Action, wired to a
placeholder button in `(dashboard)/layout.tsx` until Phase 4 gives it a real home on the Profile page. All of
it type-checks/lints clean and the pages render correctly against the live dev server. Both forms fail closed
(clean error message, not a stuck disabled button) if the Supabase client throws — which it currently does,
since Phase 2's blocker (no live project) applies here too.

**Done when:** you can sign up and land directly on the (still-empty) dashboard — no email confirmation step,
`signUp` returns a session immediately — and log out.

## Phase 4 — Profile
**From:** [tasks/login-profile-ui.md](tasks/login-profile-ui.md), entire doc.
One page now covers what used to be two phases: identity (username, avatar), password change, and all friend
handling (search, send request, accept/decline incoming) — friend requests live on the Profile page, there's no
separate Friends route. This has to land before the debt ledger UI, since `transactions` inserts are RLS-gated
on an *accepted* friendship existing — there's nothing to test debt logging against until two test accounts can
actually become friends.

**Status: code done** — `profile/page.tsx` and all five `_components/` (avatar-uploader, username-form,
password-form, friend-search, friend-request-inbox) plus `profile/actions.ts` exist, type-check/lint clean,
build clean. `respondToFriendRequest` adds an app-level check beyond RLS (only the addressee can accept/
decline — the simple RLS policy alone permits either participant to update the row). Logout button moved here
from its Phase 3 placeholder in `(dashboard)/layout.tsx`.

**Done when:** a logged-in user can change their username/photo/password, and two test accounts can send,
accept, and see each other as friends via the Profile page — not yet exercised for real, same missing-project
blocker as Phases 2-3. `friend-search.tsx`'s two-query relationship lookup (search results, then a `.or()`
filter over `friendships`) is untested SQL and worth double-checking first once a project exists.

## Phase 5 — Debt ledger UI
**From:** debt-ledger.md, "Component / build plan" (all steps, now includes presets); [homepage-ui.md](tasks/homepage-ui.md) for the
home page; [transactions-ui.md](tasks/transactions-ui.md) for the global log page, preset picker, and the third nav tab.
- `src/lib/format.ts` (`formatMoney`, `formatFinnishDateTime`, `getViewerRelativeBalance`).
- `(dashboard)/_lib/get-presets.ts` and `(dashboard)/_lib/transaction-actions.ts`: `createTransaction` /
  `updateTransaction` / `deleteTransaction` / `savePreset` / `deletePreset` — shared by both pages below,
  build this first since neither page's form works without it.
- `(dashboard)/_components/transaction-row.tsx` and `preset-picker.tsx` (shared), and `balance-header.tsx`,
  `debt-form.tsx` on the friend detail page (`friends/[friendId]/`) — `debt-form.tsx` uses `preset-picker.tsx`
  too.
- Home page (`(dashboard)/page.tsx`): two totals ("you are owed" / "you owe") + per-friend balance list.
- Transactions page (`(dashboard)/transactions/page.tsx`): global cross-friend log + `friend-picker.tsx` and
  `preset-picker.tsx` for the add-transaction form; add the `transactions/` route stub and third
  `bottom-nav.tsx` tab here too (the Phase 0 follow-up noted above).

This is last among the feature phases because it's the only one that depends on *both* prior features
(accepted friendship from Phase 4, RLS + schema from Phase 2) rather than just infrastructure.

**Status: code done** — `src/lib/format.ts`; `(dashboard)/_lib/{get-friend-balances,get-presets,
transaction-actions}.ts`; shared `_components/{preset-picker,transaction-row,totals-header,friend-row}.tsx`;
`friends/[friendId]/page.tsx` + its `balance-header`/`debt-list`/`debt-form`; home `(dashboard)/page.tsx`;
`transactions/page.tsx` + `friend-picker`/`add-transaction-form`; third `bottom-nav.tsx` tab. All type-check/
lint clean, build produces the full route table, and unauthenticated requests correctly redirect on every new
route (verified against the live dev server). `updateTransaction`/`deleteTransaction` exist in
`transaction-actions.ts` as the doc's build plan asks for, but nothing in homepage-ui.md or transactions-ui.md
specifies a UI to trigger them — left unwired rather than inventing an interaction neither doc asked for.

**Done when:** a transaction logged from either account (from either page) shows the correct opposite sign on
the other account, the dashboard list matches the friend-page balance, the same entry appears in the global
Transactions log, and a saved preset fills the form correctly from both pages — not yet exercised for real,
same missing-project blocker as Phases 2-4. The multi-query joins in `get-friend-balances.ts` and the
`transactions/` page's counterparty resolution are the most SQL-heavy code in the app so far and deserve the
closest look first.

## Phase 6 — Categories + Dashboard
**From:** [categories-dashboard.md](tasks/categories-dashboard.md), entire doc.
Adds a `categories` table, a required `category_id` on `transactions` (with an extended insert policy checking
it belongs to the debtor), and a new `/dashboard` page with month/year/all-time spending-by-category stats,
computed live (no stored aggregate — same reasoning as the `balances` view). Comes after Phase 5, not alongside
it, because it adds a column and tightens the insert policy on a table Phase 5 already built, and reuses the
friend-visibility pattern established there.

**Done when:** logging a transaction (from either page, in either direction, including on a friend's behalf)
requires picking a category and succeeds; `/dashboard` shows the current month's per-category totals by
default and correctly reflects prev/next month, year mode, and all-time.

## Phase 7 — End-to-end pass
**From:** the "manual test" step at the end of authorization.md, debt-ledger.md, and categories-dashboard.md,
combined into one pass instead of three, since by now all three are exercisable together.
Two test accounts, full journey: sign up (lands straight in the app, no email confirmation) → edit profile → friend request → accept → log
transactions both directions (saving one as a preset, then reusing it; one transaction logged on the other
account's behalf, to exercise category cross-visibility) → confirm balances/signs are correct on both accounts
→ confirm both accounts' Dashboard totals match what was actually logged → confirm account A can never
read/write anything belonging to a third account C (profile edits, pending requests, transactions, presets,
categories) — including confirming A can see *only* categories owned by its actual friends, never C's.

**Done when:** this passes with no RLS errors surfaced to the UI and no incorrect balance/sign/category total.

**Superseded by automation, once built:** [tasks/testing-ci.md](tasks/testing-ci.md) plans a Playwright suite
that runs exactly this journey (plus negative/authorization cases) against a fresh local Supabase stack on
every PR — once `friends.spec.ts` + `transactions.spec.ts` + `authorization.spec.ts` exist and pass in CI,
this phase is satisfied by the pipeline instead of a human running through it once.

## Testing & CI/CD (cross-cutting, not a numbered phase)
**From:** [tasks/testing-ci.md](tasks/testing-ci.md), entire doc.
Vitest for pure logic (already-existing `calc.ts`/`format.ts`/`direction.ts`), Playwright E2E covering Phases
0-5's flows now and Phase 6's once built, GitHub Actions (`lint` → `unit` → `build` → `e2e`) required to pass
before merging to `main`. Can start now — doesn't wait on Phase 6 or on the real Supabase project being set up,
since CI runs against its own ephemeral local Supabase stack, not the friend's account.

**Status: planned only**, nothing implemented yet.

## Not in this roadmap
Everything each task doc lists under its own "Open items" (multi-currency, edit time limits, etc.) — those are
deliberately deferred past the first working version, not sequenced here.
