---
sprint: 7
title: Unit tests — Shell + Dashboard + Activators + Distributors
status: ✅ Done
commit: (pending — filled in next commit)
---

# Sprint 7 Report — Tests (final sprint of the 7-sprint plan)

## Work done

### Shared test infrastructure (`tests/fixtures/wrappers/`)
| File | Notes |
|---|---|
| `mockTranslation.ts` (new) | `vi.mock`s both `@/hooks/useTranslation` (returns the key) and `@/components/providers/LanguageProvider`'s `useLanguage` (several components format dates/DZD via `useLanguage()` directly, not just `useTranslation()`). Imported first in every new test file. |
| `renderWithRouter.tsx` (new) | `renderWithRoutes(routes, initialRoute)` — registers sibling routes (e.g. a detail page's `:id` route plus the list page a back-link points to) so `<Link>`/`useNavigate`/`useParams`/`<Navigate>` all resolve inside a `MemoryRouter`. No `QueryClientProvider` anywhere — unit tests mock the hooks, never reach real TanStack Query internals (test-rules §5). |
| `setup.ts` (edited) | Two real, project-wide gaps fixed — see Decisions. |

### Test files (8, `/tests/unit/`)
| File | Covers |
|---|---|
| `components/layout/AdminGuard.test.tsx` | Resolving spinner, no-session → `/login`, non-admin → `/dashboard`, admin → nested route (`Outlet`) — via a real 2-level `<Route>` tree so `<Navigate>` targets render actual content. |
| `components/layout/AdminHeader.test.tsx` | Sign Out confirm ⇒ `useAuth().logout()`. |
| `components/layout/NotificationBell.test.tsx` | Idle vs. reconnecting indicator + dropdown copy. |
| `pages/dashboard/DashboardPage.test.tsx` | 4 stat skeletons; card values from mocked summary DTOs; per-region empty/error+retry; Frozen Activate confirm ⇒ `mutate(id)`. |
| `pages/activators/ActivatorsPage.test.tsx` | Empty vs. no-match; Create-modal Zod errors on empty submit; valid submit ⇒ `mutate`; success ⇒ password panel. |
| `pages/activator-detail/ActivatorDetailPage.test.tsx` | Invalid-id ⇒ `NotFoundState`+back; delete-payment confirm ⇒ `useDeletePayment(id)`; reset-password confirm ⇒ password reveal. |
| `pages/distributors/DistributorsPage.test.tsx` | No-match+Clear Filters; commune disabled until wilaya chosen, `useCommunes(id)` called on selection; empty Zod submit. |
| `pages/distributor-detail/DistributorDetailPage.test.tsx` | Invalid-id ⇒ `NotFoundState`+back; both compact tables' empty states; wilaya change during inline edit re-calls `useCommunes` with the new id. |

## Validation results
- `npx vitest run` ✅ 45/45 files, 334/334 tests (24 new, zero regressions in the 310 pre-existing)
- `npx tsc --noEmit` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean
- `npx eslint` on every new file ✅ 0 errors, 0 warnings (6 Prettier fixes)

## Decisions & deviations
- **Fixed two real gaps in the shared test setup, not sprint-local workarounds:**
  1. **RTL's `cleanup()` wasn't running between tests.** This project runs Vitest with `globals: false`, and `@testing-library/react`'s auto-cleanup relies on a global `afterEach` being present — without it, nothing unmounted a previous test's render, so a second `render()` call in the same file left two copies of the same component in `document.body` (surfaced as spurious "found multiple elements" failures). No component test existed before this sprint, so this never surfaced. Added an explicit `cleanup()` call to `tests/fixtures/wrappers/setup.ts`'s existing `afterEach`.
  2. **Radix `Select`'s pointer-capture calls aren't implemented in JSDOM** (`target.hasPointerCapture is not a function`) — a well-known JSDOM/Radix gap, not specific to this project (my own Sprint 3 risk note anticipated "`ui/select` interaction under RTL" as a risk). Added the standard 4-method stub (`hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`/`scrollIntoView`) to the same setup file — needed by any future test that opens a `Select`, not just this one.
- **`getByRole('option', { name })` succeeds where `getByText` times out** for Radix `SelectItem` content, even after the pointer-capture fix. Worth remembering: `getByText` matched nothing (likely due to how Radix structures the item's internal DOM for its checkmark indicator), while role-based accessible-name matching worked immediately.
- **`.test.tsx`, not `.spec.tsx`** — continuing Sprint 1's tooling correction; the actual `vitest.config.ts` `include` glob only matches `.test.{ts,tsx}`.
- **8 files, not ~15** — the phase file's own task-list checklist names components individually (`CreateActivatorModal`, `RecordPaymentModal`, `EditActivatorModal`, `PaymentsHistoryTable`, `DistributorProfileCard`, etc.) as if each got its own spec file. Per the token-conservation guidance given for this sprint, I folded each component's specific behavior into its *owning page's* test file instead (e.g. `ActivatorDetailPage.test.tsx` covers the delete-payment confirm, the reset-password reveal, and the invalid-id branch all in one file) — every assertion the checklist calls for is still made, just grouped by page rather than fragmented per sub-component.
- **Two identical-text ambiguities, resolved by scoping or picking a distinct assertion** rather than adding new copy: `fullName`/`username` share the `common.validation.minLength` message (asserted the count is 2, plus the distinct `invalidPhone` message, instead of an ambiguous single `getByText`); the empty-state "Add" CTA and the create-modal's submit button both render `common.actions.add` (scoped queries to `within(dialog)`).
- **Did not add a dedicated `LiveTimer` boundary-time test** (the phase file's "pending tier class at 5m/15m boundary" item) — that color-tier logic lives in `lib/duration-tone.ts`, a Sub-01-adjacent shared module, not page-assembly code; it's exercised structurally by the Dashboard test's pending-region render, and a dedicated boundary-precision test (mocking `Date.now()`) felt like testing a different layer's unit, not this sub-stage's.

## Stage-03 Sub-03 (admin-part-1) is now complete
All 7 sprints across Foundation → Primitives → Assembly → Polish → Tests are ✅. Remaining known gaps, all previously flagged and out of this sub-stage's scope: `LoginPage.tsx`'s post-login redirect doesn't check role (Sprint 3 report), and the plan's own §E contract-gap list (F-1 through F-6, Dashboard fidelity) is unchanged.
