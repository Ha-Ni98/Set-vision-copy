# Module Specification: Subscription Plan

## 1. Context [CONTRACT]
- Prisma Entity: `SubscriptionPlan`, `SubscriptionPlanCommission`, `CommissionDuration`
- Depends on: `common` (`ApiResponse`, `ErrorCode`); shared enums `SubscriptionType`, `SubscriptionDuration` (these are native contract enums — the Add-Plan dropdowns render their values directly with i18n labels, so no "list types/durations" endpoint exists); Log (backend only — inline audit for commission edits)
- Consumed by: Set, Lot, Card, Order (read the **active** plan list for their pickers/filters); Activation (backend — computes `activationPrice` at completion from `SubscriptionPlanCommission` × the achieved `CommissionDuration` tier)

## 2. API Interface [CONTRACT]
`SUBSCRIPTION_PLAN_ROUTES` (`BASE: '/subscription-plans'`). All routes Admin-only.

- Route Constant: `SUBSCRIPTION_PLAN_ROUTES.GET_ALL` (GET `/subscription-plans`)
  - Access: Admin
  - Input (query/params): `GetSubscriptionPlansQuery` { active? }
  - Output: `SubscriptionPlanDTO[]` (unpaginated — small set)

- Route Constant: `SUBSCRIPTION_PLAN_ROUTES.CREATE` (POST `/subscription-plans`)
  - Access: Admin
  - Input (body): `CreateSubscriptionPlanCommand` { subscriptionType, subscriptionDuration }
  - Output: `SubscriptionPlanDTO`

- Route Constant: `SUBSCRIPTION_PLAN_ROUTES.TOGGLE` (POST `/subscription-plans/:id/toggle`)
  - Access: Admin
  - Input (query/params): `SubscriptionPlanIdParams` { id }
  - Output: `SubscriptionPlanDTO`

- Route Constant: `SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSION_DURATIONS` (GET `/subscription-plans/commission-durations`)
  - Access: Admin
  - Input: none
  - Output: `CommissionDurationDTO[]` (the tier column headers; read-only, seed-managed)

- Route Constant: `SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSIONS` (GET `/subscription-plans/commissions`)
  - Access: Admin
  - Input: none
  - Output: `CommissionMatrixDTO`

- Route Constant: `SUBSCRIPTION_PLAN_ROUTES.UPDATE_COMMISSION` (PATCH `/subscription-plans/commissions`)
  - Access: Admin
  - Input (body): `UpdateCommissionCommand` { subscriptionPlanId, commissionDurationId, commission }
  - Output: `CommissionCellDTO` { subscriptionPlanId, commissionDurationId, commission }

DTOs:
- `SubscriptionPlanDTO` = { id, subscriptionType, subscriptionDuration, label (backend-composed, e.g. "Snapchat Plus — 01 Month"), isActive }.
- `CommissionDurationDTO` = { id, key, label, nbMinuteMin, nbMinuteMax (nullable = catch-all) }.
- `CommissionMatrixDTO` = { tiers: `CommissionDurationDTO[]`, rows: { planId, planLabel, cells: { commissionDurationId, commission (nullable until set) }[] }[] }.

## 3. Events [CONTRACT]
(none — commission audit logging is inline; see [BACKEND])

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `SubscriptionPlan`, apply `active` filter when present → compose `label` from type + duration → return.
- **create:** validate the (type, duration) combination is unique (`@@unique`) → on collision `RESOURCE_CONFLICT` → create plan (`isActive` true) → return. (No log type for plan creation — not logged.)
- **toggle:** load by id or `RESOURCE_NOT_FOUND` → flip `isActive` → return. Deactivating only removes the plan from pickers; existing cards keep their plan. (Not logged.)
- **getCommissionDurations:** list `CommissionDuration` ordered by `nbMinuteMin`.
- **getCommissions:** load active plans + all tiers + existing `SubscriptionPlanCommission` rows → assemble the matrix; a missing (plan, tier) cell is returned with `commission = null`.
- **updateCommission:** upsert the `SubscriptionPlanCommission` row for (`subscriptionPlanId`, `commissionDurationId`) with `commission` → write `Log` `CHANGE_ACTIVATION_COMMISSION` → return the cell. **Future-only:** changing a commission never recomputes already-completed activations (their `activationPrice` is already stored).

## 5. Data Mapping [BACKEND]
- **toDTO:** `SubscriptionPlanDTO` passes the two enums through and adds the composed `label`. `CommissionDurationDTO` passes the lookup row through. `Decimal` commission → number (DZD, 2 dp); `nbMinuteMax` may be null.
- **toPersistence:** `commission` parsed as `Decimal`.

## 6. Technical Constraints [BACKEND]
- The set of `CommissionDuration` tiers is **seed-managed**, total and non-overlapping (every completion duration maps to exactly one tier; the catch-all tier has `nbMinuteMax = null`). Tier definitions are read-only via the API. The (type, duration) plan combination is unique. Commission edits affect future activations only. All money is `Decimal(12,2)` serialized as a 2-dp number. The activation-time basis used to pick a tier is `takenAt → completedAt` (owned by the Activation module).

## 7. Test Scenarios [BACKEND]
- 200 — list plans; `active=true` returns only active; 403 for non-admin.
- 201/200 — create a new plan; 409 `RESOURCE_CONFLICT` when the (type, duration) combo already exists.
- 200 — toggle flips `isActive`.
- 200 — `commission-durations` returns the seeded tiers ordered by `nbMinuteMin`.
- 200 — `commissions` returns the full matrix with `null` cells where unset.
- 200 — `update-commission` upserts a cell and logs `CHANGE_ACTIVATION_COMMISSION`; a previously completed activation's `activationPrice` is unchanged afterward.
