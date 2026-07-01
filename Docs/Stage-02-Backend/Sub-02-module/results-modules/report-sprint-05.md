# Sprint 5 Report — Admin: Foundation (mapper + interface)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/admin/admin.mapper.ts` — `AdminMapper` (static):
  - `toDTO(admin, user)` — builds `AdminDTO` by listing fields explicitly; `isEnabled` sourced from **`User.isEnabled`**; dates to ISO; parse via `AdminResponseSchema`; never exposes `password`/`deletedAt`.
  - `toWithCredentialsDTO(admin, user, generatedPassword)` — nests `toDTO` result; parse via `AdminWithCredentialsResponseSchema`.
  - `toGeneratedPasswordDTO(generatedPassword)` — parse via `AdminGeneratedPasswordResponseSchema`.
  - `toPersistence(cmd)` — accepts full or partial command; trims all present string fields; omits undefined keys (works for both create and update).
- `src/modules/admin/admin.interface.ts` — `IAdminService`: 7 methods (`getAll`, `create`, `getById`, `update`, `toggle`, `resetPassword`, `delete`); mutations carry `actorId`.
- `test/data/admin.factory.ts` — `createAdminPayload(overrides)`, `adminEntity(overrides)` (Prisma-shaped for unit tests), `seedAdmin(prisma, overrides)` (persists User+Admin for integration).
- `test/unit/modules/admin/admin.mapper.spec.ts` — 11 tests: schema round-trip; no `password`/`deletedAt` leak; `isEnabled` from User; `lastLoginAt` null↔ISO; `createdAt` ISO; field sourcing (id from Admin, username from User); `toWithCredentialsDTO`/`toGeneratedPasswordDTO` schema parse; `toPersistence` trimming + partial omission.

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **116/116 passed** (+11 tests)
- `isEnabled` always sourced from `User`, not `Admin`; `password`/`deletedAt` never in any DTO.
