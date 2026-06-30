---
sprint: 1
title: Foundation
status: ✅ Done
commit: d21fa9e
---

# Sprint 1 Report — Foundation

## Work done

### L0 — Workspace config
| File | Notes |
|---|---|
| `Apps/api/package.json` | `@my-app/api`; prod deps (express, prisma, zod, pino, pino-http, pino-pretty, helmet, cors, jsonwebtoken, bcrypt, socket.io); dev deps (typescript, vitest, tsx, supertest, socket.io-client, @faker-js/faker, madge); workspace dep `@my-app/contract` via `file:../contract`; scripts: dev/build/start/test/test:unit/test:int/prisma:generate/prisma:migrate/cycles |
| `Apps/api/tsconfig.json` | `"moduleResolution": "bundler"`, `"module": "Preserve"`, full strict flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noImplicitOverride`), path aliases `@common/*`, `@modules/*`, `@my-app/contract` |
| `Apps/api/.env.example` | All 9 env vars (NODE_ENV, PORT, API_PREFIX, DATABASE_URL, TEST_DATABASE_URL, CORS_ORIGIN, JWT_SECRET, JWT_EXPIRATION, LOG_LEVEL, WS_PATH); `REDIS_URL` commented per realtime-rules §9 |
| `Apps/api/prisma/schema.prisma` | Verbatim copy of `Docs/Stage-00-Conception/schema.prisma` |
| `Apps/api/vitest.config.ts` | Alias resolution mirrors tsconfig; `environment: 'node'`; `globals: false` |
| `Apps/api/docker-compose.test.yml` | Postgres 16-alpine on port 5433, tmpfs data dir, healthcheck |
| Directory stubs | `src/modules/.gitkeep`; `test/{data,fixtures,unit,integration,contract}/.gitkeep` |

### L1 — Foundation source
| File | Notes |
|---|---|
| `src/env.ts` | Zod schema: 9 vars + WS_PATH; `z.treeifyError` on failure; `process.exit(1)` crash; only file that reads `process.env` |
| `src/common/errors/app-error.ts` | `AppError extends Error`: `statusCode`, `code: ErrorCode`, optional `details`; `Error.captureStackTrace` |
| `src/common/errors/index.ts` | AuthError 401/AUTH_UNAUTHORIZED, ForbiddenError 403/AUTH_FORBIDDEN, NotFoundError 404/RESOURCE_NOT_FOUND, ConflictError 409/RESOURCE_CONFLICT, BadRequestError 400/VALIDATION_ERROR; all ErrorCode values imported from `@my-app/contract` |
| `src/common/db/prisma.ts` | `export const prisma = new PrismaClient()` — singleton, nothing else |

### Tests
| File | Cases |
|---|---|
| `test/unit/env.spec.ts` | (a) valid env → typed values; (b) missing JWT_SECRET → exit(1); (c) short JWT_SECRET → exit(1); (d) missing DATABASE_URL → exit(1). Uses `vi.spyOn(process, 'exit')` + `vi.resetModules()` per case |
| `test/unit/common/errors.spec.ts` | AppError (2), AuthError (2), ForbiddenError (1), NotFoundError (1), ConflictError (1), BadRequestError (1) — total 8 cases |

## Validation results
- `prisma:generate` ✅ Prisma Client v6.19.3 generated
- `tsc --noEmit` ✅ clean (0 errors)
- `npm run test:unit` ✅ 12/12 tests pass (2 files)

## Decisions & deviations
- The `console.error` call in `src/env.ts` is **intentional and rules-prescribed**: it's the crash reporter for before Pino is initialized. The rules example (`back-end-rules.md` §2) uses it explicitly. Not a violation.
- Node engine in package.json is `>=18` (dev machine runs 18.18.0); the `>=20` recommendation from rules is a deployment target.
- `"type": "module"` added to package.json for ESM consistency with the contract package; tsx and Vitest handle this natively.
