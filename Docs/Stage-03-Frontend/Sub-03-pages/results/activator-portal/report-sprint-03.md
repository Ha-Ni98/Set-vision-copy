---
sprint: 3
title: Assembly & Wiring — Login + Dashboard + History
status: ✅ Done
commit: TBD
---

# Sprint 3 Report — Assembly & Wiring (Login + Dashboard + History)

## Work done

This sprint's premise was that Login/Dashboard/History's core wiring already existed from the pre-existing MVP — so the actual work was a verification-and-gap-filling pass rather than building wiring from scratch. That premise held: all three pages already called their real hooks (`useLogin` via `useAuth`, `useMyStats`, `useRecentActivations`, `useMyHistory`). Three concrete gaps surfaced under scrutiny against the plan/spec, all fixed:

### Dashboard — missing 4th stat card (`creditsBalance`)
The plan's D2 section calls for 4 `StatCard`s: Total Earnings, **Balance Owed** (`creditsBalance`), Total Activations, Avg Time. The existing code only rendered 3 — `creditsBalance` exists on `ActivatorDashboardDTO` but had never been wired to any UI element anywhere in the frontend (confirmed via a repo-wide grep). Added the missing card (`Wallet` icon, `formatDZD`), re-gridded the stat row and its loading skeleton from `md:grid-cols-3` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (matching the `sm:grid-cols-2 lg:grid-cols-4` pattern already used elsewhere in the codebase, e.g. `StatsRow.tsx`), and added a new i18n key `activator.dashboard.balanceOwed`.

### Dashboard — missing retry action on error
`DashboardPage`'s `NotFoundState` for the error branch had no `action` prop at all, unlike every other page's error state (including this same portal's `HistoryPage`, both sections). Sprint 3's own validation line explicitly requires "retry ⇒ refetch." Destructured `refetch` from `useMyStats()` and wired it into a `common.actions.tryAgain` button.

### History Section B — search wasn't actually debounced
The plan explicitly names `useDebouncedValue` for the search filter (D3), and the hook already exists and is used by 8 other pages in this codebase — but Sprint 2's `HistoryPage` rewrite wired the raw `q` state straight into the query's `useMemo`, firing one `my-history` request per keystroke. Fixed by debouncing the value before it enters the query; `hasFilters`/`clearFilters` still read the raw `q` (matching the established convention in `pages/admin/activations/ActivationsPage.tsx`, where the "any filter active" check also intentionally reads the un-debounced input).

### History Section A — no on-focus refetch
The plan's D3 wording for Global Recent is explicit: "live via socket + on-focus." Socket invalidation already existed (`activation:resolved` → `qk.activations.recent()`), but the app's `QueryClient` sets `refetchOnWindowFocus: false` globally, and nothing overrode it for this query. Added `refetchOnWindowFocus: true` directly on `useRecentActivations` — the only query in the app where this matters, since Global Recent has no per-viewer filter to go stale against and every other page's "freshness" story already rests entirely on socket invalidation.

## Decisions & deviations

### Status filter stays a flat 10-value dropdown, not 5 folded chips
The plan's D3 wording describes chips "All/Activated/Cancelled-by-me/Removed/Frozen-or-admin-resolved" — several of which fold multiple raw `ActivationStat` values into one UI option. `GetActivatorHistoryQuery.status` accepts exactly one `ActivationStat` (no array/OR support in the contract), so a folded chip can't be expressed as a single, fully-faithful server-side filter — the only ways to approximate it are (a) silently pick one of the folded states and miss the others, or (b) filter client-side across the already-paginated result set, which would desync the visible rows from the server's own `meta.total`/`totalPages`. The pre-existing implementation (inherited unmodified from the MVP, not touched by Sprint 2 either) instead exposes all 10 raw enum values 1:1 through a `Select`. This is a transparent, contract-faithful choice, not a broken wire, so it's recorded here as a carried-forward deviation rather than raised as a blocking question — the underlying constraint is a fixed fact about the query shape, not a design preference to weigh.

## Validation results
- `npm run check` (both `tsconfig.json`/`tsconfig.test.json`) ✅ clean.
- `npx vitest run` ✅ 54/54 files, 392/392 tests green (no test yet exists for these 3 pages — that's Sprint 6's job — so this is confirming no regression).
- `npx eslint` scoped to the 4 touched files (`DashboardPage.tsx`, `HistoryPage.tsx`, `useRecentActivations.ts`, `translations.json`) — 0 errors (the `translations.json` "no config" warning is expected/harmless, JSON isn't linted).
- **Live browser verification** via Playwright against the real dev API (not just a read-through): bad password on `/login` → inline "Incorrect username or password." error, URL stays on `/login`; correct credentials → redirects to `/dashboard`; Dashboard renders all 4 stat cards including the new "Balance Owed" card at "0 DZD"; History search — typed 3 characters quickly, confirmed via request-count instrumentation that exactly **1** `my-history` request fired (not 3), proving the debounce actually coalesces keystrokes; History's empty/no-match states screenshot-verified.

## Sprint plan status
Admin work untouched this sprint (out of scope). Activator Portal: 3/6 sprints done. Next = S4 (Assembly & Wiring — Active Requests), the portal's primary/heaviest page: 0–3 active cards with all 6 actions + modals, live count-up timers, the FIFO pending pool, 409 take-race handling, and realtime chime/glow — all six action hooks and both DTOs already exist, so this too is expected to be substantially a wiring-and-gap-filling pass rather than greenfield work, similar to this sprint.
