---
sprint: 2
title: Framework
status: ✅ Done
commit: ae5c121
---

# Sprint 2 Report — Framework

## Work done

### L2 — Framework source
| File | Notes |
|---|---|
| `src/common/config/logger.ts` | Pino with `level: env.LOG_LEVEL`; conditional `pino-pretty` transport only in `development` (spread approach avoids `exactOptionalPropertyTypes` violation); redacts `req.headers.authorization` and `req.body.password` |
| `src/common/http/response.ts` | `sendSuccess<T>(res, data, status = 200)` — body typed as `ApiResponse<T>` imported from `@my-app/contract` |
| `src/common/events/event-bus.ts` | Typed `EventEmitter` wrapper; `AppEvents = ActivationEvents` (contract pre-check confirmed `UserEvents` is not yet exported — one-line TODO to widen when it is); exports `eventBus` singleton with `emit`, `on`, `off` |
| `src/common/utils/password.utils.ts` | `hashPassword` / `comparePassword` over bcrypt with `SALT_ROUNDS = 12` |
| `src/common/utils/token.utils.ts` | `generateToken` (signs with `env.JWT_SECRET` + `env.JWT_EXPIRATION as StringValue`); `verifyToken` (returns raw `JwtPayload`; middleware does schema validation) |

### Test foundations
| File | Notes |
|---|---|
| `test/data/user.factory.ts` | `createUserPayload(overrides?)` returning Faker-shaped `LoginCommand` (`username`, `password`) from `@my-app/contract` |
| `test/fixtures/db.fixture.ts` | `resetDatabase()` — guards `NODE_ENV === 'test'`, then TRUNCATE all tables RESTART IDENTITY CASCADE via `prisma.$executeRawUnsafe` |
| `test/fixtures/auth.fixture.ts` | `mintToken({ id, role })` calls the real `generateToken` for integration suite use |
| `test/setup.ts` | Global Vitest setup file — provides minimum valid env vars so test files that import `src/env.ts` do not crash on first module load; added to `vitest.config.ts` `setupFiles` |

### Tests
| File | Cases |
|---|---|
| `test/unit/common/http/response.spec.ts` | (a) defaults to 200 + envelope; (b) uses provided status code |
| `test/unit/common/events/event-bus.spec.ts` | (a) delivers `activation:status-changed` to subscribed handler; (b) does not deliver after handler removed |
| `test/unit/common/utils/password.utils.spec.ts` | (a) hash differs from plain; (b) compare true for original; (c) compare false for different string |
| `test/unit/common/utils/token.utils.spec.ts` | (a) generate + verify round-trip; (b) expired token throws; (c) tampered token throws |
| `test/unit/test-helpers/db.fixture.spec.ts` | (a) rejects when `NODE_ENV !== 'test'` (no DB connection attempted) |

## Validation results
- `tsc --noEmit` ✅ clean (0 errors)
- `npm run test:unit` ✅ 23/23 tests pass (7 files: 5 new + 2 from Sprint 1)

## Decisions & deviations
- **`logger.ts` transport**: used conditional spread `...(env.NODE_ENV === 'development' ? { transport: … } : {})` to satisfy `exactOptionalPropertyTypes: true` — assigning `{ target } | undefined` to a non-optional property is a compile error under that flag.
- **`token.utils.ts` expiresIn**: `@types/jsonwebtoken` uses `ms.StringValue` (template literal brand, not plain `string`). Cast `env.JWT_EXPIRATION as StringValue` is correct: the Zod schema guarantees the value is a valid ms string at runtime.
- **`test/setup.ts`**: added a global Vitest setup file to pre-populate the minimum required env vars. `env.spec.ts` continues to work because its `beforeEach` calls `vi.resetModules()` and explicitly sets/removes vars for each case.
- **`event-bus.ts` `off` method**: added to the `TypedBus` class (not in the spec but needed by tests to clean up listeners between test cases).
- **`AppEvents = ActivationEvents` only**: per sprint pre-check note — `UserEvents` is not yet exported by the contract. Left as a TODO comment.
