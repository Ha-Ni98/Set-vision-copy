# Frontend Initialization Rules

**Role:** You are a Senior Frontend Engineer.
**Goal:** Build scalable, type-safe React features on the approved stack, bound to `@my-app/contract`.
**Stack:** React 18, Vite, TypeScript, Shadcn/UI, TanStack Query v5, React Hook Form, **Zod 4**.
**Constraint:** Do not add libraries without permission. If a scenario isn't covered here, ask.

> Companion rules: `front-end-best-practices.md` (stack versions, UI/UX, header/footer) and `front-end-test-rules.md` (testing). Read all three.

---

## 1. Directory Structure

```text
/src
├── pages/                  # route pages
│   └── admin/              # protected admin pages
├── components/
│   ├── ui/                 # Shadcn primitives
│   ├── shared/             # reusable composites (DataTable, PageHeader)
│   ├── layout/             # PublicLayout, AdminLayout, Header, Footer, Sidebar
│   ├── providers/          # AuthProvider, ThemeProvider, LanguageProvider
│   └── sections/           # page-specific sections
├── hooks/                  # custom hooks (TanStack Query wrappers)
├── services/               # pure-TS API clients
├── lib/                    # axios, query-client, api-path, i18n, utils
├── types/                  # frontend-only VIEW models (never API DTOs — see §2)
└── config/                 # translations.json, nav-links
```

---

## 2. Architecture: Component → Hook → Service

Strict one-way dependency. Components call Hooks; Hooks call Services; Components never call Services directly.

### Layer 1 — Services (`src/services/[name].service.ts`)
- Pure TypeScript, no React.
- Import the **single** axios instance and the route constants from the contract.
- **Unwrap the response envelope.** The backend returns `ApiResponse<T>` = `{ success: true, data: T }`. Services return the inner `T`, never the envelope.
- **Types come from `@my-app/contract`.** `src/types` is for frontend-only view models; a *missing* DTO is a Stage 01 contract gap to fix upstream, never a local patch.
- **Throw, don't swallow.** ❌ `return { error: true }` ✅ let it throw.

```typescript
import { api } from '../lib/axios';
import { apiPath, withParams } from '../lib/api-path';
import { USER_ROUTES, type ApiResponse, type UserDTO } from '@my-app/contract';

export const getUser = async (id: string): Promise<UserDTO> => {
  // axios rejects on non-2xx, so errors throw automatically and bubble up.
  const res = await api.get<ApiResponse<UserDTO>>(
    withParams(apiPath(USER_ROUTES.BASE, USER_ROUTES.GET_BY_ID), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
};
```

### Layer 2 — Hooks (`src/hooks/use[Name].ts`)
- Wrap services in TanStack Query.
- **Query hooks** return `{ data, isLoading, isError, error, refetch }`.
- **Mutation hooks** expose `{ mutate, mutateAsync, isPending, isError, error }` (no `refetch`) and **invalidate** their read queries via `queryClient.invalidateQueries` on success.
- Never mutate cache data manually. Don't catch errors unless you need local handling (e.g. rendering a 404 inline) — let them bubble to the global handler.

### Layer 3 — Components
- Render, call hooks, handle interaction. **Never `useEffect` for fetching.**
- Form validation: Zod schemas co-located as `[name].schema.ts`, or imported from `@my-app/contract`.

---

## 3. Global Infrastructure

### A. Axios (`src/lib/axios.ts`) — exactly one instance
- `baseURL = import.meta.env.VITE_API_URL` (which already includes the API prefix, e.g. `http://localhost:3000/api/v1`). Never hardcode URLs.
- Interceptors: attach auth from **cookies**; on **401**, redirect to `/login`. **Loop prevention:** do not redirect if the request was an auth endpoint or the user is already on `/login`.
- The 401 redirect bridges to React Router via a navigation callback the app registers at startup (`setRedirect(fn)`), falling back to `window.location` only if none is set — never a blind hard reload mid-session.
- Axios MUST NOT show toasts, do UI, or transform domain data.

### B. Route building (`src/lib/api-path.ts`)
The contract exposes **relative fragments** (`USER_ROUTES.BASE = '/users'`, `GET_BY_ID = '/:id'`), so the frontend composes them — services and MSW handlers use the **same** builder so they can never drift.

```typescript
export const apiPath = (...parts: string[]): string =>
  ('/' + parts.join('/')).replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';

export const withParams = (path: string, params: Record<string, string>): string =>
  path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(params[k]));
```

### C. Query Client (`src/lib/query-client.ts`)
Global error feedback lives on the **cache**, not per-hook (TanStack v5 removed `onError` from `useQuery`):

```typescript
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

const message = (err: unknown) =>
  (err as any)?.response?.data?.error?.message ?? 'Something went wrong';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => { if (query.state.data !== undefined) toast.error(message(err)); }, // only on background-refetch failures
  }),
  mutationCache: new MutationCache({ onError: (err) => toast.error(message(err)) }),
});
```
- **401** is handled by the axios interceptor (redirect), not a toast.

---

## 4. Granular UI States (Layout Preservation)

Errors and loading must never crash the page or hide the global layout.
- **`isLoading`:** swap the loading section for a Shadcn `Skeleton` matching its shape — no full-screen spinner.
- **`isError` / 404:** render a local `<NotFoundState />` *inside* the content area; never redirect to a global 404.

---

## 5. Performance

- Don't memoize unless a computation is expensive or a component re-renders hot. Clarity over premature optimization.
- Top-level routes use `React.lazy()` + `<Suspense fallback={<PageLoader />}>` (Suspense for code-splitting only, not data).
- `useMemo` for expensive derivations, `useCallback` for props passed to children; keep `useEffect` deps accurate.

---

## 6. Development Standards

### A. Libraries & reuse
- **Do not install new libraries — ASK.** Available: `sonner`, `vaul`, `embla-carousel-react`, `recharts`.
- Reuse first: check `src/components/shared/` (`DataTable.tsx`, `PageHeader.tsx`) before building.

### B. Internationalization (reactive `useTranslation`)
- All text lives in `src/config/translations.json`. No page-local translation files; reuse keys.
- **Use the hook, not a static function** — only a hook can read the language from context and re-render on toggle:
  ```tsx
  const { t } = useTranslation();
  <Button>{t('common.actions.save')}</Button>
  <span>{t('cart.itemCount', { count })}</span>  // interpolation supported
  ```
  `useTranslation()` reads the current language from `LanguageProvider`. (A non-reactive `translate(key, lang, vars)` exists for non-component code only.)
- **No inline strings** in JSX. Keys are lowercase dot-notation: `<scope>.<feature>.<element>.<variant?>` (e.g. `admin.users.table.noResults`).
- Language toggle via React context. Theme via `next-themes`, persisted to `localStorage`, no FOUC.
- Colors: CSS variables in `src/index.css`, referenced in `tailwind.config.ts`, semantic names (`background-neutral`, `surface`, `primary-accent`, `success`, `warning`, `destructive`).

### C. Layouts (see `front-end-best-practices.md` for header/footer contents)
- **Public pages → `PublicLayout`** (header with cart/search/auth, footer with store-locator). **Admin pages → `AdminLayout`** (no cart, no store-locator). Never mix commerce UI into admin.
- Admin is **desktop-first** (mobile best-effort, horizontal table scroll OK); public is **mobile-first**.
- Shared rules still apply on admin: no inline strings, layout persists through loading/error, Component→Hook→Service is mandatory.
