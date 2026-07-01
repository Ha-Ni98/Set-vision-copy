# Sprint 8 Report — Activator: Foundation (mapper + interface)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/activator/activator.interface.ts` — `IActivatorService` with 9 methods: `getAll`, `create` (→`actorId`), `getById`, `update`, `toggle`, `resetPassword`, `delete`, `performance`, `myStats` (→`principalUserId`).
- `src/modules/activator/activator.mapper.ts` — `ActivatorMapper` static class:
  - `decimalToNumber(d)` — `Number(d.toFixed(2))` (DZD, 2dp).
  - `toDTO(activator, user, { avgActivationTimeSeconds })` — reads `isEnabled`/`lastLoginAt`/`createdAt`/`username` from `User`; converts `totalEarning`/`credits` via `decimalToNumber`; passes `avgActivationTimeSeconds` as a derived parameter; validates through `ActivatorResponseSchema.parse`.
  - `toDetailDTO(...)` — extends `toDTO` with `totalPaid`, `creditsOwed`, `successRate` (all derived, passed in by service).
  - `toWithCredentialsDTO(...)` — wraps `toDTO` + `generatedPassword` through `ActivatorWithCredentialsResponseSchema`.
  - `toGeneratedPasswordDTO(str)` — validates through `ActivatorGeneratedPasswordResponseSchema`.
  - `toPerformanceDTO(series)` — maps `Date→ISO`, `Decimal→number(2dp)`, validates through `ActivatorPerformanceResponseSchema`.
  - `toDashboardDTO(stats)` — converts `Decimal` earnings/balance, maps weekly `Date→ISO`, validates through `ActivatorDashboardResponseSchema`.
  - `toPersistenceCreate(cmd)` — trims strings, maps `initialCredits→credits` (default 0).
  - `toPersistenceUpdate(cmd)` — selectively trims partial string fields.
- `test/data/activator.factory.ts` — `createActivatorPayload`, `activatorEntity` (with `Prisma.Decimal` for numeric fields), `seedActivator` (persists `User(ACTIVATOR)` + `Activator`; supports `credits`/`totalEarning`/counter overrides).
- `test/unit/modules/activator/activator.mapper.spec.ts` — 21 tests covering: schema parse; no `password`/`deletedAt`; `isEnabled` from User; `Decimal→number` 2dp; `avgActivationTimeSeconds` null when none; `successRate` 0 guard; performance series date/earned mapping; dashboard stats.

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **165/165 passed** (+21 mapper tests)
- `Decimal` fields always serialized as `Number(d.toFixed(2))` — never raw `Prisma.Decimal` in any DTO.
- Derived fields (`avgActivationTimeSeconds`, `totalPaid`, `creditsOwed`, `successRate`) are parameters — computed in service, not in mapper.
- Login password never appears in any DTO; `deletedAt` filtered by Zod `.parse` of each schema.
