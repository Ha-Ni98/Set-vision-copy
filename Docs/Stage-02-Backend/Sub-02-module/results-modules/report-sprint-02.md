# Sprint 2 Report — Auth: Foundation (mapper + interface)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/auth/auth.mapper.ts` — `AuthMapper`:
  - `toAuthTokensDTO(accessToken, refreshToken, role)` → `AuthTokensResponseSchema.parse`. Never exposes `password`/`tokenHash`.
  - `toSessionUserDTO(user, profile)` → picks `id`/`username`/`role` from `User`, `fullName` from the role profile (`Admin` or `Activator`); `SessionUserResponseSchema.parse`. Works for both roles.
- `src/modules/auth/auth.interface.ts` — `IAuthService` with 4 methods: `login`, `refresh`, `logout`, `me`. All return contract DTOs; no Prisma entities in signatures.
- `test/unit/modules/auth/auth.mapper.spec.ts` — 8 tests: schema conformance for both DTOs, admin+activator profile resolution, no secret leak (`password`/`tokenHash` absent).

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **85/85 passed** (+8 tests)
- Interface methods return only contract DTOs; mapper excludes all sensitive fields.
