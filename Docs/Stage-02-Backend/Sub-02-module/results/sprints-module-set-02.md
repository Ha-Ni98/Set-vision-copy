# Sprints — Set / Lot / Order / Card / Activation (Sub-02 module set 02)

> Stage 02 · Sub-02 · Phase 02 — dependency-ordered sprints. **No code.**
> Plan: `results/plan-module-set-02.md` · Rules: `module-implementation-rules.md`, `realtime-rules.md`.
> Order law (phase §3): **foundation (mapper/interface) → logic (service) → API (controller/wiring)**, per module.
> Module order (plan §0): **Set → Lot → Order → Card → Activation** (the `Card` lifecycle chain).

---

## Dependency order & status

| # | Sprint | Layer | Depends on | Status |
|---|--------|-------|-----------|--------|
| 1 | Set — Foundation (mapper + interface + generators) | foundation | Sub-01, contract | ✅ Done |
| 2 | Set — Logic (service) | logic | S1 | ✅ Done |
| 3 | Set — API (controller + wiring) | api | S2 | ✅ Done |
| 4 | Lot — Foundation (mapper + interface) | foundation | S1 (card factory) | ✅ Done |
| 5 | Lot — Logic (service) | logic | S4, S2 (PRINTED cards) | ✅ Done |
| 6 | Lot — API (controller + wiring) | api | S5 | ✅ Done |
| 7 | Order — Foundation (mapper + interface) | foundation | S4 | ✅ Done |
| 8 | Order — Logic (service) | logic | S7, S5 (lots) | ✅ Done |
| 9 | Order — API (controller + wiring) | api | S8 | ✅ Done |
| 10 | Card — Foundation (mapper + interface) | foundation | S1 (card factory) | ✅ Done |
| 11 | Card — Logic (service) | logic | S10, S8 (distributed cards) | ✅ Done |
| 12 | Card — API (controller + wiring) | api | S11 | ✅ Done |
| 13 | Activation — Foundation (contract `RELEASE` + mapper + interface) | foundation | S10, contract edit | ✅ Done |
| 14 | Activation — Logic A (client + activator service) | logic | S13 | ⬜ Pending |
| 15 | Activation — Logic B (admin service) | logic | S14 | ⬜ Pending |
| 16 | Activation — API + Realtime (controllers + two routers) | api | S15, Sub-01 Sprint 5 (gateway) | ⬜ Pending |

**Cross-cutting validation** (applies to every sprint, in addition to its own block):
- `tsc --noEmit` clean across `apps/api` (and `packages/contract` for S13).
- Routes use **contract route constants** only; responses go through `sendSuccess`; every list endpoint paginates via `buildPaginationMeta`.
- Mappers build DTOs by **listing returned fields** (never spread the entity); each `toDTO` ends with `XResponseSchema.parse(...)`; `Decimal`→number 2dp; dates→ISO.
- No `console.*`; no `process.env` outside `env.ts`. Services throw `AppError` subclasses. Committed on green.
- (Activation only) services import **`eventBus`** and never `getIO()`; every `eventBus.emit(...)` runs **after** the Prisma transaction commits.

> No Sprint 0: this set needs **no framework corrections** — `requireAuth({roles})`, pagination, `eventBus` (typed with `ActivationEvents`), `sendSuccess`, the error classes, and the realtime gateway all shipped in earlier sub-stages. The only out-of-band change is the one-line contract addition, folded into S13. Reference rows the modules resolve (SubscriptionPlan, Distributor, Wilaya/Commune, DeliveryCompany, CommissionDuration) are **seeded directly via Prisma test factories** — their modules are not prerequisites here.

---

### Sprint 1: Set — Foundation (mapper + interface + generators)   — Status: ✅ Done

**Goals**
- Pure `SetMapper`, `ISetService` contract, the `setNumber`/card-`key` format helpers, and the shared factories Set + everything downstream rely on.

**Tasks**
- [ ] Impl: `src/modules/set/set.mapper.ts` — `toDTO(set, plan): SetDTO` (resolve `subscriptionLabel`; `createdAt`/`printedAt`→ISO; `setStat as SetStat`); end with `SetResponseSchema.parse`.
- [ ] Impl: `src/modules/set/set.interface.ts` — `ISetService` { `getAll(query)`, `create(cmd, actorId)`, `transition(id, cmd)`, `delete(id, actorId)` } returning contract DTOs.
- [ ] Impl: `src/modules/set/set.util.ts` — pure `generateSetNumber()` + `generateCardKey()` format helpers (uniqueness enforced in the service against the `@unique` columns).
- [ ] Test data: `test/data/subscription-plan.factory.ts` (`seedPlan`, incl. `isActive`), `test/data/set.factory.ts` (`setEntity`/`seedSet`), `test/data/card.factory.ts` (`cardEntity`/`seedCard` for any `cardStat`) — created here since Set generates cards; reused by Lot/Order/Card/Activation. No hardcoded ids.
- [ ] Test: `test/unit/modules/set/set.mapper.spec.ts` — parses `SetResponseSchema`; `subscriptionLabel` resolved; `printedAt` null↔ISO; no entity spread.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Interface returns DTOs (no Prisma entities); mapper parses its schema; generators are pure (no DB).
- [ ] Committed on green.

---

### Sprint 2: Set — Logic (service)   — Status: ✅ Done

**Goals**
- `SetService implements ISetService`: list, create (+card generation transaction), transition (+`→PRINTED` cascade), delete (+cascade + log).

**Tasks**
- [ ] Impl: `src/modules/set/set.service.ts` (injects `PrismaClient`):
  - getAll — join `SubscriptionPlan`; filters `search`(setNumber)/`subscriptionPlanId`/`state`; `toSkipTake` + `buildPaginationMeta`.
  - create — validate plan exists **and `isActive`** (else `VALIDATION_ERROR`); unique `setNumber`; **$transaction** { `Set`(`NOT_PRINTED`) → batch `numberOfKeys` `Card`(`IN_SET`, `isActive=false`, unique `key`, `setId`, `subscriptionPlanId`) }.
  - transition — load or `RESOURCE_NOT_FOUND`; allow `NOT_PRINTED→PENDING_PRINTING` / `PENDING_PRINTING→PRINTED` only (else `RESOURCE_CONFLICT`); on `→PRINTED` **$transaction** { `printedAt=now` → cards `IN_SET→PRINTED` }.
  - delete — guard `setStat ∈ {NOT_PRINTED, PENDING_PRINTING}` (else `RESOURCE_CONFLICT`); **$transaction** { hard-delete set cards → delete `Set` }; `Log REMOVE_SET` (`userId=actorId`).
- [ ] Test: `test/unit/modules/set/set.service.spec.ts` (mock Prisma) — create generates **exactly** `numberOfKeys` cards in `IN_SET`; missing/inactive plan → `VALIDATION_ERROR`; illegal transition → `RESOURCE_CONFLICT`; `→PRINTED` cascades cards + sets `printedAt`; delete `PRINTED` → 409; delete writes `REMOVE_SET`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Card generation + `→PRINTED` cascade + delete run inside `$transaction`; only `REMOVE_SET` is logged (create/transition write none).
- [ ] Committed on green.

---

### Sprint 3: Set — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Thin controller, composition root, admin-gated routes, integration + conformance. First module of set 02 mounted on `moduleRouter`.

**Tasks**
- [ ] Impl: `src/modules/set/set.controller.ts` — 4 handlers; `req.user.id` as `actorId`; `201` create, `200` getAll/transition, `204` delete; `try/catch → next`.
- [ ] Impl: `src/modules/set/set.routes.ts` — manual DI (`new SetService(prisma)` → `SetController`); `requireAuth({ roles:[UserRole.ADMIN] })` on all; `validateRequest` per segment (`GetSetsQuerySchema`, `CreateSetSchema`, `SetIdParamsSchema`+`TransitionSetSchema`).
- [ ] Wire: mount `setRouter` at `SET_ROUTES.BASE` in `src/modules/index.ts`.
- [ ] Test: `test/integration/set.integration.spec.ts` — 201 create (+`numberOfKeys` cards seeded) / 400 inactive plan / **403** non-admin; 200 list with filters; 200 transition step / 409 illegal; 204 delete `NOT_PRINTED` (+cards gone, log) / 409 delete `PRINTED`; 404 unknown id.
- [ ] Test: extend `test/contract/routes.conformance.spec.ts` — all `SET_ROUTES` registered; parse `create` `data` through `SetResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green (incl. conformance); `npm run test:int` green with the test DB up.
- [ ] All routes admin-gated and use `SET_ROUTES` constants; conformance now includes Set.
- [ ] Committed on green.

---

### Sprint 4: Lot — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- `LotMapper` (with derived `deliveredCardsCount` injected), `ILotService`, `lotNumber` helper, factory, mapper test.

**Tasks**
- [ ] Impl: `src/modules/lot/lot.mapper.ts` — `toDTO(lot, plan, deliveredCardsCount): LotDTO` (resolve `subscriptionLabel`; `createdAt`/`deliveryDate`→ISO); `LotResponseSchema.parse`.
- [ ] Impl: `src/modules/lot/lot.interface.ts` — `ILotService` { `getAll(query)`, `getAvailableForOrder(query)`, `create(cmd, actorId)`, `delete(id, actorId)` }.
- [ ] Impl: `src/modules/lot/lot.util.ts` — pure `generateLotNumber()` (uniqueness in service).
- [ ] Test data: `test/data/lot.factory.ts` (`seedLot` for any `lotStat`); reuse `card.factory` for `PRINTED` candidates.
- [ ] Test: `test/unit/modules/lot/lot.mapper.spec.ts` — parses `LotResponseSchema`; `deliveredCardsCount` passes through; `deliveryDate` null↔ISO.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] `deliveredCardsCount` is mapper input (derived, not stored); interface returns DTOs.
- [ ] Committed on green.

---

### Sprint 5: Lot — Logic (service)   — Status: ✅ Done

**Goals**
- `LotService`: list (+derive delivered count), available-for-order, create (validate candidates + transaction), delete (revert + log).

**Tasks**
- [ ] Impl: `src/modules/lot/lot.service.ts` (injects `PrismaClient`):
  - getAll — join plan; filters `search`(lotNumber)/`subscriptionPlanId`/`state`; paginate; derive `deliveredCardsCount` = count of this lot's cards now `AT_DISTRIBUTOR`.
  - getAvailableForOrder — `lotStat ∈ {PENDING, RETURNED}` (+optional plan).
  - create — validate plan; **every** `cardId` is `PRINTED` + same plan + `lotId=null` (else `VALIDATION_ERROR`/`RESOURCE_CONFLICT`); unique `lotNumber`; **$transaction** { `Lot`(`PENDING`, `nbOfCards=cardIds.length`) → cards `cardStat=IN_LOT`, `lotId=<new>` }.
  - delete — guard `lotStat=PENDING` (else `RESOURCE_CONFLICT`); **$transaction** { cards `IN_LOT→PRINTED`, `lotId=null` → delete `Lot` }; `Log REMOVE_LOT`.
- [ ] Test: `test/unit/modules/lot/lot.service.spec.ts` (mock Prisma) — create rejects non-`PRINTED`/wrong-plan/already-assigned cards (400/409); success sets cards `IN_LOT`; `available-for-order` filters states; delete non-`PENDING` → 409; delete returns cards to `PRINTED` + logs `REMOVE_LOT`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Create/delete inside `$transaction`; only `REMOVE_LOT` logged; never writes `lotStat` beyond create/delete (Order owns transitions).
- [ ] Committed on green.

---

### Sprint 6: Lot — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Controller, composition root (static route before `/:id`), wiring, integration + conformance.

**Tasks**
- [ ] Impl: `src/modules/lot/lot.controller.ts` — 4 handlers; `actorId` from `req.user.id`; `201`/`200`/`204`; `try/catch → next`.
- [ ] Impl: `src/modules/lot/lot.routes.ts` — manual DI; admin-only; register `GET_AVAILABLE_FOR_ORDER` **before** `DELETE`(`/:id`); `validateRequest` per segment.
- [ ] Wire: mount `lotRouter` at `LOT_ROUTES.BASE` in `src/modules/index.ts`.
- [ ] Test: `test/integration/lot.integration.spec.ts` — 201 create (cards→`IN_LOT`, lot `PENDING`) / 400|409 bad candidates / **403** non-admin; 200 `available-for-order` only `PENDING`/`RETURNED`; 204 delete `PENDING` (+cards→`PRINTED`, log) / 409 non-`PENDING` / 404 unknown.
- [ ] Test: extend conformance — all `LOT_ROUTES` registered; parse `create` `data` through `LotResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green; `npm run test:int` green.
- [ ] `available-for-order` resolves before `/:id`; admin-gated; `LOT_ROUTES` constants only.
- [ ] Committed on green.

---

### Sprint 7: Order — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- `OrderMapper` (joins → `OrderDTO`/`OrderDetailDTO`, `Decimal`→number, resolved names + kept ids), `IOrderService`, `orderNumber` helper, reference + order factories.

**Tasks**
- [ ] Impl: `src/modules/order/order.mapper.ts` — `toDTO(order, joins)` and `toDetailDTO(order, joins, lots)`; resolve distributor/wilaya/commune/deliveryCompany names (keep their ids); `lotNumbers[]`; aggregate `cardsCount`; `Decimal`→number(2dp); dates→ISO; `.parse` each schema.
- [ ] Impl: `src/modules/order/order.interface.ts` — `IOrderService` { `getAll`, `getById`, `create`, `transition`, `delete` } (no `actorId` — order writes no `Log`).
- [ ] Impl: `src/modules/order/order.util.ts` — pure `generateOrderNumber()`.
- [ ] Test data: `test/data/geography.factory.ts` (`seedWilaya`/`seedCommune`), `test/data/delivery-company.factory.ts`, `test/data/distributor.factory.ts`, `test/data/order.factory.ts` — all seed directly via Prisma. Reuse `lot.factory`.
- [ ] Test: `test/unit/modules/order/order.mapper.spec.ts` — `OrderDTO`/`OrderDetailDTO` parse; ids kept alongside names; `lotNumbers[]` + aggregate `cardsCount`; prices 2dp; `completedAt` null↔ISO.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Names resolved **and** ids retained (for edit selects); money 2dp; interface returns DTOs.
- [ ] Committed on green.

---

### Sprint 8: Order — Logic (service)   — Status: ✅ Done

**Goals**
- `OrderService`: list / detail / create (validations + transaction) / transition (3 moves + cascades) / delete (revert lots).

**Tasks**
- [ ] Impl: `src/modules/order/order.service.ts` (injects `PrismaClient`):
  - getAll — join distributor/wilaya/commune/deliveryCompany + `orderLots→lots`; filters `search`/`distributorId`/`wilayaId`/`deliveryCompanyId`/`state`/`dateFrom`/`dateTo`; paginate.
  - getById — per-lot breakdown or `RESOURCE_NOT_FOUND`.
  - create — distributor exists + `isEnabled`; `lotIds` non-empty; **every lot `PENDING`|`RETURNED`** (else `RESOURCE_CONFLICT`); `communeId ∈ wilayaId` (else `VALIDATION_ERROR`); delivery company `isActive`; unique `orderNumber`; **$transaction** { `Order`(`PENDING_DELIVERY`) → `OrderLot` rows → lots `→IN_DELIVERY` }.
  - transition — `PENDING_DELIVERY→IN_DELIVERY`; `IN_DELIVERY→DELIVERED` **$transaction** { `DELIVERED`,`completedAt=now`,`cardsDeliveredCount=deliveredCount ?? total`; lots `→DELIVERED`(`deliveryDate=now`); **all** their cards `→AT_DISTRIBUTOR`,`isActive=true`,`distributorId=order.distributorId`; `distributor.nbOfActiveCards += count` }; `IN_DELIVERY→RETURNED` **$transaction** { `RETURNED`,`completedAt=now`; lots `→RETURNED`,`isReturned=true`; cards stay `IN_LOT` }; else → `RESOURCE_CONFLICT`.
  - delete — guard `orderStat=PENDING_DELIVERY` (else `RESOURCE_CONFLICT`); **$transaction** { lots revert to `PENDING`/`RETURNED`(if `isReturned`) → delete `OrderLot` → delete `Order` }.
- [ ] Test: `test/unit/modules/order/order.service.spec.ts` (mock Prisma) — create from `PENDING`+`RETURNED` (lots→`IN_DELIVERY`); 409 if any lot `IN_DELIVERY`/`DELIVERED`; 400 commune∉wilaya; `→DELIVERED` moves cards `AT_DISTRIBUTOR`+`isActive` + bumps `nbOfActiveCards` + records count; `→RETURNED` keeps cards `IN_LOT`; illegal transition 409; delete reverts lots; **no `Log` written** by any path.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Cascades inside `$transaction`; Order never writes `activationStat`; no `Log` (no matching type).
- [ ] Committed on green.

---

### Sprint 9: Order — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Controller, composition root, wiring, integration (incl. delivery cascade) + conformance.

**Tasks**
- [ ] Impl: `src/modules/order/order.controller.ts` — 5 handlers; `201`/`200`/`204`; `try/catch → next`.
- [ ] Impl: `src/modules/order/order.routes.ts` — manual DI; admin-only; `validateRequest` per segment; `GET_BY_ID`/`DELETE` share `/:id` by method.
- [ ] Wire: mount `orderRouter` at `ORDER_ROUTES.BASE` in `src/modules/index.ts`.
- [ ] Test: `test/integration/order.integration.spec.ts` — 201 create / 409 bad lot / 400 commune∉wilaya / **403** non-admin; 200 list filters; 200 `→IN_DELIVERY`; 200 `→DELIVERED` (cards `AT_DISTRIBUTOR`+`isActive`, `nbOfActiveCards` bumped); 200 `→RETURNED`; 409 illegal transition; 204 delete `PENDING_DELIVERY` (lots reverted) / 409 otherwise; 404 unknown.
- [ ] Test: extend conformance — all `ORDER_ROUTES` registered; parse `getById` `data` through `OrderDetailResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green; `npm run test:int` green.
- [ ] Admin-gated; `ORDER_ROUTES` constants only; cascade asserted end-to-end.
- [ ] Committed on green.

---

### Sprint 10: Card — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- `CardMapper` (`CardDTO`/`CardDetailDTO`/`AvailableCardDTO` + derived `distributionTimeline`) and `ICardService`.

**Tasks**
- [ ] Impl: `src/modules/card/card.mapper.ts` — `toDTO(card, joins)`, `toDetailDTO(card, joins, timeline)`, `toAvailableDTO(card)`; resolve `subscriptionLabel`/`setNumber`/`lotNumber`/`distributorName`; pass three flags + `cardStat`; `createdAt`→ISO; `.parse` each schema. **No sensitive fields** (account data lives in Activation).
- [ ] Impl: `src/modules/card/card.interface.ts` — `ICardService` { `getAll`, `getAvailableForLot`, `getById`, `delete(id, actorId)`, `disable(id)`, `enable(id)`, `revoke(id, actorId)` }.
- [ ] Test data: extend `test/data/card.factory.ts` with helpers for `lot`/`distributor` linkage + timestamp sources (set/lot/order) for timeline tests.
- [ ] Test: `test/unit/modules/card/card.mapper.spec.ts` — DTOs parse; nullable `lotNumber`/`distributorName`; `distributionTimeline` contains **only reached** stages (entry present only when its source timestamp exists); no sensitive fields.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Timeline is derived from set/lot/order timestamps (no card-history table); mapper lists fields.
- [ ] Committed on green.

---

### Sprint 11: Card — Logic (service)   — Status: ✅ Done

**Goals**
- `CardService`: reads + the four state-guarded admin actions (delete/disable/enable/revoke) with stock-counter upkeep.

**Tasks**
- [ ] Impl: `src/modules/card/card.service.ts` (injects `PrismaClient`):
  - getAll — join plan/set/lot/distributor; filters `search`(key)/`state`/`setNumber`/`lotNumber`/`distributorId`/`subscriptionPlanId`/`flag`; **exclude `deletedAt != null`**; paginate.
  - getAvailableForLot — `cardStat=PRINTED`, `subscriptionPlanId=param`, `lotId=null`, `isDisabled=false`.
  - getById — load or `RESOURCE_NOT_FOUND`; build derived `distributionTimeline`.
  - delete — guard `cardStat ∈ {IN_SET, PRINTED}` (else `RESOURCE_CONFLICT`); **soft-delete** (`deletedAt=now`, keep `key`); `Log REMOVE_CARD`.
  - disable — guard `cardStat ∈ {IN_LOT, AT_DISTRIBUTOR}` + not already disabled; `isDisabled=true`,`isActive=false`; if was `AT_DISTRIBUTOR` → `distributor.nbOfActiveCards--`. (No log.)
  - enable — guard `isDisabled=true`; `isDisabled=false`,`isActive=true`,`cardStat=AT_DISTRIBUTOR`; `nbOfActiveCards++`. (No log.)
  - revoke — guard `cardStat=ACTIVATION_FAILED` + `isDisabled=false`; `isRevoked=true`,`isActive=true`,`cardStat=AT_DISTRIBUTOR`; `nbOfActiveCards++`; `Log REVOKE_CARD`.
- [ ] Test: `test/unit/modules/card/card.service.spec.ts` (mock Prisma) — each guard's 409 path; delete soft-deletes + logs `REMOVE_CARD`; disable/enable/revoke flip flags + adjust `nbOfActiveCards` correctly; revoke logs `REVOKE_CARD`; `getAll` excludes soft-deleted.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Individual delete is **soft**; only `REMOVE_CARD`/`REVOKE_CARD` logged; `nbOfActiveCards` maintained on disable/enable/revoke.
- [ ] Committed on green.

---

### Sprint 12: Card — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Controller (7), composition root (static before param), wiring, integration + conformance.

**Tasks**
- [ ] Impl: `src/modules/card/card.controller.ts` — 7 handlers; `actorId` for delete/revoke; `200`/`204`; `try/catch → next`.
- [ ] Impl: `src/modules/card/card.routes.ts` — manual DI; admin-only; register `GET_AVAILABLE_FOR_LOT` **before** `GET_BY_ID`(`/:id`); `validateRequest` per segment.
- [ ] Wire: mount `cardRouter` at `CARD_ROUTES.BASE` in `src/modules/index.ts`.
- [ ] Test: `test/integration/card.integration.spec.ts` — 200 list per filter (`flag=disabled`/`revoked`) / **403** non-admin; 200 `available-for-lot` (only PRINTED/unassigned/non-disabled); 200 detail (derived timeline) / 404; 204 delete `IN_SET`/`PRINTED` / 409 otherwise; 200 disable/enable/revoke happy + 409 guards (+stock changes).
- [ ] Test: extend conformance — all `CARD_ROUTES` registered; parse `getById` `data` through `CardDetailResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green; `npm run test:int` green.
- [ ] `available-for-lot` resolves before `/:id`; admin-gated; `CARD_ROUTES` constants only.
- [ ] Committed on green.

---

### Sprint 13: Activation — Foundation (contract `RELEASE` + mapper + interface)   — Status: ⬜ Pending

**Goals**
- Land the one approved contract addition, then the **exposure-aware** `ActivationMapper`, the `IActivationService` contract, and the activation factories.

**Tasks**
- [ ] **Contract (do first):** add `RELEASE: '/:id/release'` to `ACTIVATION_ROUTES` in `packages/contract/src/modules/activation/activation.routes.ts`; rebuild `@my-app/contract`; confirm `ACTIVATION_ROUTES.RELEASE` is exported (no new DTO/command/enum — `REMOVED_FROM_ACTIVATOR` already in `ActivationStat`).
- [ ] Impl: `src/modules/activation/activation.mapper.ts` — `toKeyVerificationDTO`, `toClientStatusDTO`, `toPendingDTO`, `toActiveRequestDTO`, `toActivatorHistoryItemDTO`, `toRecentDTO`, `toAdminActivationDTO`, `toActivationDetailDTO`; a static `AccountInformation → label` map; `decimalToNumber`(2dp); `durationSeconds`(`takenAt→completedAt`); timestamps→ISO; `freezReason`→`freezeReason`; `.parse` each schema. **Exposure rule centralized here:** `ActiveRequestDTO` carries raw `value`s + raw `key`; `ActivationDetailDTO`/`KeyVerificationDTO` **mask** password/OTP; pool/recent use `keyMasked` (last 4).
- [ ] Impl: `src/modules/activation/activation.interface.ts` — `IActivationService` (client 5 + activator 12 incl. `release` + admin 5, per plan §8.1).
- [ ] Test data: `test/data/activation.factory.ts` — seed `Activation`(+`ActivationInformation`,`ActivationStep`,`WrongInformation`/`AdditionalInformation`) with a helper per `ActivationStat`; seed `CommissionDuration`+`SubscriptionPlanCommission` tiers (incl. catch-all `nbMinuteMax=null`); reuse `card`/`distributor`/`activator` factories. No hardcoded ids.
- [ ] Test: `test/unit/modules/activation/activation.mapper.spec.ts` — every DTO parses its schema; **exposure:** `ActiveRequestDTO` shows password/OTP, `ActivationDetailDTO`/`KeyVerificationDTO` mask them, pool/recent keys masked; label resolution; `Decimal` 2dp; `durationSeconds` computed.

**Validation**
- [ ] `tsc --noEmit` clean in **both** `packages/contract` and `apps/api`.
- [ ] `npm run test:unit` green; contract build emits `ACTIVATION_ROUTES.RELEASE`.
- [ ] Masking proven by mapper tests; only `ActiveRequestDTO` exposes raw values; interface returns DTOs.
- [ ] Committed on green.

---

### Sprint 14: Activation — Logic A (client + activator service)   — Status: ⬜ Pending

**Goals**
- The public-client and activator halves of `ActivationService`, emitting to `eventBus` **after** each transaction. Activator principal resolved to `Activator` by `userId`.

**Tasks**
- [ ] Impl: `src/modules/activation/activation.service.ts` (part 1; injects `PrismaClient`, imports `eventBus`):
  - **Client:** verify (INVALID for missing/`isActive=false`; else map `cardStat`+latest activation to `ClientActivationStatus` with `flaggedFields`/`requestedFields`/`submittedFields`(masked)/`accountUsername`); submit (guards → `$tx` create `Activation`/`ActivationInformation`/`ActivationStep` + card `→ACTIVATION_PROGRESS` → emit `activation:created`+`status-changed`); update/additional (state guard → `$tx` write onto step `WrongInformation`/`AdditionalInformation` → `PROCESSING` → emit `client-updated`+`status-changed`); status (map only).
  - **Activator** (resolve `Activator` by `userId`; absent → `AUTH_FORBIDDEN`): getPending (masked keys); getActive (latest-wins `accountFields` + raw values + `otpValue`); take (≥3 → `RESOURCE_CONFLICT`; atomic guarded `PENDING→PROCESSING` `WHERE activationStat=PENDING`, 0 rows → 409; emit `taken`); flagWrong / requestAdditional (step + null-value rows; emit `status-changed`); activate (`$tx` price-tier from `CommissionDuration` incl. catch-all + counters + card `→ACTIVATED` + distributor `−nbOfActiveCards`; emit `status-changed`); cancel (`$tx` `CANCELLED_BY_ACTIVATOR` + spawn `PENDING` + activator `nbOfActivation++`; emit `created`+`status-changed`); **release** (`$tx` `REMOVED_FROM_ACTIVATOR` + spawn `PENDING` + activator `nbOfActivation++` (no success/earning); emit `created`+`status-changed`); freeze (`FREEZE`+`freezReason`; emit `frozen`+`status-changed`); getMyHistory/getRecent.
- [ ] Test: `test/unit/modules/activation/activation.service.client-activator.spec.ts` (mock Prisma) — verify maps each state incl. INVALID; submit 409 (inactive/live); update/additional 409 unless right state; take 200→409 (taken) + 3-slot 409; activate price-tier (catch-all) + counters; cancel/release spawn `PENDING` and bump `nbOfActivation` only (release leaves `nbOfSuccessfulActivation`/earnings untouched); freeze emits `frozen`; **emits fire after commit** (not called when the tx throws); non-activator principal → `AUTH_FORBIDDEN`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Service imports `eventBus` only (no `getIO()`); every emit is post-commit; take is an atomic guarded update.
- [ ] Committed on green.

---

### Sprint 15: Activation — Logic B (admin service)   — Status: ⬜ Pending

**Goals**
- The admin half: list / detail assembly / admin resolutions / price override.

**Tasks**
- [ ] Impl: `src/modules/activation/activation.service.ts` (part 2):
  - getAll — join card/plan/activator/distributor; filters per `GetActivationsQuery`; paginate → `AdminActivationDTO`.
  - getById — assemble `ActivationDetailDTO`: blocks, `submittedInformation` latest-wins (**password/OTP masked**), `timeline` from `ActivationStep` (each with its `WrongInformation`/`AdditionalInformation` field+value + `freezeReason`), `cardHistory` (derived), `financial`.
  - activateByAdmin — require `FREEZE` → `$tx` { `ACTIVATED_BY_ADMIN`,`completedAt=now`, price, card `→ACTIVATED`, credit the **assigned** activator (counters+earnings), distributor counters, step } → emit `resolved`(`ACTIVATED_BY_ADMIN`)+`status-changed`.
  - cancelByAdmin — require `FREEZE` → `$tx` { `CANCELLED_BY_ADMIN`,`completedAt=now`, card `→ACTIVATION_FAILED`, activator `nbOfActivation++` (no success/earning), step } → emit `resolved`(`CANCELLED_BY_ADMIN`)+`status-changed`.
  - setPrice — require completed (`ACTIVATED`/`ACTIVATED_BY_ADMIN`) → set `activationPrice=amount`, adjust activator `totalEarning`/`credits` by **delta** → `Log CHANGE_ACTIVATION_COMMISSION`.
- [ ] Test: `test/unit/modules/activation/activation.service.admin.spec.ts` (mock Prisma) — getById assembly + masking + derived timeline/cardHistory; activate/cancel-by-admin 409 unless `FREEZE` + correct card outcomes + activator credit semantics; setPrice 409 unless completed + delta adjustment + `CHANGE_ACTIVATION_COMMISSION` logged (admin activate/cancel write **no** log).

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Only `CHANGE_ACTIVATION_COMMISSION` is logged; resolutions emit `activation:resolved` post-commit; detail/keyVerification mask password/OTP.
- [ ] Committed on green.

---

### Sprint 16: Activation — API + Realtime (controllers + two routers)   — Status: ⬜ Pending

**Goals**
- Controllers, the **two** composition-root routers (`keyRouter` public + `activationRouter` authed), wiring both bases, integration + realtime + conformance.

**Tasks**
- [ ] Impl: `src/modules/activation/activation.controller.ts` — client handlers (public, no principal), activator handlers (pass `req.user.id` as `principalUserId`), admin handlers (`setPrice` passes `actorId`); statuses `200`/`201`/`204`; `try/catch → next`.
- [ ] Impl: `src/modules/activation/activation.routes.ts` — manual DI (one `ActivationService`, one `ActivationController`); build **`keyRouter`** (public; `validateRequest` with `ActivationIdParamsSchema` for `:activationId`) and **`activationRouter`** (role guards; `ActivationActionParamsSchema` for `:id`; **register the static GETs `pending`/`active`/`my-history`/`recent` before `/:id`**; include `RELEASE`); export both.
- [ ] Wire: in `src/modules/index.ts` mount `keyRouter` at `KEY_ROUTES.BASE` and `activationRouter` at `ACTIVATION_ROUTES.BASE`.
- [ ] Test: `test/integration/activation.integration.spec.ts` — key flow (verify/submit/update/additional/status); take race 200→409 + 3-slot 409; flag/request/activate/cancel/release/freeze guards (409 when not owned/wrong state); admin getAll/getById/activate-by-admin/cancel-by-admin/set-price; **exposure over HTTP** (`ActiveRequestDTO` shows secrets to the assigned activator; `ActivationDetailDTO`/`KeyVerificationDTO` mask).
- [ ] Test: extend `test/integration/realtime/gateway.spec.ts` — submit → `activation:created` reaches `/activators`; freeze → `activation:frozen` reaches `/admin`; `activation:status-changed` reaches **only** the subscribed `/client` activation room. Factories only.
- [ ] Test: extend conformance — all `KEY_ROUTES` + `ACTIVATION_ROUTES` (incl. `RELEASE`) registered; parse `ActiveRequestResponseSchema` / `ActivationDetailResponseSchema` / `KeyVerificationResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green (incl. conformance); `npm run test:int` green (incl. realtime).
- [ ] Two routers mounted at their own bases; `/client` capability model preserved; role gates correct; service never imports `getIO()`; emits post-commit.
- [ ] Committed on green.

---

## Done criteria (whole set)

- All 16 sprints committed green; `tsc --noEmit` clean across `apps/api` and `packages/contract`.
- `npm run test:unit` (unit + conformance) and `npm run test:int` (incl. realtime) green.
- `routes.conformance.spec.ts` asserts every `SET_ROUTES`/`LOT_ROUTES`/`ORDER_ROUTES`/`CARD_ROUTES`/`KEY_ROUTES`/`ACTIVATION_ROUTES` (incl. `RELEASE`) constant is registered.
- The cross-module write-ownership matrix (plan §3) holds: each module mutates only its own column set; `cardStat` cascades stay inside `$transaction`.
- Exposure honored end-to-end: `ActiveRequestDTO` is the only DTO carrying real password/OTP; all other surfaces mask; pool/recent keys masked.
- Realtime untouched as framework: no service imports `getIO()`; all activation emits run after commit; only the one approved contract route (`RELEASE`) was added.
