# Sprint 15 Report — Activation Logic B (admin service)

**Status:** ✅ Done  
**Sprint:** 15 of 16  
**Module:** Activation  
**Layer:** Logic B (admin)

---

## Deliverables

| File | Description |
|------|-------------|
| `Apps/api/src/modules/activation/activation.service.ts` | Admin methods implemented: `getAll`, `getById`, `activateByAdmin`, `cancelByAdmin`, `setPrice` |
| `Apps/api/test/unit/modules/activation/activation.service.admin.spec.ts` | 29 unit tests across all 5 admin methods |

---

## Admin methods

### `getAll`
- Builds `cardWhere` incrementally (avoids key conflicts from spreading): `subscriptionPlanId`, `distributorId`, `key`, nested `distributor.wilayaId`/`communeId`
- `requestedAt` range built separately (prevents dateFrom/dateTo conflict)
- Joined: `card(subscriptionPlan, distributor.storeName)` + `activator(fullName)`
- Ordered by `requestedAt desc`; paginated with `toSkipTake` + `buildPaginationMeta`
- Maps to `AdminActivationDTO` via `toAdminActivationDTO`

### `getById`
- Full include: `card(set, lot(orderLots(order.completedAt)), subscriptionPlan+commissions, distributor(wilaya, commune))`, `activator(id, fullName)`, `information`, `steps(wrongInformation, additionalInformation)` ordered desc
- **`buildCardHistory`** derives `CardStat` timeline from timestamps: `IN_SET`, `PRINTED`, `IN_LOT`, `AT_DISTRIBUTOR`, `ACTIVATION_PROGRESS`, then terminal (`ACTIVATED`/`ACTIVATION_FAILED`) when `completedAt` present
- **Latest-wins merge** via `resolveLatestWinsInfo` (steps ordered desc, reversed for chronological apply)
- **Commission tier**: `computeCommission` called only when `takenAt && completedAt` both present
- Maps to `ActivationDetailDTO` via `toActivationDetailDTO` (PASSWORD/OTP masked in submittedInformation + timeline fields)

### `activateByAdmin`
- Requires `FREEZE` → ConflictError if not
- `computeCommission` using `takenAt → now`
- `$tx`: `ACTIVATED_BY_ADMIN + completedAt + price` → `card ACTIVATED` → `activator(nbOfActivation++, nbOfSuccessfulActivation++, totalEarning+=price, credits+=price)` → `distributor(nbOfActivation++, nbOfActiveCards--)` → step
- Emits `activation:resolved(ACTIVATED_BY_ADMIN)` + `activation:status-changed(ACTIVATED)` after commit
- **No log** (only `setPrice` logs)

### `cancelByAdmin`
- Requires `FREEZE` → ConflictError if not
- `$tx`: `CANCELLED_BY_ADMIN + completedAt` → `card ACTIVATION_FAILED` → `activator(nbOfActivation++)` (no success/earning) → step
- Emits `activation:resolved(CANCELLED_BY_ADMIN)` + `activation:status-changed(FAILED)` after commit
- **No log**

### `setPrice`
- Requires `activationStat ∈ {ACTIVATED, ACTIVATED_BY_ADMIN}` → ConflictError if not
- `delta = cmd.amount − (activation.activationPrice ?? 0)` — supports both positive and negative adjustment
- `$tx`: `activation.activationPrice = new Prisma.Decimal(cmd.amount)` + `activator(totalEarning += delta, credits += delta)`
- Writes `Log(CHANGE_ACTIVATION_COMMISSION, actorId)` after transaction
- **No event emitted**

---

## New private helper

```
buildCardHistory(card, requestedAt, completedAt, activationStat)
```

Derives the card's stat timeline:

| Condition | Stat added |
|-----------|-----------|
| Always | `IN_SET` at `card.set.createdAt` |
| `set.printedAt != null` | `PRINTED` at `set.printedAt` |
| `lot != null` | `IN_LOT` at `lot.createdAt` |
| `lot.orderLots[0]?.order.completedAt != null` | `AT_DISTRIBUTOR` |
| Always | `ACTIVATION_PROGRESS` at `requestedAt` |
| `completedAt != null && ACTIVATED\|ACTIVATED_BY_ADMIN` | `ACTIVATED` |
| `completedAt != null && CANCELLED_BY_ADMIN` | `ACTIVATION_FAILED` |

---

## Import additions

- `Prisma` from `@prisma/client` — for `new Prisma.Decimal(cmd.amount)` in `setPrice`
- `CardStat, LogActionType` from `@my-app/contract` — for card history enum and log action type

---

## Unit test coverage (29 tests)

| Suite | Tests | Key assertions |
|-------|-------|----------------|
| `getAll` | 4 | empty result; AdminActivationDTO mapping; state filter passed to Prisma; key filter on card relation |
| `getById` | 7 | not found; PASSWORD masked / USERNAME not; cardHistory 5 entries for full chain; ACTIVATED appended; ACTIVATION_FAILED for CANCELLED_BY_ADMIN; commissionTierLabel computed / null when incomplete; timeline step masking |
| `activateByAdmin` | 5 | not found; not FREEZE → 409; ACTIVATED_BY_ADMIN stat + card + counters; events emitted; return DTO state |
| `cancelByAdmin` | 5 | not FREEZE → 409; CANCELLED_BY_ADMIN + ACTIVATION_FAILED card; no success/earning; events emitted; no log |
| `setPrice` | 6 | not found; not completed → 409; delta +50 applied; delta −50 applied; CHANGE_ACTIVATION_COMMISSION logged; no event emitted; return DTO price |

---

## Validation results

```
tsc --noEmit             → clean
npm run test:unit        → 473/473 (31 files)
```
