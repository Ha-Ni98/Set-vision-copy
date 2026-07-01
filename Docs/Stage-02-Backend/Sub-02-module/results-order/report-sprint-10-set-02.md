# Sprint 10 Report — Card Foundation (mapper + interface)

**Status:** ✅ Done  
**Sprint:** 10 of 16  
**Module:** Card  
**Layer:** Foundation

---

## Deliverables

| File | Description |
|------|-------------|
| `Apps/api/src/modules/card/card.mapper.ts` | `CardMapper` — `toDTO`, `toDetailDTO`, `toAvailableDTO`; `CardJoins` + `DistributionTimelineEntry` types |
| `Apps/api/src/modules/card/card.interface.ts` | `ICardService` — 7 method signatures |
| `Apps/api/test/data/card.factory.ts` | Extended with `cardTimelineSources()` helper |
| `Apps/api/test/unit/modules/card/card.mapper.spec.ts` | 19 unit tests |

---

## Mapper design

### `CardJoins`
```typescript
{
  subscriptionPlan: { subscriptionType; subscriptionDuration };
  set: { setNumber: string };
  lot: { lotNumber: string } | null;
  distributor: { storeName: string } | null;
}
```

### `DistributionTimelineEntry`
```typescript
{ stat: CardStat; at: Date }
```
Timeline is assembled by the service from set/lot/order timestamps (no card-history table). Only stages that have been reached are included.

### Methods
| Method | Output | Schema guard |
|--------|--------|-------------|
| `toDTO(card, joins)` | `CardDTO` | `CardResponseSchema.parse` |
| `toDetailDTO(card, joins, timeline)` | `CardDetailDTO` | `CardDetailResponseSchema.parse` |
| `toAvailableDTO(card, plan)` | `AvailableCardDTO` | `AvailableCardResponseSchema.parse` |

- `subscriptionLabel` resolved via `composeSubscriptionLabel` (imported from `set.mapper`)
- `lotNumber` / `distributorName` — null-safe via `?.` + `?? null`
- `createdAt` → `.toISOString()`
- `cardStat` cast: `card.cardStat as CardStat`

---

## ICardService

```typescript
interface ICardService {
  getAll(query: GetCardsQuery): Promise<PaginatedResult<CardDTO>>;
  getAvailableForLot(query: GetAvailableCardsQuery): Promise<AvailableCardDTO[]>;
  getById(id: string): Promise<CardDetailDTO>;
  delete(id: string, actorId: string): Promise<void>;
  disable(id: string): Promise<CardDTO>;
  enable(id: string): Promise<CardDTO>;
  revoke(id: string, actorId: string): Promise<CardDTO>;
}
```

---

## Unit test coverage (19 tests)

### `CardMapper.toDTO` (11)
- Parses `CardResponseSchema`
- `lotNumber` null when no lot join
- `lotNumber` resolved from lot join
- `distributorName` null when no distributor
- `distributorName` from `storeName`
- `subscriptionLabel` resolved
- `setNumber` resolved
- Flags (`isActive`, `isDisabled`, `isRevoked`) pass through
- `createdAt` serialized as ISO string
- All `CardStat` values map correctly
- No `deletedAt` / `updatedAt` in output

### `CardMapper.toDetailDTO` (5)
- Parses `CardDetailResponseSchema`
- Timeline dates serialized as ISO strings
- Empty timeline → `[]`
- Timeline length preserved
- Base `CardDTO` fields present

### `CardMapper.toAvailableDTO` (3)
- Parses `AvailableCardResponseSchema`
- `id`, `key`, `subscriptionLabel` present
- `subscriptionLabel` for alternative duration

---

## Validation results

```
tsc --noEmit             → clean
npm run test:unit        → 321/321 (27 files)
```
