# Sprint 1 Report — User: shared mapper

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/user/user.mapper.ts` — `UserMapper.toUserIdentityDTO(user)`: picks the 6 safe fields, converts dates to ISO, casts `role as UserRole`, validates via `UserIdentityResponseSchema.parse`. Never spreads the entity; never returns `password` or `deletedAt`.
- `test/data/user.factory.ts` — added `userEntity(overrides)` returning a full Prisma-shaped `User` (incl. sensitive fields) for mapper tests. Existing `createUserPayload` unchanged.
- `test/unit/modules/user/user.mapper.spec.ts` — 9 tests covering: schema conformance, no `password`/`deletedAt`, `lastLoginAt` null↔ISO, `createdAt` ISO, `role` ADMIN/ACTIVATOR, pass-through of `id`/`username`/`isEnabled`.

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **77/77 passed** (+9 tests)
- No routes added; `modules/index.ts` unchanged.
