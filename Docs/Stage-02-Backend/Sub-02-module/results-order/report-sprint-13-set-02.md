# Sprint 13 Report — Activation Foundation (mapper + interface)

**Status:** ✅ Done  
**Sprint:** 13 of 16  
**Module:** Activation  
**Layer:** Foundation

---

## Deliverables

| File | Description |
|------|-------------|
| `Apps/contract/src/modules/activation/activation.routes.ts` | Added `RELEASE: '/:id/release'` to `ACTIVATION_ROUTES` |
| `Apps/api/src/modules/activation/activation.mapper.ts` | 8 mapper methods; masking + key utilities; `ActivationPlanJoin` typed from Prisma |
| `Apps/api/src/modules/activation/activation.interface.ts` | `IActivationService` — 22 methods (client 5 + activator 11 + admin 5) |
| `Apps/api/test/data/activation.factory.ts` | Entity builders + `seedActivation`, `seedCommissionDuration` helpers |
| `Apps/api/test/unit/modules/activation/activation.mapper.spec.ts` | 53 unit tests across all 8 mapper methods |

---

## Contract change

`ACTIVATION_ROUTES.RELEASE = '/:id/release'` added — the only Stage-1 contract addition for this set (§8.6). Reuses `ActivationActionParamsSchema`, no body, returns 204.

---

## Mapper methods

| Method | Output DTO | Masking |
|--------|-----------|---------|
| `toKeyVerificationDTO` | `KeyVerificationDTO` | PASSWORD + OTP masked in `submittedFields` |
| `toClientStatusDTO` | `ClientActivationStatusDTO` | — |
| `toPendingDTO` | `PendingActivationDTO` | `keyMasked` (last 4 chars) |
| `toActiveRequestDTO` | `ActiveRequestDTO` | Raw key + raw values (§0.1.2 exception) |
| `toActivatorHistoryItemDTO` | `ActivatorHistoryItemDTO` | Raw key; `durationSeconds` + `earning` computed |
| `toRecentDTO` | `RecentActivationDTO` | `keyMasked` (last 4 chars) |
| `toAdminActivationDTO` | `AdminActivationDTO` | Raw key; `durationSeconds` + `activationPrice` as number |
| `toActivationDetailDTO` | `ActivationDetailDTO` | PASSWORD + OTP masked; FREEZE step `freezeReason` from `activation.freezReason` |

---

## Exposure rules centralized in mapper (§8.4)

- `ActiveRequestDTO` — raw `key` + raw `value`s (activator owns the request, sanctioned exception)
- `ActivationDetailDTO` + `KeyVerificationDTO` — mask PASSWORD and OTP with `****`
- `PendingActivationDTO` + `RecentActivationDTO` — `keyMasked`: last 4 chars visible, rest `*`
- `ActivatorHistoryItemDTO` + `AdminActivationDTO` — raw `key`

---

## Interface

`IActivationService` with 22 methods grouped by principal:

- **Client (public):** `verify`, `submit`, `update`, `additional`, `status`
- **Activator** (`principalUserId` → resolves `Activator`): `getPending`, `getActive`, `take`, `flagWrong`, `requestAdditional`, `activate`, `cancel`, `release`, `freeze`, `getMyHistory`, `getRecent`
- **Admin:** `getAll`, `getById`, `activateByAdmin`, `cancelByAdmin`, `setPrice`

---

## Unit test coverage (53 tests)

| Suite | Tests | Key assertions |
|-------|-------|----------------|
| `toKeyVerificationDTO` | 8 | No plan/activation → status only; PASSWORD masked; USERNAME → `accountUsername`; flagged/requestedFields from latestStep |
| `toClientStatusDTO` | 9 | All 7 mapped stats + CANCELLED fallback → FAILED; schema parse |
| `toPendingDTO` | 4 | `keyMasked` = `********E5F6`; label composed; ISO date; schema |
| `toActiveRequestDTO` | 7 | Raw key; PASSWORD not masked; distributor block; otpValue pass-through; freezeReason; schema |
| `toActivatorHistoryItemDTO` | 6 | Raw key; `durationSeconds=330` (5m30s); null takenAt → null; Decimal → 2dp; schema |
| `toRecentDTO` | 3 | keyMasked; ISO completedAt; schema |
| `toAdminActivationDTO` | 6 | Raw key; durationSeconds; nullable activatorFullName; Decimal price; null price; schema |
| `toActivationDetailDTO` | 10 | PASSWORD/OTP masked; USERNAME not masked; FREEZE step has freezeReason; non-FREEZE null; ISO cardHistory; null activator; commissionTierLabel; schema |

---

## Implementation notes

- `ActivationPlanJoin = Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>` (Prisma type) — required to satisfy `composeSubscriptionLabel`'s parameter type; test fixtures cast via `as unknown as ActivationPlanJoin`.
- `ActivationStepEntry.activationStat` typed as `string` so the service can pass the Prisma enum without import coupling.
- `freezReason` (Prisma typo) → `freezeReason` (DTO) bridged in `toActiveRequestDTO` and `toActivationDetailDTO`.
- Zod v4 `z.uuid()` validates RFC 4122 variant bits — fixture IDs use `8` in the 4th segment's first position.

---

## Validation results

```
tsc --noEmit             → clean
npm run test:unit        → 403/403 (29 files)
```
