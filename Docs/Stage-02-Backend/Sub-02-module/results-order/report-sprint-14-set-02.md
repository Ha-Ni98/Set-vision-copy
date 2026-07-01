# Sprint 14 Report — Activation Logic A (client + activator service)

**Status:** ✅ Done  
**Sprint:** 14 of 16  
**Module:** Activation  
**Layer:** Logic A (client + activator)

---

## Deliverables

| File | Description |
|------|-------------|
| `Apps/api/src/modules/activation/activation.service.ts` | `ActivationService` — 16 implemented methods (client 5 + activator 11) + 5 admin stubs |
| `Apps/api/test/unit/modules/activation/activation.service.spec.ts` | 41 unit tests across all client + activator methods |

---

## Service methods

### Client (public)

| Method | Logic summary |
|--------|---------------|
| `verify` | Finds card by key; `isActive=false` or not found → INVALID; no live activation → READY; maps latest activation stat → ClientActivationStatus; includes `flaggedFields`, `requestedFields`, `submittedFields`, `accountUsername` |
| `submit` | Guards card availability (not found / `isActive=false` / has live activation → ConflictError); `$tx` creates `Activation` + `ActivationInformation` + `ActivationStep(PENDING)` + card `→ACTIVATION_PROGRESS`; emits `activation:created` + `activation:status-changed` |
| `update` | Requires `WRONG_INFORMATION`; `$tx` `updateMany` WrongInformation on latest step + new `PROCESSING` step + stat update; emits `activation:client-updated` + `activation:status-changed` |
| `additional` | Requires `ADDITIONAL_INFORMATION`; same pattern as `update` for `additionalInformation`; emits same events |
| `status` | `findUnique` → `toClientStatusDTO`; NotFoundError if absent |

### Activator (principal resolved by `userId`)

| Method | Logic summary |
|--------|---------------|
| `getPending` | `PENDING` activations ordered by `requestedAt asc` → `toPendingDTO` (keyMasked) |
| `getActive` | `resolveActivator`; `WORKING_STATS`; latest-wins info merge; raw values + `otpValue` |
| `take` | `resolveActivator`; count active ≥3 → ConflictError; atomic `updateMany WHERE activationStat=PENDING`; count=0 → ConflictError; create step; reload; emit `activation:taken` |
| `flagWrong` | `resolveActivator`; `assertOwnerAndWorking`; `$tx` step(WRONG_INFORMATION) + `createMany` WrongInformation(null values) + stat update; emit NEEDS_CORRECTION |
| `requestAdditional` | Same pattern → ADDITIONAL_INFORMATION; emit NEEDS_OTP |
| `activate` | `resolveActivator`; `computeCommission` (picks tier by `durationMinutes`, null max = catch-all); `$tx` update activation(ACTIVATED+price+completedAt) + card(ACTIVATED) + activator(nbOfActivation++, nbOfSuccessfulActivation++, totalEarning+=, credits+=) + distributor(nbOfActivation++, nbOfActiveCards--) + step; emit ACTIVATED |
| `cancel` | `resolveActivator`; `assertOwnerAndWorking`; `$tx` update stat(CANCELLED_BY_ACTIVATOR+completedAt) + step + spawn new PENDING activation + PENDING step + activator(nbOfActivation++); emit FAILED + `activation:created` |
| `release` | Same as cancel but `REMOVED_FROM_ACTIVATOR`; activator only gets `nbOfActivation++` (no success/earning counters) |
| `freeze` | `assertOwnerAndWorking`; `$tx` update stat(FREEZE+freezReason) + step; emit `activation:frozen` + UNDER_REVIEW |
| `getMyHistory` | `resolveActivator`; paginated; TERMINAL_STATS; filters (status, dateFrom, dateTo, search on card.key); sortBy mapping |
| `getRecent` | ACTIVATED or ACTIVATED_BY_ADMIN; desc completedAt; take 10 → `toRecentDTO` (keyMasked) |

### Admin stubs (Sprint 15)

`getAll`, `getById`, `activateByAdmin`, `cancelByAdmin`, `setPrice` all throw `new Error('Not implemented')`.

---

## Key design decisions

- **Stat array types**: `WORKING_STATS`, `LIVE_STATS`, `CANCELLED_STATS`, `TERMINAL_STATS` annotated as `PrismaActivationStat[]` to prevent tuple inference breaking `.includes()`.
- **Latest-wins merge**: `resolveLatestWinsInfo` builds a Map from base `information`, then overwrites with `steps` reversed (steps stored desc, reversed = chronological asc).
- **`ACTIVE_REQUEST_INCLUDE`**: factored out as a `const` reused across `getActive`, `take`, `flagWrong`, `requestAdditional`, `freeze`.
- **cancel/release spawn**: both create a new PENDING activation inside `$tx`; `release` does NOT increment `nbOfSuccessfulActivation` or `totalEarning`/`credits` (plan §8.6).
- **Commission catch-all**: tier with `nbMinuteMax === null` matches any duration beyond bounded tiers.
- **`freezReason` typo**: Prisma field `freezReason` → DTO `freezeReason` bridged in service and mapper.
- **`eventBus.emit` placement**: always after `await prisma.$transaction(...)` completes, never inside the callback.

---

## Private helpers

| Helper | Purpose |
|--------|---------|
| `resolveActivator(userId)` | `activator.findUnique({ where: { userId } })` → ForbiddenError if null |
| `assertOwnerAndWorking(activation, activatorId)` | ForbiddenError if not owner; ConflictError if not in WORKING_STATS |
| `resolveLatestWinsInfo(base, steps)` | Latest-wins Map for account field values |
| `extractOtpValue(steps)` | First OTP value from additionalInformation across steps (desc order) |
| `computeCommission(tiers, takenAt, completedAt)` | Duration-based tier lookup; null max = catch-all |
| `buildDistributorJoin(dist)` | `{ storeName, wilaya: { frName }, commune: { frName } }` |
| `buildActiveRequestDTO(activation)` | Composes latest-wins info + otp + mapper call |

---

## Unit test coverage (41 tests)

| Suite | Tests | Key assertions |
|-------|-------|----------------|
| `verify` | 5 | card not found → INVALID; `isActive=false` → INVALID; no live → READY + subscriptionLabel; PENDING → SUBMITTED; WRONG_INFORMATION → NEEDS_CORRECTION with flaggedFields; ACTIVATED → accountUsername |
| `submit` | 4 | card null → ConflictError; isActive=false → ConflictError; live activation → ConflictError; success → create + 2 events emitted |
| `update` | 3 | not found → NotFoundError; wrong stat → ConflictError; success → updateMany + 2 events |
| `additional` | 2 | wrong stat → ConflictError; success → emit |
| `status` | 2 | found → status DTO; not found → NotFoundError |
| `getPending` | 2 | empty list; keyMasked = `'********E5F6'` |
| `getActive` | 2 | no activator → ForbiddenError; PASSWORD value raw (not masked) |
| `take` | 4 | no activator → ForbiddenError; ≥3 active → ConflictError; 0 rows updated → ConflictError; success → emit `activation:taken` |
| `flagWrong` | 3 | not owner → ForbiddenError; not working → ConflictError; success → createMany WrongInformation + emit NEEDS_CORRECTION |
| `requestAdditional` | 2 | wrong stat → ConflictError; success → emit NEEDS_OTP |
| `activate` | 4 | wrong stat → ConflictError; within-range tier (5 min → 150); catch-all tier (60 min → 100); counters + emit ACTIVATED |
| `cancel` | 2 | wrong stat → ConflictError; success → new PENDING spawned + nbOfActivation++ + 2 events |
| `release` | 2 | REMOVED_FROM_ACTIVATOR; no success/earning counters |
| `freeze` | 1 | FREEZE + freezReason + 2 events |
| `getMyHistory` | 1 | paginated; durationSeconds=300 (5 min) |
| `getRecent` | 1 | keyMasked |

---

## Validation results

```
tsc --noEmit             → clean
npm run test:unit        → 444/444 (30 files)
```
