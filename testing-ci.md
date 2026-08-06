# Task: End-to-end testing (Playwright) + CI/CD

Status: **planned, not yet implemented**

Scope: a testing strategy for the whole app (not just E2E — see "Other testing worth having" below) plus a
GitHub Actions pipeline that blocks merging to `main` until it's green. Cross-cutting: unlike the other task
docs, this doesn't belong to one ROADMAP phase — it can start covering Phases 0-5 immediately, and picks up
Phase 6 (Categories + Dashboard) once that ships.

## Decisions made

- **Test runner split**: Vitest for pure logic, Playwright for everything that touches the browser or the
  database. Not one tool for both — see "Other testing worth having" for why a third layer (component tests)
  is deliberately *not* included.
- **CI runs against a fresh local Supabase stack, not the real project.** GitHub-hosted runners have Docker
  preinstalled (this sandbox didn't, which is why Phase 2's RLS check had to happen manually) — `supabase
  start` gives a full ephemeral Postgres+Auth+Storage+PostgREST stack per CI run, migrated from
  `supabase/migrations/`, thrown away after. This means **zero cloud secrets are needed for CI** — nothing
  from the friend's real Supabase account (see memory: Supabase ownership) ever needs to be typed into GitHub
  Secrets. That account is explicitly out of scope for automated testing.
- **Playwright's automated E2E suite supersedes ROADMAP.md's Phase 7** ("End-to-end two-account test pass,"
  currently a manual checklist). Once `friends.spec.ts` + `transactions.spec.ts` exist and pass in CI, Phase 7
  is satisfied by the pipeline instead of a human running through it once. Update ROADMAP.md's Phase 7 wording
  to point here once this is built — not done yet, this doc is the plan, not the implementation.
- **Mobile viewport only for Playwright**, not desktop+mobile. The whole UI is built mobile-first
  (`max-w-md` root container, bottom tab nav) — testing a desktop viewport would be testing a layout nobody
  actually uses. Playwright's built-in `Pixel 5` (or similar) device preset is enough; revisit only if a
  desktop layout is ever actually built.

## Other testing worth having (beyond what was asked)

### Unit tests (Vitest) — the highest-value-per-minute addition here
Pure functions with real, easy-to-get-subtly-wrong logic, currently covered by nothing:

- **`src/lib/calc.ts`** (`evaluateAmountExpression`, `isOperatorChar`) — hand-rolled arithmetic parser (operator
  precedence, malformed input, division by zero, trailing operators, comma/×/÷ normalization). This is exactly
  the kind of code that looks right, isn't, and nobody notices until a real amount comes out wrong. Table-driven
  tests: `"12,50+8×2"` → `28.5`, `"5÷0"` → `null`, `"12+"` → `null`, `"+5"` → `null`, `""` → `null`, etc.
- **`src/lib/format.ts`** (`getViewerRelativeBalance`, `getBalanceTone`, `formatMoney`, `formatFinnishDateTime`)
  — the sign-convention translation is the one piece of logic this entire app's trustworthiness rests on
  (docs/tasks/debt-ledger.md's "store facts, never store +/-"). Both directions, the zero/settled case, and
  both possible `user_a`/`user_b` orderings need explicit cases — this is cheap to get to 100% coverage and
  expensive to get wrong silently.
- **`src/app/(dashboard)/_lib/direction.ts`** (`resolveParticipants`) — the other half of the same sign
  translation, in the opposite direction (form choice → storage fact). Was pulled out of the "use server"
  `transaction-actions.ts` specifically so it's a plain, directly-importable function — exactly what makes it
  easy to unit test now instead of only reachable through a Server Action.
- Any future pure helper (e.g. a client-side category-totals aggregator, if Phase 6 ends up needing one)
  should get the same treatment before it gets a component wrapped around it.

**Not** covered by unit tests: anything that touches `supabase.from(...)` — those are integration-shaped, not
unit-shaped, and Playwright already exercises them against a real (local) database, which is more honest than
mocking the Supabase client would be.

### Component tests (React Testing Library) — deliberately skipped
Considered and rejected for now: Playwright already drives every interactive component (`SegmentedControl`,
`AmountInput`, `PresetPicker`, the friend/preset pickers) in a real browser against real data, which is a
strictly more realistic test than mounting them in isolation with mocked props. A dedicated RTL layer here
would mostly duplicate E2E coverage for extra maintenance cost. Revisit only if a specific component grows
logic that's genuinely awkward to reach via a full page flow — none currently do, since `AmountInput`'s actual
arithmetic is already isolated in `calc.ts` and unit-tested there.

### RLS tests below the app layer — deliberately not a separate suite
Every RLS boundary in `supabase/migrations/20260804120000_initial_schema.sql` is already exercised indirectly
by the Playwright authorization spec (below) — logging in as user C and confirming they can't reach user A/B's
data *through the app* is the same policy, exercised the way it'll actually be hit in production. A separate
pgTAP suite would test the same policies a second time through a different door. Skip unless a policy bug ever
slips through the app-level test undetected (i.e. only add this layer reactively, not preemptively).

## Directory structure

```
tests/
  unit/
    calc.spec.ts
    format.spec.ts
    direction.spec.ts
  e2e/
    support/
      api.ts              # service-role helpers: createUser, createFriendship, cleanup — see below
      fixtures.ts          # Playwright test fixtures: two logged-in users per test, auto-cleanup
    auth.spec.ts
    profile.spec.ts
    friends.spec.ts
    transactions.spec.ts
    authorization.spec.ts  # negative tests — the RLS-via-UI checks described above
vitest.config.ts
playwright.config.ts
```

## Playwright specs, mapped to what already exists

Each spec below corresponds to a "Done when" criterion already written (but never automated) in ROADMAP.md or
a task doc — this is formalizing existing intent, not inventing new scope.

- **`auth.spec.ts`**: sign up (unique email+username) → lands directly on the dashboard (no email-confirm step,
  per authorization.md's current decision) → log out → log back in → lands on dashboard. Plus: short-username
  and weak-password validation errors, wrong-password login shows the generic (non-enumerating) error message.
- **`profile.spec.ts`**: change username (success case + "taken" collision case using a second seeded user),
  upload an avatar (a fixture image file), change password.
- **`friends.spec.ts`** (two browser contexts = two logged-in users): A searches for B by username, sends a
  request; B sees it in the incoming inbox, accepts; both now see each other in their Friends list; A's search
  for B now shows "Friends" instead of "Send request."
- **`transactions.spec.ts`** (two contexts): A logs "+ B owes me 12,50" on the friend page; B's *own* view of
  the same relationship shows "You owe A 12,50 €" — the opposite-sign assertion is the actual point of this
  test, not just "a row appeared." Then: Home totals update for both, the global Transactions page shows the
  entry with the correct counterparty for each viewer, saving-a-preset + tapping it prefills correctly.
- **`authorization.spec.ts`** (three contexts: A, B, and unrelated C): C navigating directly to
  `/friends/<A's-id>` without an accepted friendship gets the app-level 404 (`friends/[friendId]/page.tsx`'s
  guard), not a leaked balance. Unauthenticated requests to `/`, `/profile`, `/transactions`, `/friends/x`
  redirect to `/login`; authenticated requests to `/login`/`/signup` redirect to `/`.
- **(Once Phase 6 ships)** `categories.spec.ts` / extend `transactions.spec.ts`: category is required to log a
  transaction, a friend can create a category on the debtor's behalf, Dashboard totals match hand-computed sums
  for a seeded set of transactions.

## Test data strategy

- Every CI run gets a **brand-new local Supabase stack** (`supabase db reset` right after `supabase start`,
  migrated from scratch) — no shared mutable state between runs, so nothing can flake from a previous run's
  leftovers.
- `tests/e2e/support/api.ts` wraps the Auth Admin API + service-role REST calls (the same technique used to
  manually create the `rlstesta`/`rlstestb` test accounts earlier — see chat history) into reusable helpers:
  `createTestUser(username)`, `createFriendship(userA, userB)`, `cleanupUser(userId)`. Tests that need
  "already friends" state as a *precondition* (e.g. `transactions.spec.ts`) call `createFriendship` directly
  instead of re-driving the whole friend-request UI flow every time — Playwright best practice is to only
  drive the UI for the thing a given test is actually verifying, and use API shortcuts for setup.
- `tests/e2e/support/fixtures.ts` extends Playwright's `test` with a `twoUsers` fixture (two authenticated
  `page`s, cleaned up after) so most specs don't repeat login boilerplate.

## Playwright config specifics

- `testDir: './tests/e2e'`, `use: { baseURL: 'http://localhost:3000', ...devices['Pixel 5'] }`.
- `webServer`: starts `npm run build && npm run start` against the local Supabase env vars (production build,
  not `next dev` — closer to what actually ships, and avoids dev-mode HMR noise in CI).
- `retries: 2` on CI, `0` locally; trace/video/screenshot `on-first-retry` only, to keep artifacts small.
- Single `chromium` (mobile emulation) project. Add Firefox/WebKit only if a real cross-browser bug ever shows
  up — not preemptively.

## GitHub Actions pipeline (`.github/workflows/ci.yml`)

Repo already has a real GitHub remote (`lottaLappalainen/velat`), so this is a normal Actions setup, not a
hypothetical. Triggers: `pull_request` targeting `main` (this is the check branch protection will require);
`push` to `main` as a post-merge sanity check.

Jobs (ordered so the fastest, cheapest checks fail first):

1. **`lint`** — `npm ci`, `npm run lint`. Seconds, no build needed — first thing to fail on a bad PR.
2. **`unit`** — `npm ci`, `npm run test:unit` (Vitest). No Supabase needed at all.
3. **`build`** — `npm ci`, `npm run build`. This is also the TypeScript check (`next build` type-checks as
   part of building) — no separate `tsc --noEmit` step needed.
4. **`e2e`** — depends on `build` passing first (no point spinning up Supabase for a build that's broken):
   - `supabase/setup-cli` action (or `npm i -g supabase`) → `supabase start` → `supabase db reset` (applies
     `supabase/migrations/` fresh).
   - `npm ci`, `npx playwright install --with-deps chromium`.
   - Local Supabase's fixed dev URL/anon/service keys (printed by `supabase status`, same every run — genuinely
     not secret, they're Supabase's well-known local defaults) go into `.env` for the test run.
   - `npm run build && npm run test:e2e` (Playwright's own `webServer` handles starting `next start`).
   - `actions/upload-artifact` for the Playwright HTML report, `if: failure()` — so a failing PR's report is
     downloadable instead of having to reproduce locally blind.

Node version: pin to **22** (`actions/setup-node@v4`, `node-version: 22`) to match local dev (`node --version`
here is 22.20.0) — no need for a version matrix unless a real compatibility question comes up.

## Branch protection (GitHub repo setting, not a file)

This part isn't code — it's a setting in the GitHub UI (or one `gh api`/`gh ruleset` call, if you'd rather I
run it once the workflow above actually exists and has gone green at least once):

1. Settings → Branches → Branch protection rules → add a rule for `main`.
2. **Require a pull request before merging** (disables direct pushes to `main`).
3. **Require status checks to pass before merging** → select `lint`, `unit`, `build`, `e2e` (once they've run
   at least once, GitHub will list them as selectable).
4. **Require branches to be up to date before merging** — avoids merging a PR whose CI ran against a
   now-stale `main`.

I won't turn this on myself without being asked — it's a repo-wide setting that affects how everyone merges,
not just this branch.

## Build order

1. Vitest + `calc.spec.ts` + `format.spec.ts` + `direction.spec.ts` — no infrastructure needed, can be done and verified right now,
   today, independent of everything else in this doc.
2. `playwright.config.ts` + install + a trivial smoke spec (e.g. "the login page renders") to prove the
   `webServer` wiring works, before writing real specs against it.
3. `supabase start` + `db reset` scripted locally first — **needs Docker**, which this sandbox doesn't have
   (same blocker noted for Phase 2's local verification). This step needs to be verified on a machine with
   Docker before trusting it in CI.
4. Write the five E2E specs, in the order listed above (each depends on the previous one's flow existing).
5. `.github/workflows/ci.yml` with all four jobs.
6. First green run on a real PR, then flip on branch protection (step above).

## Open items (not blocking)

- Visual regression testing (Playwright screenshot comparison) — not requested, and this app's visual surface
  is still moving fast (see the ongoing DESIGN_SYSTEM.md work); premature until the UI stabilizes.
- Load/performance testing — not relevant at this app's expected scale (see debt-ledger.md's and
  categories-dashboard.md's own "computed live, not stored" reasoning — the same "we're nowhere near needing
  this" logic applies here).
- Whether `push` to `main` should also deploy somewhere (Vercel, etc.) — no deployment target has been decided
  yet; out of scope for this doc, which is purely "block bad merges," not "ship good ones."
