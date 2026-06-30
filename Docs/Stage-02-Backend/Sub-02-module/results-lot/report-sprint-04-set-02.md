# Sprint 04 Report — Lot Foundation (mapper + interface)

**Module set:** Set · Lot · Order · Card · Activation (Set 02)
**Sprint:** 4 — Lot Foundation
**Status:** ✅ Green

---

## Deliverables

### Source files created
- `apps/api/src/modules/lot/lot.mapper.ts` — `LotMapper.toDTO(lot, plan, deliveredCardsCount)`; reuses `composeSubscriptionLabel` from set mapper; `createdAt`/`deliveryDate` → ISO; ends with `LotResponseSchema.parse`.
- `apps/api/src/modules/lot/lot.interface.ts` — `ILotService` { `getAll`, `getAvailableForOrder`, `create`, `delete` }.
- `apps/api/src/modules/lot/lot.util.ts` — pure `generateLotNumber()` (format `LOT-YYYYMMDD-RRRRRR`).

### Test data created
- `test/data/lot.factory.ts` — `lotEntity` (in-memory) + `seedLot` (any `lotStat`, reuses plan factory).

### Test file created
- `test/unit/modules/lot/lot.mapper.spec.ts` — 9 tests: schema parse, `deliveredCardsCount` passthrough, `deliveryDate` null/ISO, `createdAt` ISO, label resolution, all `LotStat` values, no entity spread, `isReturned`.

---

## Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean |
| `npm run test:unit` (23 files, 244 tests) | ✅ Green |
| `deliveredCardsCount` is mapper input (not stored on `Lot`) | ✅ |
| Interface returns DTOs only | ✅ |
