# Sprint 7 Report — Order Foundation (mapper + interface)

**Status:** ✅ Done  
**Sprint:** 7 of 16  
**Module:** Order  
**Layer:** Foundation

---

## Deliverables

### Source files

| File | Description |
|------|-------------|
| `Apps/api/src/modules/order/order.mapper.ts` | `OrderMapper.toDTO` + `toDetailDTO`; `OrderJoins` + `LotBreakdown` types; local `decimalToNumber`; `composeSubscriptionLabel` reused from set mapper |
| `Apps/api/src/modules/order/order.interface.ts` | `IOrderService` { `getAll`, `getById`, `create`, `transition`, `delete` } — no `actorId` (Order writes no Log) |
| `Apps/api/src/modules/order/order.util.ts` | `generateOrderNumber()` — format `ORD-YYYYMMDD-RRRRRR` |

### Test factories

| File | Seeds |
|------|-------|
| `Apps/api/test/data/geography.factory.ts` | `seedWilaya`, `seedCommune` (unique codes via `faker.string.numeric`) |
| `Apps/api/test/data/delivery-company.factory.ts` | `seedDeliveryCompany` |
| `Apps/api/test/data/distributor.factory.ts` | `seedDistributor` (creates wilaya + commune automatically) |
| `Apps/api/test/data/order.factory.ts` | `seedOrder` (creates distributor + delivery company; accepts `lotIds` for `OrderLot` rows) |

### Test file

| File | Tests |
|------|-------|
| `Apps/api/test/unit/modules/order/order.mapper.spec.ts` | 19 tests |

---

## Test coverage

### `OrderMapper.toDTO` (15 tests)
- Parses `OrderResponseSchema` cleanly
- Resolves `distributorName` from `distributor.storeName`
- Retains `distributorId` alongside resolved name
- Resolves `wilayaName` from `wilaya.frName`
- Resolves `communeName` from `commune.frName`
- Resolves `deliveryCompanyName`
- Passes `lotNumbers[]` array through
- Passes aggregate `cardsCount` through
- Converts `orderPrice` Decimal → number 2dp (rounding verified)
- Converts `deliverPrice` Decimal → number 2dp (rounding verified)
- `completedAt` null → null
- `completedAt` Date → ISO string
- `createdAt` Date → ISO string
- All `OrderStat` enum values map correctly
- All `DeliveryType` enum values map correctly

### `OrderMapper.toDetailDTO` (4 tests)
- Parses `OrderDetailResponseSchema` cleanly
- Includes all base `OrderDTO` fields
- `lots[]` array includes resolved `subscriptionLabel` via `composeSubscriptionLabel`
- Retains `wilayaId`/`communeId` alongside resolved names

---

## Validation results

```
tsc --noEmit      → clean (no errors)
npm run test:unit → 279/279 tests passed (25 test files)
```

---

## Key design decisions

- **`OrderJoins` type** carries pre-fetched relation data (`distributor.storeName`, `wilaya.frName`, etc.) as the service composes the joins before calling the mapper — no Prisma inside mapper.
- **`LotBreakdown` type** carries `subscriptionPlan: { subscriptionType, subscriptionDuration }` so the mapper can call `composeSubscriptionLabel` without additional DB access.
- **`decimalToNumber`** is a local helper (`Number(d.toFixed(2))`); reused for both `orderPrice` and `deliverPrice`.
- **No `actorId`** in `IOrderService` — Order has no matching `LogActionType` and writes no audit log.
- **`distributorId`/`wilayaId`/`communeId`** are retained alongside their resolved names to support frontend edit selects.
- **`seedDistributor`** seeds wilaya + commune automatically, keeping order factory ergonomic.
