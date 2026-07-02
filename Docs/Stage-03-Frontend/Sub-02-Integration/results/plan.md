# Stage 03 · Sub-02 · Phase 01 — Integration Engine Plan

Audit-and-plan deliverable for the type-safe data layer (Axios → Services → TanStack Query hooks) built from `@my-app/contract`, replacing the Sub-01 lean empty-default services. **Zero code in this phase** — this document is the blueprint the Phase-02 sprints decompose.

- **Rules applied:** `front-end-rules.md`, `front-end-test-rules.md`, `front-end-best-practices.md`, plus `Docs/Stage-02-Backend/realtime-rules.md` §8 (the frontend socket contract).
- **Source of truth:** `Apps/contract` (routes + DTOs). HTTP methods and per-route response DTOs are not encoded in the contract; they were audited from the Stage-02 API (`Apps/api` routers + `*.interface.ts`) and pinned per route below.
- **Owner decision (2026-07-02): auth transport is Bearer + silent refresh** — supersedes Sub-01 plan §8.Q7 (see §0 and §8.1).

---

## 0. Decision log (this phase)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Bearer tokens + silent refresh-and-retry on 401** (owner decision). Access token in memory, refresh token in `localStorage`, request interceptor attaches `Authorization: Bearer`. | The Stage-02 API only reads `Authorization: Bearer` (no cookie-parser, no `Set-Cookie`, `cors()` without `credentials`); the contract's §0.1.3 exception returns raw tokens in the body; `AUTH_ROUTES.LOGOUT` *requires* `{ refreshToken }` in the body. Deviation from rules §3A cookie wording — noted in §8.1. |
| D2 | **Full contract coverage**: every one of the 92 routes gets a service function; every service function except `refresh()` gets a hook, including admin domains with no UI yet. | Phase readiness checklist: "every contract route → a Service · every Service → a Hook". Admin UI arrives in later sub-stages and plugs into a finished pipeline. |
| D3 | `activate()` is wired to `ACTIVATION_ROUTES.ACTIVATE` (POST, no body, returns `ActiveRequestDTO`). | Supersedes Sub-01 §8.Q4: the route exists and needs no command body. The "Done" dialog's email field remains UI-only with no contract home (unchanged gap, out of data-layer scope). |
| D4 | Central query-key registry in `src/lib/query-keys.ts`; the `['activator','my-stats']` family is normalized to `['activators','my-stats']`. | Phase requires one central list; all key references live in hooks (verified), so the rename is contained and prevents the singular/plural drift. |
| D5 | Query services accept an optional `AbortSignal` forwarded to axios; hooks pass TanStack's `queryFn` signal through. | Enables cancel-on-unmount; pairs with the query-client change that suppresses toasts for canceled requests. |
| D6 | New admin-domain hooks are grouped **one file per domain** (e.g. `hooks/useCards.ts` exports the domain's hooks); existing Sub-01 one-hook-per-file files stay as they are. | Rules fix the naming pattern (`use[Name]`), not file cardinality; ~78 single-hook files would bury `src/hooks/`. Noted in §7.6. |
| D7 | New mutation hooks ship **without success toasts** in Sub-02 (errors are covered globally). Existing Sub-01 hooks keep their translated success toasts. | Success copy is a UI/UX decision for Sub-03+; inventing translation keys now would be UI thinking. |
| D8 | **(Revised 2026-07-02.)** Realtime client layer **is in scope**: a Socket.IO client module maps the six gateway events to query-key invalidations. `socket.io-client` (^4, matching the server's ^4.8) is the single new runtime dependency. | Owner surfaced `realtime-rules.md`, whose §8 defines the frontend connection contract; the Stage-02 gateway is verified implemented in `Apps/api` (namespaces `/client`, `/activators`, `/admin`; JWT in `handshake.auth.token` — only possible under D1's Bearer model). Full design in §5; library approval noted in §8.8. |

---

## 1. Core Setup

### 1.1 Current state (Sub-01 audit)

| Piece | State | Verdict |
|---|---|---|
| `src/lib/axios.ts` | Single instance, `baseURL = VITE_API_URL`, `withCredentials: true`, response interceptor: 401 → `redirect('/login')` with loop prevention (auth endpoints + already-on-`/login`), `setRedirect()` bridge registered in `App.tsx`. | Keep skeleton; **rework for Bearer** (§1.2). `withCredentials` is dropped (no cookies in play). |
| `src/lib/api-path.ts` | Verbatim rules §3B builder (`apiPath`, `withParams`). | Keep unchanged; add unit tests (§4.4). |
| `src/lib/query-client.ts` | `QueryCache`/`MutationCache` `onError` → `sonner` via non-reactive `translate()`; background-refetch-only guard for queries. | Keep; **add 401 + cancellation suppression and `defaultOptions`** (§1.4). |
| `src/services/*` (4 files, 18 fns) | Typed empty-default stubs with `TODO(Sub-02)` markers. | Replace bodies with real calls; fix two stale TODOs (§7.3). |
| `src/hooks/*` (16 domain hooks) | Real TanStack wrappers already calling the stub services; keys + invalidations live here. | Keep; rewire keys through the registry; add the missing domains. |
| `src/components/providers/AuthProvider.tsx` | `stubSession` bridge with an explicit `TODO(Sub-02): delete`. | Delete the bridge; consume real auth hooks (§2.1). |
| Tests | **None. No Vitest/RTL/MSW installed, no `/tests` tree, no `vitest` config, no `.env.test`.** | Full test scaffold is part of Sprint 1 (§1.6). |
| `src/types/key-flow.ts` | Frontend-only view models extending `KeyVerificationDTO`. | Compliant with rules §2 — **no DTO mismatch found; no contract gap from `src/types`**. |

### 1.2 Axios (`src/lib/axios.ts`) — Bearer redesign

Still **exactly one instance**; still no toasts/UI/domain transforms. Changes:

- `baseURL: import.meta.env.VITE_API_URL` (unchanged), **`timeout: 15_000`** (new — makes the phase's "timeout" edge case real and testable), `withCredentials` **removed**.
- **Request interceptor (new):** if `tokenStore.getAccessToken()` is set, attach `Authorization: Bearer <token>`. No storage reads besides the token store.
- **Response interceptor (401 state machine):**
  1. Non-401 errors: reject (query-client owns feedback).
  2. 401 on a **token endpoint** (`LOGIN`, `REFRESH`, `LOGOUT` paths): never refresh, never redirect — the error surfaces to the caller (login form shows invalid credentials; a failed refresh falls through to step 4).
  3. 401 on anything else (including `ME`) with a stored refresh token and no `_retried` flag on the request config: run **single-flight refresh** — one shared in-flight `POST AUTH_ROUTES.REFRESH` promise (through the same instance; step 2 makes it recursion-safe) with `{ refreshToken }` per `RefreshTokenCommand`; on success `tokenStore.setTokens(dto)` and replay the original request once with `_retried: true`.
  4. Refresh failed / no refresh token / already retried: `tokenStore.clear()`, then redirect to `/login` via the existing `setRedirect` bridge **unless** already on `/login` (loop prevention preserved, per rules §3A).
- The single-flight refresh routine is exported as `refreshTokens()` so the realtime layer (§5) reuses the exact same in-flight promise — two transports, one refresh.
- Cold-start session restore falls out for free: first `me()` 401s → silent refresh → retry succeeds → session restored without a login screen.

### 1.3 Token store (`src/lib/token-store.ts`) — new

Tiny pure-TS module, the **only** place that touches tokens: access token in a module-scoped variable (never persisted), refresh token under `localStorage` key `sv_refresh_token` (matches the `sv_lang` prefix precedent). API: `getAccessToken()`, `getRefreshToken()`, `setTokens(dto: AuthTokensDTO)`, `clear()`. Written by `auth.service` (login/refresh/logout) and the interceptor; also read by the socket handshake (§5.1). React never imports it.

### 1.4 Query Client (`src/lib/query-client.ts`) — hardening

- `defaultOptions` (per best-practices "configure `staleTime`/`gcTime`"): queries `staleTime: 30_000`, `gcTime: 5 * 60_000`, `retry: (count, err) => count < 1 && !isAxiosError4xx(err)` (never retry 4xx — 401/404 retries are noise), `refetchOnWindowFocus: false`. Mutations: `retry: 0`. Per-hook overrides stay allowed (documented ones: `['auth','me']` and `['geography', …]` use `staleTime: Infinity`; `me` also `retry: false` as today).
- Toast suppression added to **both** caches, closing gaps between the rules' intent and the current code:
  - **401** → no toast ever (the interceptor owns 401; rules §3C says "401 … not a toast").
  - **Canceled/aborted requests** (`axios.isCancel` / `CanceledError` / abort signal) → no toast (phase Step 2 requirement).
  - Queries keep the existing first-load guard (toast only when `query.state.data !== undefined`, i.e. background-refetch failures).
- Error message extraction unchanged: `err.response.data.error.message` fallback → `translate('common.errors.crashTitle', lang)`.

### 1.5 Route building & query keys

- `src/lib/api-path.ts` unchanged — services **and** MSW handlers compose URLs through it (test-rules §3), so they cannot drift.
- **`src/lib/query-keys.ts` (new):** exports a `qk` registry of key factories per §3. Hooks import from it; inline key arrays are removed. Existing key shapes are preserved verbatim except the D4 normalization.

### 1.6 Test infrastructure (install + scaffold — Sprint 1)

Dev-dependencies to add (sanctioned: `front-end-test-rules.md` names this exact stack): `vitest` (^3), `jsdom`, `@testing-library/react` (^16), `@testing-library/user-event`, `@testing-library/jest-dom`, `msw` (^2). **One runtime dependency:** `socket.io-client` (^4, pinned to the server's ^4.8 major) for the §5 realtime layer — approval context in §8.8.

- **`vitest.config.ts`** — `mergeConfig(viteConfig, …)`: `environment: 'jsdom'`, `setupFiles: ['./tests/fixtures/wrappers/setup.ts']`, `include: ['tests/**/*.test.{ts,tsx}']` (enforces "no tests in `/src`" structurally).
- **`.env.test`** — `VITE_API_URL=http://localhost:3000/api/v1` so MSW handlers match the absolute URLs axios produces, and `VITE_WS_URL=http://localhost:3000` for the realtime module (§5.1). `VITE_WS_URL` is also added to `.env.example` (server **origin**, no `/api/v1` prefix — the socket lives at the server-level `WS_PATH`, default `/socket.io`).
- **`package.json` scripts** — `"test": "vitest run"`, `"test:watch": "vitest"`. The type-check surface (`npm run check`) must cover `/tests` (dedicated `tsconfig.test.json` or an `include` extension — sprint pins the mechanics).
- **Scaffold** (mirrors test-rules §1):

```text
/tests
├── fixtures/
│   ├── data/        # 16 domain mock files, every fixture parsed through its contract schema
│   ├── msw/         # envelope.ts (ok/fail/noContent), api-url.ts, server.ts, 16 domain handler files
│   └── wrappers/    # setup.ts (MSW lifecycle, jest-dom, token/localStorage reset), createQueryWrapper()
├── integration/
│   ├── services/    # per-domain service tests (MSW, no mocks)
│   └── hooks/       # per-domain hook state-transition tests
└── unit/
    └── lib/         # api-path, token-store, axios interceptors, query-client, realtime
```

- `setup.ts`: `beforeAll(server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(server.resetHandlers() + tokenStore.clear() + localStorage.clear())`, `afterAll(server.close())`.
- `createQueryWrapper()`: fresh `QueryClient` per test with `retry: false` on both caches, wrapped in `QueryClientProvider`.

---

## 2. Domain Mapping

Conventions for every domain: services import `api` + `apiPath`/`withParams` + the contract route constants and types; responses arrive as `ApiResponse<T>` and services return the **unwrapped `T`** (defensive `success === false` throw per rules §2); axios rejections bubble untouched. Endpoints marked **204** return an empty body — the service is `Promise<void>` and performs **no unwrap**. Query services take `(query, signal?)`; the hook forwards TanStack's `queryFn` signal (D5).

Per-domain MSW handlers (in `/tests/fixtures/msw/[domain].handlers.ts`) provide: every route's happy path (200/201/204, envelope-shaped via `ok()`/`noContent()`), plus exported error variants (`fail(code, message, status)`) for at least one 400 `VALIDATION_ERROR`, one 404 `RESOURCE_NOT_FOUND` (where `:id` exists), and one 500 per domain, applied per-test with `server.use()`.

### 2.1 Auth — `auth.service.ts` (exists, rewire) · routes `AUTH_ROUTES` (`/auth`)

| Route | Method & path | Input | Returns (unwrapped) | Service fn | Hook |
|---|---|---|---|---|---|
| `LOGIN` | POST `/auth/login` | `LoginCommand` | `AuthTokensDTO` (+ side effect: `tokenStore.setTokens`) | `login` | `useLogin` (new file) |
| `REFRESH` | POST `/auth/refresh` | `RefreshTokenCommand` | `AuthTokensDTO` (+ `setTokens`) | `refresh` | — interceptor-only (see §6 checklist note) |
| `LOGOUT` | POST `/auth/logout` | `RefreshTokenCommand` (body **required** by API) | **204** → `void`; `finally { tokenStore.clear() }` (local logout always happens, error still throws) | `logout` | `useLogout` (new file) |
| `ME` | GET `/auth/me` | — | `SessionUserDTO` | `me` | `useSession` (new file) |

**AuthProvider changes:** delete the `stubSession` bridge (its own TODO), consume `useSession`/`useLogin`/`useLogout` instead of inline `useQuery`/`useMutation` (restores Component→Hook→Service layering), keep `login success → invalidate ['auth','me']` and `logout settled → queryClient.clear()`. Add an `isReady` flag (me-query settled) so `ProtectedRoute` can hold rendering during the cold-start restore instead of flashing to `/login`. Surface otherwise unchanged.

**Tests:** service — login stores tokens & returns DTO, logout clears tokens even on 500, me unwraps; hooks — login→me invalidation, logout clears cache; interceptor auth flows live in §4.4.

### 2.2 Keys (public portal) — `keys.service.ts` (exists, rewire) · routes `KEY_ROUTES` (`/keys`)

No auth required (public portal). Note the Sub-01 TODO said `api.patch` for UPDATE — the API registers **POST** (§7.3).

| Route | Method & path | Input | Returns | Service fn | Hook (exists) |
|---|---|---|---|---|---|
| `VERIFY` | POST `/keys/verify` | `VerifyKeyCommand` | `KeyVerificationDTO` | `verifyKey` | `useVerifyKey` |
| `SUBMIT` | POST `/keys/submit` → **201** | `SubmitActivationCommand` | `ClientActivationStatusDTO` (was `void` in stub — upgraded) | `submitActivation` | `useSubmitActivation` |
| `UPDATE` | **POST** `/keys/:activationId/update` | `UpdateActivationCommand` | `ClientActivationStatusDTO` | `updateActivation` | `useUpdateActivation` (+ invalidate `qk.keys.status(id)`) |
| `ADDITIONAL` | POST `/keys/:activationId/additional` | `SubmitAdditionalInfoCommand` | `ClientActivationStatusDTO` | `submitAdditionalInfo` | `useSubmitAdditionalInfo` (+ invalidate `qk.keys.status(id)`) |
| `STATUS` | GET `/keys/:activationId/status` | param `activationId` | `ClientActivationStatusDTO` | `getActivationStatus` | `useActivationStatus` (enabled-gated, as today) |

**Tests:** verify returns minimal `INVALID` shape (all optionals absent) and a full `READY` shape; submit 201 unwrap; update/additional invalidate the status key; 400 `VALIDATION_ERROR` throws with `error.code` preserved.

### 2.3 Activations — `activations.service.ts` (exists, rewire + extend) · routes `ACTIVATION_ROUTES` (`/activations`)

Activator-facing (existing hooks):

| Route | Method & path | Input | Returns | Service fn | Hook |
|---|---|---|---|---|---|
| `GET_PENDING` | GET `/activations/pending` | — | `PendingActivationDTO[]` | `getPending` | `usePendingActivations` |
| `GET_ACTIVE` | GET `/activations/active` | — | `ActiveRequestDTO[]` | `getActive` | `useActiveRequests` |
| `TAKE` | POST `/activations/:id/take` | param `id` | `ActiveRequestDTO` (was `void` — upgraded) | `take` | `useTakeActivation` |
| `FLAG_WRONG` | POST `/activations/:id/flag-wrong-info` | `FlagWrongInfoCommand` | `ActiveRequestDTO` | `flagWrongInfo` | `useFlagWrongInfo` |
| `REQUEST_ADDITIONAL` | POST `/activations/:id/request-additional` | `RequestAdditionalInfoCommand` | `ActiveRequestDTO` | `requestAdditionalInfo` | `useRequestAdditionalInfo` |
| `ACTIVATE` | POST `/activations/:id/activate` | param `id` (no body — D3) | `ActiveRequestDTO` | `activate` (no longer a no-op) | `useActivateRequest` |
| `CANCEL` | POST `/activations/:id/cancel` | param `id` | **204** → `void` | `cancel` (new) | `useCancelActivation` (new) |
| `RELEASE` | POST `/activations/:id/release` | param `id` | **204** → `void` | `release` | `useReleaseActivation` |
| `FREEZE` | POST `/activations/:id/freeze` | `FreezeRequestCommand` | `ActiveRequestDTO` | `freeze` | `useFreezeActivation` |
| `GET_MY_HISTORY` | GET `/activations/my-history` | `GetActivatorHistoryQuery` | `PaginatedActivatorHistory` | `getMyHistory` | `useMyHistory` |
| `GET_RECENT` | GET `/activations/recent` | — | `RecentActivationDTO[]` | `getRecent` | `useRecentActivations` |

Admin-facing (new; hooks in `hooks/useAdminActivations.ts` per D6):

| Route | Method & path | Input | Returns | Service fn | Hook |
|---|---|---|---|---|---|
| `GET_ALL` | GET `/activations/` | `GetActivationsQuery` | `PaginatedActivations` | `getAll` | `useAdminActivations` |
| `GET_BY_ID` | GET `/activations/:id` | param `id` | `ActivationDetailDTO` | `getById` | `useActivationDetail` |
| `ACTIVATE_BY_ADMIN` | POST `/activations/:id/activate-by-admin` | param `id` | `AdminActivationDTO` | `activateByAdmin` | `useActivateByAdmin` |
| `CANCEL_BY_ADMIN` | POST `/activations/:id/cancel-by-admin` | param `id` | `AdminActivationDTO` | `cancelByAdmin` | `useCancelByAdmin` |
| `SET_PRICE` | POST `/activations/:id/set-price` | `SetActivatorPriceCommand` | `AdminActivationDTO` | `setPrice` | `useSetActivationPrice` |

**Tests:** paginated unwrap (items + meta), empty page (`items: []`, `total: 0`, `totalPages: 0`), query serialization (page/limit/state/dates appear in `request.url`), 204 handling for cancel/release, nullable-field fixtures (`otpValue`, `freezeReason`, `durationSeconds`, `earning` null), invalidation matrix rows (§3.2).

### 2.4 Activators — `activator.service.ts` (exists, extend) · routes `ACTIVATOR_ROUTES` (`/activators`)

| Route | Method & path | Input | Returns | Service fn | Hook |
|---|---|---|---|---|---|
| `MY_STATS` | GET `/activators/me/stats` | — | `ActivatorDashboardDTO` | `getMyStats` (exists) | `useMyStats` (exists; key normalized per D4) |
| `GET_ALL` | GET `/activators/` | `GetActivatorsQuery` | `PaginatedActivators` | `getAll` | `useActivators` |
| `CREATE` | POST `/activators/` | `CreateActivatorCommand` | `ActivatorWithCredentialsDTO` (one-time password!) | `create` | `useCreateActivator` |
| `GET_BY_ID` | GET `/activators/:id` | param `id` | `ActivatorDetailDTO` | `getById` | `useActivator` |
| `UPDATE` | PATCH `/activators/:id` | `UpdateActivatorCommand` | `ActivatorDTO` | `update` | `useUpdateActivator` |
| `TOGGLE` | POST `/activators/:id/toggle` | param `id` | `ActivatorDTO` | `toggle` | `useToggleActivator` |
| `RESET_PASSWORD` | POST `/activators/:id/reset-password` | param `id` | `ActivatorGeneratedPasswordDTO` | `resetPassword` | `useResetActivatorPassword` |
| `DELETE` | DELETE `/activators/:id` | param `id` | **204** → `void` | `remove` | `useDeleteActivator` |
| `PERFORMANCE` | GET `/activators/:id/performance` | `ActivatorPerformanceQuery` | `ActivatorPerformanceDTO` | `getPerformance` | `useActivatorPerformance` |

New hooks in `hooks/useActivators.ts`. **Tests:** create returns credentials DTO exactly once (mutation, never cached as a query), 404 on unknown `:id` throws, `days` query param serialized.

### 2.5 Admins — `admins.service.ts` (new) · routes `ADMIN_ROUTES` (`/admins`) · hooks `hooks/useAdmins.ts`

Same CRUD pattern as Activators minus performance/my-stats: `GET_ALL`→`PaginatedAdmins`/`useAdmins`, `CREATE`(POST)→`AdminWithCredentialsDTO`/`useCreateAdmin`, `GET_BY_ID`→`AdminDTO`/`useAdmin`, `UPDATE`(PATCH, `UpdateAdminCommand`)→`AdminDTO`/`useUpdateAdmin`, `TOGGLE`(POST)→`AdminDTO`/`useToggleAdmin`, `RESET_PASSWORD`(POST)→`AdminGeneratedPasswordDTO`/`useResetAdminPassword`, `DELETE`→**204**/`useDeleteAdmin`. Inputs: `GetAdminsQuery`, `CreateAdminCommand`. **Tests:** mirror 2.4.

### 2.6 Payments — `payments.service.ts` (new) · `PAYMENT_ROUTES` (`/payments`) · hooks `hooks/usePayments.ts`

| Route | Method & path | Input | Returns | Service fn | Hook |
|---|---|---|---|---|---|
| `GET_ALL` | GET `/payments/` | `GetPaymentsQuery` (`includeDeleted` boolean-string) | `PaginatedPayments` | `getAll` | `usePayments` |
| `CREATE` | POST `/payments/` | `RecordPaymentCommand` | `PaymentDTO` | `record` | `useRecordPayment` |
| `DELETE` | DELETE `/payments/:id` | param `id` | **204** → `void` | `remove` | `useDeletePayment` |

**Tests:** `includeDeleted: true/false` serializes to the literal strings `BooleanQuerySchema` expects; payment mutations invalidate `['activators']` (credits change).

### 2.7 Logs — `logs.service.ts` (new) · `LOG_ROUTES` (`/logs`) · hooks `hooks/useLogs.ts`

`GET_ALL` GET `/logs/` · `GetLogsQuery` → `PaginatedLogs` · `getAll` · `useLogs`. **Never invalidated by other domains' mutations** (decision: the 30s `staleTime` + refetch-on-mount covers an audit page; wiring every admin mutation to logs would be noise).

### 2.8 Subscription Plans — `subscription-plans.service.ts` (new) · `SUBSCRIPTION_PLAN_ROUTES` (`/subscription-plans`) · hooks `hooks/useSubscriptionPlans.ts`

| Route | Method & path | Input | Returns | Service fn | Hook |
|---|---|---|---|---|---|
| `GET_ALL` | GET `/subscription-plans/` | `GetSubscriptionPlansQuery` (`active?`) | `SubscriptionPlanDTO[]` | `getAll` | `useSubscriptionPlans` |
| `CREATE` | POST `/subscription-plans/` | `CreateSubscriptionPlanCommand` | `SubscriptionPlanDTO` | `create` | `useCreateSubscriptionPlan` |
| `TOGGLE` | POST `/subscription-plans/:id/toggle` | param `id` | `SubscriptionPlanDTO` | `toggle` | `useToggleSubscriptionPlan` |
| `GET_COMMISSION_DURATIONS` | GET `/subscription-plans/commission-durations` | — | `CommissionDurationDTO[]` | `getCommissionDurations` | `useCommissionDurations` |
| `GET_COMMISSIONS` | GET `/subscription-plans/commissions` | — | `CommissionMatrixDTO` | `getCommissionMatrix` | `useCommissionMatrix` |
| `UPDATE_COMMISSION` | PATCH `/subscription-plans/commissions` | `UpdateCommissionCommand` | `CommissionCellDTO` | `updateCommission` | `useUpdateCommission` |

**Tests:** matrix DTO with `commission: null` cells; `updateCommission` invalidates the commissions keys only.

### 2.9 Geography — `geography.service.ts` (new) · `GEOGRAPHY_ROUTES` (`/geography`) · hooks `hooks/useGeography.ts`

`GET_WILAYAS` GET `/geography/wilayas` → `WilayaDTO[]` · `getWilayas` · `useWilayas`; `GET_COMMUNES` GET `/geography/wilayas/:wilayaId/communes` → `CommuneDTO[]` · `getCommunes(wilayaId)` · `useCommunes(wilayaId)` (enabled-gated on `wilayaId`). Static reference data → both hooks use `staleTime: Infinity`. **Tests:** param substitution via `withParams`; communes disabled until a wilaya is chosen.

### 2.10 Delivery Companies — `delivery-companies.service.ts` (new) · `DELIVERY_COMPANY_ROUTES` (`/delivery-companies`) · hooks `hooks/useDeliveryCompanies.ts`

`GET_ALL` GET (query `active?` boolean-string) → `DeliveryCompanyDTO[]` · `useDeliveryCompanies`; `CREATE` POST `CreateDeliveryCompanyCommand` → `DeliveryCompanyDTO` · `useCreateDeliveryCompany`; `UPDATE` PATCH `UpdateDeliveryCompanyCommand` → `DeliveryCompanyDTO` · `useUpdateDeliveryCompany`; `TOGGLE` POST → `DeliveryCompanyDTO` · `useToggleDeliveryCompany`.

### 2.11 Distributors — `distributors.service.ts` (new) · `DISTRIBUTOR_ROUTES` (`/distributors`) · hooks `hooks/useDistributors.ts`

`GET_ALL` GET `GetDistributorsQuery` → `PaginatedDistributors` · `useDistributors`; `CREATE` POST `CreateDistributorCommand` → `DistributorDTO` · `useCreateDistributor`; `GET_BY_ID` GET → `DistributorDetailDTO` · `useDistributor`; `UPDATE` PATCH `UpdateDistributorCommand` → `DistributorDTO` · `useUpdateDistributor`; `TOGGLE` POST → `DistributorDTO` · `useToggleDistributor`; `DELETE` → **204** · `useDeleteDistributor`.

### 2.12 Sets — `sets.service.ts` (new) · `SET_ROUTES` (`/sets`) · hooks `hooks/useSets.ts`

`GET_ALL` GET `GetSetsQuery` → `PaginatedSets` · `useSets`; `CREATE` POST `CreateSetCommand` → `SetDTO` · `useCreateSet`; `TRANSITION` POST `TransitionSetCommand` → `SetDTO` · `useTransitionSet`; `DELETE` → **204** · `useDeleteSet`. **Tests:** transition command constrained to `PENDING_PRINTING | PRINTED` (fixture parses through `TransitionSetSchema`).

### 2.13 Lots — `lots.service.ts` (new) · `LOT_ROUTES` (`/lots`) · hooks `hooks/useLots.ts`

`GET_ALL` GET `GetLotsQuery` → `PaginatedLots` · `useLots`; `GET_AVAILABLE_FOR_ORDER` GET `GetAvailableLotsQuery` → `LotDTO[]` · `useAvailableLotsForOrder`; `CREATE` POST `CreateLotCommand` → `LotDTO` · `useCreateLot`; `DELETE` → **204** · `useDeleteLot`. **Route-order note for MSW:** `/lots/available-for-order` must be registered before `/lots/:id`-style patterns just like the API registers it first — a mis-ordered handler would shadow it.

### 2.14 Orders — `orders.service.ts` (new) · `ORDER_ROUTES` (`/orders`) · hooks `hooks/useOrders.ts`

`GET_ALL` GET `GetOrdersQuery` → `PaginatedOrders` · `useOrders`; `GET_BY_ID` GET → `OrderDetailDTO` · `useOrder`; `CREATE` POST `CreateOrderCommand` → `OrderDTO` · `useCreateOrder`; `TRANSITION` POST `TransitionOrderCommand` → `OrderDTO` · `useTransitionOrder`; `DELETE` → **204** · `useDeleteOrder`. **Tests:** `TransitionOrderCommand.deliveredCount` optional; `OrderDetailDTO.lots[]` embedded shape.

### 2.15 Cards — `cards.service.ts` (new) · `CARD_ROUTES` (`/cards`) · hooks `hooks/useCards.ts`

`GET_ALL` GET `GetCardsQuery` → `PaginatedCards` · `useCards`; `GET_AVAILABLE_FOR_LOT` GET `GetAvailableCardsQuery` (**required** `subscriptionPlanId`) → `AvailableCardDTO[]` · `useAvailableCardsForLot` (enabled-gated); `GET_BY_ID` GET → `CardDetailDTO` · `useCard`; `DELETE` → **204** · `useDeleteCard`; `DISABLE`/`ENABLE`/`REVOKE` POST → `CardDTO` · `useDisableCard`/`useEnableCard`/`useRevokeCard`. Same handler-ordering note as lots (`/available-for-lot` before `/:id`).

### 2.16 Statistics — `statistics.service.ts` (new) · `STATISTICS_ROUTES` (`/statistics`) · hooks `hooks/useStatistics.ts`

All GET, all admin-only:

| Route | Path | Query/params | Returns | Hook |
|---|---|---|---|---|
| `DASHBOARD` | `/statistics/dashboard` | — | `DashboardStatsDTO` | `useDashboardStats` |
| `ACTIVATORS_SUMMARY` | `/statistics/activators` | — | `ActivatorsSummaryDTO` | `useActivatorsSummary` |
| `DISTRIBUTORS_SUMMARY` | `/statistics/distributors` | — | `DistributorsSummaryDTO` | `useDistributorsSummary` |
| `INVENTORY_SUMMARY` | `/statistics/inventory` | — | `InventorySummaryDTO` | `useInventorySummary` |
| `ORDERS_SUMMARY` | `/statistics/orders` | — | `OrdersSummaryDTO` | `useOrdersSummary` |
| `ACTIVATIONS_SUMMARY` | `/statistics/activations` | — | `ActivationsSummaryDTO` | `useActivationsSummary` |
| `OVERVIEW` | `/statistics/overview` | `StatisticsOverviewQuery` (required `period`) | `StatisticsOverviewDTO` | `useStatisticsOverview` |
| `WILAYA_HEATMAP` | `/statistics/wilaya-heatmap` | `WilayaHeatmapQuery` | `WilayaHeatmapDTO` (top-level **array**) | `useWilayaHeatmap` |
| `WILAYA_DRILLDOWN` | `/statistics/wilaya/:wilayaId` | param + `WilayaDrilldownQuery` | `WilayaDrilldownDTO` | `useWilayaDrilldown` |

**Tests:** the contract-documented "missing stat = 0" rule — fixtures for `InventorySummaryDTO`/`byState` arrays **omit** zero-count entries so consumers' treat-missing-as-zero handling is exercised; heatmap's top-level-array envelope (`data` is an array, not an object).

### 2.17 User module — no routes

`user/` exports `UserRole` + `UserIdentityDTO` only (shared types consumed by auth/admin/activator). **No service, no hook — nothing to map.** Counted as 0 routes.

---

## 3. Query Key Registry (`src/lib/query-keys.ts`)

### 3.1 Central list

Factories return `as const` tuples; list-style keys take the query object as the final element so each filter combination caches independently. Domain prefixes (`['cards']` etc.) are the invalidation handles.

| Domain | Key | Used by |
|---|---|---|
| auth | `['auth','me']` | `useSession` (AuthProvider) |
| keys | `['keys','status', activationId]` | `useActivationStatus` |
| activations | `['activations','pending']` · `['activations','active']` · `['activations','recent']` · `['activations','my-history', query]` · `['activations','list', query]` · `['activations','detail', id]` | activator + admin activation hooks |
| activators | `['activators','my-stats']` (**normalized from `['activator','my-stats']`**, D4) · `['activators','list', query]` · `['activators','detail', id]` · `['activators','performance', id, query]` | `useMyStats`, admin activator hooks |
| admins | `['admins','list', query]` · `['admins','detail', id]` | admin hooks |
| payments | `['payments','list', query]` | `usePayments` |
| logs | `['logs','list', query]` | `useLogs` |
| subscription-plans | `['subscription-plans','list', query]` · `['subscription-plans','commission-durations']` · `['subscription-plans','commissions']` | plan hooks |
| geography | `['geography','wilayas']` · `['geography','communes', wilayaId]` | geography hooks |
| delivery-companies | `['delivery-companies','list', query]` | delivery hooks |
| distributors | `['distributors','list', query]` · `['distributors','detail', id]` | distributor hooks |
| sets | `['sets','list', query]` | set hooks |
| lots | `['lots','list', query]` · `['lots','available-for-order', query]` | lot hooks |
| orders | `['orders','list', query]` · `['orders','detail', id]` | order hooks |
| cards | `['cards','list', query]` · `['cards','available-for-lot', query]` · `['cards','detail', id]` | card hooks |
| statistics | `['statistics','dashboard']` · `['statistics','activators']` · `['statistics','distributors']` · `['statistics','inventory']` · `['statistics','orders']` · `['statistics','activations']` · `['statistics','overview', query]` · `['statistics','wilaya-heatmap', query]` · `['statistics','wilaya-drilldown', wilayaId, query]` | statistics hooks |

### 3.2 Invalidation matrix (mutation → invalidated prefixes)

Policy: a mutation invalidates (a) its own domain prefix and (b) domains whose DTOs visibly embed the changed data. Statistics and logs are deliberately **not** fan-out targets (30s `staleTime` + refetch-on-mount keep them fresh; see §2.7).

| Mutation hook | Invalidates |
|---|---|
| existing activator-flow hooks (take/flag/request-additional/activate/release/freeze) | unchanged from Sub-01 (already correct), keys sourced from registry |
| `useCancelActivation` (new) | `['activations','active']`, `['activations','my-history']`, `['activations','recent']`, `['activators','my-stats']` (mirror of release) |
| `useUpdateActivation` / `useSubmitAdditionalInfo` | `['keys','status', id]` (new — was nothing) |
| `useActivateByAdmin` / `useCancelByAdmin` / `useSetActivationPrice` | `['activations']`, `['activators']` (earnings/credits shift) |
| `useCreateActivator` / `useUpdateActivator` / `useToggleActivator` / `useResetActivatorPassword` / `useDeleteActivator` | `['activators']` |
| admin CRUD (`useCreateAdmin` … `useDeleteAdmin`) | `['admins']` |
| `useRecordPayment` / `useDeletePayment` | `['payments']`, `['activators']` |
| plan hooks (`useCreateSubscriptionPlan`, `useToggleSubscriptionPlan`) | `['subscription-plans']` |
| `useUpdateCommission` | `['subscription-plans','commissions']`, `['subscription-plans','commission-durations']` |
| delivery-company mutations | `['delivery-companies']` |
| distributor mutations | `['distributors']` |
| `useCreateSet` / `useTransitionSet` / `useDeleteSet` | `['sets']`, `['cards']` (cards are created/re-stated by set lifecycle) |
| `useCreateLot` / `useDeleteLot` | `['lots']`, `['cards']` (cards move IN_LOT/back) |
| `useCreateOrder` / `useDeleteOrder` | `['orders']`, `['lots']` (lots reserved/freed) |
| `useTransitionOrder` | `['orders']`, `['lots']`, `['cards']`, `['distributors']` (delivery moves stock) |
| card mutations (`useDeleteCard`, `useDisableCard`, `useEnableCard`, `useRevokeCard`) | `['cards']` |
| `useLogin` | `['auth','me']` |
| `useLogout` | `queryClient.clear()` (settled) |

---

## 4. Testing & Edge-Case Strategy

### 4.1 Fixtures (`/tests/fixtures/data/`) — every fixture parsed through its contract schema

One file per domain; every export is `Schema.parse({...})`-validated so a fixture can never drift from the contract (test-rules §3). Envelopes are **not** baked into fixtures — handlers wrap DTOs via the envelope helpers.

| File | Fixtures (DTO → variants) |
|---|---|
| `auth.mock.ts` | `AuthTokensDTO`; `SessionUserDTO` (ADMIN + ACTIVATOR) |
| `keys.mock.ts` | `KeyVerificationDTO` — minimal `INVALID` (all optionals absent), `READY`, `NEEDS_CORRECTION` (with `flaggedFields`), `NEEDS_OTP` (with `requestedFields`); `ClientActivationStatusDTO` |
| `activations.mock.ts` | `PendingActivationDTO`; `ActiveRequestDTO` (nulls: `otpValue`, `freezeReason`; and populated variant); `ActivatorHistoryItemDTO` (completed + in-progress with null `completedAt`/`durationSeconds`/`earning`); `RecentActivationDTO`; `AdminActivationDTO`; `ActivationDetailDTO` (null `activator` variant); paginated wrappers incl. **empty page** (`items: []`, `total: 0`, `totalPages: 0`) |
| `activators.mock.ts` | `ActivatorDTO` (null `avgActivationTimeSeconds` variant); `ActivatorDetailDTO`; `ActivatorWithCredentialsDTO`; `ActivatorGeneratedPasswordDTO`; `ActivatorPerformanceDTO`; `ActivatorDashboardDTO` (empty `weekly` variant) |
| `admins.mock.ts` | `AdminDTO`; `AdminWithCredentialsDTO`; `AdminGeneratedPasswordDTO`; paginated |
| `payments.mock.ts` | `PaymentDTO` (incl. `isDeleted: true`); paginated |
| `logs.mock.ts` | `LogDTO`; paginated |
| `plans.mock.ts` | `SubscriptionPlanDTO`; `CommissionDurationDTO` (null `nbMinuteMax` variant); `CommissionCellDTO`; `CommissionMatrixDTO` (null-commission cells) |
| `geography.mock.ts` | `WilayaDTO`; `CommuneDTO` (Arabic `arName` content — exercises encoding) |
| `delivery-companies.mock.ts` | `DeliveryCompanyDTO` (active + inactive) |
| `distributors.mock.ts` | `DistributorDTO`; `DistributorDetailDTO`; paginated |
| `sets.mock.ts` | `SetDTO` (null `printedAt` variant); paginated |
| `lots.mock.ts` | `LotDTO` (null `deliveryDate` + null `lotNumber` linkage variants); paginated |
| `orders.mock.ts` | `OrderDTO` (null `completedAt`); `OrderDetailDTO` (embedded lots); paginated |
| `cards.mock.ts` | `CardDTO` (null `lotNumber`/`distributorName`); `CardDetailDTO` (timeline); `AvailableCardDTO`; paginated |
| `statistics.mock.ts` | all 9 DTOs; inventory/byState arrays with **omitted zero-count entries** (contract rule: missing = 0); heatmap as top-level array |
| `realtime.mock.ts` | socket event payloads parsed through the contract event schemas (`ActivationTakenPayloadSchema`, `ActivationClientUpdatedPayloadSchema`, `ActivationFrozenPayloadSchema`, `ActivationResolvedPayloadSchema`, `ActivationStatusChangedPayloadSchema`; `activation:created` reuses the pending fixture) |

### 4.2 MSW plumbing (`/tests/fixtures/msw/`)

- `envelope.ts`: `ok(data, status = 200)` → `HttpResponse.json({ success: true, data }, { status })`; `fail(code, message, status, details?)` → `{ success: false, error: {...} }`; `noContent()` → `new HttpResponse(null, { status: 204 })`. Mirrors `Apps/api`'s `sendSuccess` + `globalErrorHandler` shapes exactly (including Zod-issues `details` on 400s).
- `api-url.ts`: `apiUrl(...parts) = import.meta.env.VITE_API_URL + apiPath(...parts)` — the **same builder services use**, per test-rules §3.
- `server.ts`: `setupServer(...allDomainHandlers)`.
- 16 `[domain].handlers.ts` files as specified in §2 (happy defaults + exported error variants for `server.use()`).

### 4.3 Integration tests (`/tests/integration/`) — MSW, no mocks

- **`services/[domain].service.test.ts` (16 files).** Per service function: 200/201 returns the unwrapped DTO (deep-equals fixture — proves envelope removal); 4xx/5xx **rejects** with the `AxiosError` carrying `response.data.error.code` (proves no swallowing and that the global handler will find the message); 204 endpoints resolve `void` without unwrap; query objects serialize into `request.url` (asserted by a capturing handler); path params substitute via `withParams`.
- **`hooks/[domain].test.tsx` (16 files).** With `createQueryWrapper()`: query hooks transition `isLoading → isSuccess` with fixture data and `isLoading → isError` under an error handler; mutation hooks expose `isPending → isSuccess` and fire the §3.2 invalidations (seed the target query, mutate, assert the handler served a refetch via call counting); enabled-gating (`useActivationStatus`, `useCommunes`, `useAvailableCardsForLot`) issues no request until enabled.
- **Auth flow specials:** login stores tokens then a subsequent request carries them (observable via an MSW handler asserting the `Authorization` header our interceptor set); logout clears tokens even when the API 500s; cold-start restore (only refresh token present → `me()` 401 → silent refresh → retry 200 → `isAuthenticated`).

### 4.4 Unit tests (`/tests/unit/lib/`)

- **`api-path.test.ts`:** joining, duplicate-slash collapse, trailing-slash strip, root `'/'`, `withParams` encoding (spaces/unicode), multi-param paths, and the pinned current behavior that a missing param renders the literal string `undefined` (documents the sharp edge instead of silently relying on it).
- **`token-store.test.ts`:** set/get/clear; access token never touches `localStorage`; refresh token persists under `sv_refresh_token`; tolerant of pre-corrupted storage.
- **`axios.test.ts`** (the phase-mandated edge cases): 401 → single refresh → replay succeeds; concurrent 401s share **one** refresh (single-flight); refresh failure → tokens cleared + `redirect('/login')` exactly once (spy via `setRedirect`); 401 on `LOGIN` → no refresh, no redirect (error reaches the form); "missing cookie" analog — no stored tokens → no refresh attempt, straight redirect; already on `/login` → no redirect; `timeout: 15_000` rejects on a never-resolving handler; network errors pass through untransformed.
- **`query-client.test.ts`** (mock `sonner`): mutation error → `toast.error` with the server's `error.message`; query first-load failure → **no** toast; background-refetch failure (cache seeded) → toast; 401 → no toast from either cache; canceled request → no toast; enveloped-message absent (network error) → falls back to `translate('common.errors.crashTitle')`.
- **`realtime.test.ts`** (`vi.mock('socket.io-client')` with a fake emitter double): namespace URL composition (`VITE_WS_URL` + namespace); the `auth` callback returns the **current** token after a simulated refresh (not a stale capture); each §5.2 row fires exactly its listed `invalidateQueries` keys (parametrized over the routing table); `subscribe`/`unsubscribe` emissions and resubscribe-on-`connect`; `connect_error` `UNAUTHORIZED` → one shared `refreshTokens()` → one reconnect, and **no reconnect loop** when refresh fails; `FORBIDDEN` → permanent disconnect; role gating (ACTIVATOR connects `/activators` only); logout disconnects and removes all listeners.

### 4.5 Edge-case catalog (SDET checklist woven through the suites above)

Empty list vs null (`[]` + zero-meta pages, omitted stat entries = 0); every nullable DTO field has a null fixture variant; token expiry mid-request (401 → refresh → replay); revoked refresh token (refresh 401 → logout path); 204 no-envelope endpoints; 201 on submit; `success: false` inside a 2xx (defensive throw branch — synthetic MSW case); boolean query params serialized as `'true'`/`'false'` strings (matches `BooleanQuerySchema`); ISO datetime strings round-tripping `z.iso.datetime()`; unicode path/query values; MSW handler ordering for literal-vs-param routes (`available-for-*` before `:id`); optional-field-free minimal DTOs (`INVALID` key verification); aborted in-flight query on unmount → no toast, no state update.

### 4.6 What NOT to test (boundaries, per phase Step 2)

- **Axios internals** — never assert that axios serializes params or sets default headers; only assert behavior **our interceptors** add (Bearer attach, refresh-replay, redirect) and only by observing requests/responses at the MSW boundary.
- **TanStack Query internals** — no assertions on cache eviction, retry backoff timing, structural sharing, or devtools; test the hook's observable state transitions only.
- **Zod schema correctness** — the contract's own conformance tests own that; fixtures `parse()` as a *guard*, not as an assertion target.
- **Sonner rendering** — spy on `toast.error`/`toast.success` calls; never query the DOM for toast markup.
- **Thin wrappers** — no tests that a one-line hook "calls useQuery" or that a service "calls api.get" (implementation details); test inputs → outputs.
- **Socket.IO internals** — transport negotiation, polling fallback, reconnection backoff, and heartbeat are library behavior; bus→room routing correctness is owned by the API's own `gateway.spec.ts` (realtime-rules §10). The web suite tests only our glue: connect/disconnect lifecycle, auth callback, and event→invalidation mapping, against a mocked `socket.io-client`.
- **No `/src` test files, no E2E, no real-API tests** in this sub-stage.

MSW placement note: `unit/lib/axios.test.ts` and `query-client.test.ts` legitimately use the global MSW server — interceptors and cache handlers only fire in reaction to real responses. The "unit = mock the hook, no MSW" rule (test-rules §5) governs **component/page** tests, which belong to later sub-stages.

---

## 5. Realtime (WebSocket) Client Integration

Per `Docs/Stage-02-Backend/realtime-rules.md` (frontend contract in its §8). Verified against `Apps/api`: the gateway is implemented (`common/realtime/`, `socket.io ^4.8.1`, `WS_PATH=/socket.io`), with namespaces `/client` (public), `/activators` (JWT, ACTIVATOR), `/admin` (JWT, ADMIN) and the JWT carried in `handshake.auth.token`.

**Design principle: sockets are a freshness signal, never a data source.** Every server event maps to `queryClient.invalidateQueries` against the §3 registry; payloads are never written into the cache (rules §2 forbids manual cache mutation), so REST stays the single source of truth. If sockets are blocked entirely, the app silently degrades to `staleTime`-based fetching, and the client portal additionally keeps the REST `GET /keys/:activationId/status` hook as the hard fallback (realtime-rules §7.8).

### 5.1 Module: `src/lib/realtime.ts` (new)

- One module owns all sockets (mirrors the one-axios-instance ethos). Two managed connections: the **role socket** (session role → namespace: ACTIVATOR → `/activators`; ADMIN → `/admin`, registered now for the later admin UI) and the **portal socket** (`/client`, created lazily on first activation subscription).
- **URL:** `io(import.meta.env.VITE_WS_URL + NS, …)` — new env var holding the server **origin** (`VITE_API_URL` can't be reused: it carries the `/api/v1` REST prefix, while sockets attach at the server-level `WS_PATH`).
- **Typing:** `Socket<ServerToClientEvents, …>` with `ServerToClientEvents` imported **from the contract** (it already exists in `activation.events.ts`). The `subscribe`/`unsubscribe` client→server interface and the namespace names are *not* in the contract (gap §7.5) — pinned locally in this one module with a reference to realtime-rules §3A/§3C.
- **Auth:** `auth: (cb) => cb({ token: tokenStore.getAccessToken() })` — the callback form re-evaluates on every (re)connection attempt, so a refreshed access token is picked up automatically (realtime-rules §7.6 validates at handshake only; §11.7 forbids skipping re-auth on reconnect). On `connect_error` with `UNAUTHORIZED`: await the shared `refreshTokens()` single-flight from §1.2, then `socket.connect()` once — if refresh fails, stop; the REST layer owns the logout redirect. `FORBIDDEN` → disconnect permanently (wrong role; no retry loop).
- **Exposed API** (pure TS; only hooks/providers call it, never components): `connectRoleSocket(role)` / `disconnectRoleSocket()`; `subscribeActivation(id)` / `unsubscribeActivation(id)` (re-emits the current subscription on every `connect`, per realtime-rules §8 reconnection guidance); a tiny external store (`getStatus`/`onStatusChange`) backing a **`useRealtimeStatus()`** hook (`useSyncExternalStore`, in `src/hooks/useRealtimeStatus.ts`) so a later UI stage can hang the "reconnecting…" toast off `disconnect`/`reconnect` without ever touching the socket module.
- **Lifecycle binding:** `AuthProvider` effect — `isAuthenticated && role` → `connectRoleSocket(role)`; logout settled → `disconnectRoleSocket()` (precedent: `App.tsx` already calls the lib-level `setRedirect`). Portal flow — `useVerifyKey`/`useSubmitActivation` success with an `activationId` → `subscribeActivation(id)`; "Check Another Key" reset → `unsubscribeActivation(id)`.

### 5.2 Event → invalidation routing (frontend mirror of realtime-rules §6)

| Server event (contract payload) | Received on | Invalidates |
|---|---|---|
| `activation:created` (`PendingActivationDTO`) | `/activators` (namespace-wide) | `['activations','pending']` |
| `activation:taken` (`ActivationTakenPayload`) | `/activators` (namespace-wide) | `['activations','pending']` |
| `activation:client-updated` (`ActivationClientUpdatedPayload`) | `/activators` personal room | `['activations','active']` |
| `activation:resolved` (`ActivationResolvedPayload`) | `/activators` personal room | `['activations','active']`, `['activations','my-history']`, `['activations','recent']`, `['activators','my-stats']` |
| `activation:frozen` (`ActivationFrozenPayload`) | `/admin` bell room | `['activations']` (admin list/detail — a free no-op until admin queries mount) |
| `activation:status-changed` (`ActivationStatusChangedPayload`) | `/client` activation room | `['keys','status', activationId]` |

All six re-fetch through REST — event payloads carry ids/timestamps, not state to trust.

### 5.3 Realtime testing (extends §4)

Unit only, no real socket server in the web suite: `tests/unit/lib/realtime.test.ts` (§4.4) against a mocked `socket.io-client`, with event-payload fixtures in `realtime.mock.ts` parsed through the contract event schemas (§4.1). Boundaries in §4.6 — transport/reconnection/heartbeat are Socket.IO's job, and bus→room routing is proven by the API's own `gateway.spec.ts`.

---

## 6. Readiness Checklist

- [x] **Interceptors defined** — request (Bearer attach) + response (401 refresh-retry state machine with single-flight, loop prevention, redirect bridge) specified in §1.2; unit-test matrix in §4.4.
- [x] **Global error handling mapped** — cache-level `sonner` toasts with 401/cancellation/first-load suppression and i18n fallback (§1.4, §4.4).
- [x] **Every contract route → a Service** — 92/92 routes mapped across 16 service files (§2.1–2.16; `user` module has no routes, §2.17). Methods + response DTOs pinned per route from the Stage-02 API.
- [x] **Every Service → a Hook** — 91 hooks for 92 functions; the single exemption is `auth.refresh()`, which is axios-interceptor infrastructure and must never be a React hook (documented D1/§2.1).
- [x] **Keys + invalidations defined** — central registry §3.1, mutation matrix §3.2, D4 normalization.
- [x] **Fixtures validated against contract schemas** — every fixture is `Schema.parse`d at module load; full inventory §4.1.
- [x] **Test boundaries set** — §4.6.
- [x] **Realtime mapped** — all six gateway events → registry-key invalidations (§5.2); handshake auth reuses the token store + shared refresh single-flight; reconnect re-auth and resubscribe defined; REST status polling retained as the hard fallback.

---

## 7. Contract gaps & upstream flags (Stage-01/02 findings, not local patches)

1. **HTTP methods and per-route response DTOs are not encoded in the contract** — resolved here by auditing `Apps/api` routers/interfaces (§2 tables). Risk: a backend method change is invisible to contract consumers. Upstream suggestion (non-blocking): encode method + response type per route in a future contract revision.
2. **204 endpoints are an envelope exception** — logout, cancel, release, and all deletes return empty bodies, not `ApiResponse<null>`. Handled by typed `void` services + `noContent()` MSW helper; flagged so the envelope rule in the docs isn't read as absolute.
3. **Stale Sub-01 TODO markers corrected by this plan** — `keys.service` UPDATE is **POST** (TODO said `patch`); `take`/`flag`/`request-additional`/`freeze`/`activate` return `ActiveRequestDTO` (stubs say `void`); `submit`/`update`/`additional` return `ClientActivationStatusDTO`.
4. **§8.Q4 supersede** — `ACTIVATE` is wired (D3); the "Done" dialog's email input still has no contract field and stays a UI-only artifact for Sub-03 to reconcile.
5. **Socket namespace names and the client→server interface are not in the contract** — the contract's `ClientToServerEvents` is `Record<string, never>` ("none in Stage 1"), while the API locally defines `subscribe`/`unsubscribe`, and `/client`/`/activators`/`/admin` live only in the backend's `rooms.ts`. Recommend the additive Stage-1 touch-up realtime-rules §3A itself suggests (move the three socket interfaces + NS constants into the contract). Until then, `src/lib/realtime.ts` pins both locally in one place with a doc reference (§5.1).
6. **`RefreshTokenCommand` requires the token in the body** — compatible with D1 (we hold the refresh token); would have been impossible under cookie-only auth. Recorded as the deciding evidence for D1.

## 8. Rule-alignment notes (HOW conflicts resolved, per standing instruction)

1. **Auth transport deviates from rules §3A cookie wording** — owner decision D1 after Sub-01 §8.Q7 deferral; everything else in §3A is preserved (single instance, env-driven baseURL, 401 → `/login` with loop prevention, router-bridge redirect, no toasts/UI in axios). Residual risk accepted: `localStorage` refresh token is XSS-readable; access token stays memory-only to narrow the window.
2. **Test stack installation** — `front-end-test-rules.md` names Vitest/RTL/user-event/MSW as the mandated stack, so adding them as devDependencies is rules-sanctioned, not a new-library request. No runtime dependencies are added.
3. **Query-client additions (401 + cancel suppression, `defaultOptions`)** — implements rules §3C's "401 is never a toast" statement (the current code only says it in a comment) and best-practices' `staleTime`/`gcTime` requirement.
4. **`api-path.ts` kept verbatim** from the rules even though `withParams` renders missing params as `'undefined'` — behavior pinned by unit test rather than "improved" away from the rules' snippet.
5. **New `src/lib` modules** (`token-store.ts`, `query-keys.ts`) — the rules' lib list is illustrative, not exhaustive; both are project infrastructure, not libraries.
6. **Hook file grouping for new admin domains (D6)** — rules fix naming (`use[Name]`), Sub-01 fixed one-hook-per-file for the 16 existing hooks (untouched); new domains group per domain file to keep `src/hooks/` navigable.
7. **AuthProvider refactor** — moving its inline `useQuery`/`useMutation` into `useSession`/`useLogin`/`useLogout` restores the strict Component→Hook→Service chain the provider currently shortcuts.
8. **`socket.io-client` installation (runtime dependency)** — rules §6A requires permission for new libraries; granted 2026-07-02 when the owner directed this phase to `realtime-rules.md`, which mandates Socket.IO v4 end-to-end ("no second naming layer, no drift"). Version pinned to the server's major (^4.8). No other runtime additions.

## 9. Dependency notes for Phase-02 sprinting

Phase-02's mandated order (core → auth → domains ≤3 per sprint) is compatible with this plan. Constraints worth honoring when slicing: **token-store + axios + query-client + test scaffold are one unit** (Sprint 1 — nothing else is testable without them); **auth must precede every protected domain** (Sprint 2, including the AuthProvider/`ProtectedRoute` `isReady` gate and stubSession deletion); the four **existing** service files (auth, keys, activations, activator) also carry the UI-visible rewiring (D3 `activate`, D4 key normalization, new invalidations), so they should land before the net-new admin domains; geography is dependency-free and pairs well with distributors (its consumer). Statistics last — it reads everything and touches nothing. **Realtime (§5) is its own sprint** after the activator-flow domains: it needs the token store + shared `refreshTokens()` (Sprint 1), a real session (Sprint 2), and the §3 registry keys it invalidates (activations/keys sprints) — and nothing depends on it, so it can't block anything.

---

**Coverage confirmation: 92/92 contract routes mapped** (auth 4 · keys 5 · activations 16 · activators 9 · admins 7 · payments 3 · logs 1 · subscription-plans 6 · geography 2 · delivery-companies 4 · distributors 6 · sets 4 · lots 4 · orders 5 · cards 7 · statistics 9), 16 service files / 92 service functions, 91 hooks (+1 documented interceptor-only exemption, +`useRealtimeStatus`), **all 6 gateway events → invalidation mappings + 2 client emits (§5)**, 17 fixture files, 16 MSW handler files + 3 shared MSW modules, 37 planned test files.
