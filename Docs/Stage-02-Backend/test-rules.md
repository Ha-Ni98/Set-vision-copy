# Backend Testing Rules

**Location:** `apps/api/test/`
**Frameworks:** Vitest, Supertest. Integration runs against a **dedicated, disposable test database**.
**Philosophy:** Unit tests are isolated and mocked; integration tests are realistic and hit a real (test) DB; `test/data` factories are the single source of truth for scenarios.

---

## 1. Test Database Isolation (read first)

Integration tests truncate tables — so they **must** point at a throwaway DB, never the dev/prod one.
- Add `TEST_DATABASE_URL` and run integration with `NODE_ENV=test`, loading it instead of `DATABASE_URL`.
- Provide a `docker-compose.test.yml` (or equivalent) that spins up a local Postgres for tests; `test:int` brings it up, migrates, runs, tears down.
- `db.fixture` **asserts** it is connected to the test DB before truncating (e.g. refuse to run unless `NODE_ENV === 'test'`).

---

## 2. Folder Structure

```text
apps/api/test/
├── data/                       # factories — the source of truth for test data
│   ├── user.factory.ts
│   └── product.factory.ts
├── fixtures/                   # dynamic setup helpers
│   ├── db.fixture.ts           # connect / guarded truncate
│   └── auth.fixture.ts         # mint valid JWTs (via token.utils)
├── unit/                       # isolated, mocks allowed
│   ├── utils/
│   ├── middleware/             # e.g. auth.middleware.spec.ts
│   └── modules/[name]/         # service.spec.ts, mapper.spec.ts
├── integration/                # real test DB, no mocks
│   └── [name].integration.spec.ts
└── contract/                   # contract-conformance checks (§7)
    └── routes.conformance.spec.ts
```

Naming is fixed: factories are `[name].factory.ts`; unit specs are `[name].spec.ts`; integration specs are `[name].integration.spec.ts`.

---

## 3. Scripts (`package.json`)

```json
"scripts": {
  "test": "vitest run",
  "test:unit": "vitest run test/unit test/contract",
  "test:int": "NODE_ENV=test vitest run test/integration"
}
```
Per-sprint loops run `test:unit` (fast, no DB). `test:int` runs once the wiring exists and the test DB is up.

---

## 4. Factories (`test/data/`)

Never hardcode data in a spec. Factories return objects shaped to the **contract** commands/DTOs.

```typescript
import { faker } from '@faker-js/faker';
import type { CreateUserCommand } from '@my-app/contract';

export const createUserPayload = (overrides: Partial<CreateUserCommand> = {}): CreateUserCommand => ({
  email: faker.internet.email(),
  password: 'Password123!',
  ...overrides,
});
```

## 5. Fixtures (`test/fixtures/`)

```typescript
// db.fixture.ts
import { prisma } from '../../src/common/db/prisma';

export const resetDatabase = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'test') throw new Error('resetDatabase blocked outside NODE_ENV=test');
  // TRUNCATE all tables (RESTART IDENTITY CASCADE) against the test DB
};
```
`auth.fixture.ts` mints valid tokens with the real `token.utils` so integration tests can authenticate.

---

## 6. Unit & Integration

**Unit — service (mock Prisma):**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { UserService } from '@modules/user/user.service';

describe('UserService', () => {
  it('returns a user when found', async () => {
    const prismaMock = { user: { findUnique: vi.fn().mockResolvedValue({ id: '1', email: 'a@b.com', role: 'USER', createdAt: new Date(), password: 'x' }) } };
    const service = new UserService(prismaMock as any);
    const result = await service.findById('1');
    expect(result.email).toBe('a@b.com');
    expect(result).not.toHaveProperty('password'); // mapper excludes it
  });
});
```

**Integration — real test DB, hit the real prefix, assert the envelope:**
```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { createUserPayload } from '../data/user.factory';
import { resetDatabase } from '../fixtures/db.fixture';

describe('User integration', () => {
  beforeEach(resetDatabase);

  it('POST creates a user', async () => {
    const res = await request(app).post('/api/v1/users').send(createUserPayload());
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBeDefined(); // ApiResponse envelope
    expect(res.body.data.password).toBeUndefined();
  });
});
```

---

## 7. Contract Conformance (`test/contract/`)

This is what makes the contract binding rather than decorative:
- **Route coverage:** assert every route constant exported by `@my-app/contract` is registered on the app.
- **Response shape:** for representative endpoints, parse `res.body.data` through the matching contract DTO schema (`UserResponseSchema.parse(res.body.data)`) — a drifted mapper fails here, not in production.
