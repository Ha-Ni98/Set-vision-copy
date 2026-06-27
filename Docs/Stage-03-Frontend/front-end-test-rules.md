# Frontend Testing Rules

**Role:** Senior Frontend SDET.
**Goal:** Reliability of the Component→Hook→Service architecture, with `/src` kept production-only.
**Stack:** Vitest, React Testing Library, `@testing-library/user-event`, MSW.

---

## 1. Dedicated Test Directory

**No test files in `/src` — ever.** All tests live under `/tests`, mirroring `/src`.

```text
/tests
├── fixtures/
│   ├── data/        # static mock objects matching @my-app/contract DTOs
│   ├── msw/         # MSW server + handlers
│   └── wrappers/    # QueryClientProvider wrapper, global setup, i18n mock
├── integration/     # MSW-backed: services + hooks together
│   ├── services/
│   └── hooks/
└── unit/            # isolated, hooks mocked
    ├── components/
    ├── pages/
    └── lib/
```

---

## 2. Stack & Constraints

- Runner: **Vitest** (not Jest). DOM: RTL + `user-event`. Network: **MSW**.
- Test inputs/outputs/DOM, not implementation details (no asserting internal state).
- 100% type-safe — no `as any` on real assertions; use typed data from `/tests/fixtures/data/`.

---

## 3. Fixtures Match the Real Envelope (critical)

The backend wraps responses in `ApiResponse<T>` = `{ success: true, data }`. **MSW handlers must return the envelope**, or tests will pass while the live app fails. Validate every fixture through its contract schema so it can never drift:

```typescript
// /tests/fixtures/data/user.mock.ts
import { UserResponseSchema, type UserDTO } from '@my-app/contract';
export const mockUserDTO: UserDTO = UserResponseSchema.parse({
  id: '0b9f...', email: 'a@b.com', role: 'USER', createdAt: '2026-01-01T00:00:00.000Z',
});
```

Handlers use the **same route builder as services** (so URLs match):

```typescript
// /tests/fixtures/msw/user.handlers.ts
import { http, HttpResponse } from 'msw';
import { USER_ROUTES } from '@my-app/contract';
import { apiPath } from '@/lib/api-path';
import { mockUserDTO } from '../data/user.mock';

const url = import.meta.env.VITE_API_URL + apiPath(USER_ROUTES.BASE, USER_ROUTES.GET_BY_ID); // .../users/:id
export const userHandlers = [
  http.get(url, () => HttpResponse.json({ success: true, data: mockUserDTO })),         // 200
  http.post(import.meta.env.VITE_API_URL + apiPath(USER_ROUTES.BASE),
    () => HttpResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'bad' } }, { status: 400 })),
];
```

---

## 4. Integration Tests (`/tests/integration/`) — MSW, no mocks

**Services:** verify envelope unwrap, DTO mapping, and explicit throwing.
```typescript
import { getUser } from '@/services/user.service';
import { server } from '../../fixtures/msw/server';
it('returns the unwrapped DTO on 200', async () => {
  const result = await getUser('1');
  expect(result.id).toBe(mockUserDTO.id); // result is the DTO, not the envelope
});
it('throws on 404', async () => {
  server.use(/* handler returning 404 */);
  await expect(getUser('x')).rejects.toThrow();
});
```
**Hooks:** verify state transitions with the `createQueryWrapper()`; don't test TanStack internals.
```typescript
const { result } = renderHook(() => useUser('1'), { wrapper: createQueryWrapper() });
await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

---

## 5. Unit Tests (`/tests/unit/`) — mock the hook, not the network

No MSW. `vi.mock()` the custom hook to force UI states.
```typescript
import * as useUserHook from '@/hooks/useUser';
vi.mock('@/hooks/useUser');
vi.mocked(useUserHook.useUser).mockReturnValue({ isLoading: true, data: undefined } as any);
```

---

## 6. i18n in tests

Mock the **hook** (the codebase uses `useTranslation`, not a static `t`):
```typescript
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
expect(screen.getByText('auth.login.title')).toBeInTheDocument();
```
Don't assert real translated strings.

---

## 7. Forms

`/tests/unit/`, with `userEvent` (not `fireEvent`); assert Zod error messages appear on invalid submit; `await` async validation.
