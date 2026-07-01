# Stage 03 · Sub-01 — Refactor Action Plan

Companion to [`codebase-map.md`](./codebase-map.md). Scope: standardize the existing MVP into `Apps/web` on the approved stack — **no new features**. Phase 02 slices this into sprints; Phase 03 executes.

**Approach:** the MVP cannot be refactored in place — it is a TanStack Start SSR app on React 19/Vite 7/Tailwind 4 with a black-box Lovable config. `Apps/web` is scaffolded fresh on the approved stack (Vite 5.4.19 SPA + React 18.3.1 + React Router + Tailwind 3.4.17 + Zod 4), and MVP code is ported file-by-file through the map. Contract is consumed as `"@my-app/contract": "file:../contract"` (same wiring as `Apps/api`).

**Primary goal:** carry over the MVP's UI components and design system intact — they are the asset this refactor preserves for the later pages/integration stages. Services, hooks, and page wiring are standardized *scaffolding* with typed empty stubs, to be filled when those stages implement their requirements. All gap questions are **resolved** (2026-07-01, see §8) and their decisions are baked into §§1–6.

---

## 1. The Purge — ✅ Done (Sprint 1, 2026-07-02 — see `sprints.md`)

### 1.1 Libraries

| Action | Packages |
|---|---|
| **Uninstall (framework/deploy)** | `@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/router-plugin`, `@cloudflare/vite-plugin`, `@lovable.dev/vite-tanstack-config`, `vite-tsconfig-paths` (alias configured directly), `tw-animate-css`, `@tailwindcss/vite` |
| **Uninstall (unused-primitive peers)** | `react-day-picker`, `cmdk`, `react-resizable-panels`, `recharts`, `vaul`, `embla-carousel-react`, and the ~25 Radix packages belonging to dropped primitives (recharts/vaul/embla remain *approved* per rules §6A — reinstall via shadcn CLI when a phase actually uses them) |
| **Downgrade** | `react`/`react-dom` → 18.3.1, `vite` → 5.4.19, `tailwindcss` → 3.4.17, `@vitejs/plugin-react` to matching major |
| **Upgrade** | `zod` → ^4.0.0 (**must match contract major — readiness gate**) |
| **Add** | `react-router-dom`, `axios`, `next-themes`, `@tanstack/react-table`, `tailwindcss-animate`, `@my-app/contract (file:../contract)`, `@tanstack/react-query-devtools` (dev) |
| **Keep** | `@tanstack/react-query` 5.83.0, `react-hook-form`, `@hookform/resolvers`, `sonner`, `date-fns`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `input-otp`, kept-primitive Radix peers, `typescript` 5.x, eslint/prettier chain |

### 1.2 Files that do not cross over

`routeTree.gen.ts`, `router.tsx`, `wrangler.jsonc`, `.wrangler/`, `bunfig.toml`, `bun.lockb`, `vite.config.ts` (Lovable), `lib/mock-data.ts` (dissolved: DTO shapes → contract imports, strings → `translations.json`, formatters → `lib/utils.ts`, fake data → deleted), `contexts/*` (rewritten as providers), the 25 unused `ui/` primitives.

**Demo artifacts stripped during port:** demo-keys paragraph (landing), demo credentials line (login), "Toggle Empty State" floating button (requests), fake notification *entries* + hardcoded badges "3"/"4" (the bell itself stays as an empty shell — §8.Q6), `MOCK_USERS` plaintext creds, `localStorage("sv_auth")`. **Kept, not stripped:** StatsRow "Recent Activity" — its values become static marketing copy in `translations.json` (copy, not data — §8.Q1); the counter animation stays as design.

### 1.3 Target layout (rules §1, strict)

```text
Apps/web/src
├── pages/            LandingPage · LoginPage · activator/{Dashboard,Requests,History}Page
├── components/
│   ├── ui/           trimmed shadcn set (see map §3)
│   ├── shared/       DataTable · PageHeader · StatusBadge · EmptyState · NotFoundState ·
│   │                 StatCard · CopyButton · LiveTimer · Logo · ThemeToggle · LanguageToggle
│   ├── layout/       PublicLayout · PublicHeader · PublicFooter ·
│   │                 ActivatorLayout · ActivatorHeader · ActivatorSidebar
│   ├── providers/    AuthProvider · ThemeProvider(next-themes) · LanguageProvider
│   └── sections/     landing/{KeyVerifySection,StepIndicator,AccountForm(+schema),OtpStep,
│   │                 CompletedStep,MessageCard,WhoWeAre,StatsRow}
│   │                 activator/{ActiveRequestCard(+dialogs),PendingPoolTable,
│   │                 RecentTeamTable,MyHistoryTable,WeeklyChart}
├── hooks/            see §4
├── services/         auth.service · keys.service · activations.service · activator.service
├── lib/              axios.ts · api-path.ts · query-client.ts · i18n.ts · utils.ts
├── types/            key-flow view state, table view models (never API DTOs)
└── config/           translations.json · nav-links.ts
```

Routing (`App.tsx`): `React.lazy` top-level routes + `<Suspense fallback={<PageLoader/>}>`; `/` and `/login` under `PublicLayout`/standalone; `/dashboard`, `/requests`, `/history` under `ProtectedRoute` + `ActivatorLayout` (redirect to `/login` when unauthenticated — replaces the `useEffect` guard).

---

## 2. UI Standardization & i18n

### 2.1 Duplicates → `shared/`

| New shared component | Replaces (currently duplicated/hand-rolled) |
|---|---|
| `StatusBadge` (on `ui/badge`, driven by `ActivationStat` group map) | `StatusBadge` in `history` + `StatusBadge` in `ActiveRequestCard` |
| `DataTable` (TanStack Table on `ui/table`; sorting, pagination, empty slot) | 3 hand-rolled `<table>`s (pending pool, recent team, my history) + hand-rolled pagination row; keeps the existing mobile card-list pattern via a `renderMobileRow` slot (admin-side horizontal scroll is acceptable per rules §6C). Sorting is **client-side** (TanStack Table sorting state) over the fetched rows — §8.Q3 |
| `EmptyState` | `EmptyBox` (requests) + inline empty divs (pool, history "no records") |
| `NotFoundState` (rules §4) | root-level 404 page redirect; also used for `isError` sections |
| `StatCard` | local `StatCard` (dashboard) + `Card` (StatsRow) |
| `PageHeader` | repeated `h1 + subtitle` blocks on all three activator pages |
| `CopyButton`, `LiveTimer`, `Logo`, `ThemeToggle` | moved as-is from feature folders |
| `LanguageToggle` (new, on `LanguageProvider`) | three dead "EN ▾" buttons (login, public header, activator header) |
| `OtpStep` rebuilt on `ui/input-otp` | hand-rolled 6-input OTP grid |
| Forms on `ui/form` + RHF + Zod (`mode: 'onBlur'`) | manual `useState` forms: login (schema = contract `LoginSchema`), AccountForm (`account-form.schema.ts` co-located, fields mapped to `AccountInformation`, password-confirm via `.refine`; fixed field set kept — no `BIRTHDAY` field, it stays null for now per §8.Q8), ActiveRequestCard dialogs (done/freeze) |

Styling: port oklch tokens from `styles.css` into `src/index.css` + `tailwind.config.ts` semantic names (rules §6B); move login's raw inline `oklch()` gradients into tokens; keep `--shadow-card`/`--shadow-glow` as utilities.

### 2.2 i18n

- Create `config/translations.json` (EN/FR) + `lib/i18n.ts` (`translate(key, lang, vars)`) + `LanguageProvider` + reactive `useTranslation` with interpolation (`{count}`).
- **Every** user-facing string moves behind `t()` — the map flags `#inline-string` in all 20 app components/pages, including toasts, aria-labels, `<title>`/meta (set via `document.title` on route change), dialog copy, empty states, and formatter suffixes (`DZD`, time).
- Key scheme `<scope>.<feature>.<element>.<variant?>`: `common.actions.*`, `common.states.*` (loading/empty/error), `public.landing.*` (steps, verify, form, otp, completed, whoWeAre, stats), `auth.login.*`, `activator.nav.*`, `activator.dashboard.*`, `activator.requests.*`, `activator.history.*`, `enums.activationStat.*`, `enums.clientStatus.*`, `enums.accountInformation.*` (badge/filter/field labels reused everywhere).
- No page-local translation files; enum label maps live once under `enums.*`.
- `formatDZD`/`formatTime` become locale-aware (`Intl.NumberFormat(lang)`), living in `lib/utils.ts`.

---

## 3. Layouts & States

### 3.1 Layouts

| Layout | Applies to | Built from | Notes |
|---|---|---|---|
| `PublicLayout` | `/` (landing) | `PublicHeader` + `PublicFooter` + `<Outlet/>` | Mobile-first ✓. Header keeps existing contents (logo, socials, terms/privacy, EN/FR, theme) — the best-practices commerce header (Search/Cart/store-locator) is **not** applicable to this product; noted in §8 |
| `ActivatorLayout` | `/dashboard`, `/requests`, `/history` | `ActivatorShell` split into `ActivatorHeader` + `ActivatorSidebar` (+ mobile Sheet) | Fills the rules' AdminLayout slot: protected, no cart/store-locator ✓; nav from `config/nav-links.ts`; badge count derived from `useActiveRequests` data length (replaces hardcoded `4`); notifications bell **kept** with an empty dropdown shell, no badge, no action wired (§8.Q6) |
| Login | `/login` | standalone centered card (as today) | No layout chrome by design; guard redirects authenticated users to `/dashboard` via router (no `useEffect`) |

Layout persists through loading/error (rules §4): errors render inside `<main>`, never replace the shell. Router-level `errorElement` only wraps page content.

### 3.2 Granular state coverage (all missing today — MVP renders mocks synchronously)

| Section | `isLoading` (Skeleton matching shape) | `isError` / empty |
|---|---|---|
| Dashboard stat cards | 3 skeleton cards | inline `NotFoundState` in grid area |
| Weekly chart + slots | chart-shaped skeleton | `EmptyState` (no data yet) |
| Active requests grid | 2 card skeletons | existing "No active requests" `EmptyState` |
| Pending pool table | table-row skeletons | existing "No pending requests" `EmptyState` (📭 + pulse dots kept) |
| Recent team table | row skeletons | `EmptyState` |
| My history table | row skeletons | existing "No records match" empty row; `NotFoundState` on error |
| Key verify submit | button spinner (kept) | error `MessageCard` (kept) |
| AccountForm/OTP submit | `isPending` on buttons | field errors via RHF `formState.errors`; API errors via global MutationCache toast |
| Login submit | `isPending` (kept) | inline error alert (kept — local handling of 401 on the auth endpoint) |

No full-screen spinners anywhere; `PageLoader` is for `React.lazy` code-splitting only.

---

## 4. Data Extraction (Component → Hook → Service)

Infra first (rules §3): `lib/axios.ts` (single instance, `VITE_API_URL`, cookie auth, 401→`/login` with loop-prevention + `setRedirect` bridge), `lib/api-path.ts` (`apiPath`/`withParams` verbatim from rules), `lib/query-client.ts` (QueryCache/MutationCache global toasts, 401 excluded). Services import route constants from `@my-app/contract`, return unwrapped `T`, throw on failure. **This sub-stage stubs service bodies with typed empty defaults** (axios wiring is Sub-02-Integration); hooks, keys, and UI states are final now so integration is a body-swap.

| Component data today | Service (stub return now) | Hook | Contract binding |
|---|---|---|---|
| `AuthContext` + `MOCK_USERS` | `auth.service`: `login`, `logout`, `me` (`null` session) | `AuthProvider` exposing `useAuth` (session query + login/logout mutations) | `AUTH_ROUTES` · `LoginCommand`/`AuthTokensDTO`/`SessionUserDTO` — cookie-vs-body transport deferred to later stages (§8.Q7) |
| `lookupKey()` in landing | `keys.service.verifyKey` → `{ status: 'INVALID' }` | `useVerifyKey` (mutation) | `KEY_ROUTES.VERIFY` |
| `AccountForm` setTimeout submit | `keys.service.submitActivation` / `updateActivation` (resolve void) | `useSubmitActivation`, `useUpdateActivation` | `KEY_ROUTES.SUBMIT/UPDATE` |
| `OtpStep` setTimeout | `keys.service.submitAdditionalInfo` | `useSubmitAdditionalInfo` | `KEY_ROUTES.ADDITIONAL` (field `OTP`) |
| (no equivalent — status refresh) | `keys.service.getActivationStatus` | `useActivationStatus` (enabled while pending) | `KEY_ROUTES.STATUS` |
| `MOCK_STATS` in dashboard | `activator.service.getMyStats` → zeroed `ActivatorDashboardDTO` (`weekly: []`) | `useMyStats` | `ACTIVATOR_ROUTES.MY_STATS` |
| `MOCK_ACTIVE_REQUESTS` state | `activations.service.getActive` → `[]` | `useActiveRequests` | `GET_ACTIVE` · `ActiveRequestDTO[]` |
| `MOCK_PENDING_POOL` state | `activations.service.getPending` → `[]` | `usePendingActivations` | `GET_PENDING` · `PendingActivationDTO[]` |
| `takeRequest` local filter | `activations.service.take` | `useTakeActivation` | `TAKE` |
| Card actions (toast+setState) | `flagWrongInfo` · `requestAdditionalInfo` · `activate` · `release` · `freeze` | `useFlagWrongInfo` · `useRequestAdditionalInfo` · `useActivateRequest` · `useReleaseActivation` · `useFreezeActivation` | `FLAG_WRONG`/`REQUEST_ADDITIONAL`/`ACTIVATE`/`RELEASE`/`FREEZE` (commands per contract; "Cancel" button maps to **RELEASE** — returns to pool, matching its current copy; `CANCEL` endpoint stays unused, no UI invented). "Done" dialog UI ported as-is (email field included); `activate` stub stays a typed no-op until later page stages (§8.Q4) |
| `MOCK_PERSONAL_HISTORY` + client-side filter/sort/paging | `activations.service.getMyHistory(query)` → empty `PaginatedActivatorHistory` (`{items:[], meta:{page:1,limit:10,total:0,totalPages:0}}`) | `useMyHistory(query)` (server-driven `page/limit/status/search` from `GetActivatorHistoryQuery`; the Newest/Oldest/Earning control sorts the fetched page **client-side** — `sortBy` unused, §8.Q3) | `GET_MY_HISTORY` |
| `MOCK_GLOBAL_RECENT` | `activations.service.getRecent` → `[]` | `useRecentActivations` | `GET_RECENT` — **DTO wins** (§8.Q2): table re-columns to `subscriptionLabel / keyMasked / completedAt / state`; activator + email columns dropped unless the DTO grows upstream |

**Query keys (hierarchical):** `['auth','me']` · `['activator','my-stats']` · `['activations','active']` · `['activations','pending']` · `['activations','my-history', query]` · `['activations','recent']`.

**Invalidations (rules §2, on success):** take → `pending, active, my-stats`; activate/release/freeze → `active, my-stats, my-history, recent`; flag-wrong/request-additional → `active`; login/logout → `auth.me` (+ clear cache on logout). No manual cache writes; errors bubble to the global handler (login handles its own 401 inline).

**Component state that stays local (correctly UI-state):** landing step machine (retyped to `ClientActivationStatus`-based view union in `types/`), dialog open flags, password visibility, sidebar sheet, history filter inputs (feeding the query object), client-side sort state (§8.Q3).

**Deliberately hardcoded (by decision):** active-slot cap stays `3`, lifted to a named constant `config/constants.ts` → `ACTIVE_SLOTS_CAP` so both usages (dashboard, requests) share it and a later change is one line (§8.Q5). No notifications service is created (§8.Q6); no public stats service is created (§8.Q1).

---

## 5. Readiness Checklist (exit criteria for Sub-01)

- [ ] Unapproved libs removed; `Apps/web` on React 18.3.1 / Vite 5.4.19 / Tailwind 3.4.17 / React Router / TanStack Query 5.83 / RHF + Zod 4.
- [ ] `src/` matches rules §1 layout exactly; no `contexts/`, no `routes/`, no `mock-data.ts`.
- [ ] Zero in-component `useEffect` fetching / `axios` / mock imports; all server state via hooks→services typed by `@my-app/contract`.
- [ ] Zero inline JSX strings; all text via reactive `useTranslation` from `config/translations.json` (EN/FR), enum labels centralized.
- [ ] `PublicLayout`/`ActivatorLayout` separate routing concerns; protected routes redirect via router; layout survives loading/error; every data section has Skeleton + error/empty state.
- [ ] Single axios instance + `api-path` + query-client per rules §3 (bodies wired in Sub-02); global error toasts on caches; 401 handled by interceptor only.
- [ ] Monorepo on one Zod major (contract ^4, web ^4); `zodResolver` compiles against contract schemas.
- [ ] Theme via next-themes (no FOUC); language via context; demo artifacts gone.
- [ ] §8 decisions applied: static StatsRow copy · DTO-shaped recent table · client-side sort · empty `activate`/notifications stubs · `ACTIVE_SLOTS_CAP` constant · no BIRTHDAY field.

## 6. Suggested execution order (feeds Phase 02 sprints)

1. **Scaffold & config** — Vite 5 SPA, Tailwind 3 + token port, tsconfig/eslint/prettier, contract file-dep, trimmed `ui/` port. *(Purge §1)*
2. **Infra & providers** — axios/api-path/query-client/i18n, Theme/Language/Auth providers, router + layouts + guards. *(§1, §3)*
3. **Shared components** — DataTable, StatusBadge, EmptyState, NotFoundState, StatCard, PageHeader, toggles, CopyButton, LiveTimer, translations.json backbone. *(§2)*
4. **Pages & sections port** — landing flow, login (RHF+Zod), dashboard, requests, history; all strings keyed; skeleton/error states in. *(§2, §3)*
5. **Data layer** — services (typed empty stubs) + hooks + invalidation map; delete last mock references. *(§4)*
6. **Checklist sweep** — §5 gate + verification that every §8 decision landed as specified.

## 7. Heaviest technical debt (summary)

1. **Wrong foundation** — TanStack Start SSR on React 19/Vite 7/Tailwind 4 behind a Lovable black-box config: nothing of the build chain survives; the port must be scaffold-first, not tweak-in-place.
2. **No data layer at all** — 7 components import mocks directly and fake mutations with `setTimeout`+`toast`; `ActiveRequestCard` holds a whole activation state machine in local state. Component→Hook→Service must be built from zero (mitigated: contract DTOs map cleanly onto every screen).
3. **Zod 3 vs contract Zod 4** — blocks importing any contract schema into forms; must be fixed before a single `zodResolver` is written.
4. **Zero i18n with three dead language toggles** — every string in 20 files is inline; i18n is a cross-cutting rewrite of every JSX file, cheapest done during the port rather than after.
5. **Mock enums diverge from contract enums** in all four domains (key status, request sub-status, history status, field ids) — silent-drift risk; the mapping tables in the map §4 are the antidote.
6. **Hand-rolled duplicates of installed primitives** — 3 tables, pagination, OTP inputs, 2 status badges, 2 stat cards; DataTable/input-otp/badge consolidation removes ~400 lines.

## 8. Gap questions — RESOLVED (owner decisions, 2026-07-01)

| # | Gap found in audit | Decision | Where it lands in this plan |
|---|---|---|---|
| Q1 | No public stats endpoint behind `StatsRow` "Recent Activity" | **Static marketing copy, translated** | No service/hook; values live in `translations.json`; counter animation kept as design (§1.2, §2.2) |
| Q2 | `RecentActivationDTO` lacks activator name / client email columns | **DTO wins for now** | Recent-team table re-columns to `subscriptionLabel / keyMasked / completedAt / state` (§4) |
| Q3 | `GetActivatorHistoryQuery` has `sortBy` but no direction | **Sorting is a frontend function** — backend sends results, frontend sorts | DataTable client-side sorting over the fetched page; `sortBy` unused (§2.1, §4). Known caveat: sort applies within the current page, not across the full result set |
| Q4 | "Done" dialog email has no contract command body | **Leave the function empty** — pages developed in later stages | Dialog UI ported unchanged; `activate` service stub is a typed no-op (§4) |
| Q5 | Active-slot cap `3` hardcoded, no `activeSlotsTotal` in DTO | **Keep hardcoded for now** | Lifted to `config/constants.ts` `ACTIVE_SLOTS_CAP = 3`, shared by dashboard + requests (§4) |
| Q6 | No notifications read endpoint (socket events only) | **Keep the bell, empty function** | Bell stays with empty dropdown shell, no badge, no service (§1.2, §3.1) |
| Q7 | Cookie-attach rule vs body-token contract response | **Leave auth wiring for later stages** | `auth.service` stays a typed stub; transport decided at integration (Sub-02) (§4) |
| Q8 | `AccountInformation.BIRTHDAY` has no UI field | **Always null for now** — no UI/spec; reserved for a future app version | AccountForm keeps its fixed field set; the `enums.accountInformation.*` label map already covers BIRTHDAY if it ever appears in `flaggedFields`/`requestedFields` (§2.1) |

## 9. Rule-alignment notes (HOW conflicts resolved toward the rules, per standing instruction)

- **Layout naming:** rules name the protected layout `AdminLayout`; this app's protected persona is the *Activator*. The plan applies the AdminLayout pattern under the name `ActivatorLayout` (same constraints: no commerce UI, layout separation, shared rules apply). `pages/admin/` will be introduced when admin pages arrive (Sub-03); nothing here conflicts with it.
- **Best-practices header/footer template** (Search, Cart, store-locator, Shipping/Returns links) describes commerce features that don't exist in this product or its contract. Adding them would violate the phase constraint "standardize, don't invent." Kept: Logo, socials, Terms/Privacy, EN/FR toggle, Theme toggle. Flagged rather than silently dropped.
- **Desktop-first admin rule** applies to the activator portal as the protected area; the MVP is already responsive on those pages (tables get mobile card variants) — kept, since horizontal-scroll-on-mobile is the *minimum*, not a mandate to remove better behavior.
- **Results path casing:** phase file says `/docs/stage-03-frontend/...`; repo convention (Stages 01/02) is `Docs/Stage-03-Frontend/Sub-01-Refactor/results/` — the latter used.
- **`useTranslation` for non-component code:** toasts fired inside `query-client.ts` use the non-reactive `translate()` escape hatch the rules explicitly allow for non-component code.
