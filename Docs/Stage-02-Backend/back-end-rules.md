# Backend Initialization Rules

**Goal:** Initialize the `apps/api` workspace (package `@my-app/api`) with a clean, scalable, contract-bound structure.
**Stack:** Node.js (v20+), Express, TypeScript, Prisma, Pino, Zod 4.
**Constraint:** Strict separation between **framework code** (config, middleware, utils) and **business logic** (modules). No module code in this substage.
**Bound to:** `@my-app/contract` is the single source of truth for routes, schemas, DTOs, error codes, and event types. Import from it; never redefine its values here.

> Naming notes: examples target **Zod 4** (`z.email()`, `z.iso.datetime()`, `z.enum()`, `err.issues`, `z.ZodType`). If pinned to Zod 3, the deprecated chained forms still work — stay consistent with what is installed.

---

## 1. Folder Structure

Generate exactly this inside `apps/api/`.

```text
apps/api/
├── package.json            # express, prisma, zod, pino, pino-http, helmet, cors, jsonwebtoken, bcrypt
├── tsconfig.json           # strict config + path aliases
├── .env.example            # template only — NO secrets (see env-template.md)
├── prisma/
│   └── schema.prisma       # database source of truth
├── src/
│   ├── env.ts              # Zod env validator (crashes on missing/invalid)
│   ├── app.ts              # Express app definition (middleware chain only)
│   ├── server.ts           # entry point (port listener + graceful shutdown)
│   ├── @types/
│   │   └── express.d.ts    # Request augmentation (user, validated)
│   └── common/             # the "framework" — independent of modules
│       ├── db/
│       │   └── prisma.ts   # the PrismaClient singleton (imported everywhere)
│       ├── config/
│       │   └── logger.ts   # Pino logger (reads env)
│       ├── http/
│       │   └── response.ts # sendSuccess() — the ApiResponse envelope helper
│       ├── events/
│       │   └── event-bus.ts# typed emitter over @my-app/contract event types
│       ├── errors/
│       │   ├── app-error.ts
│       │   └── index.ts
│       ├── middlewares/    # files named *.middleware.ts
│       │   ├── validate-request.middleware.ts
│       │   ├── auth.middleware.ts
│       │   └── error.middleware.ts
│       └── utils/          # pure functions only
│           ├── password.utils.ts
│           └── token.utils.ts
│   └── modules/            # empty in this substage
```

**Philosophy:** Config = setup/constants (no logic). Middleware = interceptors/guards. Utils = stateless pure functions.

---

## 2. Environment (`src/env.ts`)

- **Crash on invalid config.** Validate `process.env` with Zod; `process.exit(1)` if it fails.
- **Never read `process.env` directly elsewhere.** Import the typed `env` object.
- **The schema is the superset of every variable any file reads.** If you reference `env.X`, `X` must be in the schema.

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.url(),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', z.treeifyError(parsed.error));
  process.exit(1);
}
export const env = parsed.data;
```

`tsconfig.json`: `"strict": true` is non-negotiable; add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Aliases: `@common/*` → `src/common/*`, `@modules/*` → `src/modules/*`, plus the workspace alias for `@my-app/contract`.

---

## 3. Prisma Singleton (`src/common/db/prisma.ts`)

One client, imported by both `server.ts` and every module. **Modules must never import Prisma from `server.ts`** (circular import).

```typescript
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

---

## 4. Logging (`src/common/config/logger.ts`)

Pino only — no `console.log` in app code. The error handler logs through this, not `console`.

```typescript
import pino from 'pino';
import { env } from '../../env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  redact: ['req.headers.authorization', 'req.body.password'],
});
```

---

## 5. Response Envelope (`src/common/http/response.ts`)

**Every success response uses the contract's `ApiResponse<T>` shape**, so it matches the error shape and the frontend's expectations. Controllers call this helper — they do not call `res.json(rawDto)`.

```typescript
import type { Response } from 'express';
import type { ApiResponse } from '@my-app/contract';

export const sendSuccess = <T>(res: Response, data: T, status = 200): void => {
  const body: ApiResponse<T> = { success: true, data };
  res.status(status).json(body);
};
```

---

## 6. Request Augmentation (`src/@types/express.d.ts`)

Type `req.user` and `req.validated` once, globally — no `@ts-ignore` anywhere.

```typescript
import type { JWTPayload } from '@my-app/contract';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      validated: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}
export {};
```

---

## 7. Middleware

File format: `name.middleware.ts`. Middleware **fails fast** (`next(new SomeError())`) and **never sends the final response** — that is the controller's job.

### A. `validate-request.middleware.ts`
Validates each request segment against the relevant **contract** schema and writes the coerced result to `req.validated` (so `z.coerce` in query schemas actually takes effect — and this sidesteps Express 5's read-only `req.query`). Controllers read coerced values from `req.validated`, never raw `req.query`/`req.params`.

```typescript
import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

type Schemas = { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType };

export const validateRequest = (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.validated = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
      };
      next();
    } catch (err) {
      next(err); // ZodError → global handler → 400 VALIDATION_ERROR
    }
  };
```

### B. `auth.middleware.ts` — `requireAuth`
**One** guard, with an options object. The default path decodes + validates the JWT only (no DB). The DB freshness check is an **explicit opt-in** for sensitive actions — this is the single sanctioned exception to "no DB calls in middleware."

```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../env';
import { prisma } from '../db/prisma';
import { AuthError, ForbiddenError } from '../errors';
import { JWTPayloadSchema, UserRole } from '@my-app/contract';

export const requireAuth = (options: { roles?: UserRole[]; checkDB?: boolean } = {}) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) throw new AuthError('Missing token');

      const decoded = jwt.verify(header.slice(7), env.JWT_SECRET);
      const payload = JWTPayloadSchema.parse(decoded); // validate shape, no `any`

      if (options.checkDB) {
        const fresh = await prisma.user.findUnique({
          where: { id: payload.id },
          select: { role: true, status: true },
        });
        if (!fresh || fresh.status === 'BANNED') throw new AuthError('Account banned or deleted');
        payload.role = fresh.role as UserRole;
      }

      if (options.roles && !options.roles.includes(payload.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      req.user = payload;
      next();
    } catch (err) {
      next(err instanceof jwt.JsonWebTokenError ? new AuthError('Invalid token') : err);
    }
  };
```

### C. `error.middleware.ts`
The **last** `app.use()`. Standardizes every error to the `ApiResponse` error shape. Logs through Pino, not `console`.

```typescript
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { logger } from '../config/logger';
import { ErrorCode } from '@my-app/contract';

export const globalErrorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ success: false, error: { code: ErrorCode.VALIDATION_ERROR, message: 'Validation failed', details: err.issues } });
    return;
  }
  logger.error({ err }, 'Uncaught exception');
  res.status(500).json({ success: false, error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' } });
};
```

### D. `logger` middleware
Use `pino-http` (request id + latency), configured from the Pino instance above.

---

## 8. Errors (`src/common/errors/`)

Base `AppError extends Error` carrying `statusCode`, `code` (from the contract's `ErrorCode`), and optional `details`. Subclasses: `AuthError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `BadRequestError` (400, prefer Zod). Throw them; never `res.status(...).json(...)` inside services.

---

## 9. Utils (`src/common/utils/`)

Pure functions only — no DB, no service imports. Split by domain (`password.utils.ts`, `token.utils.ts`); never a single `utils.ts`.

```typescript
// token.utils.ts
import jwt from 'jsonwebtoken';
import { env } from '../../env';
export const generateToken = (payload: object): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRATION });
```

`password.utils.ts` wraps `bcrypt`/`argon2` (`hash`, `compare`).

---

## 10. Event Bus (`src/common/events/event-bus.ts`)

A thin **typed** wrapper over Node's `EventEmitter`, keyed by the contract's event types so emits/handlers are type-checked end to end.

```typescript
import { EventEmitter } from 'node:events';
import type { UserEvents /*, OrderEvents */ } from '@my-app/contract';

type AppEvents = UserEvents /* & OrderEvents */;

class TypedBus {
  private emitter = new EventEmitter();
  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void { this.emitter.emit(event as string, payload); }
  on<K extends keyof AppEvents>(event: K, handler: (payload: AppEvents[K]) => void): void { this.emitter.on(event as string, handler); }
}
export const eventBus = new TypedBus();
```

---

## 11. Boot Sequence

**`app.ts` (definition):** `pino-http` → `helmet` + `cors` → `express.json` → `GET /health` → API routes mounted at `env.API_PREFIX` → `globalErrorHandler` (last). No `logger.createLogger(...)` here — import from `config/logger`.

**`server.ts` (execution):** import `env` → `await prisma.$connect()` → `server.listen(env.PORT)` → handle `SIGTERM`/`SIGINT` for graceful shutdown (close server, then `prisma.$disconnect()`).

---

## 12. Contract Conformance (the payoff)

The contract only protects you if the backend is actually bound to it:
1. **Validate outgoing responses in dev/test.** Mappers can drift; a response check that runs each payload through its contract DTO schema makes that fail loudly instead of reaching the frontend. (See `test-rules.md` §7.)
2. **Routes come from contract constants only.** No string literal route ever appears in backend code.

---

## 13. Anti-Patterns

1. **Circular imports** — `common/` must never import from `modules/`; modules import the Prisma singleton from `common/db`, not `server.ts`.
2. **DB calls in middleware** — forbidden, with exactly one opt-in exception: `requireAuth({ checkDB: true })`.
3. **God utils** — split by domain.
4. **Magic strings** — enums and route constants only.
5. **`console.*`** — use `logger`.
6. **Configuring inside `app.ts`** — keep setup in `config/`.
7. **Raw DTO responses** — always wrap via `sendSuccess` (the `ApiResponse` envelope).
