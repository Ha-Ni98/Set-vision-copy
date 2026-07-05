# Report — Sprint 05 · Subscription Plan — Logic (service) · Set 03

**Date:** 2026-07-01
**Status:** ✅ Green & Committed

---

## What was built

Business logic layer for the Subscription Plan module (6 service methods).

### Files created

| File | Description |
|------|-------------|
| `Apps/api/src/modules/subscription-plan/subscription-plan.service.ts` | `getAll` (active filter); `create` (409 on duplicate unique); `toggle` (404 + flip); `getCommissionDurations` (ordered by `nbMinuteMin`); `getCommissions` (active plans + all tiers + cells → matrix); `updateCommission` ($transaction: upsert + `CHANGE_ACTIVATION_COMMISSION` log) |
| `Apps/api/test/unit/modules/subscription-plan/subscription-plan.service.spec.ts` | 11 service unit tests (mock Prisma) |

---

## Validation

- `tsc --noEmit` — clean
- `npm run test:unit` — 548/548 passed

---

## Constraints respected

- Duplicate `(subscriptionType, subscriptionDuration)` → 409 `RESOURCE_CONFLICT`
- `create`/`toggle` do **not** log (only `updateCommission` does)
- `updateCommission` inside `$transaction`: upsert cell → `Log CHANGE_ACTIVATION_COMMISSION` with `userId=actorId`
- Future-only: `updateCommission` touches only `SubscriptionPlanCommission`, never completed `activationPrice`
- `getCommissions` loads only active plans (commission matrix for active plans)
- `getCommissionDurations` ordered `nbMinuteMin` ascending
