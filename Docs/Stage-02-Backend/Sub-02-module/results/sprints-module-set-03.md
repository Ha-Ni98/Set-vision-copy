# Sprints — Geography / Delivery Company / Subscription Plan / Log / Distributor / Payment / Statistics (Sub-02 module set 03)

> Stage 02 · Sub-02 · Phase 02 — dependency-ordered sprints. **No code.**
> Plan: `results/plan-module-set-03.md` · Rules: `module-implementation-rules.md`, `realtime-rules.md`.
> Order law (phase §3): **foundation (mapper/interface) → logic (service) → API (controller/wiring)**, per module.
> Module order (plan §0): **Geography → Delivery Company → Subscription Plan → Log → Distributor → Payment → Statistics**.
> Sizing (phase "adjust to the module"): the three trivial read modules ship as **one full-slice sprint** each (tasks ordered mapper→interface→service→controller→routes); substantive modules split **Foundation / Logic / API**; the 9-endpoint **Statistics** service splits its logic in two — the same rationale set 02 used for Activation.

---

## Dependency order & status

| # | Sprint | Layer | Depends on | Status |
|---|--------|-------|-----------|--------|
| 1 | Geography (full slice) | F+L+API | Sub-01, contract | ✅ Done |
| 2 | Delivery Company (full slice) | F+L+API | Sub-01 | ✅ Done |
| 3 | Log (full slice) | F+L+API | Sub-01 (User actor) | ✅ Done |
| 4 | Subscription Plan — Foundation | foundation | contract | ✅ Done |
| 5 | Subscription Plan — Logic | logic | S4 | ✅ Done |
| 6 | Subscription Plan — API | api | S5 | ✅ Done |
| 7 | Distributor — Foundation | foundation | S1 (geography seed) | ✅ Done |
| 8 | Distributor — Logic | logic | S7, S3 (inline audit) | ✅ Done |
| 9 | Distributor — API | api | S8 | ✅ Done |
| 10 | Payment — Foundation | foundation | set-01 Activator/Admin | ✅ Done |
| 11 | Payment — Logic | logic | S10 | ⬜ Pending |
| 12 | Payment — API | api | S11 | ⬜ Pending |
| 13 | Statistics — Foundation | foundation | contract | ⬜ Pending |
| 14 | Statistics — Logic A (summaries) | logic | S13 | ⬜ Pending |
| 15 | Statistics — Logic B (overview/heatmap/drilldown) | logic | S14 | ⬜ Pending |
| 16 | Statistics — API | api | S15, set-02 entities (int) | ⬜ Pending |

**Cross-cutting validation** (applies to every sprint, in addition to its own block):
- `tsc --noEmit` clean across `apps/api`.
- **Every route is admin-gated** (`requireAuth({ roles:[UserRole.ADMIN] })`) and uses **contract route constants**; responses go through `sendSuccess`.
- Lists paginate via `buildPaginationMeta` **only** where the contract is paginated (Distributor, Log, Payment); Delivery Company / Geography / Subscription Plan / Statistics return plain shapes.
- Mappers build DTOs by **listing fields** (no entity spread); each `toDTO` ends with `XResponseSchema.parse(...)`; `Decimal`→number 2dp; dates→ISO.
- **No module here emits/listens or imports `getIO()`/`common/realtime`** (plan §1.5); audit is **inline** `tx.log.create` (plan §1.3). No `console.*`; no `process.env` outside `env.ts`. Committed on green.

> No Sprint 0, **no contract change, no framework change** (plan §1): every route/DTO/command/query/enum and every `LogActionType` is already present, and `onlineNow` is computed as the enabled-activator count (plan §1.1) — no realtime touch.

---

### Sprint 1: Geography (full slice)   — Status: ✅ Done

**Goals**
- The complete read-only reference module (wilayas + communes), foundation→logic→API in one sprint.

**Tasks**
- [ ] Impl: `src/modules/geography/geography.mapper.ts` — `toWilayaDTO(w)`, `toCommuneDTO(c)`; pass bilingual fields; `.parse` each schema.
- [ ] Impl: `src/modules/geography/geography.interface.ts` — `IGeographyService` { `getWilayas()`, `getCommunes(wilayaId)` }.
- [ ] Impl: `src/modules/geography/geography.service.ts` — getWilayas (all `Wilaya` ordered `wilayaCode`); getCommunes (validate wilaya → `RESOURCE_NOT_FOUND`; `Commune` by `wilayaId` ordered `communeCode`; empty array allowed).
- [ ] Impl: `src/modules/geography/geography.controller.ts` — 2 handlers; `200`; `try/catch → next`.
- [ ] Impl: `src/modules/geography/geography.routes.ts` — manual DI; admin-only; `GET_WILAYAS` then `GET_COMMUNES` (params `WilayaIdParamsSchema`).
- [ ] Wire: mount `geographyRouter` at `GEOGRAPHY_ROUTES.BASE` in `src/modules/index.ts`.
- [ ] Test data: reuse/extend `test/data/geography.factory.ts` (`seedWilaya`/`seedCommune`).
- [ ] Test: `test/unit/modules/geography/geography.mapper.spec.ts` (DTOs parse, both names present); `test/integration/geography.integration.spec.ts` — 200 wilayas ordered / **403** non-admin; 200 communes / 404 unknown wilaya / empty array for childless wilaya.
- [ ] Test: extend `test/contract/routes.conformance.spec.ts` — `GEOGRAPHY_ROUTES` registered; parse through `WilayaResponseSchema`/`CommuneResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green; `npm run test:int` green.
- [ ] Read-only (no writes, no log, no events); both `frName`/`arName` returned; admin-gated.
- [ ] Committed on green.

---

### Sprint 2: Delivery Company (full slice)   — Status: ✅ Done

**Goals**
- The small management module (list/create/update/toggle; **no delete, no audit**), full slice.

**Tasks**
- [ ] Impl: `src/modules/delivery-company/delivery-company.mapper.ts` — `toDTO` { id, name, registeredName, isActive }; `toPersistence` trims; `.parse`.
- [ ] Impl: `src/modules/delivery-company/delivery-company.interface.ts` — `IDeliveryCompanyService` { `getAll(query)`, `create(cmd)`, `update(id, cmd)`, `toggle(id)` }.
- [ ] Impl: `src/modules/delivery-company/delivery-company.service.ts` — getAll (`active` filter, order `name`, unpaginated); create (trim, `isActive` default true); update (404 + apply); toggle (404 + flip). *(Optional duplicate-`name` 409 left off by default.)*
- [ ] Impl: `src/modules/delivery-company/delivery-company.controller.ts` — 4 handlers; `201` create, `200` rest.
- [ ] Impl: `src/modules/delivery-company/delivery-company.routes.ts` — manual DI; admin-only; `validateRequest` per segment.
- [ ] Wire: mount `deliveryCompanyRouter` at `DELIVERY_COMPANY_ROUTES.BASE`.
- [ ] Test data: `test/data/delivery-company.factory.ts` (reuse if created in set 02).
- [ ] Test: mapper unit; `test/integration/delivery-company.integration.spec.ts` — 200 list all / 200 `active=true` only enabled / **403** non-admin; 201 create `isActive=true`; 200 update / 404; 200 toggle flips + restores / 404.
- [ ] Test: extend conformance — `DELIVERY_COMPANY_ROUTES` registered; parse `DeliveryCompanyResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` + `npm run test:int` green.
- [ ] No `DELETE` route (retire via toggle); **no `Log`** written; admin-gated.
- [ ] Committed on green.

---

### Sprint 3: Log (full slice)   — Status: ✅ Done

**Goals**
- The append-only read surface (`GET_ALL`) + actor-name resolution. (The inline-audit pattern callers use is documented in plan §1.3; no shared writer required.)

**Tasks**
- [ ] Impl: `src/modules/log/log.mapper.ts` — `toDTO(log, actorName)`; resolve `userName` (`Admin`/`Activator` `fullName`, fallback `User.username`); `actionType` passthrough; `createdAt`→ISO; `.parse`.
- [ ] Impl: `src/modules/log/log.interface.ts` — `ILogService` { `getAll(query): PaginatedResult<LogDTO>` }.
- [ ] Impl: `src/modules/log/log.service.ts` — getAll: join `User`(+profile); filters `userId`/`actionType`/`dateFrom`/`dateTo`/`search`(`actionDescription`); order `createdAt` **desc**; paginate; resolve `userName`.
- [ ] Impl: `src/modules/log/log.controller.ts` — 1 handler; `200`.
- [ ] Impl: `src/modules/log/log.routes.ts` — manual DI; admin-only; `validateRequest({ query: GetLogsQuerySchema })`.
- [ ] Wire: mount `logRouter` at `LOG_ROUTES.BASE`.
- [ ] Test data: `test/data/log.factory.ts` — seed `Log` rows of varied `actionType`/actor/date.
- [ ] Test: mapper unit (`actionType` valid `LogActionType`, `userName` fallback); `test/integration/log.integration.spec.ts` — 200 newest-first + each filter narrows / **403** non-admin.
- [ ] Test: extend conformance — `LOG_ROUTES` registered; parse `LogResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` + `npm run test:int` green.
- [ ] No create/update/delete surface (append-only); ordered newest-first; admin-gated.
- [ ] Committed on green.

---

### Sprint 4: Subscription Plan — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- `SubscriptionPlanMapper` (plan label, tier, matrix assembly, cell) and `ISubscriptionPlanService`.

**Tasks**
- [ ] Impl: `src/modules/subscription-plan/subscription-plan.mapper.ts` — `toPlanDTO(plan)` (compose `label` from type+duration), `toDurationDTO(tier)`, `toMatrixDTO(plans, tiers, cells)` (missing cell → `commission:null`), `toCellDTO(row)`; commission `Decimal`→number 2dp; `nbMinuteMax` nullable; `.parse` each schema.
- [ ] Impl: `src/modules/subscription-plan/subscription-plan.interface.ts` — `ISubscriptionPlanService` { `getAll(query)`, `create(cmd)`, `toggle(id)`, `getCommissionDurations()`, `getCommissions()`, `updateCommission(cmd, actorId)` }.
- [ ] Test data: `test/data/subscription-plan-commission.factory.ts` — seed `SubscriptionPlan` + `CommissionDuration` tiers (incl. catch-all `nbMinuteMax=null`) + `SubscriptionPlanCommission` cells (reuse `subscription-plan.factory` from set 02).
- [ ] Test: `test/unit/modules/subscription-plan/subscription-plan.mapper.spec.ts` — `SubscriptionPlanDTO`/`CommissionDurationDTO`/`CommissionMatrixDTO`/`CommissionCellDTO` parse; composed `label`; `null` cells where unset; commission 2dp.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] Matrix assembly yields `null` for unset cells; label composed backend-side; interface returns DTOs.
- [ ] Committed on green.

---

### Sprint 5: Subscription Plan — Logic (service)   — Status: ✅ Done

**Goals**
- `SubscriptionPlanService`: plans (list/create/toggle), tiers, matrix, commission upsert (+log).

**Tasks**
- [ ] Impl: `src/modules/subscription-plan/subscription-plan.service.ts` (injects `PrismaClient`):
  - getAll — `active` filter; compose `label`.
  - create — `(type,duration)` unique (`@@unique`) → collision `RESOURCE_CONFLICT`; `isActive` true. **Not logged.**
  - toggle — load or `RESOURCE_NOT_FOUND` → flip `isActive`. **Not logged.**
  - getCommissionDurations — list `CommissionDuration` ordered `nbMinuteMin`.
  - getCommissions — active plans + all tiers + existing cells → matrix (`null` where unset).
  - updateCommission — **upsert** `SubscriptionPlanCommission` for `(planId, durationId)` → `Log CHANGE_ACTIVATION_COMMISSION` (inline) → return cell. **Future-only** (never touches completed `activationPrice`).
- [ ] Test: `test/unit/modules/subscription-plan/subscription-plan.service.spec.ts` (mock Prisma) — duplicate `(type,duration)` → 409; toggle flips; durations ordered; matrix `null` cells; `updateCommission` upserts + logs `CHANGE_ACTIVATION_COMMISSION`; a completed activation's `activationPrice` unchanged after an edit.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] Only `updateCommission` logs (create/toggle don't); commission edits are future-only.
- [ ] Committed on green.

---

### Sprint 6: Subscription Plan — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Controller (6), composition root (static commission routes before `/:id`), wiring, integration + conformance.

**Tasks**
- [ ] Impl: `src/modules/subscription-plan/subscription-plan.controller.ts` — 6 handlers; `actorId` on `updateCommission`; `201` create, `200` rest.
- [ ] Impl: `src/modules/subscription-plan/subscription-plan.routes.ts` — manual DI; admin-only; register `GET_COMMISSION_DURATIONS` + `GET_COMMISSIONS`/`UPDATE_COMMISSION` (`/commissions`) **before** `TOGGLE` (`/:id/toggle`); `validateRequest` per segment.
- [ ] Wire: mount `subscriptionPlanRouter` at `SUBSCRIPTION_PLAN_ROUTES.BASE`.
- [ ] Test: `test/integration/subscription-plan.integration.spec.ts` — 200 list / `active=true` / **403** non-admin; 201 create / 409 duplicate; 200 toggle; 200 `commission-durations` ordered; 200 `commissions` matrix with `null` cells; 200 `update-commission` upsert + log.
- [ ] Test: extend conformance — `SUBSCRIPTION_PLAN_ROUTES` registered; parse `CommissionMatrixResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` (incl. conformance) + `npm run test:int` green.
- [ ] Static commission routes resolve before `/:id/toggle`; admin-gated; contract constants only.
- [ ] Committed on green.

---

### Sprint 7: Distributor — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- `DistributorMapper` (resolved names + kept ids + derived fields) and `IDistributorService`.

**Tasks**
- [ ] Impl: `src/modules/distributor/distributor.mapper.ts` — `toDTO(d, wilaya, commune, derived)`, `toDetailDTO(..., {soldKeys, ordersCount})`; resolve `wilayaName`/`communeName` keeping ids; counts `Int`; `createdAt`→ISO; `.parse` each schema; no sensitive fields.
- [ ] Impl: `src/modules/distributor/distributor.interface.ts` — `IDistributorService` { `getAll(query)`, `create(cmd, actorId)`, `getById(id)`, `update(id, cmd, actorId)`, `toggle(id, actorId)`, `delete(id, actorId)` }.
- [ ] Test data: `test/data/distributor.factory.ts` (reuse from set 02); add card/order seed helpers for derived `deliveredOrdersCount`/`soldKeys`/`ordersCount`.
- [ ] Test: `test/unit/modules/distributor/distributor.mapper.spec.ts` — `DistributorDTO`/`DistributorDetailDTO` parse; ids + names both present; derived fields pass through; no sensitive fields.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] Names resolved + ids retained (edit selects); derived fields are mapper input (computed, not stored).
- [ ] Committed on green.

---

### Sprint 8: Distributor — Logic (service)   — Status: ✅ Done

**Goals**
- `DistributorService`: list/create/getById/update/toggle/delete with geography validation, inline audit, and read-only counters.

**Tasks**
- [ ] Impl: `src/modules/distributor/distributor.service.ts` (injects `PrismaClient`):
  - getAll — join `Wilaya`/`Commune`; filters `search`(fullName/storeName/phone)+`wilayaId`/`communeId`; exclude `deletedAt`; paginate; derive `deliveredOrdersCount`.
  - create — `communeId ∈ wilayaId` (else `VALIDATION_ERROR`) → **$transaction** { create `Distributor` (counters 0, `isEnabled` true) → `Log ADD_DISTRIBUTOR` }.
  - getById — load or `RESOURCE_NOT_FOUND` → derive `soldKeys` (cards `ACTIVATED`) + `ordersCount`.
  - update — re-validate commune∈wilaya if changed → **$transaction** { apply (trim) → `Log CHANGE_DISTRIBUTOR_INFORMATION` }.
  - toggle — **$transaction** { flip `isEnabled` → `Log CHANGE_DISTRIBUTOR_STAT` }.
  - delete — soft-delete (`deletedAt`); *(optional 409 if active cards/open orders)*; **not logged**.
- [ ] Test: `test/unit/modules/distributor/distributor.service.spec.ts` (mock Prisma) — commune∉wilaya → 400 (create+update); create logs `ADD_DISTRIBUTOR`; update logs `CHANGE_DISTRIBUTOR_INFORMATION`; toggle logs `CHANGE_DISTRIBUTOR_STAT`; getById derives `soldKeys`/`ordersCount` + 404; delete soft-deletes (no log); counters never written here.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] Each audited mutation writes the correct `Log` inside its `$transaction`; delete writes none; `nbOfActiveCards`/`nbOfActivation` read-only.
- [ ] Committed on green.

---

### Sprint 9: Distributor — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Controller (6), composition root, wiring, integration + conformance.

**Tasks**
- [ ] Impl: `src/modules/distributor/distributor.controller.ts` — 6 handlers; `req.user.id` as `actorId`; `201`/`200`/`204`.
- [ ] Impl: `src/modules/distributor/distributor.routes.ts` — manual DI; admin-only; `validateRequest` per segment.
- [ ] Wire: mount `distributorRouter` at `DISTRIBUTOR_ROUTES.BASE`.
- [ ] Test: `test/integration/distributor.integration.spec.ts` — 200 list (filters + resolved names) / **403** non-admin; 201 create + `ADD_DISTRIBUTOR` / 400 commune mismatch; 200 detail (`soldKeys`/`ordersCount`) / 404; 200 update + log / 400 mismatch; 200 toggle + log; 204 delete (soft) / optional 409.
- [ ] Test: extend conformance — `DISTRIBUTOR_ROUTES` registered; parse `DistributorDetailResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` + `npm run test:int` green.
- [ ] Audit rows visible via `/logs` after actions; admin-gated; contract constants only.
- [ ] Committed on green.

---

### Sprint 10: Payment — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- `PaymentMapper` (`Decimal`→number, recorder name) and `IPaymentService`.

**Tasks**
- [ ] Impl: `src/modules/payment/payment.mapper.ts` — `toDTO(payment, recorderAdmin)`: `amount`←`totalAmount`, `previousCredits` `Decimal`→number 2dp; `recordedByName`←`Admin.fullName`; `paymentDate`→ISO; pass `isDeleted`; `.parse`. `toPersistence`: `amount` as `Decimal`; snapshot `previousCredits`; `paymentDate` from input or now.
- [ ] Impl: `src/modules/payment/payment.interface.ts` — `IPaymentService` { `getAll(query)`, `create(cmd, actorUserId)`, `delete(id, actorUserId)` }.
- [ ] Test data: `test/data/payment.factory.ts` — seed `Payment` (linked to seeded `Admin` recorder + `Activator`); reuse set-01 `activator`/`admin` factories.
- [ ] Test: `test/unit/modules/payment/payment.mapper.spec.ts` — `PaymentDTO` parses; money 2dp; `recordedByName` resolved; `isDeleted` passthrough.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] `amount` maps from `totalAmount`; money 2dp; interface returns DTOs.
- [ ] Committed on green.

---

### Sprint 11: Payment — Logic (service)   — Status: ⬜ Pending

**Goals**
- `PaymentService`: list / create (credits decrement + snapshot + log) / delete (reverse + log). Resolves the recording `Admin` by `userId` (plan §1.4).

**Tasks**
- [ ] Impl: `src/modules/payment/payment.service.ts` (injects `PrismaClient`):
  - getAll — join `Admin` (recorder); `activatorId` filter; exclude `isDeleted` unless `includeDeleted=true`; order `paymentDate` **desc**; paginate; resolve `recordedByName`.
  - create — resolve `Admin` by `actorUserId`; load activator or `RESOURCE_NOT_FOUND`; `amount>0` (`VALIDATION_ERROR`); `amount ≤ credits` (`RESOURCE_CONFLICT`, relaxable); snapshot `previousCredits` → **$transaction** { create `Payment`(`adminId`, `activatorId`, `totalAmount=amount`, `previousCredits`, `paymentDate=date??now`) → `activator.credits -= amount` → `Log SET_PAYMENT` (`userId=actorUserId`) }.
  - delete — load or `RESOURCE_NOT_FOUND`; already `isDeleted` → `RESOURCE_CONFLICT` → **$transaction** { `isDeleted=true`,`deletedDate=now` → `activator.credits += amount` → `Log DELETE_PAYMENT` }.
- [ ] Test: `test/unit/modules/payment/payment.service.spec.ts` (mock Prisma) — create snapshots `previousCredits`, decrements `credits`, logs `SET_PAYMENT`; `amount>credits` → 409; unknown activator → 404; delete reverses `credits` + logs `DELETE_PAYMENT`; double-delete → 409; `includeDeleted` toggles list.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] Credits movement + reversal inside `$transaction`; `SET_PAYMENT`/`DELETE_PAYMENT` logged with `userId=actorUserId`; `adminId` resolved from the principal's `Admin` row.
- [ ] Committed on green.

---

### Sprint 12: Payment — API (controller + wiring)   — Status: ⬜ Pending

**Goals**
- Controller (3), composition root, wiring, integration + conformance.

**Tasks**
- [ ] Impl: `src/modules/payment/payment.controller.ts` — 3 handlers; `req.user.id` as `actorUserId`; `201` create, `204` delete.
- [ ] Impl: `src/modules/payment/payment.routes.ts` — manual DI; admin-only; `validateRequest` per segment.
- [ ] Wire: mount `paymentRouter` at `PAYMENT_ROUTES.BASE`.
- [ ] Test: `test/integration/payment.integration.spec.ts` — 201 create (snapshot + credits down + `SET_PAYMENT`) / 400 `amount≤0` / 409 `amount>credits` / 404 unknown activator / **403** non-admin; 200 list excludes deleted by default + `includeDeleted=true` shows + `activatorId` filter; 204 delete restores credits + `DELETE_PAYMENT` / 409 already-deleted / 404.
- [ ] Test: extend conformance — `PAYMENT_ROUTES` registered; parse `PaymentResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` + `npm run test:int` green.
- [ ] Credits reconcile across create/delete; admin-gated; contract constants only.
- [ ] Committed on green.

---

### Sprint 13: Statistics — Foundation (mapper + interface + time helper)   — Status: ⬜ Pending

**Goals**
- The shape layer for all 9 aggregates, the Algiers-tz boundary helper, and `IStatisticsService`.

**Tasks**
- [ ] Impl: `src/modules/statistics/statistics.time.ts` — Africa/Algiers (UTC+1, no DST) boundaries: `todayStart`, `weekStart`, `monthStart`, and `resolvePeriod(period, dateFrom?, dateTo?)` → `{ from, to, bucket: 'day'|'week' }` for the `StatisticsPeriod` enum (incl. `custom`).
- [ ] Impl: `src/modules/statistics/statistics.mapper.ts` — one shaper per DTO: counts `Int`; money `Decimal`→number 2dp; durations seconds (nullable where defined); series `{ date(ISO)|label, value }`; resolve `wilayaName`/`subscriptionLabel`; **omit zero-count groups** (plan §1.2); `.parse` each response schema.
- [ ] Impl: `src/modules/statistics/statistics.interface.ts` — `IStatisticsService` (9 methods: `dashboard`, `activatorsSummary`, `distributorsSummary`, `inventorySummary`, `ordersSummary`, `activationsSummary`, `overview(query)`, `wilayaHeatmap(query)`, `wilayaDrilldown(wilayaId, query)`).
- [ ] Test data: reuse set-02 `set`/`lot`/`order`/`card`/`activation` + set-01 `activator` factories (Statistics owns no entity).
- [ ] Test: `test/unit/modules/statistics/statistics.time.spec.ts` (Algiers cutoffs incl. month/week edges); `test/unit/modules/statistics/statistics.mapper.spec.ts` (each DTO parses; zero groups omitted; money 2dp; heatmap all-58 shape).

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] Boundaries use Algiers tz; mappers omit zero groups and parse their schemas; interface returns contract DTOs.
- [ ] Committed on green.

---

### Sprint 14: Statistics — Logic A (summaries)   — Status: ⬜ Pending

**Goals**
- The six fixed-shape aggregates: `dashboard`, `activatorsSummary`, `distributorsSummary`, `inventorySummary`, `ordersSummary`, `activationsSummary`.

**Tasks**
- [ ] Impl: `src/modules/statistics/statistics.service.ts` (part 1; injects `PrismaClient`):
  - dashboard — `activationsToday` (completed today), `totalRevenue` (Σ completed `activationPrice`), `pendingActivations` (`PENDING`), `activeActivators` (enabled activators) (plan §1.2).
  - activatorsSummary — `totalActivators`, `onlineNow` = **enabled activators** (plan §1.1), `totalSuccessful` (Σ `nbOfSuccessfulActivation`), `totalCreditsOwed` (Σ `credits`).
  - distributorsSummary — `totalDistributors`, `activeWithStock` (`nbOfActiveCards>0`), `totalCardsInStock` (Σ), `activationsThisMonth`.
  - inventorySummary — `groupBy` `Set`/`Lot`/`Card` stat (omit zeros) + `cardFlags` {disabled,revoked}.
  - ordersSummary — `totalOrders`{all,month,week}, `byState[]`, `pendingDelivery`/`inDelivery`, `totalRevenue` (Σ `Order.orderPrice`).
  - activationsSummary — `total`{all,today,week,month}, `byState[]`, `avgDurationSeconds` (avg `takenAt→completedAt`, nullable), `totalRevenue` (Σ `activationPrice`).
- [ ] Test: `test/unit/modules/statistics/statistics.summaries.spec.ts` (mock Prisma) — `onlineNow` = enabled count; revenue source correct (activation vs order); Algiers "today/week/month" counts; zero groups omitted; `avgDurationSeconds` null when none.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] Read-only (no writes); revenue = completed `activationPrice` (dashboard/activations) or `Order.orderPrice` (orders); enabled-activator semantics for presence.
- [ ] Committed on green.

---

### Sprint 15: Statistics — Logic B (overview / heatmap / drilldown)   — Status: ⬜ Pending

**Goals**
- The period-filtered series + geographic aggregates: `overview`, `wilayaHeatmap`, `wilayaDrilldown`.

**Tasks**
- [ ] Impl: `src/modules/statistics/statistics.service.ts` (part 2):
  - overview — apply `period`(+`dateFrom/dateTo`)/`subscriptionPlanId`/`wilayaId`; build the 6 series (activationsOverTime, activationsByState, topActivators, topDistributors, avgTimeTrend, revenueOverTime); bucket day/week from the period span; **empty period → zeroed series** (not an error).
  - wilayaHeatmap — per wilaya aggregate distributors/activations/cancellations/avg-time over the period; **return all 58** (zeroed where empty).
  - wilayaDrilldown — validate wilaya (`RESOURCE_NOT_FOUND`) → topDistributors / activationsByPlan / activationsOverTime for the period.
- [ ] Test: `test/unit/modules/statistics/statistics.overview.spec.ts` (mock Prisma) — overview honors filters + bucket choice + zeroed empty period; heatmap returns 58 (zeroed); drilldown 404 unknown wilaya + per-plan/per-distributor breakdown.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` green.
- [ ] Empty period yields zeroed series (no error); heatmap always 58 wilayas; drilldown validates the wilaya.
- [ ] Committed on green.

---

### Sprint 16: Statistics — API (controllers + wiring)   — Status: ⬜ Pending

**Goals**
- 9 controllers, composition root (static `/wilaya-heatmap` before `/wilaya/:wilayaId`), wiring, integration + conformance. Integration needs set-02 entities seeded.

**Tasks**
- [ ] Impl: `src/modules/statistics/statistics.controller.ts` — 9 handlers; `200`; `overview`/`wilayaHeatmap`/`wilayaDrilldown` read `req.validated.query`/`params`.
- [ ] Impl: `src/modules/statistics/statistics.routes.ts` — manual DI; admin-only; register `WILAYA_HEATMAP` **before** `WILAYA_DRILLDOWN`; `validateRequest` (`StatisticsOverviewQuerySchema`, `WilayaHeatmapQuerySchema`, geography `WilayaIdParamsSchema` + `WilayaDrilldownQuerySchema`).
- [ ] Wire: mount `statisticsRouter` at `STATISTICS_ROUTES.BASE`.
- [ ] Test: `test/integration/statistics.integration.spec.ts` (seed via set-02 factories) — each endpoint returns its DTO shape / **403** non-admin; `overview` honors `period`/`subscriptionPlanId`/`wilayaId` + empty period zeroed; `wilaya-heatmap` returns 58; `wilaya/:id` 200 + 404 unknown.
- [ ] Test: extend conformance — `STATISTICS_ROUTES` registered; parse `StatisticsOverviewResponseSchema` + a summary schema.

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:unit` (incl. conformance) + `npm run test:int` green.
- [ ] `/wilaya-heatmap` resolves before `/wilaya/:wilayaId`; all 9 admin-gated; contract constants only; no `getIO()` / no realtime import.
- [ ] Committed on green.

---

## Done criteria (whole set)

- All 16 sprints committed green; `tsc --noEmit` clean across `apps/api`.
- `npm run test:unit` (unit + conformance) and `npm run test:int` green.
- `routes.conformance.spec.ts` asserts every `GEOGRAPHY_ROUTES`/`DELIVERY_COMPANY_ROUTES`/`SUBSCRIPTION_PLAN_ROUTES`/`LOG_ROUTES`/`DISTRIBUTOR_ROUTES`/`PAYMENT_ROUTES`/`STATISTICS_ROUTES` constant is registered.
- Every route is admin-gated; audit is inline (`ADD_DISTRIBUTOR`/`CHANGE_DISTRIBUTOR_*`, `SET_PAYMENT`/`DELETE_PAYMENT`, `CHANGE_ACTIVATION_COMMISSION`); no other action logs.
- Money serialized 2dp; dates ISO; mappers exclude sensitive fields and parse their schemas.
- **No contract change, no framework change, no realtime touch**: no service imports `getIO()`, no module emits/listens, and `onlineNow` is the enabled-activator count (plan §1.1).
