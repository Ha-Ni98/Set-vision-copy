---
sprint: 8
title: Commerce & Audit — Orders + Subscription Plans + Logs
status: ✅ Done
commit: TBD
---

# Sprint 8 Report — Commerce & Audit

## Work done

### Services (`src/services`, all new)
| File | Notes |
|---|---|
| `src/services/orders.service.ts` | All 5 `ORDER_ROUTES` — `getAll`, `getById` (detail DTO with embedded `lots`), `create` (201), `transition` (`TransitionOrderCommand.deliveredCount` optional), `remove` (204). |
| `src/services/subscription-plans.service.ts` | All 6 `SUBSCRIPTION_PLAN_ROUTES` — `getAll` (plain array, not paginated), `create` (201), `toggle`, `getCommissionDurations`, `getCommissions` (matrix), `updateCommission` (PATCH — the only mutation in this sprint that isn't POST). |
| `src/services/logs.service.ts` | The single `LOG_ROUTES.GET_ALL` — paginated, admin-only, read-only audit trail. |

### Hooks (`src/hooks`, all new, grouped per D6)
| File | Notes |
|---|---|
| `src/hooks/useOrders.ts` | 5 hooks. `useTransitionOrder` invalidates the four-family fan-out — `qk.orders.all()`, `qk.lots.all()`, `qk.cards.all()`, `qk.distributors.all()` — since a transition moves lot/card delivery state and touches the owning distributor's standing (plan.md §3.2). `useCreateOrder`/`useDeleteOrder` invalidate only `qk.orders.all()`. |
| `src/hooks/useSubscriptionPlans.ts` | 6 hooks. `useUpdateCommission` invalidates only `qk.subscriptionPlans.commissions()` — a single cell edit doesn't touch the plans list or duration tiers. `useCreateSubscriptionPlan`/`useToggleSubscriptionPlan` invalidate `qk.subscriptionPlans.all()`. |
| `src/hooks/useLogs.ts` | 1 hook, query-only. No domain's mutations invalidate `qk.logs.all()` — logs are an append-only audit trail, never invalidated cross-domain (plan.md §3.2 / §2.7 decision). |

### Test scaffold additions
| File | Notes |
|---|---|
| `tests/fixtures/data/orders.mock.ts` | `OrderDTO` (null `completedAt` until a terminal state), `OrderDetailDTO` (embedded `lots` array), paginated. Reuses cross-domain ids already established by distributor/geography/delivery-company/lot fixtures (`f3…` distributor, `f1…` wilaya, `f2…` commune, `f4…` delivery company, `72…` lot) so cross-domain assertions stay consistent. |
| `tests/fixtures/data/plans.mock.ts` | `SubscriptionPlanDTO` (reuses the `81…` subscriptionPlanId already referenced by sets/lots/cards fixtures), `CommissionDurationDTO` (null `nbMinuteMax` — its only nullable field, an open-ended top tier), `CommissionMatrixDTO` (one cell deliberately `null` — no rate configured yet), `CommissionCellDTO`. |
| `tests/fixtures/data/logs.mock.ts` | `LogDTO`, paginated. |
| `tests/fixtures/msw/{orders,subscription-plans,logs}.handlers.ts` | Happy-path defaults + `*ErrorHandlers` maps. `subscription-plans.handlers.ts` registers `getCommissionDurations` ('/commission-durations') and `getCommissions`/`updateCommission` ('/commissions') before the parameterized `toggle` ('/:id/toggle'), mirroring `Apps/api`'s own router comment ("Static routes first (before /:id/toggle to avoid param collision)"). |
| `tests/fixtures/msw/server.ts` | Now seeded with all three new handler arrays — every domain from the 9-sprint plan is registered as of this sprint. |

### Tests
| File | Cases |
|---|---|
| `tests/integration/services/orders.service.test.ts` | 8 cases incl. `transition` called both with and without the optional `deliveredCount`. |
| `tests/integration/services/subscription-plans.service.test.ts` | 8 cases incl. an explicit assertion that a matrix cell's `commission: null` survives the unwrap untouched. |
| `tests/integration/services/logs.service.test.ts` | 3 cases incl. a query-serialization check that `dateFrom`/`dateTo` reach the wire as ISO date-time strings. |
| `tests/integration/hooks/orders.test.tsx` | 6 cases: list + detail (enabled-gated) query hooks, `useCreateOrder`/`useDeleteOrder`'s own-domain invalidation, and the sprint's core assertion — `useTransitionOrder`'s four-family fan-out, verified by refetch-counting all of `orders`/`lots`/`cards`/`distributors` together. |
| `tests/integration/hooks/subscription-plans.test.tsx` | 6 cases: 3 query hooks (incl. the null-cell matrix assertion at the hook level), `useCreateSubscriptionPlan`/`useToggleSubscriptionPlan`'s domain-wide invalidation, and `useUpdateCommission`'s narrower commissions-only invalidation (asserted by proving the plans list is *not* refetched). |
| `tests/integration/hooks/logs.test.tsx` | 1 case: the query hook resolves with the unwrapped paginated result. No mutation tests — this domain has none. |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint --fix` on every Sprint 8 file ✅ 0 errors (prettier formatting only)
- `npx vitest run` ✅ 290/290 tests pass, 35/35 files (258 carried over from Sprints 1–7 + 32 new)
- `npx vite build` ✅ production build unaffected

## Decisions & deviations
- **No real path collision found between the subscription-plan module's static and param routes, despite the API's defensive comment.** `/commission-durations` and `/commissions` are single-segment paths; `/:id/toggle` is two segments. Express (and MSW's path matching) never actually confuses them regardless of registration order — unlike Sprint 7's `cards` domain, where `/available-for-lot` and `/:id` are both single-segment and registration order genuinely matters. The MSW handlers still register literal-before-param here, matching both the plan's explicit instruction and the API's own file ordering, but this sprint's "handler-ordering regression guard" test (Sprint 7's pattern) wasn't repeated for subscription-plans since there's no real ordering hazard to guard against.
- **`GetLogsQuery.page`/`limit` use `.default()` without a trailing `.optional()`** (same shape as `GetActivatorsQuery`/`GetAdminsQuery`/`GetPaymentsQuery` from Sprint 5), making both fields required in the inferred TS type — confirmed via the contract dump before writing the service, so no `tsc` surprise this time. `GetOrdersQuery`, by contrast, uses `.default().optional()` (the activation-domain shape), keeping `page`/`limit` optional; `getAll({})` type-checks for orders but not for logs.
- **`useTransitionOrder`'s fan-out test asserts all four families in one case** rather than one test per family, since the fan-out is the atomic unit of correctness the plan calls out (§3.2) — partial fan-out (e.g. cards invalidated but not distributors) would be the actual regression risk, and a single combined assertion catches that directly.
- **No `/src/components`/`/src/pages` tension** — this domain has no UI consumer yet, so the standing execution-scope constraint never came into play this sprint.
