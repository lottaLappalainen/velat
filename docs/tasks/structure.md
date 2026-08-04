# Task: Folder & component structure

Status: **planned, not yet implemented**

## Decisions made
- Feature UI is **colocated** with its route (`_components/`, `actions.ts` next to the `page.tsx` that uses them) rather than centralized in one big `src/components/` folder. Rationale: a debts app has few, non-overlapping features (friends vs. debts vs. profile) — colocation means deleting/changing a feature touches one folder, not a shared junk drawer. Something only gets promoted to `src/components/` once a second route actually needs it.
- `src/components/ui/` stays reserved for **generic shadcn primitives only** (Button, Card, Avatar, etc.) — zero app-specific knowledge, could be copied into an unrelated project as-is.
- Two route groups instead of one flat tree: `(auth)` (login/signup, centered layout, no bottom nav) and `(dashboard)` (everything behind auth, wrapped in `BottomNav`). This **deviates from** authorization.md's illustrative `/app/*` prefix — using a route group keeps URLs clean (`/`, `/friends`, `/profile` instead of `/app`, `/app/friends`) since `middleware.ts` matches on URL path, not folder name. Flagging this as a change from that doc's wording rather than assuming it's fine.
- Bottom nav goes from 4 generic placeholder tabs (Home/Explore/Alerts/Profile) to **3 real ones**: Home (dashboard), Friends, Profile. No "Alerts" tab — pending friend requests live inside the Friends page instead of a separate notifications concept, since nothing in docs/PLAN.md calls for push/alert-style notifications.
- Server Actions (`actions.ts`) are colocated per route, one file per feature (`friends/actions.ts`, `friends/[friendId]/actions.ts`, `profile/actions.ts`) rather than one global `actions/` folder — keeps each mutation next to the table/RLS policy it corresponds to.

## Target structure

```
src/
  middleware.ts                        # session refresh (lib/supabase/middleware) + redirect gate

  app/
    layout.tsx                         # root layout: <html>/<body>, fonts, globals.css
    globals.css

    (auth)/                            # route group — no bottom nav, centered card layout
      layout.tsx
      login/page.tsx
      signup/page.tsx

    auth/
      callback/route.ts                # exchanges email-confirmation code for a session

    (dashboard)/                       # route group — authenticated shell, wraps BottomNav
      layout.tsx                       # renders <BottomNav>; belt-and-suspenders auth check
      page.tsx                         # "/" — friend list + net balance per friend
      friends/
        page.tsx                       # add-friend form + pending request inbox
        actions.ts                     # sendFriendRequest / acceptRequest / declineRequest
        _components/
          add-friend-form.tsx
          request-inbox.tsx
        [friendId]/
          page.tsx                     # one friend: balance + debt history + add-debt form
          actions.ts                   # createDebt / editDebt / deleteDebt
          _components/
            balance-header.tsx
            debt-list.tsx
            debt-form.tsx
      profile/
        page.tsx
        actions.ts                     # updateProfile / uploadAvatar
        _components/
          profile-form.tsx
          avatar-uploader.tsx

  components/
    ui/                                 # shadcn primitives only (existing: button, card, badge,
                                         # avatar, list, separator, skeleton)
    layout/
      bottom-nav.tsx                    # existing — tabs become Home / Friends / Profile

  lib/
    supabase/
      client.ts                         # browser client (anon key)
      server.ts                         # server client, cookies() from Next
      middleware.ts                     # session-refresh helper, imported by src/middleware.ts
    utils.ts                            # cn() — existing

  types/
    database.ts                         # Supabase-generated types (`supabase gen types typescript`)
```

## Cleanup this implies
- Delete the placeholder pages that don't map to any real feature: `src/app/explore/`, `src/app/notifications/`, `src/app/billing/`, `src/app/settings/`. Keep `src/app/profile/` conceptually but it moves under `(dashboard)/profile/`.
- Root `page.tsx` (currently a "style playground") becomes the real dashboard.

## Not yet decided (raise before/while implementing)
- Where Zod (or similar) validation schemas for forms live — colocated per feature (`_components/schema.ts`) vs. a shared `lib/validation/`. Low-stakes, decide when the first form is built.
- Whether `(dashboard)/layout.tsx` does its own `redirect()` on missing session, or trusts `middleware.ts` entirely — leaning toward both (defense in depth), same posture authorization.md already takes for RLS vs. app-code checks.
