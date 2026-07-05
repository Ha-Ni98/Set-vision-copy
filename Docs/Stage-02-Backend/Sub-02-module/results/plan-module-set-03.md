# Plan — Module Set 03 (Geography · Delivery Company · Subscription Plan · Log · Distributor · Payment · Statistics)

> Stage 02 · Sub-02 · Phase 01 — vertical-slice plan for the **reference / admin-management / reporting** modules. **No code.**
> Specs: `Module-Contracts/{geography,delivery-company,subscription-plan,log,distributor,payment,statistics}.md`
> Rules: `module-implementation-rules.md`, `realtime-rules.md`
> Contract: `@my-app/contract` (`Apps/contract`) — **verified present**, nothing below is to be (re)declared.

---

## 0. Scope & build order

Seven modules, all **Admin-only**, none emit or listen to events. They split into three bands:

- **Reference reads** (seed/lookup, mostly read-only): **Geography**, **Delivery Company**, **Subscription Plan**, **Log**.
- **Admin management** (CRUD + inline audit + money): **Distributor**, **Payment**.
- **Reporting** (read-only cross-entity aggregation): **Statistics**.

**Build order = dependency order:**

1. **Geography** (seed reads; Distributor + Order validate against it)
2. **Delivery Company** (independent; Order's picker reads the active list)
3. **Subscription Plan** (independent; plans + commission matrix; Activation prices off it)
4. **Log** (read surface + the inline-audit pattern the writers use)
5. **Distributor** (needs Geography; writes `ADD_DISTRIBUTOR`/`CHANGE_DISTRIBUTOR_*`)
6. **Payment** (needs Activator credits + Admin recorder; writes `SET_PAYMENT`/`DELETE_PAYMENT`)
7. **Statistics** (reads everything — build last)

> These complement **set 02** (the inventory + activation pipeline). The denormalized counters Statistics/Distributor read (`nbOfActiveCards`, `nbOfActivation`, `credits`) are written by the set-02 Order/Card/Activation/Payment transactions — never by the read modules here.

---

## 1. Founding gaps & assumptions

### 1.1 Live activator presence (`onlineNow`) — RESOLVED (no realtime dependency)

**Decision (confirmed 2026-06-30):** `ActivatorsSummaryDTO.onlineNow` is computed as the **count of enabled activators** (`User.role=ACTIVATOR`, `isEnabled=true`, `deletedAt=null`) — **not** live socket presence. The realtime gateway tracks no presence today, and `realtime-rules.md` §11.2 forbids a service from importing `getIO()`; this interpretation keeps Statistics a pure DB read with **no framework change**. `DashboardStatsDTO.activeActivators` uses the **same** enabled-activator count for consistency. (If true live presence is wanted later, add a presence registry in `common/realtime` exposing a plain accessor — a separate, additive sprint.)

### 1.2 Spec ↔ contract divergences — contract wins (per standing rule "the contract WHICH")

- **`DashboardStatsDTO`.** The spec (§2/§4) narrates four rich cards (activation totals + trend, activator enabled/disabled/online, distributor enabled/with-stock, active cards + distinct distributors). The **contract** ships a leaner shape: `{ activationsToday, totalRevenue, pendingActivations, activeActivators }`. **Plan to the contract.** Mapping: `activationsToday` = activations **completed** today (Algiers tz); `totalRevenue` = Σ `activationPrice` over completed activations; `pendingActivations` = count `ActivationStat.PENDING`; `activeActivators` = enabled activators (§1.1). The spec's deeper breakdowns already live in the dedicated `*_SUMMARY` endpoints.
- **`InventorySummaryDTO`.** Contract = `{ sets[], lots[], cards[] (each {stat,count}), cardFlags:{disabled,revoked} }`. The spec's "cards awaiting delivery" / "active cards" have **no contract field** → omitted (derivable frontend-side from the `cards[]` groups). Plan to the contract shape.
- **Zero-count groups omitted.** Per the contract's own note, `sets/lots/cards/byState` arrays **omit** zero-count stats; consumers treat a missing stat as `0`. The service must not emit `count:0` rows.

### 1.3 `createLog` — HOW resolved toward the established inline pattern (noted)

The Log spec (§4) describes an internal `createLog(actionType, description, userId)` other services call **inside their transaction**. The shipped codebase (set 01: `activator.service.ts`, `admin.service.ts`) writes audit rows **inline** via `tx.log.create({ data: {...} })`. Resolving toward the existing pattern (and `module-implementation-rules.md`, which shows services using Prisma directly): **Distributor and Payment write their `Log` rows inline within their own `$transaction`**; the **Log module owns only the read surface** (`GET_ALL`). A shared `createLog` helper is **optional** sugar (a static `(tx, type, desc, userId)` writer) — not required, and not a refactor of existing modules. Noted as a deliberate divergence.

### 1.4 Principal → entity resolution

- **Log author.** `Log.userId` is a FK to `User.id`, so audit writes use `actorId = req.user.id` **directly** (no lookup) — matches set 01.
- **Payment recorder.** `Payment.adminId` is a FK to **`Admin.id`**, not `User.id`. The service resolves the `Admin` row by `userId = req.user.id` → `adminId`, and `recordedByName` from `Admin.fullName`. (The `Log` row for the payment still uses `userId = req.user.id`.)

### 1.5 No events, no realtime

All seven specs declare **§3 Events: none**. No module in set 03 has a `listener.ts`, emits to `eventBus`, or imports anything from `common/realtime`. Audit is inline (§1.3). This is consistent with `realtime-rules.md` (only Activation touches realtime).

### 1.6 Module-local helpers (not gaps)

- **Algiers-timezone boundaries** (Statistics). "Today / this week / this month" cutoffs use Africa/Algiers (UTC+1, no DST) per spec §6 → a module-local `statistics.time.ts` computing day/week/month/period bounds. No new dependency required.
- **Decimal → number (2dp)** and **date → ISO**: the same per-mapper helpers used across the codebase (set 01/02).

---

## 2. Shared conventions for this set

Identical to set 02 §2 — restated for the cross-cutting points that recur here:

| Concern | Decision |
|---|---|
| **DI** | `routes.ts` wires `new Service(prisma)` → `new Controller(service)`; manual, no framework. |
| **Auth** | every route `requireAuth({ roles:[UserRole.ADMIN] })`. No public or activator surface in set 03. |
| **Errors** | `@common/errors`: `NotFoundError` (404), `ConflictError` (409), `BadRequestError` (400/`VALIDATION_ERROR`), `ForbiddenError` (403). |
| **Responses** | `sendSuccess(res, data, status)` — `201` create, `200` read/update/toggle, `204` delete. |
| **Validation** | `validateRequest({ params, query, body })` in `routes.ts`; controller reads `req.validated.*` only. |
| **Pagination** | `toSkipTake` + `buildPaginationMeta` → `{ items, meta }` for the **paginated** modules (Distributor, Log, Payment). Delivery Company / Geography / Subscription Plan / Statistics return **plain** shapes (small/fixed sets) — no pagination. |
| **Mapper conformance** | every `toDTO` ends with `XResponseSchema.parse(...)`; lists returned fields (no entity spread); `Decimal`→number 2dp; dates→ISO. |
| **`actorId`** | mutations needing a `Log` take `req.user.id`. |

---

## 3. Module: **Geography** (read-only reference)

**`apps/api/src/modules/geography/`** — mount at `GEOGRAPHY_ROUTES.BASE` (`/geography`).

- [ ] `geography.mapper.ts` — `Wilaya`→`WilayaDTO`, `Commune`→`CommuneDTO`.
- [ ] `geography.interface.ts` — `IGeographyService`.
- [ ] `geography.service.ts` — getWilayas / getCommunes.
- [ ] ~~`geography.listener.ts`~~ — none.
- [ ] `geography.controller.ts` — 2 handlers.
- [ ] `geography.routes.ts` — composition root (admin-only).

**Contract (verified):** `GEOGRAPHY_ROUTES`, `WilayaResponseSchema/WilayaDTO`, `CommuneResponseSchema/CommuneDTO`, `WilayaIdParamsSchema`. No command, no events.

**DTOs:** `WilayaDTO = { id, wilayaCode, frName, arName }`; `CommuneDTO = { id, communeCode, wilayaId, frName, arName }`.

**Interface** — `getWilayas(): Promise<WilayaDTO[]>` · `getCommunes(wilayaId): Promise<CommuneDTO[]>`.

**Service**
- **getWilayas** — list all `Wilaya` ordered by `wilayaCode` → map (all 58, unpaginated).
- **getCommunes** — validate the wilaya exists (`RESOURCE_NOT_FOUND`) → `Commune` where `wilayaId` ordered by `communeCode` → map (empty array allowed).

**Routes** (admin-only): `GET_WILAYAS` GET `/wilayas` → `WilayaDTO[]`; `GET_COMMUNES` GET `/wilayas/:wilayaId/communes` (params `WilayaIdParamsSchema`) → `CommuneDTO[]`.

**Mapper** — pure pass-through of bilingual fields (both `frName`/`arName` always returned for frontend i18n). No dates, no sensitive fields.

---

## 4. Module: **Delivery Company**

**`apps/api/src/modules/delivery-company/`** — mount at `DELIVERY_COMPANY_ROUTES.BASE` (`/delivery-companies`).

- [ ] `delivery-company.mapper.ts` — `DeliveryCompany`→`DeliveryCompanyDTO`.
- [ ] `delivery-company.interface.ts` — `IDeliveryCompanyService`.
- [ ] `delivery-company.service.ts` — getAll / create / update / toggle.
- [ ] ~~`delivery-company.listener.ts`~~ — none.
- [ ] `delivery-company.controller.ts` — 4 handlers.
- [ ] `delivery-company.routes.ts` — composition root (admin-only).

**Contract (verified):** `DELIVERY_COMPANY_ROUTES`, `DeliveryCompanyResponseSchema/DTO`, `CreateDeliveryCompanySchema/Command`, `UpdateDeliveryCompanySchema/Command`, `GetDeliveryCompaniesQuerySchema` (`{ active? }`, `BooleanQuerySchema`), `DeliveryCompanyIdParamsSchema`. No events. **No `Log` type → no audit.** **No DELETE by design** (retire via `toggle`).

**DTO:** `DeliveryCompanyDTO = { id, name, registeredName, isActive }`.

**Interface** — `getAll(query)` · `create(cmd)` · `update(id, cmd)` · `toggle(id)`, all → `DeliveryCompanyDTO`(`[]` for getAll).

**Service**
- **getAll** — query `DeliveryCompany`; when `active=true` filter `isActive=true`; order by `name` → `DeliveryCompanyDTO[]` (unpaginated).
- **create** — trim → create (`isActive` defaults true). *(Optional, off by default: reject exact duplicate `name` with `RESOURCE_CONFLICT`.)*
- **update** — load or `RESOURCE_NOT_FOUND` → apply provided fields (trim) → return.
- **toggle** — load or `RESOURCE_NOT_FOUND` → flip `isActive` → return.

**Routes** (admin-only): `GET_ALL` GET `/` (query) · `CREATE` POST `/` (body) → 201 · `UPDATE` PATCH `/:id` (params+body) · `TOGGLE` POST `/:id/toggle` (params).

**Mapper** — pass `{ id, name, registeredName, isActive }`; no dates/sensitive fields. `toPersistence` trims `name`/`registeredName`.

---

## 5. Module: **Subscription Plan** (plans + commission matrix)

**`apps/api/src/modules/subscription-plan/`** — mount at `SUBSCRIPTION_PLAN_ROUTES.BASE` (`/subscription-plans`).

- [ ] `subscription-plan.mapper.ts` — plan→`SubscriptionPlanDTO` (composed `label`), tier→`CommissionDurationDTO`, matrix assembly, cell→`CommissionCellDTO`.
- [ ] `subscription-plan.interface.ts` — `ISubscriptionPlanService`.
- [ ] `subscription-plan.service.ts` — getAll / create / toggle / getCommissionDurations / getCommissions / updateCommission.
- [ ] ~~`subscription-plan.listener.ts`~~ — none.
- [ ] `subscription-plan.controller.ts` — 6 handlers.
- [ ] `subscription-plan.routes.ts` — composition root (admin-only).

**Contract (verified):** `SUBSCRIPTION_PLAN_ROUTES`, enums `SubscriptionType`/`SubscriptionDuration`, `SubscriptionPlanResponseSchema/DTO`, `CommissionDurationResponseSchema/DTO`, `CommissionCellResponseSchema/DTO`, `CommissionMatrixResponseSchema/DTO`, `CreateSubscriptionPlanSchema/Command`, `UpdateCommissionSchema/Command`, `GetSubscriptionPlansQuerySchema` (`{ active? }`), `SubscriptionPlanIdParamsSchema`. Log: `CHANGE_ACTIVATION_COMMISSION` (commission edits only).

**DTOs:** `SubscriptionPlanDTO = { id, subscriptionType, subscriptionDuration, label, isActive }`; `CommissionDurationDTO = { id, key, label, nbMinuteMin, nbMinuteMax|null }`; `CommissionMatrixDTO = { tiers: CommissionDurationDTO[], rows: { planId, planLabel, cells:{ commissionDurationId, commission|null }[] }[] }`; `CommissionCellDTO = { subscriptionPlanId, commissionDurationId, commission }`.

**Interface** — `getAll(query)` · `create(cmd)` · `toggle(id)` · `getCommissionDurations()` · `getCommissions()` · `updateCommission(cmd, actorId)`.

**Service**
- **getAll** — query `SubscriptionPlan`; `active` filter when present; compose `label` (type + duration, e.g. "Snapchat Plus — 01 Month") → `SubscriptionPlanDTO[]`.
- **create** — validate `(subscriptionType, subscriptionDuration)` unique (`@@unique`) → collision → `RESOURCE_CONFLICT` → create (`isActive` true). **Not logged.**
- **toggle** — load or `RESOURCE_NOT_FOUND` → flip `isActive`. **Not logged.**
- **getCommissionDurations** — list `CommissionDuration` ordered by `nbMinuteMin` → `CommissionDurationDTO[]` (seed-managed, read-only).
- **getCommissions** — load active plans + all tiers + existing `SubscriptionPlanCommission` rows → assemble `CommissionMatrixDTO`; a missing (plan, tier) cell → `commission: null`.
- **updateCommission** — **upsert** `SubscriptionPlanCommission` for `(subscriptionPlanId, commissionDurationId)` with `commission` → `Log CHANGE_ACTIVATION_COMMISSION` → return the cell. **Future-only:** never recomputes completed activations' stored `activationPrice`.

**Routes** (admin-only): `GET_ALL` GET `/` (query) · `CREATE` POST `/` (body) → 201 · `GET_COMMISSION_DURATIONS` GET `/commission-durations` · `GET_COMMISSIONS` GET `/commissions` · `UPDATE_COMMISSION` PATCH `/commissions` (body) · `TOGGLE` POST `/:id/toggle` (params).
> Register the static `/commission-durations` and `/commissions` GETs **before** `/:id/...` (no param GET exists, so no hard collision, but keep static-first for safety).

**Mapper** — `SubscriptionPlanDTO` passes both enums + composed `label`; commission `Decimal`→number (2dp); `nbMinuteMax` may be null. `toPersistence`: `commission` as `Decimal`.

---

## 6. Module: **Log** (read-only audit trail)

**`apps/api/src/modules/log/`** — mount at `LOG_ROUTES.BASE` (`/logs`).

- [ ] `log.mapper.ts` — `Log`(+actor)→`LogDTO`.
- [ ] `log.interface.ts` — `ILogService`.
- [ ] `log.service.ts` — getAll *(+ optional shared `createLog`, §1.3)*.
- [ ] ~~`log.listener.ts`~~ — none.
- [ ] `log.controller.ts` — 1 handler.
- [ ] `log.routes.ts` — composition root (admin-only).

**Contract (verified):** `LOG_ROUTES` (`GET_ALL` only), `LogActionType`, `LogResponseSchema/LogDTO`, `PaginatedLogsSchema`, `GetLogsQuerySchema` (`{ page,limit,userId?,actionType?,dateFrom?,dateTo?,search? }`). No command, no events. **Append-only — no create/update/delete HTTP surface.**

**DTO:** `LogDTO = { id, actionType, actionDescription, userName(resolved actor), createdAt }`.

**Interface** — `getAll(query): Promise<PaginatedResult<LogDTO>>` *(+ optional `createLog(tx, actionType, description, userId)`)*.

**Service**
- **getAll** — query `Log` join `User`; filters `userId`/`actionType`/`dateFrom`/`dateTo`/`search`(over `actionDescription`) → order `createdAt` **desc** → paginate → resolve `userName` → map.
- **(optional) createLog** — inserts a `Log` row inside the caller's `tx`. Per §1.3 the established pattern is inline `tx.log.create`; this helper is sugar only.

**Routes** (admin-only): `GET_ALL` GET `/` (query `GetLogsQuerySchema`) → `{ items: LogDTO[], meta }`.

**Mapper** — `userName` resolved from the actor's profile (`Admin`/`Activator` `fullName`, fallback `User.username`); pass `actionType`; `createdAt`→ISO.

---

## 7. Module: **Distributor**

**`apps/api/src/modules/distributor/`** — mount at `DISTRIBUTOR_ROUTES.BASE` (`/distributors`).

- [ ] `distributor.mapper.ts` — `Distributor`(+wilaya/commune, +derived)→`DistributorDTO`/`DistributorDetailDTO`.
- [ ] `distributor.interface.ts` — `IDistributorService`.
- [ ] `distributor.service.ts` — getAll / create / getById / update / toggle / delete.
- [ ] ~~`distributor.listener.ts`~~ — none.
- [ ] `distributor.controller.ts` — 6 handlers.
- [ ] `distributor.routes.ts` — composition root (admin-only).

**Contract (verified):** `DISTRIBUTOR_ROUTES`, `DistributorResponseSchema/DTO`, `DistributorDetailResponseSchema/DetailDTO`, `PaginatedDistributorsSchema`, `CreateDistributorSchema/Command`, `UpdateDistributorSchema/Command`, `GetDistributorsQuerySchema` (`{ page,limit,search?,wilayaId?,communeId? }`), `DistributorIdParamsSchema`. Logs: `ADD_DISTRIBUTOR`, `CHANGE_DISTRIBUTOR_INFORMATION`, `CHANGE_DISTRIBUTOR_STAT` (no `REMOVE_DISTRIBUTOR` → delete not logged).

**DTOs:** `DistributorDTO = { id, fullName, storeName, phone, wilayaId, wilayaName, communeId, communeName, isEnabled, nbOfActiveCards, nbOfActivation, deliveredOrdersCount(derived), createdAt }`. **Detail** adds `{ soldKeys(derived), ordersCount(derived) }` (`remainingCards`=`nbOfActiveCards`, `activationsCount`=`nbOfActivation` already on base).

**Interface** — `getAll(query): PaginatedResult<DistributorDTO>` · `create(cmd, actorId): DistributorDTO` · `getById(id): DistributorDetailDTO` · `update(id, cmd, actorId): DistributorDTO` · `toggle(id, actorId): DistributorDTO` · `delete(id, actorId): void`.

**Service**
- **getAll** — join `Wilaya`/`Commune`; filters `search`(fullName/storeName/phone) + `wilayaId`/`communeId`; **exclude `deletedAt != null`**; paginate; derive `deliveredOrdersCount` (distinct delivered orders for this distributor); resolve names.
- **create** — verify `communeId ∈ wilayaId` (else `VALIDATION_ERROR`) → **$transaction** { create `Distributor` (counters 0, `isEnabled` true) → `Log ADD_DISTRIBUTOR` } → resolved DTO.
- **getById** — load or `RESOURCE_NOT_FOUND` → derive `soldKeys` (cards `ACTIVATED` for this distributor) + `ordersCount` (total orders) → `DistributorDetailDTO`.
- **update** — load → if `wilayaId`/`communeId` change, re-validate commune ∈ wilaya (else `VALIDATION_ERROR`) → **$transaction** { apply fields (trim) → `Log CHANGE_DISTRIBUTOR_INFORMATION` }.
- **toggle** — **$transaction** { flip `isEnabled` → `Log CHANGE_DISTRIBUTOR_STAT` }.
- **delete** — soft-delete (`deletedAt=now`). *(Optional edge: `RESOURCE_CONFLICT` if `nbOfActiveCards>0` or open orders.)* **Not logged** (no matching type).

> `nbOfActiveCards`/`nbOfActivation` are **read-only here** — maintained by set-02 Order/Card/Activation transactions (see set-02 §3).

**Routes** (admin-only): `GET_ALL` GET `/` (query) · `CREATE` POST `/` (body) → 201 · `GET_BY_ID` GET `/:id` (params) · `UPDATE` PATCH `/:id` (params+body) · `TOGGLE` POST `/:id/toggle` (params) · `DELETE` DELETE `/:id` (params) → 204.

**Mapper** — resolve `wilayaName`/`communeName` while keeping ids (edit-form selects); counts `Int`; `createdAt`→ISO; derived fields computed not stored; no sensitive fields. `toPersistence`: trim `fullName`/`storeName`/`phone`; init counters 0.

---

## 8. Module: **Payment** (writes `Activator.credits`)

**`apps/api/src/modules/payment/`** — mount at `PAYMENT_ROUTES.BASE` (`/payments`).

- [ ] `payment.mapper.ts` — `Payment`(+recorder)→`PaymentDTO`.
- [ ] `payment.interface.ts` — `IPaymentService`.
- [ ] `payment.service.ts` — getAll / create / delete.
- [ ] ~~`payment.listener.ts`~~ — none.
- [ ] `payment.controller.ts` — 3 handlers.
- [ ] `payment.routes.ts` — composition root (admin-only).

**Contract (verified):** `PAYMENT_ROUTES`, `PaymentResponseSchema/PaymentDTO`, `PaginatedPaymentsSchema`, `RecordPaymentSchema/Command` (`{ activatorId, amount>0, date? }`), `GetPaymentsQuerySchema` (`{ activatorId?, includeDeleted?, page, limit }`), `PaymentIdParamsSchema`. Logs: `SET_PAYMENT`, `DELETE_PAYMENT`.

**DTO:** `PaymentDTO = { id, activatorId, amount, previousCredits, paymentDate, recordedByName(resolved), isDeleted }`.

**Interface** — `getAll(query): PaginatedResult<PaymentDTO>` · `create(cmd, actorUserId): PaymentDTO` · `delete(id, actorUserId): void`.

**Service** *(resolve the recording `Admin` by `userId` → `adminId`; §1.4)*
- **getAll** — join `Admin` (recorder); filter `activatorId` when present; exclude `isDeleted` unless `includeDeleted=true`; order `paymentDate` **desc**; paginate; resolve `recordedByName`.
- **create** — load activator or `RESOURCE_NOT_FOUND`; `amount > 0` (`VALIDATION_ERROR`); `amount ≤ activator.credits` (`RESOURCE_CONFLICT` — relaxable); snapshot `previousCredits = activator.credits` → **$transaction** { create `Payment`(`adminId=resolved admin`, `activatorId`, `totalAmount=amount`, `previousCredits`, `paymentDate = date ?? now`) → `activator.credits -= amount` → `Log SET_PAYMENT` }.
- **delete** — load or `RESOURCE_NOT_FOUND`; if already `isDeleted` → `RESOURCE_CONFLICT` → **$transaction** { `isDeleted=true`, `deletedDate=now` → `activator.credits += amount` (reverse) → `Log DELETE_PAYMENT` }.

**Routes** (admin-only): `GET_ALL` GET `/` (query) · `CREATE` POST `/` (body) → 201 · `DELETE` DELETE `/:id` (params) → 204.

**Mapper** — `amount` ← `totalAmount`, `previousCredits` `Decimal`→number (2dp); `recordedByName` from recording `Admin.fullName`; `paymentDate`→ISO; pass `isDeleted`. `toPersistence`: `amount` as `Decimal`; snapshot `previousCredits`; `paymentDate` from input or now.

---

## 9. Module: **Statistics** (read-only aggregation)

**`apps/api/src/modules/statistics/`** — mount at `STATISTICS_ROUTES.BASE` (`/statistics`). Owns **no entity**; every figure is computed server-side.

- [ ] `statistics.mapper.ts` — shape each aggregate into its DTO (counts `Int`, money 2dp, durations seconds, series `{date,value}`).
- [ ] `statistics.interface.ts` — `IStatisticsService`.
- [ ] `statistics.service.ts` — 9 read methods.
- [ ] `statistics.time.ts` — module-local Algiers-tz (UTC+1) day/week/month/period boundary helpers (§1.6).
- [ ] ~~`statistics.listener.ts`~~ — none.
- [ ] `statistics.controller.ts` — 9 handlers.
- [ ] `statistics.routes.ts` — composition root (admin-only).

**Contract (verified):** `STATISTICS_ROUTES`, `DashboardStatsResponseSchema/DTO`, `ActivatorsSummaryResponseSchema/DTO`, `DistributorsSummaryResponseSchema/DTO`, `InventorySummaryResponseSchema/DTO`, `OrdersSummaryResponseSchema/DTO`, `ActivationsSummaryResponseSchema/DTO`, `StatisticsOverviewResponseSchema/DTO`, `WilayaHeatmapResponseSchema/DTO`, `WilayaDrilldownResponseSchema/DTO`, `StatisticsOverviewQuerySchema`, `WilayaHeatmapQuerySchema`, `WilayaDrilldownQuerySchema`, `StatisticsPeriodSchema`. `WilayaIdParamsSchema` is reused from **geography** for the drilldown path. No command, no events.

**Endpoints → computation (all read-only; Algiers tz boundaries):**

| Route | DTO | Source / computation |
|---|---|---|
| `DASHBOARD` GET `/dashboard` | `DashboardStatsDTO` | `activationsToday` = completed today; `totalRevenue` = Σ `activationPrice` (completed); `pendingActivations` = `PENDING` count; `activeActivators` = enabled activators (§1.1/§1.2) |
| `ACTIVATORS_SUMMARY` GET `/activators` | `ActivatorsSummaryDTO` | `totalActivators` (non-deleted); `onlineNow` = **enabled activators** (§1.1); `totalSuccessful` = Σ `nbOfSuccessfulActivation`; `totalCreditsOwed` = Σ `credits` |
| `DISTRIBUTORS_SUMMARY` GET `/distributors` | `DistributorsSummaryDTO` | `totalDistributors`; `activeWithStock` (`nbOfActiveCards>0`); `totalCardsInStock` = Σ `nbOfActiveCards`; `activationsThisMonth` |
| `INVENTORY_SUMMARY` GET `/inventory` | `InventorySummaryDTO` | group `Set`/`Lot`/`Card` by stat (**omit zero groups**); `cardFlags`={disabled,revoked} counts |
| `ORDERS_SUMMARY` GET `/orders` | `OrdersSummaryDTO` | `totalOrders`{all,month,week}; `byState[]`; `pendingDelivery`/`inDelivery`; `totalRevenue` = Σ `Order.orderPrice` |
| `ACTIVATIONS_SUMMARY` GET `/activations` | `ActivationsSummaryDTO` | `total`{all,today,week,month}; `byState[]`; `avgDurationSeconds` = avg `takenAt→completedAt` (nullable); `totalRevenue` = Σ `activationPrice` |
| `OVERVIEW` GET `/overview` | `StatisticsOverviewDTO` | query `StatisticsOverviewQuerySchema` (`period` + optional `dateFrom/dateTo`/`subscriptionPlanId`/`wilayaId`); 6 series, bucket granularity (daily/weekly) derived from period span; empty period → zeroed series (not an error) |
| `WILAYA_HEATMAP` GET `/wilaya-heatmap` | `WilayaHeatmapDTO[]` | query `WilayaHeatmapQuerySchema`; per-wilaya distributors/activations/cancellations/avg-time; **return all 58** (zeroed where empty) |
| `WILAYA_DRILLDOWN` GET `/wilaya/:wilayaId` | `WilayaDrilldownDTO` | params `WilayaIdParamsSchema` (geography) + query `WilayaDrilldownQuerySchema`; validate wilaya (`RESOURCE_NOT_FOUND`); per-wilaya topDistributors/activationsByPlan/activationsOverTime |

> Register `WILAYA_HEATMAP` (`/wilaya-heatmap`, static) before `WILAYA_DRILLDOWN` (`/wilaya/:wilayaId`, param) — different segment counts so no hard clash, but keep static-first.

**Interface** — one method per route: `dashboard()`, `activatorsSummary()`, `distributorsSummary()`, `inventorySummary()`, `ordersSummary()`, `activationsSummary()`, `overview(query)`, `wilayaHeatmap(query)`, `wilayaDrilldown(wilayaId, query)` — each returning its contract DTO.

**Service** — read-only aggregates via Prisma `groupBy`/`count`/`aggregate`; **revenue** = Σ completed-activation `activationPrice` (dashboard/activations/overview) or Σ `Order.orderPrice` (orders summary); durations from `takenAt→completedAt`; all "today/week/month/period" cutoffs via `statistics.time.ts` (Algiers). **No writes, no sensitive fields surface.**

**Mapper** — counts `Int`; money `Decimal`→number (2dp); time-series `{ date(ISO)|label, value }`; resolve `wilayaName`/`subscriptionLabel`; honor the "omit zero groups" contract note.

---

## 10. `modules/index.ts` additions

```
moduleRouter.use(GEOGRAPHY_ROUTES.BASE, geographyRouter);
moduleRouter.use(DELIVERY_COMPANY_ROUTES.BASE, deliveryCompanyRouter);
moduleRouter.use(SUBSCRIPTION_PLAN_ROUTES.BASE, subscriptionPlanRouter);
moduleRouter.use(LOG_ROUTES.BASE, logRouter);
moduleRouter.use(DISTRIBUTOR_ROUTES.BASE, distributorRouter);
moduleRouter.use(PAYMENT_ROUTES.BASE, paymentRouter);
moduleRouter.use(STATISTICS_ROUTES.BASE, statisticsRouter);
```

---

## 11. Test strategy (`test/`, per `test-rules.md`)

**Factories (`test/data/`)** — most already created in set 02 (`subscription-plan`, `geography`, `delivery-company`, `distributor`, plus `card`/`order`/`activation`/`activator`). Add only what's missing: `delivery-company.factory`, `subscription-plan-commission.factory` (plan + `CommissionDuration` tiers + `SubscriptionPlanCommission` cells), `log.factory` (seed `Log` rows of varied `actionType`/actor), `payment.factory`. Reuse set-01 `activator`/`admin` seeds. No hardcoded ids.

**Unit — service (mock Prisma)** — per §7 of each spec: Delivery Company `active` filter + toggle + update 404; Subscription Plan `(type,duration)` uniqueness 409 + matrix `null` cells + `updateCommission` upsert→`CHANGE_ACTIVATION_COMMISSION` + future-only; Log ordering newest-first + each filter; Distributor commune∈wilaya 400 (create+update) + correct `Log` per mutation + soft-delete + derived `soldKeys`/`ordersCount`; Payment snapshot+decrement+`SET_PAYMENT`, `amount>credits` 409, `amount≤0` 400, unknown activator 404, delete reverse+`DELETE_PAYMENT`+already-deleted 409; Statistics boundary math (Algiers cutoffs), omit-zero groups, `onlineNow`=enabled count, heatmap all-58, drilldown 404.

**Unit — mapper** — every `toDTO` parses its schema; `Decimal`→number 2dp (Payment/Subscription commission/Statistics revenue); dates→ISO; resolved names present; no sensitive fields.

**Integration (Supertest)** — happy path + guard codes per route; **403** non-admin on **every** endpoint (all admin-only); Distributor/Payment audit rows appear after the action; Statistics endpoints return their DTO shape and honor filters (`overview` empty period → zeroed; heatmap 58; drilldown 404).

**Conformance** — assert every `GEOGRAPHY_ROUTES`/`DELIVERY_COMPANY_ROUTES`/`SUBSCRIPTION_PLAN_ROUTES`/`LOG_ROUTES`/`DISTRIBUTOR_ROUTES`/`PAYMENT_ROUTES`/`STATISTICS_ROUTES` constant is registered; parse representative `res.body.data` through the matching response schema (e.g. `DistributorDetailResponseSchema`, `CommissionMatrixResponseSchema`, `StatisticsOverviewResponseSchema`).

---

## 12. Build order summary (one module per sprint, commit on green)

1. **Geography** — 2 read endpoints (seed validation).
2. **Delivery Company** — CRUD-minus-delete; no audit.
3. **Subscription Plan** — plans + commission matrix; `CHANGE_ACTIVATION_COMMISSION` on cell edits.
4. **Log** — read surface; inline-audit pattern documented (§1.3).
5. **Distributor** — CRUD + geography validation + 3 audit types; read-only counters.
6. **Payment** — credits movement + reversal + 2 audit types; Admin-recorder resolution.
7. **Statistics** — 9 read-only aggregates; Algiers-tz boundaries; `onlineNow`=enabled activators.

> Each sprint: `tsc --noEmit` clean, unit + integration + conformance green, admin-gated via contract route constants, mappers exclude sensitive fields and parse their schemas, no `console.*` / no `process.env` outside `env.ts`. **No module here emits/listens or imports `getIO()`** — set 03 touches no realtime, and adds **no** contract or framework changes.
