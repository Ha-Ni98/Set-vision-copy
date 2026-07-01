# Plan — Module Set 02 (Set · Lot · Order · Card · Activation)

> Stage 02 · Sub-02 · Phase 01 — vertical-slice plan for the **inventory + activation pipeline**. **No code.**
> Specs: `Module-Contracts/{set,lot,order,card,activation}.md`
> Rules: `module-implementation-rules.md`, `realtime-rules.md`
> Contract: `@my-app/contract` (`Apps/contract`) — **verified present**, nothing below is to be (re)declared.

---

## 0. Why these five together, and in this order

This set is one dependency chain — the lifecycle of a `Card`:

```
Set ──generates──► Card(IN_SET) ──PRINTED──► Lot(IN_LOT) ──Order──► AT_DISTRIBUTOR ──Activation──► ACTIVATED
```

`cardStat` is written by **four** modules inside their own transactions. Each module owns only its slice (see §3 ownership matrix). **Build order = dependency order:**

1. **Set** (creates cards + `setNumber`/`key` generators — everything downstream needs cards)
2. **Lot** (groups `PRINTED` cards)
3. **Order** (delivers lots → cards `AT_DISTRIBUTOR`)
4. **Card** (admin reads + state-guarded actions over the above)
5. **Activation** (the live pipeline + realtime events — the largest slice)

---

## 1. Founding gaps & assumptions

### 1.1 G-1 — inactivity auto-release: RESOLVED (frontend-triggered route)

**Decision (confirmed 2026-06-30):** inactivity detection moves to the **frontend**. The activator's client tracks idle time (timeout = frontend config) and, on timeout, POSTs an authenticated release endpoint. This **dissolves both missing foundations** the spec's "scheduled job" implied — **no `Settings` model** and **no backend scheduler/cron** are needed. The backend side becomes a normal authenticated activator route with the standard caller-owned + working-state guard; the spec's "Not a route" auto-release is replaced by this route.

**Contract addition required (approved):** no existing route yields `REMOVED_FROM_ACTIVATOR`, so **one** route constant must be added to the contract — **`ACTIVATION_ROUTES.RELEASE` (POST `/:id/release`)**. It reuses `ActivationActionParamsSchema` (`{id}`), takes **no body**, returns **none** (204). **No new DTO / command / enum** — `REMOVED_FROM_ACTIVATOR` already exists in `ActivationStat`. This is the single Stage-1 contract change this set requires (detailed in §8.6); it must be added **before** the Activation route file compiles, since that file references the constant.

### 1.2 Resolved assumptions (documented, not blocking)

- **Activator principal → `Activator.id`.** The JWT carries `User.id` (`req.user.id`), but `Activation.activatorId` → `Activator.id`. Every activator-scoped method resolves the `Activator` row by `userId` first (same pattern as `activator.service.ts::myStats`). A non-activator/absent row → `AUTH_FORBIDDEN`.
- **`freezReason` spelling.** Prisma field is `Activation.freezReason` (sic); the DTO field is `freezeReason`. The mapper bridges the two — not a new field.
- **`accountUsername` (verify, `ACTIVATED`).** Resolved from the `ActivationInformation` row where `accountInform = USERNAME` (no dedicated column). `Activation.activationEmail` may back it if username is absent — username preferred.
- **`planKey` (KeyVerificationDTO, optional).** No `key` column on `SubscriptionPlan`; emit only if a stable public plan identifier is later defined, else omit (field is `.optional()`). Confirm only if you want it populated now.
- **Account-field labels.** `AccountFieldValue.fieldLabel` and `flaggedFields/requestedFields[].label` are **resolved strings**, not the enum. Source = a module-local static map `AccountInformation → label` (Snapchat plan fields are fixed per spec). Lives in the Activation mapper; no contract/schema change.
- **`cardHistory` / `distributionTimeline` are derived** (no card-history table) from set/lot/order timestamps + `ActivationStep` rows — identical approach in Card (`distributionTimeline`) and Activation detail (`cardHistory`).
- **Spec §6 assumptions (a)/(b) — adopted as written in §4:** `ACTIVATED_BY_ADMIN` credits the **assigned** activator the computed commission; `nbOfActivation` counts every terminal outcome the activator was assigned, `nbOfSuccessfulActivation` only `ACTIVATED` + `ACTIVATED_BY_ADMIN`.

### 1.3 HOW conflicts resolved toward the rules (noted per standing rule)

- **Emit after commit.** Specs phrase emits inline with the transaction prose ("→ emit …"). Per `realtime-rules.md` §7.1 / §11.3, **all `eventBus.emit(...)` calls go after the Prisma transaction resolves**, never inside it. Authoritative for every Activation mutation.
- **Two routers in one `routes.ts`.** Activation has two route groups (`KEY_ROUTES` `/keys` public, `ACTIVATION_ROUTES` `/activations` authed). The spec says "Both exported from the module barrel." The single composition-root file builds **two `Router` instances** and exports both; `modules/index.ts` mounts each at its own `BASE`. This refines (not violates) the one-composition-root rule.
- **Static-before-param route registration.** Express matches greedily, so static segments register **before** `/:id` (same caveat as `activator`’s `/me/stats`). Affects Card and Activation (see their route tables).

---

## 2. Shared conventions for this set (apply in every module)

| Concern | Decision |
|---|---|
| **DI** | `routes.ts` instantiates `new Service(prisma)` → `new Controller(service)`; manual, no framework. |
| **Errors** | Throw `@common/errors`: `NotFoundError` (404/`RESOURCE_NOT_FOUND`), `ConflictError` (409/`RESOURCE_CONFLICT`), `BadRequestError` (400/`VALIDATION_ERROR`), `ForbiddenError` (403). |
| **Responses** | `sendSuccess(res, data, status)` — `201` create, `200` read/update, `204` delete (no body). |
| **Pagination** | `toSkipTake(query)` + `buildPaginationMeta(page, limit, total)` → `{ items, meta }` (contract `paginated()` shape). |
| **Validation** | `validateRequest({ params, query, body })` in `routes.ts` **before** controller; controller reads `req.validated.*` only. |
| **`Decimal` → number** | Module-local `decimalToNumber(d) = Number(d.toFixed(2))` (DZD, 2dp) in each mapper that touches money. |
| **Dates → ISO** | `date.toISOString()` in mappers; contract DTOs are `z.iso.datetime()`. |
| **Mapper conformance** | Every `toDTO` ends with `XResponseSchema.parse(dto)` (dev/test guard). |
| **Auth** | `requireAuth({ roles: [UserRole.ADMIN] })` (admin modules); `requireAuth({ roles: [UserRole.ACTIVATOR] })` and public (no guard) for Activation. |
| **`actorId` for logs** | Mutations needing a `Log` take `req.user.id` as `actorId`. |
| **Number/key generators** | Set/Lot/Order need unique human-readable identifiers (`setNumber`, `lotNumber`, `orderNumber`) and Set needs unique card `key`s — **module-local utilities** (collision-checked against the `@unique` columns). Not a contract concern. |

---

## 3. Cross-module write-ownership matrix (avoid double-writes)

| Field / counter | Set | Lot | Order | Card | Activation |
|---|---|---|---|---|---|
| `Card.cardStat` | `IN_SET`→`PRINTED` (gen + print) | `IN_LOT` (create), →`PRINTED` (delete) | →`AT_DISTRIBUTOR` (DELIVERED) | delete/disable/enable/revoke transitions | `ACTIVATION_PROGRESS`→`ACTIVATED`/`ACTIVATION_FAILED` |
| `Lot.lotStat` | — | create (`PENDING`), delete revert | `IN_DELIVERY`/`DELIVERED`/`RETURNED` | — | — |
| `Order.orderStat` | — | — | full lifecycle | — | — |
| `Distributor.nbOfActiveCards` | — | — | `+` on DELIVERED | `±` on disable/enable/revoke | `−` on activate |
| `Distributor.nbOfActivation` | — | — | — | — | `+` on activate/admin-resolve |
| `Activator` counters/earnings | — | — | — | — | activate / cancel / release / admin actions / set-price |
| `Log` types | `REMOVE_SET` | `REMOVE_LOT` | **none** | `REMOVE_CARD`, `REVOKE_CARD` | `CHANGE_ACTIVATION_COMMISSION` only |

> Each module touches **only** its column set above. Activation never writes `lotStat`; Order never writes `activationStat`; etc.

---

## 4. Module: **Set**

**`apps/api/src/modules/set/`** — mount at `SET_ROUTES.BASE` (`/sets`) in `modules/index.ts`.

- [ ] `set.mapper.ts` — `Set`(+plan) → `SetDTO`; dates→ISO; resolve `subscriptionLabel`.
- [ ] `set.interface.ts` — `ISetService`.
- [ ] `set.service.ts` — getAll / create / transition / delete.
- [ ] ~~`set.listener.ts`~~ — none (spec §3: no events; audit inline).
- [ ] `set.controller.ts` — 4 handlers.
- [ ] `set.routes.ts` — composition root (admin-only).

**Contract (verified):** `SET_ROUTES`, `CreateSetSchema/Command`, `TransitionSetSchema/Command` (targets `PENDING_PRINTING`,`PRINTED`), `GetSetsQuerySchema`, `SetIdParamsSchema`, `SetResponseSchema/SetDTO`, `PaginatedSetsSchema`, `SetStat`. Log: `REMOVE_SET`.

**`SetDTO`** = `{ id, setNumber, subscriptionPlanId, subscriptionLabel(resolved), numberOfKeys, setStat, createdAt(ISO), printedAt(ISO|null) }`.

**Interface**
- `getAll(query): Promise<PaginatedResult<SetDTO>>`
- `create(cmd, actorId): Promise<SetDTO>`
- `transition(id, cmd): Promise<SetDTO>`
- `delete(id, actorId): Promise<void>`

**Service**
- **getAll** — `Set` join `SubscriptionPlan`; filters `search`(setNumber)/`subscriptionPlanId`/`state`; paginate; compose label; map.
- **create** — validate plan exists **and `isActive`** (else `VALIDATION_ERROR`) → generate unique `setNumber` → **$transaction** { create `Set`(`NOT_PRINTED`) → batch-create `numberOfKeys` `Card`(`IN_SET`, `isActive=false`, unique `key`, `setId`, `subscriptionPlanId`) } → `SetDTO`.
- **transition** — load or `RESOURCE_NOT_FOUND`; allow `NOT_PRINTED→PENDING_PRINTING` and `PENDING_PRINTING→PRINTED` only (else `RESOURCE_CONFLICT`); on `→PRINTED` **$transaction** { `printedAt=now` → cards `IN_SET→PRINTED` }.
- **delete** — load; guard `setStat ∈ {NOT_PRINTED, PENDING_PRINTING}` (else `RESOURCE_CONFLICT`) → **$transaction** { **hard-delete** all set cards → delete `Set` } → `Log REMOVE_SET`.

**Routes** (all `adminOnly`)

| Constant | Method/Path | Validate | Out |
|---|---|---|---|
| `GET_ALL` | GET `/` | query `GetSetsQuerySchema` | `{items,meta}` |
| `CREATE` | POST `/` | body `CreateSetSchema` | `SetDTO` (201) |
| `TRANSITION` | POST `/:id/transition` | params `SetIdParamsSchema` + body `TransitionSetSchema` | `SetDTO` |
| `DELETE` | DELETE `/:id` | params `SetIdParamsSchema` | none (204) |

---

## 5. Module: **Lot**

**`apps/api/src/modules/lot/`** — mount at `LOT_ROUTES.BASE` (`/lots`).

- [ ] `lot.mapper.ts` — `Lot`(+plan, +derived `deliveredCardsCount`) → `LotDTO`.
- [ ] `lot.interface.ts` — `ILotService`.
- [ ] `lot.service.ts` — getAll / getAvailableForOrder / create / delete.
- [ ] ~~`lot.listener.ts`~~ — none.
- [ ] `lot.controller.ts` — 4 handlers.
- [ ] `lot.routes.ts` — composition root (admin-only).

**Contract (verified):** `LOT_ROUTES`, `CreateLotSchema/Command` `{subscriptionPlanId, cardIds[]}`, `GetLotsQuerySchema`, `GetAvailableLotsQuerySchema`, `LotIdParamsSchema`, `LotResponseSchema/LotDTO`, `PaginatedLotsSchema`, `LotStat`. Log: `REMOVE_LOT`.

> **Candidate `PRINTED` cards list is the Card module’s `GET_AVAILABLE_FOR_LOT`** — not duplicated here.

**`LotDTO`** = `{ id, lotNumber, subscriptionPlanId, subscriptionLabel, lotStat, nbOfCards, deliveredCardsCount(derived), isReturned, createdAt(ISO), deliveryDate(ISO|null) }`.

**Interface**
- `getAll(query): Promise<PaginatedResult<LotDTO>>`
- `getAvailableForOrder(query): Promise<LotDTO[]>`
- `create(cmd, actorId): Promise<LotDTO>`
- `delete(id, actorId): Promise<void>`

**Service**
- **getAll** — `Lot` join plan; filters `search`(lotNumber)/`subscriptionPlanId`/`state`; paginate; derive `deliveredCardsCount` = count of this lot's cards now `AT_DISTRIBUTOR`; map.
- **getAvailableForOrder** — `lotStat ∈ {PENDING, RETURNED}`, optional plan filter → `LotDTO[]` (feeds Order wizard).
- **create** — validate plan; validate **every** `cardId` is `PRINTED` + same plan + `lotId=null` (else `VALIDATION_ERROR`/`RESOURCE_CONFLICT`) → generate unique `lotNumber` → **$transaction** { create `Lot`(`PENDING`, `nbOfCards=cardIds.length`) → cards `cardStat=IN_LOT`, `lotId=<new>` }.
- **delete** — load; guard `lotStat=PENDING` (else `RESOURCE_CONFLICT`) → **$transaction** { cards `IN_LOT→PRINTED`, `lotId=null` → delete `Lot` } → `Log REMOVE_LOT`.

**Routes** (all `adminOnly`)

| Constant | Method/Path | Validate | Out |
|---|---|---|---|
| `GET_ALL` | GET `/` | query `GetLotsQuerySchema` | `{items,meta}` |
| `GET_AVAILABLE_FOR_ORDER` | GET `/available-for-order` | query `GetAvailableLotsQuerySchema` | `LotDTO[]` |
| `CREATE` | POST `/` | body `CreateLotSchema` | `LotDTO` (201) |
| `DELETE` | DELETE `/:id` | params `LotIdParamsSchema` | none (204) |

> Register `GET_AVAILABLE_FOR_ORDER` (static) before any `/:id`. (`CREATE` and `GET_ALL` share `/` by method — fine.)

---

## 6. Module: **Order**

**`apps/api/src/modules/order/`** — mount at `ORDER_ROUTES.BASE` (`/orders`).

- [ ] `order.mapper.ts` — `Order`(+joins) → `OrderDTO`/`OrderDetailDTO`; `Decimal`→number; resolve distributor/wilaya/commune/deliveryCompany names (keep ids); `lotNumbers[]`; aggregate `cardsCount`.
- [ ] `order.interface.ts` — `IOrderService`.
- [ ] `order.service.ts` — getAll / getById / create / transition / delete.
- [ ] ~~`order.listener.ts`~~ — none.
- [ ] `order.controller.ts` — 5 handlers.
- [ ] `order.routes.ts` — composition root (admin-only).

**Contract (verified):** `ORDER_ROUTES`, `CreateOrderSchema/Command`, `TransitionOrderSchema/Command` (`to ∈ {IN_DELIVERY,DELIVERED,RETURNED}`, optional `deliveredCount`), `GetOrdersQuerySchema`, `OrderIdParamsSchema`, `OrderResponseSchema/OrderDTO`, `OrderDetailResponseSchema/OrderDetailDTO`, `PaginatedOrdersSchema`, `OrderStat`, `DeliveryType`. **No Log type — order writes no `Log`.**

**`OrderDTO`** = `{ id, orderNumber, distributorId, distributorName, receivedName, receivedPhone, wilayaId, wilayaName, communeId, communeName, deliveryCompanyId, deliveryCompanyName, deliveryType, lotNumbers[], cardsCount(agg), orderPrice, deliverPrice, cardsDeliveredCount, orderStat, createdAt, completedAt }`. **Detail** adds `lots:[{lotId, lotNumber, subscriptionLabel, cardsCount, lotStat}]`.

**Interface**
- `getAll(query): Promise<PaginatedResult<OrderDTO>>`
- `getById(id): Promise<OrderDetailDTO>`
- `create(cmd): Promise<OrderDTO>`
- `transition(id, cmd): Promise<OrderDTO>`
- `delete(id): Promise<void>`

**Service**
- **getAll** — join distributor/wilaya/commune/deliveryCompany + `orderLots→lots`; filters `search`(orderNumber/receiver/distributor)/`distributorId`/`wilayaId`/`deliveryCompanyId`/`state`/`dateFrom`/`dateTo`; paginate; map.
- **getById** — load w/ per-lot breakdown or `RESOURCE_NOT_FOUND` → `OrderDetailDTO`.
- **create** — validate distributor exists + `isEnabled`; `lotIds` non-empty; **every lot `PENDING`|`RETURNED`** (else `RESOURCE_CONFLICT`); `communeId ∈ wilayaId` (else `VALIDATION_ERROR`); delivery company `isActive` → gen `orderNumber` → **$transaction** { create `Order`(`PENDING_DELIVERY`) → `OrderLot` rows → lots `→IN_DELIVERY` } → `cardsCount`=Σ lot `nbOfCards`.
- **transition** — load or 404; apply:
  - `PENDING_DELIVERY→IN_DELIVERY`: set `orderStat` (lots already `IN_DELIVERY`).
  - `IN_DELIVERY→DELIVERED`: **$transaction** { `orderStat=DELIVERED`, `completedAt=now`, `cardsDeliveredCount=deliveredCount ?? total`; lots `→DELIVERED`(`deliveryDate=now`); **all** their cards `→AT_DISTRIBUTOR`, `isActive=true`, `distributorId=order.distributorId`; `distributor.nbOfActiveCards += count` }.
  - `IN_DELIVERY→RETURNED`: **$transaction** { `orderStat=RETURNED`, `completedAt=now`; lots `→RETURNED`, `isReturned=true`; cards stay `IN_LOT` }.
  - else → `RESOURCE_CONFLICT`.
- **delete** — load; guard `orderStat=PENDING_DELIVERY` (else `RESOURCE_CONFLICT`) → **$transaction** { each lot reverts to `PENDING` (or `RETURNED` if `isReturned`) → delete `OrderLot` rows → delete `Order` }.

**Routes** (all `adminOnly`)

| Constant | Method/Path | Validate | Out |
|---|---|---|---|
| `GET_ALL` | GET `/` | query `GetOrdersQuerySchema` | `{items,meta}` |
| `GET_BY_ID` | GET `/:id` | params `OrderIdParamsSchema` | `OrderDetailDTO` |
| `CREATE` | POST `/` | body `CreateOrderSchema` | `OrderDTO` (201) |
| `TRANSITION` | POST `/:id/transition` | params + body `TransitionOrderSchema` | `OrderDTO` |
| `DELETE` | DELETE `/:id` | params `OrderIdParamsSchema` | none (204) |

---

## 7. Module: **Card**

**`apps/api/src/modules/card/`** — mount at `CARD_ROUTES.BASE` (`/cards`).

- [ ] `card.mapper.ts` — `Card`(+joins) → `CardDTO`/`CardDetailDTO`/`AvailableCardDTO`; derive `distributionTimeline`.
- [ ] `card.interface.ts` — `ICardService`.
- [ ] `card.service.ts` — getAll / getAvailableForLot / getById / delete / disable / enable / revoke.
- [ ] ~~`card.listener.ts`~~ — none (spec §3).
- [ ] `card.controller.ts` — 7 handlers.
- [ ] `card.routes.ts` — composition root (admin-only).

**Contract (verified):** `CARD_ROUTES`, `GetCardsQuerySchema` (incl. `flag ∈ CardFlag {disabled,revoked}`), `GetAvailableCardsQuerySchema`, `CardIdParamsSchema`, `CardResponseSchema/CardDTO`, `CardDetailResponseSchema/CardDetailDTO`, `AvailableCardResponseSchema/AvailableCardDTO`, `PaginatedCardsSchema`, `CardStat`, `CardFlag`. Logs: `REMOVE_CARD`, `REVOKE_CARD`.

**`CardDTO`** = `{ id, key, subscriptionPlanId, subscriptionLabel, setNumber, lotNumber(null), distributorName(null), cardStat, isActive, isDisabled, isRevoked, createdAt }`. **Detail** adds `distributionTimeline:[{stat, at}]`.

**Interface**
- `getAll(query): Promise<PaginatedResult<CardDTO>>`
- `getAvailableForLot(query): Promise<AvailableCardDTO[]>`
- `getById(id): Promise<CardDetailDTO>`
- `delete(id, actorId): Promise<void>`
- `disable(id): Promise<CardDTO>` · `enable(id): Promise<CardDTO>` · `revoke(id, actorId): Promise<CardDTO>`

**Service**
- **getAll** — join plan/set/lot/distributor; filters `search`(key)/`state`/`setNumber`/`lotNumber`/`distributorId`/`subscriptionPlanId`/`flag`; **exclude `deletedAt != null`**; paginate; resolve labels/names; map.
- **getAvailableForLot** — `cardStat=PRINTED`, `subscriptionPlanId=param`, `lotId=null`, `isDisabled=false` → `AvailableCardDTO[]`.
- **getById** — load or `RESOURCE_NOT_FOUND` → derive `distributionTimeline` (IN_SET←set.createdAt, PRINTED←set.printedAt, IN_LOT←lot.createdAt, IN_DELIVERY←order.createdAt, AT_DISTRIBUTOR←order.completedAt; each entry only if its timestamp exists) → `CardDetailDTO`.
- **delete** — load; guard `cardStat ∈ {IN_SET, PRINTED}` (else `RESOURCE_CONFLICT`) → **soft-delete** (`deletedAt=now`, keep `key`) → `Log REMOVE_CARD`.
- **disable** — load; guard `cardStat ∈ {IN_LOT, AT_DISTRIBUTOR}` and not already disabled → `isDisabled=true`, `isActive=false`; if was `AT_DISTRIBUTOR` → `distributor.nbOfActiveCards--`. (No log.)
- **enable** — load; guard `isDisabled=true` → `isDisabled=false`, `isActive=true`, `cardStat=AT_DISTRIBUTOR`; `distributor.nbOfActiveCards++`. (No log; literal-rule edge noted in spec.)
- **revoke** — load; guard `cardStat=ACTIVATION_FAILED` and `isDisabled=false` → `isRevoked=true`, `isActive=true`, `cardStat=AT_DISTRIBUTOR`; `distributor.nbOfActiveCards++` → `Log REVOKE_CARD`.

**Routes** (all `adminOnly`) — **static before param:**

| Order | Constant | Method/Path | Validate | Out |
|---|---|---|---|---|
| 1 | `GET_AVAILABLE_FOR_LOT` | GET `/available-for-lot` | query `GetAvailableCardsQuerySchema` | `AvailableCardDTO[]` |
| 2 | `GET_ALL` | GET `/` | query `GetCardsQuerySchema` | `{items,meta}` |
| 3 | `GET_BY_ID` | GET `/:id` | params `CardIdParamsSchema` | `CardDetailDTO` |
| 4 | `DISABLE` | POST `/:id/disable` | params | `CardDTO` |
| 5 | `ENABLE` | POST `/:id/enable` | params | `CardDTO` |
| 6 | `REVOKE` | POST `/:id/revoke` | params | `CardDTO` |
| 7 | `DELETE` | DELETE `/:id` | params | none (204) |

> `GET_BY_ID` and `DELETE` share `/:id` but differ by method — fine. `GET_AVAILABLE_FOR_LOT` **must** precede `GET_BY_ID`.

---

## 8. Module: **Activation** (largest slice — emits realtime events)

**`apps/api/src/modules/activation/`** — **two routers**, mounted at `KEY_ROUTES.BASE` (`/keys`, public) and `ACTIVATION_ROUTES.BASE` (`/activations`, authed) in `modules/index.ts`.

- [ ] `activation.mapper.ts` — entity graph → the 7 DTOs; **exposure/masking is centralized here** (see §8.4).
- [ ] `activation.interface.ts` — `IActivationService` (client + activator + admin methods).
- [ ] `activation.service.ts` — all logic; **emits to `eventBus` after commit**.
- [ ] ~~`activation.listener.ts`~~ — **none** (spec §3 "Listens: none"; the bus→socket bridge is `common/realtime`, already built — not a module listener).
- [ ] `activation.controller.ts` — client(5) + activator(12, incl. `release`) + admin(5) handlers.
- [ ] `activation.routes.ts` — composition root building **`keyRouter`** + **`activationRouter`**.

**Contract (verified):** `KEY_ROUTES`, `ACTIVATION_ROUTES`; enums `ActivationStat`, `AccountInformation`, `ClientActivationStatus`; commands `VerifyKeySchema`, `SubmitActivationSchema`, `UpdateActivationSchema`, `SubmitAdditionalInfoSchema`, `FlagWrongInfoSchema`, `RequestAdditionalInfoSchema`, `FreezeRequestSchema`, `SetActivatorPriceSchema`; queries `ActivationIdParamsSchema` (`activationId`), `ActivationActionParamsSchema` (`id`), `GetActivationsQuerySchema`, `GetActivatorHistoryQuerySchema`; DTOs `KeyVerificationDTO`, `ClientActivationStatusDTO`, `PendingActivationDTO`, `ActiveRequestDTO`, `ActivatorHistoryItemDTO`, `RecentActivationDTO`, `AdminActivationDTO`, `ActivationDetailDTO` (+ `PaginatedActivations`, `PaginatedActivatorHistory`); events `ActivationEvents` (6). Log: `CHANGE_ACTIVATION_COMMISSION` only.

> **Param-schema split (verified):** `KEY_ROUTES` use `ActivationIdParamsSchema` (`{activationId}`); `ACTIVATION_ROUTES` actions use `ActivationActionParamsSchema` (`{id}`). Do not cross them.

### 8.1 Interface `IActivationService`

**Client (public):** `verify(cmd): KeyVerificationDTO` · `submit(cmd): ClientActivationStatusDTO` · `update(activationId, cmd): ClientActivationStatusDTO` · `additional(activationId, cmd): ClientActivationStatusDTO` · `status(activationId): ClientActivationStatusDTO`.
**Activator** (`principalUserId` → resolve `Activator`): `getPending(): PendingActivationDTO[]` · `getActive(principalUserId): ActiveRequestDTO[]` · `take(id, principalUserId): ActiveRequestDTO` · `flagWrong(id, principalUserId, cmd): ActiveRequestDTO` · `requestAdditional(id, principalUserId, cmd): ActiveRequestDTO` · `activate(id, principalUserId): ActiveRequestDTO` · `cancel(id, principalUserId): void` · `release(id, principalUserId): void` · `freeze(id, principalUserId, cmd): ActiveRequestDTO` · `getMyHistory(principalUserId, query): PaginatedResult<ActivatorHistoryItemDTO>` · `getRecent(): RecentActivationDTO[]`.
**Admin:** `getAll(query): PaginatedResult<AdminActivationDTO>` · `getById(id): ActivationDetailDTO` · `activateByAdmin(id): AdminActivationDTO` · `cancelByAdmin(id): AdminActivationDTO` · `setPrice(id, cmd, actorId): AdminActivationDTO`.

### 8.2 Service — state machine (guards → mutation → **post-commit** emit)

**Client**
- **verify** — find `Card` by `key` (not soft-deleted). Missing **or** `isActive=false` → `INVALID`. Else resolve from `cardStat` + latest non-terminal activation: `AT_DISTRIBUTOR`+none → `READY`; in-progress maps `PENDING→SUBMITTED`, `PROCESSING→PROCESSING`, `WRONG_INFORMATION→NEEDS_CORRECTION`(+`flaggedFields`), `ADDITIONAL_INFORMATION→NEEDS_OTP`(+`requestedFields`), `FREEZE→UNDER_REVIEW`, +`activationId`+`submittedFields`(password masked); `ACTIVATED→ACTIVATED`(+`accountUsername`); `ACTIVATION_FAILED→FAILED`. **No emit.**
- **submit** — card by `key`; require `isActive`+`AT_DISTRIBUTOR`+no live activation (else `RESOURCE_CONFLICT`) → **$tx** { `Activation`(`PENDING`,client info) → `ActivationInformation` rows from `accountFields` (`@@unique(activationId,accountInform)`) → `ActivationStep`(`PENDING`) → card `→ACTIVATION_PROGRESS` } → **emit** `activation:created`(+`activation:status-changed`).
- **update** — load by `activationId`; require `WRONG_INFORMATION` → **$tx** { write corrected values onto the step's `WrongInformation` rows (**not** `ActivationInformation`) → `ActivationStep`(`PROCESSING`) → `PROCESSING` } → **emit** `client-updated`+`status-changed`.
- **additional** — require `ADDITIONAL_INFORMATION` → **$tx** { values onto step's `AdditionalInformation` rows → `ActivationStep`(`PROCESSING`) → `PROCESSING` } → **emit** `client-updated`+`status-changed`.
- **status** — load → map to `ClientActivationStatus`.

**Activator** (caller = resolved `Activator`)
- **getPending** — `PENDING`, unassigned, `requestedAt` asc → masked keys.
- **getActive** — caller's `PROCESSING`/`WRONG_INFORMATION`/`ADDITIONAL_INFORMATION`/`FREEZE`; resolve `accountFields` **latest-wins** (latest step value per field else `ActivationInformation`), `otpValue`, distributor+client → `ActiveRequestDTO[]` (**raw values**).
- **take** — count caller active; `≥3` → `RESOURCE_CONFLICT` → **atomic guarded update** `PENDING→PROCESSING` set `activatorId`,`takenAt=now` `WHERE activationStat=PENDING` (0 rows → 409 already taken) → `ActivationStep`(`PROCESSING`) → **emit** `activation:taken`.
- **flagWrong** — caller-owned + working state → `WRONG_INFORMATION` → `ActivationStep`+`WrongInformation` rows (value null) per field → **emit** `status-changed`.
- **requestAdditional** — same guard → `ADDITIONAL_INFORMATION` → step + `AdditionalInformation` rows (value null) → **emit** `status-changed`.
- **activate** — caller-owned + working → **$tx** { `ACTIVATED`,`completedAt=now`, `activationPrice` from plan commission for the tier matching `takenAt→completedAt` against `CommissionDuration.nbMinuteMin/Max` (null max = catch-all) → card `→ACTIVATED` → activator `nbOfActivation++`,`nbOfSuccessfulActivation++`,`totalEarning+=price`,`credits+=price` → distributor `nbOfActivation++`,`nbOfActiveCards--` → step } → **emit** `status-changed`.
- **cancel** — caller-owned + working → **$tx** { `CANCELLED_BY_ACTIVATOR`,`completedAt=now`,step → **new** `Activation`(`PENDING`) same card copying client info+`ActivationInformation` → new `ActivationStep`(`PENDING`); card stays `ACTIVATION_PROGRESS`; activator `nbOfActivation++` } → **emit** `activation:created`(new)+`status-changed`.
- **release** (frontend inactivity timeout — `ACTIVATION_ROUTES.RELEASE`) — caller-owned + working → **$tx** { `REMOVED_FROM_ACTIVATOR`,`completedAt=now`, `ActivationStep`(`REMOVED_FROM_ACTIVATOR`) → **new** `Activation`(`PENDING`) same card copying client info+`ActivationInformation` → new `ActivationStep`(`PENDING`); card stays `ACTIVATION_PROGRESS`; activator `nbOfActivation++` (no success/earning) } → **emit** `activation:created`(new)+`status-changed`. Structurally mirrors **cancel** but with the `REMOVED_FROM_ACTIVATOR` outcome, keeping an idle-release distinct from a deliberate cancel in history/metrics. **Counter policy (confirmed 2026-06-30):** `nbOfActivation++` only — parity with §6(b) ("counts every assigned terminal outcome"); `nbOfSuccessfulActivation`, `totalEarning`, and `credits` are untouched.
- **freeze** — caller-owned + working → `FREEZE`,`freezReason=reason` → `ActivationStep`(`FREEZE`) → **emit** `activation:frozen`+`status-changed`.
- **getMyHistory / getRecent** — terminal activations (own paginated / global last 10); resolve labels; compute `durationSeconds`(`takenAt→completedAt`) + `earning`.

**Admin**
- **getAll** — join card/plan/activator/distributor; filters per `GetActivationsQuery`; paginate → `AdminActivationDTO`. (Dashboard frozen/pending lists via `state=FREEZE`/`PENDING`.)
- **getById** — assemble `ActivationDetailDTO`: blocks, `submittedInformation` latest-wins (**password/OTP masked**), `timeline` from `ActivationStep` (each with its `WrongInformation`/`AdditionalInformation` field+value and `freezeReason`), `cardHistory` (derived), `financial`.
- **activateByAdmin** — require `FREEZE` → **$tx** { `ACTIVATED_BY_ADMIN`,`completedAt=now`, compute price, card `→ACTIVATED`, credit **assigned** activator (as activate), distributor counters, step } → **emit** `activation:resolved`(outcome `ACTIVATED_BY_ADMIN`)+`status-changed`.
- **cancelByAdmin** — require `FREEZE` → **$tx** { `CANCELLED_BY_ADMIN`,`completedAt=now`, card `→ACTIVATION_FAILED`, activator `nbOfActivation++` (no success/earning), step } → **emit** `activation:resolved`(outcome `CANCELLED_BY_ADMIN`)+`status-changed`.
- **setPrice** — require completed (`ACTIVATED`/`ACTIVATED_BY_ADMIN`) → `activationPrice=amount`, adjust activator `totalEarning`/`credits` by **delta** → `Log CHANGE_ACTIVATION_COMMISSION`. (Admin activate/cancel are **not** logged — no matching type.)

### 8.3 Events (emit AFTER commit — `realtime-rules.md` §7.1)

| Trigger | Emit | Payload type |
|---|---|---|
| submit / cancel-spawn / release-spawn | `activation:created` | `PendingActivationDTO` |
| take | `activation:taken` | `{activationId, activatorId, timestamp}` |
| update / additional | `activation:client-updated` | `{activationId, activatorId, timestamp}` |
| freeze | `activation:frozen` | `{activationId, timestamp}` |
| activateByAdmin / cancelByAdmin | `activation:resolved` | `{activationId, activatorId, outcome, timestamp}` |
| any state change | `activation:status-changed` | `{activationId, status, timestamp}` |

> The service imports **only `eventBus`** (never `getIO()`). `common/realtime` already bridges these to `/client`,`/activators`,`/admin` (gateway shipped in Sub-01 Sprint 5). Payloads reuse contract event types — no new shapes.

### 8.4 Mapper — exposure rule (the security-critical part)

- **`ActiveRequestDTO`** (assigned activator **only**) — the **single** DTO carrying real `value`s incl. password/OTP, plus raw `key`.
- **`ActivationDetailDTO`** & **`KeyVerificationDTO`** — **mask** password/OTP values.
- **Pools / recent** (`PendingActivationDTO`,`RecentActivationDTO`) — `keyMasked` (last 4); history keeps raw `key` (activator owns it).
- `Decimal`→number(2dp); timestamps→ISO; `durationSeconds`=`takenAt→completedAt`; `AccountInformation`→`fieldLabel` via module-local label map (§1.2).
- **toPersistence:** `accountFields` → one `ActivationInformation` per `AccountInformation` on initial submit; corrections/additional → step-scoped `WrongInformation`/`AdditionalInformation`, never back into `ActivationInformation`.

### 8.5 Routes — two routers

**`keyRouter`** (mount `KEY_ROUTES.BASE` `/keys`, **public**, no auth):

| Constant | Method/Path | Validate |
|---|---|---|
| `VERIFY` | POST `/verify` | body `VerifyKeySchema` |
| `SUBMIT` | POST `/submit` | body `SubmitActivationSchema` |
| `UPDATE` | PUT `/:activationId/update` | params `ActivationIdParamsSchema` + body `UpdateActivationSchema` |
| `ADDITIONAL` | POST `/:activationId/additional` | params `ActivationIdParamsSchema` + body `SubmitAdditionalInfoSchema` |
| `STATUS` | GET `/:activationId/status` | params `ActivationIdParamsSchema` |

**`activationRouter`** (mount `ACTIVATION_ROUTES.BASE` `/activations`) — **register static GETs before `/:id`:**

| Order | Constant | Method/Path | Access | Validate |
|---|---|---|---|---|
| 1 | `GET_PENDING` | GET `/pending` | activator | — |
| 2 | `GET_ACTIVE` | GET `/active` | activator | — |
| 3 | `GET_MY_HISTORY` | GET `/my-history` | activator | query `GetActivatorHistoryQuerySchema` |
| 4 | `GET_RECENT` | GET `/recent` | activator | — |
| 5 | `GET_ALL` | GET `/` | admin | query `GetActivationsQuerySchema` |
| 6 | `GET_BY_ID` | GET `/:id` | admin | params `ActivationActionParamsSchema` |
| 7 | `TAKE` | POST `/:id/take` | activator | params |
| 8 | `FLAG_WRONG` | POST `/:id/flag-wrong-info` | activator | params + body `FlagWrongInfoSchema` |
| 9 | `REQUEST_ADDITIONAL` | POST `/:id/request-additional` | activator | params + body `RequestAdditionalInfoSchema` |
| 10 | `ACTIVATE` | POST `/:id/activate` | activator | params |
| 11 | `CANCEL` | POST `/:id/cancel` | activator | params |
| 12 | `RELEASE` ⬅ **new contract const (§8.6)** | POST `/:id/release` | activator | params `ActivationActionParamsSchema` |
| 13 | `FREEZE` | POST `/:id/freeze` | activator | params + body `FreezeRequestSchema` |
| 14 | `ACTIVATE_BY_ADMIN` | POST `/:id/activate-by-admin` | admin | params |
| 15 | `CANCEL_BY_ADMIN` | POST `/:id/cancel-by-admin` | admin | params |
| 16 | `SET_PRICE` | POST `/:id/set-price` | admin | params + body `SetActivatorPriceSchema` |

> Guards: `requireAuth({roles:[UserRole.ACTIVATOR]})` / `requireAuth({roles:[UserRole.ADMIN]})`. Controller passes `req.user.id` as `principalUserId` (activator methods → resolve `Activator`) or `actorId` (`setPrice`).

### 8.6 Contract addition (the one Stage-1 change — approved)

Add to **`Apps/contract/src/modules/activation/activation.routes.ts`**, inside `ACTIVATION_ROUTES`:

```
RELEASE: '/:id/release',
```

- **Reuses** `ActivationActionParamsSchema` (`{id}`) — no new query/param schema.
- **No body command**, **no response DTO** (returns `204`), **no enum** — `REMOVED_FROM_ACTIVATOR` already in `ActivationStat`.
- **No event addition** — reuses `activation:created` + `activation:status-changed`.
- Re-export is automatic (barrel `export * from './activation.routes'`). Rebuild `@my-app/contract` before the API references it.

> This is the **only** declaration in this set not already in the contract; everything else was verified present. Make this edit first in the Activation sprint.

---

## 9. `modules/index.ts` additions

```
moduleRouter.use(SET_ROUTES.BASE, setRouter);
moduleRouter.use(LOT_ROUTES.BASE, lotRouter);
moduleRouter.use(ORDER_ROUTES.BASE, orderRouter);
moduleRouter.use(CARD_ROUTES.BASE, cardRouter);
moduleRouter.use(KEY_ROUTES.BASE, keyRouter);
moduleRouter.use(ACTIVATION_ROUTES.BASE, activationRouter);
```

---

## 10. Test strategy (`test/`, per `test-rules.md`)

**Factories (`test/data/`)** — `set.factory`, `lot.factory`, `order.factory` (+ geography/delivery-company/distributor seeds), `card.factory`, `activation.factory` (seed `Activation`+`ActivationInformation`+`ActivationStep`+`WrongInformation`/`AdditionalInformation`; helpers for each `ActivationStat`). No hardcoded ids; reuse existing `activator`/`distributor` seeds.

**Unit — service (mock Prisma)** — the §7 scenarios of each spec, notably: Set create generates exactly `numberOfKeys` cards; Set/Lot/Order illegal transitions → `RESOURCE_CONFLICT`; Lot create rejects non-`PRINTED`/wrong-plan/assigned cards; Order DELIVERED cascade + `nbOfActiveCards++`; Card state guards (delete/disable/enable/revoke); Activation take 3-slot + atomic-guard 409, exposure masking, price-tier selection (incl. catch-all), counter math on activate/cancel/admin-resolve, set-price delta + log.

**Unit — mapper** — every `toDTO` parses its schema; `Decimal`→number 2dp; **exposure:** `ActiveRequestDTO` shows password/OTP, `ActivationDetailDTO`/`KeyVerificationDTO` mask them, pool/recent keys masked.

**Integration (Supertest)** — happy-path + guard codes per route; **403** for wrong role; **409** for state conflicts; Activation: take race (200 then 409), update/additional only in the right state, admin activate/cancel only from `FREEZE`, set-price only when completed.

**Realtime integration** — extend `test/integration/realtime/gateway.spec.ts`: submit→`activation:created` reaches `/activators`; freeze→`activation:frozen` reaches `/admin`; status-changed reaches the subscribed `/client` activation room only. Use factories.

**Conformance** — assert every `SET_ROUTES`/`LOT_ROUTES`/`ORDER_ROUTES`/`CARD_ROUTES`/`KEY_ROUTES`/`ACTIVATION_ROUTES` constant is registered; parse representative `res.body.data` through the matching response schema.

---

## 11. Suggested build sprints (one module per sprint, commit on green)

1. **Set** — generators (`setNumber`,`key`) + 6-file + cascade tests.
2. **Lot** — 6-file; depends on Set's `PRINTED` cards.
3. **Order** — 6-file; geography/delivery validation; DELIVERED/RETURNED cascades.
4. **Card** — 6-file; admin actions + derived timeline.
5. **Activation** — **first** add the `ACTIVATION_ROUTES.RELEASE` contract constant (§8.6) and rebuild the contract; then two routers, full state machine (incl. `release`), mapper exposure, post-commit emits, realtime integration test.

> Each sprint: `tsc --noEmit` clean, unit+integration green, no `console.*`, no `process.env` outside `env.ts`, services never import `getIO()`, emits after commit.
