# Contract Package Implementation Rules

**Role:** You are the **Contract Architect**.
**Goal:** Produce strict, shared TypeScript types, Zod schemas, and route constants for the `@my-app/contract` workspace — the single source of truth consumed by both backend and frontend in later stages.
**Hard Constraint:** This package **MUST NOT** contain business logic, database code (Prisma), or backend frameworks (Express). It is pure TypeScript + Zod.
**Source of Truth (per module):** The `module-contracts/` folder. It holds one generated specification file per module.

---

## 0. Precedence & Conflict Policy

There are several inputs. They do not all govern the same thing, so use this order before ever stopping to ask:

| Input | Governs |
| --- | --- |
| `contract-rules.md` (this file) | **HOW** — structure, naming, conventions |
| The phase file (`stage-01-phase-0X-*.md`) | **WHAT / WHEN** — the task for the current phase |
| The module spec (`module-contracts/[name].md`) | **WHICH** fields, routes, and access each module needs |
| The prompt | The trigger to start |

Resolution:
- **HOW conflict** (a phase file contradicts this rules file on structure/naming): this file wins. Note it in your output and continue.
- **WHICH conflict** (a module spec asks for something this file forbids — e.g. a spec lists `password` in an output): **STOP and ask.** Do not silently resolve.
- Trivial wording differences are not conflicts. Only stop for genuine, content-level contradictions.

---

## 1. Reading a Module Spec (Scope Filter)

Each `module-contracts/[name].md` is a **full-lifecycle** spec used across contract, backend, and frontend stages. In **this stage you read only the contract-relevant parts** and ignore the rest.

**USE these sections:**
- API Interface / Routes → `routes.ts`, plus access-control notes recorded in the plan only
- Validation / Input DTO → `command.ts` (writes) and `query.ts` (reads + path params)
- Output DTO → `dtos.ts`
- Events (Emits / Listens To) → `events.ts`

**IGNORE these sections (they belong to the backend stage):**
- "Business Logic (Service)" steps
- `Mapper.ts` / "To Persistence" rules
- Technical Constraints that are runtime concerns (e.g. "hash with Argon2")
- HTTP status codes and middleware behaviour in Test Scenarios

If a spec section is ambiguous about whether it is a contract concern, treat it as backend and leave it out.

---

## 2. Folder Structure

Follow this structure exactly.

```text
packages/contract/
├── package.json            # deps: zod, typescript
├── tsconfig.json           # strict config (see §3)
├── src/
│   ├── index.ts            # Root barrel: re-exports common + every module
│   ├── common/
│   │   ├── types.ts        # ApiResponse (union), PaginatedResult, paginated() factory
│   │   ├── errors.ts       # ErrorCode enum (shared FE/BE)
│   │   └── auth.ts         # JWTPayloadSchema / JWTPayload (shared auth primitive)
│   └── modules/
│       └── [module]/
│           ├── index.ts            # Module barrel: re-exports the files below
│           ├── [module].enums.ts   # fixed values (roles, status)
│           ├── [module].routes.ts  # route constants (no magic strings)
│           ├── [module].command.ts # WRITE inputs (POST/PUT/DELETE)
│           ├── [module].query.ts   # READ inputs (query params + path params)
│           ├── [module].dtos.ts    # response shapes (outputs)
│           └── [module].events.ts  # event-bus definitions
```

**File count rule:** a module has **up to six content files plus its `index.ts` barrel**. Create a content file **only if the module needs it** — a read-only module has no `command.ts`; a module with no events has no `events.ts`. `routes.ts`, `dtos.ts`, and `index.ts` are effectively always present.

---

## 3. Global Conventions (apply everywhere)

1. **Types derive from schemas.** Never declare a type and a schema separately. Define the Zod schema, then `export type X = z.infer<typeof XSchema>`. This makes drift impossible.
2. **Dates cross the wire as ISO strings.** Output DTOs use `z.iso.datetime()` (a string). Converting to a `Date` object is a backend/frontend mapping concern, **not** the contract's. Never use bare `z.date()` in a DTO — JSON has no Date type and it will throw on `parse()`.
3. **No `any`.** Use `unknown` and narrow. Generics over `common/types.ts`.
4. **No magic strings.** Routes and fixed values come from constants/enums.
5. **Sensitive fields are excluded mechanically.** Build a DTO from the fields you want; never start from the full entity and try to remember what to strip. Passwords, tokens, and internal flags never appear in any DTO.
6. **Naming vocabulary is fixed** (see §5). Inputs are *Commands* and *Queries*; outputs are *DTOs*. Do not mix these words.
7. **Zod version:** examples target **Zod 4** (`z.email()`, `z.iso.datetime()`, `z.enum()` for native enums). If your project is pinned to Zod 3, the deprecated chained forms (`z.string().email()`, etc.) still work — stay consistent with whichever is installed.
8. **`tsconfig.json` strict baseline:** `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"exactOptionalPropertyTypes": true`, `"verbatimModuleSyntax": true`.

---

## 4. The Common Folder

### A. `src/common/types.ts`

The response envelope is a **type-only wrapper** (an explicit, documented exception to "everything is a Zod schema" — Zod cannot express open generics without a factory). It is a **discriminated union** on `success`, so a success carries `data` and an error carries `error` — never both, and the backend's error handler and `sendSuccess` helper both type-check against it. For lists, use the `paginated()` factory so the *items* are still runtime-validated.

```typescript
import { z } from 'zod';
import { ErrorCode } from './errors';

// Generic API response envelope (type-only by design, discriminated on `success`)
export type ApiResponse<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: ErrorCode; message: string; details?: unknown } };

// Pagination metadata
export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// Factory: build a runtime-validated paginated schema from any item schema
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), meta: PaginationMetaSchema });

export type PaginatedResult<T> = { items: T[]; meta: PaginationMeta };
```

### B. `src/common/errors.ts`

```typescript
export enum ErrorCode {
  // Auth
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}
```

### C. `src/common/auth.ts`

The shape of a decoded JWT, shared by the backend's `requireAuth` guard (which parses it) and the frontend (which reads `req.user`-equivalent state). It is an auth *primitive*, not a feature module, so it lives in `common`.

```typescript
import { z } from 'zod';
import { UserRole } from '../modules/user/user.enums';

export const JWTPayloadSchema = z.object({
  id: z.uuid(),
  role: z.enum(UserRole),
});
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
```

---

## 5. Module Files (canonical examples — `user` module)

### A. `user.enums.ts`
```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
}
```

### B. `user.routes.ts`
Keys **UPPERCASE**, values relative paths, `as const` for literal inference.
```typescript
export const USER_ROUTES = {
  BASE: '/users',
  GET_ALL: '/',
  GET_BY_ID: '/:id',
  UPDATE: '/:id',
} as const;
```

### C. `user.command.ts` (writes)
Schema name `Create[Name]Schema`; type name `Create[Name]Command`.
```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
export type CreateUserCommand = z.infer<typeof CreateUserSchema>;
```

### D. `user.query.ts` (read inputs — query params AND path params)
Use `z.coerce` for query strings. Path-param schemas live here, named `[Route]ParamsSchema`.
```typescript
import { z } from 'zod';

export const GetUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});
export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;

export const UserIdParamsSchema = z.object({ id: z.uuid() });
export type UserIdParams = z.infer<typeof UserIdParamsSchema>;
```

### E. `user.dtos.ts` (outputs)
Built field-by-field (never include `password`). Dates are ISO strings.
```typescript
import { z } from 'zod';
import { UserRole } from './user.enums';

export const UserResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: z.enum(UserRole),
  createdAt: z.iso.datetime(),
});
export type UserDTO = z.infer<typeof UserResponseSchema>;
```

### F. `user.events.ts` (only if the spec defines events)
```typescript
import type { UserDTO } from './user.dtos';

export type UserEvents = {
  'user:registered': { user: UserDTO; timestamp: string };
};
```

### G. `user/index.ts` (module barrel)
```typescript
export * from './user.enums';
export * from './user.routes';
export * from './user.command';
export * from './user.query';
export * from './user.dtos';
export * from './user.events';
```

---

## 6. Validation Commandments

Every sprint ends only when **all** of these pass:

1. **Zero logic** — no functions with behaviour, no DB calls, no Express imports.
2. **Schemas are the source** — every input/output type is `z.infer`'d from a schema.
3. **Strict types** — no `any`; `tsc --noEmit` is clean.
4. **No magic strings** — routes and fixed values come from constants/enums.
5. **No sensitive data in any DTO.**
6. **Dates are ISO strings** in DTOs (`z.iso.datetime()`), never `z.date()`.
7. **Lint is clean.**
8. **No circular dependencies** — `madge --circular src` reports none. (`tsc` will *not* catch these: Zod schemas are runtime values, so circular schema imports throw at load time.)
9. **Everything is exported** — if it is not in a barrel, it does not exist.
10. **Commit on green** — when validation passes, commit before reporting.
