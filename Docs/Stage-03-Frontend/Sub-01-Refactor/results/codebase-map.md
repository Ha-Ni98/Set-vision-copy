# Stage 03 · Sub-01 · Phase 01 — Codebase Map

Audit of `App-MVP/` (Lovable-generated TanStack Start app) against `front-end-rules.md`, `front-end-best-practices.md`, and `Apps/contract`. Target of the refactor: `Apps/web` (currently empty).

- **Scanned:** 76 source files (29 app files + 47 `components/ui` shadcn primitives) + 8 config files.
- **Verdict:** UI quality is good and worth porting; the foundation is not. The app is on the wrong framework (TanStack Start/SSR vs. Vite SPA + React Router), wrong majors (React 19, Vite 7, Tailwind 4, Zod 3), has **zero** services/hooks/i18n, and every data flow is a hardcoded mock imported directly by components.

## Tag legend

| Tag | Meaning |
|---|---|
| `#ui-primitive` | shadcn/Radix primitive under `components/ui` |
| `#shared-component` | reusable composite (or should become one) |
| `#page` | route page |
| `#layout` | app shell / header / footer / sidebar |
| `#state` | context/provider or business state held in a component |
| `#legacy-fetch` | data obtained outside Component→Hook→Service (here: direct mock imports + `setTimeout` fake calls — the MVP has no `fetch`/`axios` at all) |
| `#inline-string` | hardcoded user-facing text (violates i18n rule §6B) |
| `#unapproved-lib` | library/framework outside the approved stack |
| `#demo-artifact` | demo-only code to purge (fake creds, debug toggles, fake notifications) |

---

## 1. Stack audit (`package.json` vs approved stack)

| Package | MVP | Approved | Action |
|---|---|---|---|
| `react` / `react-dom` | ^19.2.0 | **18.3.1** | Downgrade `#unapproved-lib` |
| `vite` | ^7.3.1 | **5.4.19** | Downgrade |
| `tailwindcss` | ^4.2.1 (`@tailwindcss/vite`, CSS-first `@theme`) | **3.4.17** (`tailwind.config.ts` + CSS vars) | Replace; port `styles.css` tokens to config |
| `@tanstack/react-router` + `react-start` + `router-plugin` | ^1.16x (file-based SSR) | **react-router-dom** (SPA, route protection) | Replace framework |
| `zod` | ^3.24.2 | **4** (contract has `^4.0.0`) | **Upgrade — monorepo must share one Zod major** |
| `@tanstack/react-query` | ^5.83.0 | 5.83.0 | Keep (installed but **never used** — no QueryClientProvider anywhere) |
| `react-hook-form` + `@hookform/resolvers` | ^7.71.2 | 7.61.x | Keep (installed but **never used** — all forms are manual `useState`) |
| `sonner`, `vaul`, `embla-carousel-react`, `recharts` | present | approved list §6A | Keep `sonner`; keep others only if their primitive stays (see §4 ui table) |
| `@lovable.dev/vite-tanstack-config` | ^1.4.0 | — | Purge (opaque black-box config) `#unapproved-lib` |
| `@cloudflare/vite-plugin` + `wrangler.jsonc` + `.wrangler/` + `bunfig.toml`/`bun.lockb` | present | — | Purge (deploy target not part of approved stack) |
| `tw-animate-css` | ^1.3.4 | — | Replace with `tailwindcss-animate` (Tailwind-3 shadcn companion) |
| `date-fns` | ^4.1.0 | approved (rules §Step-2 example) | Keep |
| `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `cmdk`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `input-otp` | shadcn peers | shadcn/ui is approved | Keep only peers of primitives we keep |
| **Missing** | — | `axios` · `next-themes` · `@tanstack/react-table` (shared DataTable) · `@my-app/contract` (as `file:../contract`, same as `Apps/api`) · `tailwindcss-animate` | Add |

Also: package name `tanstack_start_ts` → `@my-app/web`.

## 2. Directory-structure delta (rules §1)

| Rules require | MVP has | Gap |
|---|---|---|
| `pages/` (+ `pages/admin` for protected) | `routes/` (TanStack file-based) + `routeTree.gen.ts` | Convert to `pages/` + central React Router config |
| `components/ui` | ✅ `components/ui` (47 primitives, ~29 unused) | Trim to used set |
| `components/shared` | ❌ none | Create (DataTable, PageHeader, StatusBadge, EmptyState, NotFoundState, CopyButton, LiveTimer, Logo, ThemeToggle, LanguageToggle, StatCard) |
| `components/layout` | ❌ (`ActivatorShell` lives in `components/activator`, Public header/footer in `components/setvision`) | Create `PublicLayout`, `ActivatorLayout`, header/footer/sidebar pieces |
| `components/providers` | `contexts/` (AuthContext, ThemeContext) | Move + rewrite; add `LanguageProvider` |
| `components/sections` | `components/setvision` + `components/activator` (mixed bag) | Split: page sections → `sections/`, reusables → `shared/` |
| `hooks/` | only shadcn `use-mobile.tsx` | Create TanStack Query wrapper hooks |
| `services/` | ❌ none | Create pure-TS services bound to contract routes |
| `lib/` (axios, query-client, api-path, i18n, utils) | only `utils.ts` + `mock-data.ts` | Create all four infra files; **delete `mock-data.ts`** |
| `types/` (view models only) | ❌ none (mock types double as DTOs) | Create for view models (e.g. key-flow view state) |
| `config/` (translations.json, nav-links) | ❌ none | Create |

## 3. File-by-file map

Proposed paths are relative to `Apps/web/src/`. Every user-facing string in every file below is `#inline-string` (there is no i18n at all); only additional violations are listed.

### Root / entry / config

| Current (`App-MVP/`) | Proposed (`Apps/web/`) | Tags | Violations / notes |
|---|---|---|---|
| `vite.config.ts` (Lovable black-box) | `vite.config.ts` (plain Vite 5: react plugin, `@` alias) | `#unapproved-lib` | Hidden plugin stack; no `VITE_API_URL` usage anywhere |
| `wrangler.jsonc`, `.wrangler/`, `bunfig.toml`, `bun.lockb` | — (delete) | `#unapproved-lib` | Cloudflare/Bun artifacts |
| `tsconfig.json` | `tsconfig.json` + `tsconfig.node.json` | — | Keep strict; drop `allowImportingTsExtensions` |
| `components.json` | `components.json` | — | Update `tailwind.css` path + add `tailwind.config.ts` ref |
| `eslint.config.js`, `.prettierrc`, `.prettierignore` | same | — | Carry over |
| — (SSR, no html) | `index.html` + `src/main.tsx` + `src/App.tsx` | — | New SPA entry: StrictMode, QueryClientProvider, providers, RouterProvider, `React.lazy` routes |
| `src/router.tsx` + `src/routeTree.gen.ts` | `src/App.tsx` (React Router routes) | `#unapproved-lib` | Error component has inline strings + raw `<a href="/">`; generated file dies with the framework |
| `src/routes/__root.tsx` | split → `main.tsx` (providers), `index.html` (meta), `shared/NotFoundState` | `#layout` `#inline-string` | Root 404 redirects whole page — rules §4 want local `NotFoundState` inside content area |
| `src/styles.css` (Tailwind 4 `@theme`, oklch tokens) | `src/index.css` (vars) + `tailwind.config.ts` (semantic color names) | `#unapproved-lib` | Tokens are good (incl. `surface`, `success`, `warning`) — port, don't redesign. `login.tsx` hardcodes raw `oklch(...)` gradients that belong here |
| `src/assets/setvision-logo.jpg` | `src/assets/setvision-logo.jpg` | — | Keep |

### Pages (from `src/routes/`)

| Current | Proposed | Tags | Violations / key entities |
|---|---|---|---|
| `routes/index.tsx` | `pages/LandingPage.tsx` + sections (`KeyVerifySection`, `MessageCard`) | `#page` `#legacy-fetch` `#inline-string` `#demo-artifact` | `setTimeout` fake verify + `lookupKey(mock)`; local `View` state machine typed by mock statuses (must move to `types/` keyed to `ClientActivationStatus`); demo-keys footer paragraph; manual form (no RHF/Zod). **Key entities:** `View`, `verify()`, step gating |
| `routes/login.tsx` | `pages/LoginPage.tsx` | `#page` `#legacy-fetch` `#inline-string` `#demo-artifact` `#state` | `setTimeout` fake login; sync `login(u,p)` against `MOCK_USERS`; manual form, no RHF+Zod (`LoginSchema` exists in contract); demo credentials shown; raw `oklch` gradient; dead EN toggle; `useEffect`-redirect |
| `routes/_activator.tsx` | route guard in `App.tsx` (`ProtectedRoute` + `ActivatorLayout`) | `#layout` `#state` | Guard via `useEffect`+`nav` (flash of null); belongs in router-level protection per best-practices "route protection" |
| `routes/_activator.dashboard.tsx` | `pages/activator/DashboardPage.tsx` (+ `sections/activator/WeeklyChart`, shared `StatCard`) | `#page` `#legacy-fetch` `#inline-string` | Imports `MOCK_STATS` directly; hand-rolled div bar-chart; local `StatCard` (duplicate pattern with StatsRow card); slot cap `/3` hardcoded (kept by decision, named constant — plan §8.Q5); no `isLoading`/`isError` states at all. **Maps to** `ACTIVATOR_ROUTES.MY_STATS` → `ActivatorDashboardDTO` |
| `routes/_activator.requests.tsx` | `pages/activator/RequestsPage.tsx` (+ `sections/activator/PendingPoolTable`) | `#page` `#legacy-fetch` `#inline-string` `#demo-artifact` `#state` | `useState(MOCK_ACTIVE_REQUESTS/POOL)` as fake server state; local mutations (`takeRequest` = filter + toast); hand-rolled `<table>` (→ shared DataTable); floating "Toggle Empty State" debug button; slot cap `3` hardcoded (kept by decision, named constant — plan §8.Q5); `EmptyBox` local (→ shared EmptyState). **Maps to** `ACTIVATION_ROUTES.GET_ACTIVE/GET_PENDING/TAKE` |
| `routes/_activator.history.tsx` | `pages/activator/HistoryPage.tsx` (+ `sections/activator/RecentTeamTable`, `MyHistoryTable`) | `#page` `#legacy-fetch` `#inline-string` `#state` | Client-side filter/sort/pagination over mocks (server supports `page/limit/status/search` via `GetActivatorHistoryQuery`; sorting stays client-side by decision — plan §8.Q3); 2 hand-rolled tables + hand-rolled pagination (shared DataTable + Pagination exist); local `StatusBadge` (duplicate #1); mutating `arr.sort`; `key` used as React key. **Maps to** `GET_MY_HISTORY` (paginated) + `GET_RECENT` |

### Contexts → Providers

| Current | Proposed | Tags | Violations / notes |
|---|---|---|---|
| `contexts/AuthContext.tsx` | `components/providers/AuthProvider.tsx` + `hooks/useAuth.ts` + `services/auth.service.ts` | `#state` `#legacy-fetch` `#demo-artifact` | Fake creds against `MOCK_USERS` (plaintext passwords); session in `localStorage("sv_auth")`; no roles. Rules: cookie-based auth, axios 401 interceptor, session via `AUTH_ROUTES.ME` → `SessionUserDTO`, login via `LoginCommand`/`AuthTokensDTO` |
| `contexts/ThemeContext.tsx` | `components/providers/ThemeProvider.tsx` (wrap **next-themes**) | `#state` | Custom impl re-implements next-themes badly: theme applies in `useEffect` after mount → FOUC; rules §6B mandate next-themes + no FOUC. Storage key `sv_theme` |
| — | `components/providers/LanguageProvider.tsx` | — | **Missing entirely.** Required for reactive `useTranslation`; three dead EN toggles reference it |

### `components/setvision/` (public)

| Current | Proposed | Tags | Violations / notes |
|---|---|---|---|
| `PublicHeader.tsx` | `components/layout/PublicHeader.tsx` (inside `PublicLayout`) | `#layout` `#inline-string` | Dead `href="#"` socials/Terms/Privacy; dead EN dropdown button ×2 (desktop+mobile). Note: best-practices' commerce header (Search/Cart) **does not apply** — no such features exist in this product (see plan §8 rule-notes) |
| `PublicFooter.tsx` | `components/layout/PublicFooter.tsx` | `#layout` `#inline-string` | Dead links; hardcoded "© 2026 Setvision" |
| `Logo.tsx` | `components/shared/Logo.tsx` | `#shared-component` | Inline `style` sizing (acceptable); text "SETVISION" fine as brand name |
| `ThemeToggle.tsx` | `components/shared/ThemeToggle.tsx` | `#shared-component` | Rewire to next-themes; add i18n aria-label |
| `StepIndicator.tsx` | `components/sections/landing/StepIndicator.tsx` | `#shared-component` `#inline-string` | `STEPS` labels hardcoded |
| `AccountForm.tsx` | `components/sections/landing/AccountForm.tsx` + `account-form.schema.ts` | `#state` `#legacy-fetch` `#inline-string` | Manual `useState` form + `setTimeout` submit; password-match check by hand (→ RHF + Zod refine); field ids `snap_*` must map to `AccountInformation` enum; mode machine (`ACTIVE/PENDING/INFORMATION_ERROR`) → `ClientActivationStatus`; masked-password placeholder hack (`••••••••`); dead WhatsApp `href="#"`. **Maps to** `KEY_ROUTES.SUBMIT/UPDATE` (`SubmitActivationCommand`/`UpdateActivationCommand`) |
| `OtpStep.tsx` | `components/sections/landing/OtpStep.tsx` | `#state` `#inline-string` | Hand-rolled 6-digit OTP inputs while `ui/input-otp.tsx` (approved, installed) sits unused — merge; fake 60s resend countdown with no backend semantics; `setTimeout` submit. **Maps to** `KEY_ROUTES.ADDITIONAL` (`accountFields: [{field: OTP, value}]`) |
| `CompletedStep.tsx` | `components/sections/landing/CompletedStep.tsx` | `#inline-string` | Default username `"fatima_z"` demo fallback; maps to `KeyVerificationDTO.accountUsername` |
| `StatsRow.tsx` | `components/sections/landing/StatsRow.tsx` | `#inline-string` `#demo-artifact` | Fake animated counters (247, 15, "3:24") presented as live "Recent Activity" — no public stats endpoint exists in contract. **Resolved:** kept as static translated marketing copy, no service (plan §8.Q1) |
| `WhoWeAre.tsx` | `components/sections/landing/WhoWeAre.tsx` | `#inline-string` | Pure marketing copy → translations.json |

### `components/activator/`

| Current | Proposed | Tags | Violations / notes |
|---|---|---|---|
| `ActivatorShell.tsx` | `components/layout/ActivatorLayout.tsx` + `ActivatorHeader.tsx` + `ActivatorSidebar.tsx`; nav data → `config/nav-links.ts` | `#layout` `#inline-string` `#demo-artifact` | Hardcoded nav badge `4`; **entirely fake notifications dropdown** (3 hardcoded entries, badge "3" — resolved: bell kept as empty shell, plan §8.Q6); dead EN button; nav labels inline. Follows the AdminLayout pattern (no cart/store-locator ✓) |
| `ActiveRequestCard.tsx` | `components/sections/activator/ActiveRequestCard.tsx` (+ extracted dialogs) | `#state` `#legacy-fetch` `#inline-string` | 420-line component owning the whole activation state machine locally (toast + `setState` instead of mutations); `ERROR_FIELDS` ids ≠ `AccountInformation` enum; `RequestSubStatus` ≠ `ActivationStat`; StatusBadge duplicate #2; manual dialog forms (no RHF/Zod); "Done" dialog collects an *activation email* that no contract command accepts (**resolved:** UI kept, `activate` stub stays empty — plan §8.Q4). **Maps to** `FLAG_WRONG`, `REQUEST_ADDITIONAL`, `ACTIVATE`, `RELEASE`, `FREEZE` |
| `CopyButton.tsx` | `components/shared/CopyButton.tsx` | `#shared-component` `#inline-string` | Toast strings inline; otherwise clean |
| `LiveTimer.tsx` | `components/shared/LiveTimer.tsx` | `#shared-component` | 1s interval re-render OK; hardcoded 5/10/15-min color thresholds (→ named constants) |

### `components/ui/` (47 shadcn primitives)

| Set | Files | Action |
|---|---|---|
| **Used or required by rules** | `button, input, label, select, checkbox, textarea, dialog, alert-dialog, dropdown-menu, sheet, sonner, skeleton (rules §4), badge (StatusBadge base), table + pagination (DataTable base), form (RHF pattern), card, input-otp, separator, tooltip` | Port to `Apps/web`, re-idiom for Tailwind 3 (`tailwindcss-animate`) |
| **Unused — drop** | `accordion, aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, collapsible, command, context-menu, drawer, hover-card, menubar, navigation-menu, popover, progress, radio-group, resizable, scroll-area, sidebar, slider, switch, tabs, toggle, toggle-group` | Do not port; re-add via shadcn CLI if a later phase needs one. Drop their Radix/`cmdk`/`react-day-picker`/`embla`/`vaul`/`react-resizable-panels`/`recharts` peers accordingly (recharts/vaul/embla stay "available" per rules §6A — just not installed until used) |
| `ui/sonner.tsx` | keep | Rewire theme via next-themes (`theme` prop) |

### Hooks / lib

| Current | Proposed | Tags | Notes |
|---|---|---|---|
| `hooks/use-mobile.tsx` | `hooks/use-mobile.ts` | — | Fine (UI hook, not server state) |
| `lib/utils.ts` (`cn`) | `lib/utils.ts` | — | Add `formatTime`/`formatDZD` here (currently in mock-data!), locale-aware |
| `lib/mock-data.ts` | **delete** — split into: contract DTOs (already exist), `types/` view unions, `config/translations.json` strings, and stub services returning typed empty defaults | `#legacy-fetch` `#demo-artifact` | The single biggest violation: 200 lines of fake DTOs + plaintext creds + formatters, imported by 7 components |

## 4. Contract binding (page ↔ route ↔ DTO)

| UI area | Contract routes | DTOs / commands |
|---|---|---|
| Landing key flow | `KEY_ROUTES` `VERIFY / SUBMIT / UPDATE / ADDITIONAL / STATUS` | `VerifyKeyCommand → KeyVerificationDTO`, `SubmitActivationCommand`, `UpdateActivationCommand`, `SubmitAdditionalInfoCommand`, `ClientActivationStatusDTO` |
| Login / session | `AUTH_ROUTES` `LOGIN / LOGOUT / ME` (`REFRESH` is interceptor-level) | `LoginCommand → AuthTokensDTO`, `SessionUserDTO` |
| Dashboard | `ACTIVATOR_ROUTES.MY_STATS` | `ActivatorDashboardDTO` |
| Requests | `ACTIVATION_ROUTES` `GET_ACTIVE / GET_PENDING / TAKE / FLAG_WRONG / REQUEST_ADDITIONAL / ACTIVATE / RELEASE / FREEZE` | `ActiveRequestDTO[]`, `PendingActivationDTO[]`, `FlagWrongInfoCommand`, `RequestAdditionalInfoCommand`, `FreezeRequestCommand` |
| History | `ACTIVATION_ROUTES` `GET_MY_HISTORY / GET_RECENT` | `GetActivatorHistoryQuery → PaginatedActivatorHistory`, `RecentActivationDTO[]` |

### Enum mappings (mock → contract)

**Public key flow — `KeyStatus` → `ClientActivationStatus`** (all 9 contract states land on an existing screen; no new UI):

| Contract | MVP equivalent | Screen |
|---|---|---|
| `INVALID` | `NOT_FOUND` / `DISABLED` (invalid case) | "Key not found" MessageCard |
| `READY` | `ACTIVE` | AccountForm (editable) |
| `SUBMITTED`, `PROCESSING`, `UNDER_REVIEW` | `PENDING` | AccountForm read-only + processing banner |
| `NEEDS_CORRECTION` | `INFORMATION_ERROR` | AccountForm error mode (`flaggedFields`) |
| `NEEDS_OTP` | `OTP_REQUIRED` | OtpStep |
| `ACTIVATED` | `COMPLETED` / `USED` | CompletedStep (`accountUsername`) |
| `FAILED` | `DISABLED` (failed case) | "Key deactivated" MessageCard |

**Active request — `RequestSubStatus` → `ActivationStat`:** `IN_PROGRESS→PROCESSING`, `AWAITING_OTP→ADDITIONAL_INFORMATION`, `AWAITING_CORRECTION→WRONG_INFORMATION`, `ADMIN_REVIEW→FREEZE`.

**History badge — `HistoryStatus` (4 values) → `ActivationStat` (10 values), grouped:** success = `ACTIVATED, ACTIVATED_BY_ADMIN`; neutral = `CANCELLED_BY_ACTIVATOR, REMOVED_FROM_ACTIVATOR, CANCELLED_BY_ADMIN`; destructive = `WRONG_INFORMATION`; warning = `FREEZE, ADDITIONAL_INFORMATION, PENDING, PROCESSING`. The status filter dropdown must offer contract states, not the 4 mock groups (server filters by single `ActivationStat`).

**Form fields — MVP ids → `AccountInformation`:** `snap_username→USERNAME`, `snap_email→EMAIL`, `snap_phone→PHONE_NUMBER`, `password→PASSWORD`, OTP step→`OTP` (`BIRTHDAY` exists in contract, absent in MVP — not added; always null for now per plan §8.Q8). `full_name`/`phone` map to top-level `fullName`/`phone` of `SubmitActivationCommand`.

**Dashboard — `MOCK_STATS` → `ActivatorDashboardDTO`:** snake→camel (`total_earnings→totalEarnings`, `earnings_trend→earningsTrendPercent`, `avg_activation_time→avgActivationTimeSeconds`, `active_slots_used→activeSlotsUsed`); `weekly_chart[{day:"Mon"}]` → `weekly[{date}]` (derive localized day label via date-fns). `creditsBalance` exists in DTO, unused by MVP UI — ignored (no invented UI).
