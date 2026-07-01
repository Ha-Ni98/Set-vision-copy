# Sprint 11 Report — Card Logic (service)

**Status:** ✅ Done  
**Sprint:** 11 of 16  
**Module:** Card  
**Layer:** Logic

---

## Deliverables

| File | Description |
|------|-------------|
| `Apps/api/src/modules/card/card.service.ts` | `CardService` — 7 methods; `extractJoins` + `buildTimeline` private helpers |
| `Apps/api/test/unit/modules/card/card.service.spec.ts` | 21 unit tests |

---

## Service design

### `getAll`
`where: { deletedAt: null, ... }` — soft-deleted cards excluded from all list queries.  
Flag filter: `disabled → isDisabled: true`, `revoked → isRevoked: true`.  
Paginated with `buildPaginationMeta` / `toSkipTake`.

### `getAvailableForLot`
Filter: `cardStat=PRINTED`, `lotId=null`, `isDisabled=false`, `subscriptionPlanId=param`, `deletedAt=null`.

### `getById`
Includes `lot.orderLots.order` (take 1, order by `order.createdAt desc`) for timeline.  
Timeline uses 4 valid `CardStat` entries — `IN_DELIVERY` is a lot/order stat, not a card stat, so it is omitted:

| Stage | Source |
|-------|--------|
| `IN_SET` | `set.createdAt` (always) |
| `PRINTED` | `set.printedAt` (if not null) |
| `IN_LOT` | `lot.createdAt` (if lot exists) |
| `AT_DISTRIBUTOR` | `order.completedAt` (if lot has a completed order) |

### `delete`
Guard: `cardStat ∈ {IN_SET, PRINTED}` → soft-delete (`deletedAt=now`, key preserved) → `Log REMOVE_CARD`.

### `disable`
Guard: `cardStat ∈ {IN_LOT, AT_DISTRIBUTOR}` + `!isDisabled` → `$transaction`:
- `isDisabled=true, isActive=false`
- If was `AT_DISTRIBUTOR`: `distributor.nbOfActiveCards--`

### `enable`
Guard: `isDisabled=true` → `$transaction`:
- `isDisabled=false, isActive=true, cardStat=AT_DISTRIBUTOR`
- `distributor.nbOfActiveCards++`

### `revoke`
Guard: `cardStat=ACTIVATION_FAILED` + `!isDisabled` → `$transaction`:
- `isRevoked=true, isActive=true, cardStat=AT_DISTRIBUTOR`
- `distributor.nbOfActiveCards++`
→ `Log REVOKE_CARD`.

### Private helpers
- `extractJoins(card)` — builds `CardJoins` from Prisma result; `subscriptionPlan` cast with `as unknown as CardJoins['subscriptionPlan']`
- `buildTimeline(card)` — derives `DistributionTimelineEntry[]` from set/lot/order timestamps

---

## Unit test coverage (21 tests)

### `getAll` (2)
- Passes `deletedAt: null` in `where`
- Returns paginated result with items and meta

### `getById` (4)
- Throws `NotFoundError` when absent
- Builds timeline with only `IN_SET` when `printedAt` and lot are absent
- Includes `PRINTED` when `set.printedAt` exists
- Full timeline (IN_SET→PRINTED→IN_LOT→AT_DISTRIBUTOR) when lot + completedAt exist
- Omits `AT_DISTRIBUTOR` when `order.completedAt` is null

### `delete` (5)
- Soft-deletes `IN_SET` card + logs `REMOVE_CARD`
- Soft-deletes `PRINTED` card
- `ConflictError` for `IN_LOT`
- `ConflictError` for `AT_DISTRIBUTOR`
- `NotFoundError` when absent

### `disable` (4)
- `AT_DISTRIBUTOR`: sets flags + decrements `nbOfActiveCards`
- `IN_LOT`: sets flags, no distributor update
- `ConflictError` when already disabled
- `ConflictError` for invalid state (`PRINTED`)

### `enable` (2)
- Flips flags + `AT_DISTRIBUTOR` + increments `nbOfActiveCards`
- `ConflictError` when not disabled

### `revoke` (3)
- Sets flags + `AT_DISTRIBUTOR` + increments `nbOfActiveCards` + logs `REVOKE_CARD`
- `ConflictError` for non-`ACTIVATION_FAILED` state
- `ConflictError` when disabled

---

## Implementation notes

- `IN_DELIVERY` is **not** a `CardStat` value — the plan's description used it as a logical stage name. The timeline only records stages the card actually reaches (i.e. valid `CardStat` enum members that `CardDetailResponseSchema` accepts via `z.enum(CardStat)`).
- `extractJoins` uses `as unknown as CardJoins['subscriptionPlan']` to bridge Prisma's `$Enums.SubscriptionType` to the contract's `SubscriptionType`.

---

## Validation results

```
tsc --noEmit             → clean
npm run test:unit        → 342/342 (28 files)
```
