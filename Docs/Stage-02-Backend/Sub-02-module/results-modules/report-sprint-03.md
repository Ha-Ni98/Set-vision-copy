# Sprint 3 Report — Auth: Logic (service)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/auth/auth.service.ts` — `AuthService implements IAuthService`:
  - **login**: `findUnique` by username → check `deletedAt`/`isEnabled` (generic `AUTH_INVALID_CREDENTIALS` for all three failure modes + wrong password, identical message); mint access JWT + opaque refresh; store SHA-256 hash + `expiredAt`; update `lastLoginAt`.
  - **refresh**: lookup by `tokenHash`; expired → delete + `AUTH_UNAUTHORIZED`; unknown → `AUTH_UNAUTHORIZED`; rotate (delete old, create new hash).
  - **logout**: `deleteMany` by hash — idempotent.
  - **me**: load `User` then dispatch to `admin.findUnique` or `activator.findUnique` by role; compose `SessionUserDTO` via `AuthMapper`.
- `test/data/auth.factory.ts` — `seedUser(prisma, overrides)`: persists `User` (argon2-hashed), creates the role profile (`Admin` or `Activator`); returns credentials for integration tests.
- `test/unit/modules/auth/auth.service.spec.ts` — 14 tests (mock Prisma): login success (tokens + lastLoginAt update + hash stored); 4 identical-message failure modes; refresh rotate + expired cleanup + unknown → 401; logout idempotent; me for admin and activator profiles.
- Added `ms` as explicit direct dependency (`package.json`).

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **99/99 passed** (+14 tests)
- Refresh tokens persisted only as SHA-256 hash; `REFRESH_TOKEN_EXPIRATION` drives `expiredAt`; login failure messages are byte-identical across all 4 failure modes.
