---
sprint: 6
title: Unit Tests — Login · Dashboard · History · Active Requests
status: ✅ Done
commit: 426a66b
---

# Sprint 6 Report — Unit Tests (final sprint for this portal)

## Work done

One `.test.tsx` per page as specified, plus two small deviations from the literal task list where the actual architecture meant the named behavior lives somewhere else — both documented below rather than silently worked around.

### `login/LoginPage.test.tsx` (6 tests)
Empty submit shows both inline "emptyFields" errors and never calls `login()`; a valid submit calls `useAuth().login()` with the typed command; 401/429/network branches each show the right message. **Role-based redirect is not tested in this file** — since Sprint 1, `LoginPage` never navigates itself (the architecture moved that to `PublicOnlyRoute`'s reactive `<Navigate>`), so there is nothing for a `LoginPage`-scoped test to exercise. Added `tests/unit/components/layout/ProtectedRoute.test.tsx` instead (7 tests, mirroring the existing `AdminGuard.test.tsx` pattern) to test `PublicOnlyRoute` directly for both roles, plus `ProtectedRoute`'s spinner/redirect/Outlet cases — this is the file that actually owns the behavior Sprint 6's task list was asking about.

### `dashboard/DashboardPage.test.tsx` (6 tests)
Skeleton count is 6, not 4 — `ChartSkeleton` shares the identical wrapper markup as `StatCardSkeleton` (`rounded-2xl border ... p-5`), so the loading state genuinely renders 6 such elements (4 stat cards + the chart + the Active-Slots stat card), not 4. All 4 stat values verified including Sprint 3's Balance-Owed card; both avg-time pace branches; the new-activator empty state with its emphasised (filled) CTA vs. the normal outline CTA (distinguished via the `bg-primary`/`border-input` classes, since neither Button variant's class list literally contains the word "outline"); retry-on-error.

### `history/HistoryPage.test.tsx` (10 tests)
Section A's actual rendered column set is 4 (subscription/key/completed/status) — the plan's "3 present columns" phrasing documents which 2 columns E-1 dropped (`activatorName`/`activationEmail`), it was never a literal count of what remains. Covered: Section A's empty state; debounced search (via `vi.advanceTimersByTimeAsync`, since a plain `advanceTimersByTime` doesn't flush the resulting state update without wrapping in an async React act cycle); status/sort Selects mutating the query and re-sorting client-side respectively; true-empty vs. no-match+Clear; per-section error+retry; Previous/Next disabled states and page-2 re-query. **Noted, not built**: the plan's "mobile Load-More" pagination pattern was never actually implemented (the shipped page uses Previous/Next at every viewport width) — this is a pre-existing deviation from the original plan wording, tested as it actually behaves rather than treated as a Sprint 6 build task.

### `requests/RequestsPage.test.tsx` (16 tests)
The heaviest file. Gating (all 5 actions + the locked notice on FREEZE; all enabled on PROCESSING); every action's exact mutate payload — Wrong-Info via an actual checkbox click, Request-OTP and Activate with no dialog at all (direct single-click, per spec), Cancel behind its AlertDialog confirm, Freeze with both a real reason and a blocked-empty submission; the pool's Take action; slot-full disabling the pool's Activate button; `LiveTimer` tier classes for both elapsed (active card) and waiting (pool item) modes; the reassuring (non-error) empty-pool state; and a `rerender`-simulated cache-invalidation removing a taken row. **The 409 take-race toast is not tested here** — that branching (409 → the specific "taken by another activator" message, anything else → the generic one, via the `meta.silentErrorToast` opt-out added in Sprint 4) lives inside the real `useTakeActivation` hook, which this fully-mocked page test never touches. Added the case to the existing `tests/integration/hooks/activations.test.tsx` instead, reusing its already-defined-but-previously-unused `activationsErrorHandlers.takeConflict()` MSW handler — that file is the one that can actually drive the real hook and observe its `onError` behavior.

## A real bug found and fixed
Writing the RequestsPage error-state test triggered an actual infinite render loop (the test process hung at 100% CPU until killed). Root cause: `const active = activeData ?? []` allocates a **new array reference on every render** whenever `activeData` is `undefined` — which is exactly the case when `isError: true`. That reference is the dependency of `useExitingActiveList`'s `useEffect` (added in Sprint 5 for the card exit animation); a fresh dependency every render means the effect never stops re-firing, and since it calls `setState`, that's an unbounded render loop. This is **not a test-only artifact** — the identical condition (`activeData === undefined` while the component renders) is exactly what happens in the live app the instant `useActiveRequests()` errors, meaning this was a real, ship-blocking regression introduced in Sprint 5 that the sprint's own manual Playwright pass never caught, because it never exercised an active-requests error state. Fixed by hoisting a stable module-level `EMPTY_ACTIVE: ActiveRequestDTO[] = []` constant in place of the ad hoc `?? []` literal.

## Validation results
- `npm run check` (both tsconfigs) ✅ clean.
- `npx vitest run` ✅ 59/59 files, 438/438 tests (392 baseline + 46 new across 5 new/extended files).
- `npx eslint` scoped to all touched/new files — a few Prettier-only findings from `--fix`, 0 errors after.
- No live browser verification this sprint — Sprint 6 is a tests-only sprint with no UI changes beyond the `RequestsPage.tsx` bugfix, which is exactly what the new unit test suite exists to verify going forward.

## Sprint plan status
**Activator Portal: 6/6 sprints done — this portal is complete.** All four pages (Login, Dashboard, History, Active Requests) plus the authenticated shell are wired, polished, and unit-tested. Admin Parts 1–3 were already complete before this portal started; Client Portal remains sprint-planned but not yet executed for Sub-03 overall.
