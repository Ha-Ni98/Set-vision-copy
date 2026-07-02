# Stage 03 · Sub-02 · Phase 02 — Integration Engine Sprints

Bottom-up decomposition of [`plan.md`](./plan.md) into executable sprints. **No code in this phase.** Scope per sprint is strictly `src/lib`, `src/services`, `src/hooks`, providers-as-plumbing, and `/tests` — zero UI tasks.

- **Sources:** `plan.md` (§ references below point there), `front-end-rules.md`, `front-end-test-rules.md`, `@my-app/contract`.
- **Mandated order honored:** Sprint 1 Core Pipeline → Sprint 2 Auth → feature domains (≤3 per sprint). Realtime (plan §5) slots immediately after its dependencies; Statistics closes (reads everything, touches nothing).

---

## Sprint map

| # | Sprint | Domains (routes) | Depends on |
|---|---|---|---|
| 1 | Core Pipeline | — (0 routes; all infrastructure) | — |
| 2 | Auth Domain | auth (4) | 1 |
| 3 | Activator Flow | keys (5) · activations (16) | 1, 2 |
| 4 | Realtime Client | — (6 socket events, 2 client emits) | 1, 2, 3 |
| 5 | People & Money | activators (9) · admins (7) · payments (3) | 1, 2 |
| 6 | Network & Places | geography (2) · distributors (6) · delivery-companies (4) | 1, 2 |
| 7 | Inventory | sets (4) · lots (4) · cards (7) | 1, 2 |
| 8 | Commerce & Audit | orders (5) · subscription-plans (6) · logs (1) | 1, 2, 6 (delivery/distributor keys), 7 (lot/card keys) |
| 9 | Statistics & Closeout | statistics (9) + coverage audit | all |

Route total: 4+21+19+12+15+12+9 = **92/92** (plan §2 tables are the per-route source of truth for method, input, and unwrapped return type).

## Conventions binding every sprint

- **Type compliance:** every DTO/Command/Query type imports from `@my-app/contract`; `npm run check` (`tsc --noEmit`, covering `/tests`) must be clean. No `as any` in real assertions (test-rules §2).
- **Envelope discipline:** services unwrap `ApiResponse<T>` and return `T` with the defensive `success === false` throw (rules §2); **204 endpoints** (plan §7.2) are `Promise<void>` with no unwrap. MSW handlers always reply envelope-shaped via `ok()`/`fail()`/`noContent()` (plan §4.2), and every fixture is `Schema.parse`d through its contract schema at module load (test-rules §3).
- **URLs never drift:** services and handlers both compose URLs with `apiPath`/`withParams` + `VITE_API_URL` (test-rules §3).
- **Keys from the registry only:** hooks read query keys from `src/lib/query-keys.ts` (plan §3.1) and fire the invalidation-matrix rows (plan §3.2) — no inline key arrays.
- **What NOT to test** (plan §4.6, phase principle): no TanStack internals (retry timing, cache eviction, structural sharing), no axios internals (param serialization, default headers), no Zod schema correctness (contract conformance tests own it), no sonner DOM (spy on `toast.*`), no Socket.IO transport internals, no thin-wrapper "calls useQuery" assertions, no test files in `/src`, no E2E.
- **Closing each sprint:** write `report-sprint-NN.md` in this `results/` dir (repo convention: frontmatter `sprint/title/status/commit`, then Work done / Validation results / Decisions & deviations), update docs, then commit on green.

---

### Sprint 1: Core Pipeline   — Status: ✅ Done

**Goals**
- The Bearer data pipeline exists end-to-end: token store, single axios instance with request-attach + 401 refresh-retry state machine, hardened query client, central query-key registry (plan §1.2–§1.5).
- The full test harness runs: Vitest + jsdom + RTL + MSW installed, `/tests` scaffold in place, and the four core lib suites green (plan §1.6, §4.4).

**Tasks**
- [ ] Dependencies — dev: `vitest` (^3), `jsdom`, `@testing-library/react` (^16), `@testing-library/user-event`, `@testing-library/jest-dom`, `msw` (^2); runtime: `socket.io-client` (^4, consumed Sprint 4; approval plan §8.8).
- [ ] Config — `vitest.config.ts` (`mergeConfig`, jsdom, `setupFiles`, `include: ['tests/**/*.test.{ts,tsx}']`); `.env.test` (`VITE_API_URL`, `VITE_WS_URL`); `.env.example` gains `VITE_WS_URL`; `package.json` scripts `test`/`test:watch`; type-check surface extended to `/tests` (plan §1.6).
- [ ] `src/lib/token-store.ts` (new) — memory access token, `sv_refresh_token` in `localStorage`, `getAccessToken/getRefreshToken/setTokens/clear` (plan §1.3).
- [ ] `src/lib/axios.ts` (rework) — drop `withCredentials`, add `timeout: 15_000`, request interceptor attaches `Authorization: Bearer`, response interceptor implements the 4-step 401 state machine (token-endpoint exclusion, single-flight refresh, one `_retried` replay, clear + loop-safe redirect), export `refreshTokens()` (plan §1.2).
- [ ] `src/lib/query-client.ts` (harden) — `defaultOptions` (`staleTime: 30_000`, `gcTime: 5m`, no 4xx retry, `refetchOnWindowFocus: false`), 401 + canceled-request toast suppression on both caches, first-load guard kept (plan §1.4).
- [ ] `src/lib/query-keys.ts` (new) — the complete `qk` registry from plan §3.1 (all 16 domains defined now; later sprints only consume).
- [ ] `/tests` scaffold — `fixtures/msw/envelope.ts` (`ok/fail/noContent` mirroring the API's `sendSuccess`/`globalErrorHandler`), `fixtures/msw/api-url.ts`, `fixtures/msw/server.ts` (handler list grows per sprint), `fixtures/wrappers/setup.ts` (MSW lifecycle, jest-dom, `tokenStore.clear()` + `localStorage.clear()` per test), `fixtures/wrappers/createQueryWrapper.tsx` (fresh client, `retry: false`) (plan §1.6).
- [ ] `/tests/unit/lib/api-path.test.ts` — joins, slash collapse, root, param encoding (unicode), pinned missing-param → literal `undefined` (plan §4.4).
- [ ] `/tests/unit/lib/token-store.test.ts` — set/get/clear; access token never persisted; corrupt-storage tolerance.
- [ ] `/tests/unit/lib/axios.test.ts` — 401→refresh→replay; concurrent 401s share one refresh; refresh failure → clear + one redirect (`setRedirect` spy); 401 on LOGIN → no refresh/redirect; no stored tokens → straight redirect; already on `/login` → no redirect; timeout rejects; network errors untransformed.
- [ ] `/tests/unit/lib/query-client.test.ts` — mutation error toast; first-load silence; background-refetch toast; 401 silent; canceled silent; `translate` fallback.

**Validation**
- [ ] `tsc --noEmit` clean; all types from `@my-app/contract`.
- [ ] Exactly one axios instance; no toasts/UI/domain transforms in `axios.ts`; 401 never produces a toast anywhere.
- [ ] Single-flight refresh proven by test (concurrent 401s → one `POST /auth/refresh`).
- [ ] MSW intercepts via the route builder; `onUnhandledRequest: 'error'` active.
- [ ] Tests cover success **and** failure paths; no test files inside `/src`.
- [ ] Committed on green (+ `report-sprint-01.md`).

**Risks**
- Single-flight/replay races are subtle — deterministic tests need MSW `delay()` control, not real timers.
- axios uses the XHR adapter under jsdom; MSW v2 must intercept it (interceptors package) — verify early, it gates every later sprint.
- `import.meta.env` in `.env.test` must load under Vitest's mode resolution — pin mechanics before writing suites.

---

### Sprint 2: Auth Domain   — Status: ✅ Done

**Goals**
- Real session lifecycle over `AUTH_ROUTES`: login/refresh/logout/me wired to the token store; `stubSession` deleted; cold-start restore works (plan §2.1).
- Auth fixtures, envelope-shaped handlers, and service + hook integration suites green.

**Tasks**
- [ ] `src/services/auth.service.ts` (rewire) — `login` (POST → `AuthTokensDTO`, `setTokens` side effect), `refresh` (POST → `AuthTokensDTO`, `setTokens`), `logout` (POST body `RefreshTokenCommand` **required**, 204 → `void`, `finally { tokenStore.clear() }`), `me` (GET → `SessionUserDTO`).
- [ ] Hooks (one per file, Sub-01 precedent): `src/hooks/useLogin.ts` (invalidates `qk.auth.me`), `src/hooks/useLogout.ts` (`queryClient.clear()` on settled), `src/hooks/useSession.ts` (`staleTime: Infinity`, `retry: false`).
- [ ] `AuthProvider` plumbing (not UI): delete the `stubSession` bridge (its own `TODO(Sub-02)`), consume the three hooks, add `isReady` (me-query settled) consumed by `ProtectedRoute` as a render gate — no markup changes (plan §2.1).
- [ ] `/tests/fixtures/data/auth.mock.ts` — `AuthTokensDTO`; `SessionUserDTO` ADMIN + ACTIVATOR variants (schema-parsed).
- [ ] `/tests/fixtures/msw/auth.handlers.ts` — login 200/401, refresh 200/401, logout 204 + 500, me 200/401; registered in `server.ts`.
- [ ] `/tests/integration/services/auth.service.test.ts` — login stores tokens & returns unwrapped DTO; logout clears tokens **even on 500** and still throws; me unwraps; 401 rejects with `error.code` preserved.
- [ ] `/tests/integration/hooks/auth.test.tsx` — login → me invalidation; logout clears cache; cold-start restore (refresh token only → me 401 → silent refresh → retry 200 → session); subsequent request carries `Authorization` (handler-asserted).

**Validation**
- [ ] `tsc --noEmit` clean; all types from `@my-app/contract`.
- [ ] Services unwrap `ApiResponse` and throw (never swallow); logout is the only sanctioned `finally` side effect.
- [ ] Query hook returns `{ data, isLoading, isError, error, refetch }`; mutations expose `{ mutate, mutateAsync, isPending, … }` and invalidate per plan §3.2.
- [ ] Handlers envelope-shaped via helpers; fixtures schema-parsed; MSW uses the route builder.
- [ ] 200 **and** 4xx/5xx covered; no test files in `/src`.
- [ ] Committed on green (+ `report-sprint-02.md`).

**Risks**
- Refresh-on-me bootstrap must fire exactly once (interceptor `_retried` + token-endpoint exclusion interplay — the `ME` path is under `/auth` but must **not** be excluded from refresh, plan §1.2.3).
- `ProtectedRoute` gating regression: without `isReady`, a slow `me()` flashes `/login` — assert the flag transition in the hook suite.

---

### Sprint 3: Activator Flow — Keys + Activations   — Status: ✅ Done

**Goals**
- The two MVP-visible service files fully live: all 5 `KEY_ROUTES` and all 16 `ACTIVATION_ROUTES` per plan §2.2–§2.3, including D3 (`activate` is real) and the corrected verbs/return types (plan §7.3).
- All 16 existing hooks rewired through the `qk` registry; new `useCancelActivation` + the 5 admin-activation hooks; fixture/handler/integration coverage for both domains.

**Tasks**
- [ ] `src/services/keys.service.ts` (rewire) — `verifyKey`, `submitActivation` (201 → `ClientActivationStatusDTO`), `updateActivation` (**POST**, not the stub's `patch`), `submitAdditionalInfo`, `getActivationStatus` (plan §2.2).
- [ ] `src/services/activations.service.ts` (rewire + extend) — activator-facing 11 (incl. `activate` → `ActiveRequestDTO`, new `cancel` → 204, upgraded mutation return types) + admin-facing `getAll`/`getById`/`activateByAdmin`/`cancelByAdmin`/`setPrice` (plan §2.3); query fns accept `signal` (D5).
- [ ] Hooks — rewire the 16 existing files to registry keys + real services (success toasts kept, D7); add status-key invalidation to `useUpdateActivation`/`useSubmitAdditionalInfo`; new `src/hooks/useCancelActivation.ts` (mirror of release, plan §3.2); new `src/hooks/useAdminActivations.ts` (grouped per D6: `useAdminActivations`, `useActivationDetail`, `useActivateByAdmin`, `useCancelByAdmin`, `useSetActivationPrice`).
- [ ] `/tests/fixtures/data/keys.mock.ts` — `KeyVerificationDTO` minimal-`INVALID` / `READY` / `NEEDS_CORRECTION` / `NEEDS_OTP`; `ClientActivationStatusDTO`.
- [ ] `/tests/fixtures/data/activations.mock.ts` — all DTO variants incl. null fields (`otpValue`, `freezeReason`, `completedAt`, `durationSeconds`, `earning`, null `activator`) and the **empty page** paginated fixture (plan §4.1).
- [ ] `/tests/fixtures/msw/keys.handlers.ts` + `activations.handlers.ts` — happy paths (200/201/204) + 400/404/500 variants; registered in `server.ts`.
- [ ] `/tests/integration/services/{keys,activations}.service.test.ts` — unwrap deep-equals fixtures; 201 submit; 204 cancel/release resolve `void`; `GetActivatorHistoryQuery`/`GetActivationsQuery` serialization asserted in `request.url`; param substitution; 4xx/5xx reject with `error.code`.
- [ ] `/tests/integration/hooks/{keys,activations}.test.tsx` — state transitions; every plan §3.2 row for these domains (seed → mutate → refetch counted); `useActivationStatus` enabled-gating.

**Validation**
- [ ] `tsc --noEmit` clean — including the UI components that consume the upgraded mutation return types.
- [ ] Services unwrap + throw; 204s never unwrap; all types from `@my-app/contract`.
- [ ] Hooks return the rule-mandated shapes; invalidations match plan §3.2 exactly; no inline key arrays remain in these files.
- [ ] Envelope-shaped handlers via helpers; fixtures schema-parsed; route-builder URLs.
- [ ] 200 **and** 4xx/5xx covered; no test files in `/src`.
- [ ] Committed on green (+ `report-sprint-03.md`).

**Risks**
- Return-type upgrades (`void` → DTO) ripple into existing pages/components at type level — run `check` early, fix types only (no UI behavior changes).
- 21 routes in one sprint is the heaviest slice; the two domains share one contract module, so splitting the service file across sprints would be worse.

---

### Sprint 4: Realtime Client   — Status: ✅ Done

**Goals**
- `src/lib/realtime.ts` per plan §5: role + portal sockets, handshake auth from the token store, shared `refreshTokens()` on `UNAUTHORIZED`, and all six gateway events mapped to registry invalidations (§5.2).
- Realtime unit suite green against a mocked `socket.io-client`; payload fixtures schema-parsed.

**Tasks**
- [ ] `src/lib/realtime.ts` (new) — namespaces/`subscribe` interface pinned locally (contract gap, plan §7.5) with realtime-rules §3A/§3C references; `auth` callback form reading `tokenStore.getAccessToken()`; `connect_error` handling (`UNAUTHORIZED` → one shared refresh → one reconnect; `FORBIDDEN` → permanent disconnect); `connectRoleSocket`/`disconnectRoleSocket`, `subscribeActivation`/`unsubscribeActivation` (resubscribe on `connect`), external status store (plan §5.1).
- [ ] Event → invalidation wiring — the six §5.2 rows against `qk`, payloads never written to cache.
- [ ] `src/hooks/useRealtimeStatus.ts` (new) — `useSyncExternalStore` over the status store.
- [ ] Lifecycle plumbing — `AuthProvider` effect connects/disconnects the role socket; `useVerifyKey`/`useSubmitActivation` success (with `activationId`) subscribes; portal reset unsubscribes (plan §5.1).
- [ ] `/tests/fixtures/data/realtime.mock.ts` — payloads parsed through the five contract event schemas; `activation:created` reuses the pending fixture.
- [ ] `/tests/unit/lib/realtime.test.ts` — full matrix from plan §4.4: URL composition, fresh-token auth callback, parametrized event→invalidation table, subscribe/resubscribe, refresh-reconnect without loops, role gating, logout teardown.

**Validation**
- [ ] `tsc --noEmit` clean; `ServerToClientEvents` + payload types imported from `@my-app/contract`.
- [ ] No manual cache writes anywhere — invalidations only; REST status hook untouched as fallback.
- [ ] No component imports the socket module; only the provider/hooks bindings.
- [ ] Socket.IO internals untested (boundary, plan §4.6); all six events covered by fixtures parsed against contract schemas.
- [ ] Tests cover happy and failure (`UNAUTHORIZED`/`FORBIDDEN`) paths; no test files in `/src`.
- [ ] Committed on green (+ `report-sprint-04.md`).

**Risks**
- Fake-socket fidelity: the mock must emulate `connect`/`connect_error` event ordering or tests will assert fantasy behavior.
- Refresh/reconnect interplay with Sprint 1's single-flight — reuse `refreshTokens()`, never a second refresh path.

---

### Sprint 5: People & Money — Activators + Admins + Payments   — Status: ✅ Done

**Goals**
- Full admin people-management pipeline: 9 `ACTIVATOR_ROUTES` (extending the existing service), 7 `ADMIN_ROUTES`, 3 `PAYMENT_ROUTES` (plan §2.4–§2.6), with the D4 key normalization landed.
- Three fixture/handler/integration sets green.

**Tasks**
- [ ] `src/services/activator.service.ts` (extend) — add `getAll`, `create`, `getById`, `update` (PATCH), `toggle`, `resetPassword`, `remove` (204), `getPerformance` alongside the rewired `getMyStats`.
- [ ] **D4 migration:** `['activator','my-stats']` → `qk.activators.myStats` in `useMyStats` and its three invalidation sites; grep-verify no stragglers.
- [ ] `src/services/admins.service.ts` + `src/services/payments.service.ts` (new) per plan §2.5–§2.6.
- [ ] Hooks — `src/hooks/useActivators.ts` (8 grouped hooks, D6), `src/hooks/useAdmins.ts` (7), `src/hooks/usePayments.ts` (3; both mutations invalidate `['payments']` **and** `['activators']`).
- [ ] Fixtures — `activators.mock.ts` (incl. null `avgActivationTimeSeconds`, empty `weekly`, credentials DTOs), `admins.mock.ts`, `payments.mock.ts` (incl. `isDeleted: true`); all schema-parsed.
- [ ] Handlers ×3 (200/201/204 + 400/404/500) registered in `server.ts`.
- [ ] Integration ×6 — services: unwrap/throw/204/query serialization (incl. `includeDeleted` → literal `'true'`/`'false'`, plan §2.6); hooks: transitions + §3.2 rows (payments → activators cross-invalidation asserted).

**Validation**
- [ ] `tsc --noEmit` clean; all types from `@my-app/contract`.
- [ ] Services unwrap + throw; one-time credential DTOs flow through mutations only (never cached as queries).
- [ ] Hook shapes per rules §2; invalidations per plan §3.2; keys from registry only.
- [ ] Envelope handlers, schema-parsed fixtures, route-builder URLs.
- [ ] 200 **and** 4xx/5xx covered; no test files in `/src`.
- [ ] Committed on green (+ `report-sprint-05.md`).

**Risks**
- D4 rename is behavior-invisible if a site is missed (stale key silently never invalidates) — the grep check is mandatory, and the my-stats invalidation tests from Sprint 3 must be re-run green.

---

### Sprint 6: Network & Places — Geography + Distributors + Delivery Companies   — Status: ✅ Done

**Goals**
- Reference-data and distributor pipeline: 2 `GEOGRAPHY_ROUTES`, 6 `DISTRIBUTOR_ROUTES`, 4 `DELIVERY_COMPANY_ROUTES` (plan §2.9–§2.11).

**Tasks**
- [ ] Services (new ×3) — `geography.service.ts` (`getCommunes(wilayaId)` via `withParams`), `distributors.service.ts`, `delivery-companies.service.ts`.
- [ ] Hooks (grouped, D6) — `useGeography.ts` (`useWilayas`/`useCommunes` with `staleTime: Infinity`, communes enabled-gated), `useDistributors.ts` (6), `useDeliveryCompanies.ts` (4).
- [ ] Fixtures — `geography.mock.ts` (Arabic `arName` content — encoding case), `distributors.mock.ts` (list + detail + paginated), `delivery-companies.mock.ts` (active/inactive).
- [ ] Handlers ×3 + registration; `active` boolean-string query variant for delivery companies.
- [ ] Integration ×6 — param substitution for communes; enabled-gating issues no request; distributor CRUD invalidations (`['distributors']`); 204 delete.

**Validation**
- [ ] `tsc --noEmit` clean; contract types only; services unwrap + throw; 204s typed `void`.
- [ ] Hook shapes + §3.2 invalidations; `staleTime: Infinity` overrides only where plan §2.9 says so.
- [ ] Envelope handlers, schema-parsed fixtures, route-builder URLs; 200 + 4xx/5xx; no tests in `/src`.
- [ ] Committed on green (+ `report-sprint-06.md`).

**Risks**
- Unicode in fixtures can surface URL-encoding assumptions in assertions — assert decoded values, not raw URLs, except in the dedicated serialization tests.

---

### Sprint 7: Inventory — Sets + Lots + Cards   — Status: ⬜ Pending

**Goals**
- Card-lifecycle pipeline: 4 `SET_ROUTES`, 4 `LOT_ROUTES`, 7 `CARD_ROUTES` with their cross-domain invalidations (sets↔cards, lots↔cards; plan §2.12–§2.15, §3.2).

**Tasks**
- [ ] Services (new ×3) — `sets.service.ts`, `lots.service.ts`, `cards.service.ts`; transition commands typed via contract (`TransitionSetCommand` constrained enum).
- [ ] Hooks (grouped, D6) — `useSets.ts` (4), `useLots.ts` (4, incl. `useAvailableLotsForOrder`), `useCards.ts` (7, incl. enabled-gated `useAvailableCardsForLot` — **required** `subscriptionPlanId`).
- [ ] Fixtures — `sets.mock.ts` (null `printedAt`), `lots.mock.ts` (null `deliveryDate`), `cards.mock.ts` (null `lotNumber`/`distributorName`, detail timeline, available); paginated + schema-parsed.
- [ ] Handlers ×3 — **literal-before-param registration** (`/lots/available-for-order`, `/cards/available-for-lot` before `:id` patterns, plan §2.13/§2.15 note).
- [ ] Integration ×6 — set/lot mutations invalidate `['cards']` too (asserted); card mutations invalidate `['cards']`; 204 deletes; transition command fixtures parse through their schemas.

**Validation**
- [ ] `tsc --noEmit` clean; contract types only; unwrap + throw; 204s typed `void`.
- [ ] Cross-domain invalidation rows from plan §3.2 all asserted, not just own-domain.
- [ ] Envelope handlers, schema-parsed fixtures, route-builder URLs; 200 + 4xx/5xx; no tests in `/src`.
- [ ] Committed on green (+ `report-sprint-07.md`).

**Risks**
- Handler-ordering bug produces false greens (param route swallows the literal one and returns the wrong fixture) — add one explicit test that the `available-for-*` URL hits its own handler.

---

### Sprint 8: Commerce & Audit — Orders + Subscription Plans + Logs   — Status: ⬜ Pending

**Goals**
- Order flow with its fan-out invalidations, the commission matrix, and the audit log read path: 5 `ORDER_ROUTES`, 6 `SUBSCRIPTION_PLAN_ROUTES`, 1 `LOG_ROUTES` (plan §2.7–§2.8, §2.14).

**Tasks**
- [ ] Services (new ×3) — `orders.service.ts`, `subscription-plans.service.ts`, `logs.service.ts`.
- [ ] Hooks (grouped, D6) — `useOrders.ts` (5; `useTransitionOrder` invalidates `['orders']`, `['lots']`, `['cards']`, `['distributors']`), `useSubscriptionPlans.ts` (6; `useUpdateCommission` → commissions keys only), `useLogs.ts` (1; **never** invalidated by other domains — plan §2.7 decision).
- [ ] Fixtures — `orders.mock.ts` (null `completedAt`, `OrderDetailDTO` embedded lots), `plans.mock.ts` (null `nbMinuteMax`, null-commission matrix cells), `logs.mock.ts`; schema-parsed.
- [ ] Handlers ×3 + registration; literal-before-param for `/subscription-plans/commission-durations` + `/commissions` vs `/:id/toggle`.
- [ ] Integration ×6 — transition fan-out asserted across all four key families; `TransitionOrderCommand.deliveredCount` optionality; matrix null cells reach the hook untouched; 204 deletes; log query serialization (`dateFrom`/`dateTo` ISO strings).

**Validation**
- [ ] `tsc --noEmit` clean; contract types only; unwrap + throw; 204s typed `void`.
- [ ] Fan-out invalidations match plan §3.2 exactly — the four-family transition row is the sprint's core assertion.
- [ ] Envelope handlers, schema-parsed fixtures, route-builder URLs; 200 + 4xx/5xx; no tests in `/src`.
- [ ] Committed on green (+ `report-sprint-08.md`).

**Risks**
- Over-invalidation creep: keep exactly the §3.2 rows — statistics/logs are deliberately not fan-out targets.

---

### Sprint 9: Statistics & Closeout   — Status: ⬜ Pending

**Goals**
- The 9 read-only `STATISTICS_ROUTES` mapped (plan §2.16), and the sub-stage exit audit: 92/92 routes live, registry complete, readiness checklist re-verified.

**Tasks**
- [ ] `src/services/statistics.service.ts` (new) — 9 GET functions (`overview` requires `period`; drilldown = param + query).
- [ ] `src/hooks/useStatistics.ts` (grouped, D6) — 9 query hooks, keys per plan §3.1.
- [ ] `/tests/fixtures/data/statistics.mock.ts` — all 9 DTOs; **omitted zero-count entries** in inventory/byState arrays (contract "missing = 0" rule); heatmap as top-level array; schema-parsed.
- [ ] `/tests/fixtures/msw/statistics.handlers.ts` + registration; drilldown literal/param ordering.
- [ ] `/tests/integration/{services,hooks}/statistics.*` — unwrap incl. array-root envelope; `period`/date serialization; state transitions.
- [ ] **Closeout audit** — script-or-grep sweep: every route constant in `Apps/contract` referenced by exactly one service fn; every service fn (minus `refresh`) by a hook; every hook key sourced from `qk`; no `TODO(Sub-02)` markers remain; plan §6 readiness checklist re-ticked against reality; note any contract gaps newly discovered → plan §7 addendum.

**Validation**
- [ ] `tsc --noEmit` clean; full `npm run test` green across all suites (not just this sprint's).
- [ ] Coverage confirmation reproduced: 92/92 routes · 16 service files · 91 hooks (+`useRealtimeStatus`) · 6/6 socket events · 17 fixture files · 16 handler files.
- [ ] Envelope handlers, schema-parsed fixtures, route-builder URLs; 200 + 4xx/5xx; no tests in `/src`.
- [ ] Committed on green (+ `report-sprint-09.md`; final sub-stage summary in the report).

**Risks**
- The audit is the last catch for silent drift (a route mapped in the plan but skipped in a sprint) — do it mechanically against the contract exports, not against the plan document.
