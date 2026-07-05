# Report — Sprint 06 · Subscription Plan — API (controller + wiring) · Set 03

**Date:** 2026-07-01
**Status:** ✅ Green & Committed

---

## What was built

Controller (6 handlers), routes (static-before-param ordering), wiring, integration + conformance.

### Files created

| File | Description |
|------|-------------|
| `Apps/api/src/modules/subscription-plan/subscription-plan.controller.ts` | 6 handlers; `actorId = req.user.id` on `updateCommission`; `201` create, `200` rest |
| `Apps/api/src/modules/subscription-plan/subscription-plan.routes.ts` | Manual DI; admin-only; static routes (`GET_COMMISSION_DURATIONS`, `GET_COMMISSIONS`, `UPDATE_COMMISSION`) registered **before** `/:id/toggle` |
| `Apps/api/test/integration/subscription-plan.integration.spec.ts` | 12 integration tests |

### Files modified

| File | Change |
|------|--------|
| `Apps/api/src/modules/index.ts` | Mounted `subscriptionPlanRouter` at `SUBSCRIPTION_PLAN_ROUTES.BASE` |
| `Apps/api/test/contract/routes.conformance.spec.ts` | Added `SUBSCRIPTION_PLAN_ROUTES` registration checks + `CommissionMatrixResponseSchema` schema test |

---

## Validation

- `tsc --noEmit` — clean
- `npm run test:unit` — 555/555 passed (includes conformance)
- `npm run test:int` — 12/12 subscription-plan tests passed (1 pre-existing admin failure unrelated)

---

## Constraints respected

- Static commission routes (`/commission-durations`, `/commissions`) registered **before** `/:id/toggle` — static resolves first, no param collision
- Admin-gated on all 6 routes
- Contract route constants only
- `updateCommission` passes `req.user.id` as `actorId` → `CHANGE_ACTIVATION_COMMISSION` logged
- `201` on create, `200` on all other mutations
