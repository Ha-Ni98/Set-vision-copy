# Stage 03 · Sub-01 · Phase 02 — Refactor Sprint Playbook

Decomposition of [`plan.md`](./plan.md) into 4 incremental sprints per the phase-02 ordering (clean → UI → data). **No code in this phase** — Phase 03 executes these sprints in order, committing on green after each.

**Ground rules carried from the plan:** scaffold-first port into `Apps/web` (the MVP is not refactorable in place); UI components and design are the asset being preserved; services/hooks end as typed empty stubs (Sub-02 wires the real engine); all §8 owner decisions apply.

## Sprint overview

| # | Sprint | Plan § | End state ("runnable" means) | Status |
|---|---|---|---|---|
| 1 | Purge & Structure | §1 | `Apps/web` builds and serves all 5 routes on the approved stack, strict folder layout, mock data still inline | ✅ Done |
| 2 | UI Standardization & i18n | §2 | Same routes, now on shared components + contract types, EN/FR toggle live, zero inline strings | ⬜ Pending |
| 3 | Layouts & Boundaries | §3 | Router-level layouts + guards, lazy pages, skeleton/error states exist (prop-driven) | ⬜ Pending |
| 4 | Data Decoupling | §4, §5 | Component→Hook→Service everywhere, mocks deleted, pages render typed empty states; §5 readiness gate green | ⬜ Pending |

## Transitional artifacts (deliberate, tracked to their kill-sprint)

| Artifact | Lives | Dies | Why it exists |
|---|---|---|---|
| `lib/mock-data.ts` ported as-is | S1 | S4 (deleted) | Keeps pages rendering real content until hooks exist |
| Custom `ThemeContext` (ported) | S1 | S2 (next-themes) | Scaffold runs before provider standardization |
| Custom `AuthContext` mock login + `localStorage` | S1 | S4 (AuthProvider on stubs) | Login/guards must work while data layer doesn't exist |
| In-component `useEffect` route guards | S1 | S3 (`ProtectedRoute`) | Boundaries are Sprint-3 scope |
| `isLoading`/`isError` props defaulted `false` | S3 | S4 (live TanStack Query flags) | States are built before the hooks that drive them |
| `pages/NotFoundPage.tsx` + `pages/ErrorPage.tsx` (verbatim ports of `__root.tsx`/`router.tsx`'s fallbacks) | S1 | S3 (shared `NotFoundState` inside the active layout) | The app needs *some* 404/error rendering before Sprint 3 builds the layout-preserving version |

**Standard validation gate (every sprint, referenced below as "gate"):** `npm run check` (`tsc --noEmit`) clean · `npm run build` succeeds · `npm run dev` walk of `/`, `/login`, `/dashboard`, `/requests`, `/history` in light+dark — renders, no console errors, no layout crash · committed on green.

---

### Sprint 1: Purge & Structure — Status: ✅ Done (2026-07-02)

**Goals**
- `Apps/web` exists on the approved stack with the plan §1.3 folder layout; every MVP file is ported, relocated, or deliberately left behind (plan §1.2); zero unapproved libraries ever installed.
- App runs end-to-end on React Router with mock data untouched.

**Tasks**
- [x] Scaffold `Apps/web`: Vite **5.4.19** SPA + React **18.3.1** + TS strict; `index.html` + `src/main.tsx` + `src/App.tsx`; `@` alias; scripts `dev/build/preview/lint/format/check(tsc --noEmit)`; eslint/prettier carried; `components.json` paths updated. (#unapproved-lib)
- [x] Final `package.json` in one pass per plan §1.1 — name `@my-app/web`; add `react-router-dom`, `axios`, `next-themes`, `@tanstack/react-table`, `tailwindcss-animate`, `"@my-app/contract": "file:../contract"`, `@tanstack/react-query-devtools` (dev); **zod ^4**; keeps per plan; nothing from the uninstall lists. Later sprints add no packages. Also added `postcss`/`autoprefixer` (dev) — mechanical requirement for Tailwind 3's build pipeline, not called out in the plan's library table but not an application library either.
- [x] Tailwind **3.4.17**: `tailwind.config.ts` + `src/index.css`. Port oklch tokens **as channel triplets** exposed as `oklch(var(--x) / <alpha-value>)` so the MVP's opacity utilities (`bg-primary/15`, `bg-success/15`, `bg-warning/20`…) keep working; port radius scale, `--shadow-card`/`--shadow-glow`, gradients, `animate-shake`/`pulse-soft`/`pop-in`/`fade-out` keyframes; `darkMode: 'class'`; semantic names per rules §6B. (#layout)
- [x] Port the **20 kept** `ui/` primitives (map §3 — corrected from this file's earlier "19", a scrivener miscount when tallying the map's list) + `lib/utils.ts`; re-idiom `tw-animate-css` → `tailwindcss-animate`; the 25 unused primitives are left behind. (#ui-primitive)
- [x] Move all app files to the strict layout per map §3 current→proposed columns: `routes/*` → `pages/` (+ `pages/activator/`), `components/setvision|activator/*` → `layout/` · `shared/` · `sections/landing|activator/`, `contexts/*` → `components/providers/` (**ported as-is**, rewrite later), `hooks/use-mobile`, `assets/`. All import paths updated. (#page #layout #shared-component)
- [x] Swap TanStack Router → **react-router-dom** in `App.tsx`: plain (non-lazy) routes for all 5 pages; migrate `Link`/`useNavigate`/`useLocation` call sites; temporary in-component guards stay. `router.tsx`, `routeTree.gen.ts`, `wrangler.jsonc`, `.wrangler/`, `bunfig.toml`, `bun.lockb`, Lovable `vite.config.ts` do not cross over. (#unapproved-lib)
- [x] Port `lib/mock-data.ts` **unchanged** (transitional — see table above). (#legacy-fetch)
- [x] Static `index.html` `<title>`/meta from `__root.tsx` `head()` (SPA equivalent; reactive titles arrive with i18n in S2).

**Implementation notes (decisions made while executing, not in the original task list)**
- Used `createBrowserRouter`/`RouterProvider` (react-router-dom's data-router API) instead of plain `<BrowserRouter><Routes>`, so every route gets a real `errorElement` — the closest honest equivalent of the MVP's router-level `defaultErrorComponent`, and it gives Sprint 3 nested layout routes (`<Outlet/>`) for free instead of a second router-API migration.
- `routes/_activator.tsx` (guard) and `components/activator/ActivatorShell.tsx` (chrome) were **merged into one file** at `components/layout/ActivatorShell.tsx`: the guard's `useEffect` redirect-if-unauthenticated + null-return-while-redirecting is unchanged, just relocated to wrap `children` instead of `<Outlet/>`. Sidebar active-state kept the original's `useLocation().pathname === item.to` check on plain `Link` rather than switching to `NavLink` — the task list mentioned `NavLink` as an option, but changing the mechanism wasn't necessary to port the existing behavior faithfully, so it was left as-is pending Sprint 3's real layout-route split.
- `NotFoundPage.tsx` and `ErrorPage.tsx` (`src/pages/`) are two small **transitional files not listed in the original transitional-artifacts table** — ported verbatim from `__root.tsx`'s `NotFoundComponent` and `router.tsx`'s `DefaultErrorComponent` so the app has *something* for 404s/render errors before Sprint 3 builds the real layout-preserving `NotFoundState`. Added to the transitional table below; dies at S3.
- Demo artifacts (demo-keys paragraph, demo credentials line, "Toggle Empty State" button, fake notifications) were **kept untouched** — stripping them is explicitly Sprint 2 scope (i18n string sweep), not Sprint 1 (structural move only).

**Validation**
- [x] `tsc --noEmit` clean (zero errors). `npm run build` succeeds (1846 modules, valid `dist/`).
- [x] `package.json` contains no TanStack Router/Start, Lovable, Cloudflare, or Tailwind-4 packages (grep confirmed empty); `zod` is `^4.0.0` in both `Apps/web` and `Apps/contract` — single major.
- [x] Folder tree matches plan §1.3 exactly (`assets/ components/ config/ hooks/ lib/ pages/ services/ types/` — no `contexts/`, no `routes/`).
- [x] Dev server boots clean (`VITE ready`, no errors in log after sustained idle) and serves the correct HTML shell (title/meta match). Compiled production CSS was inspected directly to verify the exact risk called out below: `.bg-primary\/15{background-color:oklch(var(--primary) / .15)}` and `.bg-warning\/20{...oklch(var(--warning) / .2)}` — the channel-triplet approach compiles correctly, opacity modifiers are **not** broken. `:root` triplets, the `.dark{}` override block, and all 4 custom keyframes (`shake`/`pop-in`/`pulse-soft`/`fade-out-up`) are present in the bundle.
- [ ] **Not verified: interactive browser walk** (mock login → `/dashboard`, dark-mode toggle, visual diff, console errors). This sandbox's network egress reaches the npm registry but not the Playwright/Chromium CDN host (`cdn.playwright.dev` → `EAI_AGAIN`, repeated), and no `chromium-cli` or browser binary is preinstalled — so no headless browser could be launched. Static evidence above (tsc/build/CSS-inspection) stands in for it. **This gap should be closed with a real browser pass before Sub-02 integration**, ideally via a project `run` skill recorded for this repo once a working browser path exists in the target environment.

**Risks**
- Tailwind 4→3 regressions: opacity modifiers are the big one — **mitigated and statically confirmed** (see Validation); minor ring/border default deltas remain unverified visually (see the browser-walk gap above).
- Router API drift (active-link logic, navigate-after-login timing): mitigated by keeping the original's exact `useLocation`-based active check; navigate-after-login (`nav("/dashboard")`) is a direct string-form port of the original's `nav({ to: "/dashboard" })`.
- SSR head() features (og: tags per route) flatten into static `index.html` — acceptable for the SPA target, confirmed served correctly.

---

### Sprint 2: UI Standardization & i18n — Status: ✅ Done (2026-07-02)

**Goals**
- One implementation per pattern: shared DataTable/StatusBadge/EmptyState/StatCard/PageHeader; forms on RHF + Zod 4; UI typed by contract enums/DTOs.
- Zero inline user-facing strings; EN/FR toggle works everywhere it's rendered.

**Tasks**
- [x] i18n foundation: `config/translations.json` — **flat map**, dot-notation key → `{ en, fr, ar }` object (not a nested tree; key scheme per plan §2.2, e.g. `"common.actions.save": { "en": "Save", "fr": "Enregistrer", "ar": "" }`). Populate `en`/`fr` with real copy for every key; **`ar` stays `""` on every entry — reserved in the schema, not authored or exposed this stage** (per 2026-07-02 decision: toggle stays EN/FR, RTL fully deferred). `lib/i18n.ts` `translate(key, lang, vars) = interpolate(values[key][lang], vars)`; `LanguageProvider` + reactive `useTranslation` (interpolation), persisted language (EN/FR only); shared `LanguageToggle` (2-way) replaces the three dead "EN ▾" buttons. 191 keys, EN+FR fully authored. (#inline-string)
- [x] Full string sweep of all pages/sections/layout/shared files — JSX text, toasts, aria-labels, dialog copy, empty states, placeholders; enum label maps once under `enums.*` (`enums.activationStat.*` ×10, `enums.accountInformation.*` ×6). Demo copy (demo-keys paragraph, demo credentials line) **removed, not keyed**; the "Toggle Empty State" debug button (requests) was removed too — it wasn't explicitly named in this bullet but plan §1.2 always flagged it and no other sprint claims it (doc inconsistency noted below). The fake notifications dropdown's *content* was translated but **not** structurally emptied — that's explicitly Sprint 3's task per this file. `document.title` is reactive via `t("common.brand.pageTitle")` in `App.tsx` — the MVP only ever set one site-wide title at the root route (confirmed by grep: no per-child-route `head()` calls existed), so this keeps that same single-title behavior, now language-reactive, rather than inventing distinct per-route titles the source never had. (#inline-string #demo-artifact)
- [x] `ThemeProvider` → next-themes wrapper (class strategy, persisted `sv_theme`, `enableSystem={false}` to match the ported app's light-default behavior exactly); rewire `ThemeToggle` + `ui/sonner` theme; delete custom ThemeContext. A small inline script in `index.html` sets the `dark` class before React mounts — next-themes alone can't prevent a flash on a pure client SPA with no server render. (#state)
- [x] Retyped the transitional mock data to **contract shapes**: `MOCK_STATS`→`MOCK_DASHBOARD` (`ActivatorDashboardDTO`), `MOCK_ACTIVE_REQUESTS`/`MOCK_PENDING_POOL`/`MOCK_PERSONAL_HISTORY`/`MOCK_GLOBAL_RECENT` retyped to their DTOs, `MockKey`→`MockKeyRecord extends KeyVerificationDTO`. All enum fields now use `ActivationStat`/`ClientActivationStatus`/`AccountInformation` from `@my-app/contract`. (#state)
- [x] Built `shared/`: `StatusBadge`, `DataTable` (on `@tanstack/react-table` — `useReactTable`/`getCoreRowModel`/`flexRender`, no interactive sort UI since sorting is applied to `data` before it arrives, per §8.Q3), `EmptyState` (`decoration` slot preserves the 📭 pulse-dots case), `StatCard` (`variant: "default" | "centered"` covers both the dashboard and StatsRow treatments), `PageHeader`, `LanguageToggle`; relocated `CopyButton`/`LiveTimer` gained named threshold constants and (CopyButton) its own missed strings. All 3 hand-rolled tables + hand-rolled pagination row now render through `DataTable`. (#shared-component)
- [x] Recent-team table re-columned to `RecentActivationDTO` — `subscriptionLabel / keyMasked / completedAt / state`; activator-name and email columns are gone (§8.Q2 — DTO wins). History status filter now lists all 10 `ActivationStat` values (translated via the same `enums.activationStat.*` keys `StatusBadge` uses).
- [x] `OtpStep` rebuilt on `ui/input-otp` (`InputOTP`/`InputOTPGroup`/`InputOTPSlot`, `maxLength=6`) — gets paste support and Radix a11y for free; the manual per-digit `useRef` focus-management code is gone. (#shared-component)
- [x] Forms on `ui/form`-adjacent RHF + Zod 4, `mode: "onBlur"`: **Login** on contract `LoginSchema` directly (zero custom messages needed — its fields are unconstrained `z.string()`, so no Zod-level failure mode reaches the UI; the business-logic "wrong credentials" error stays a local translated string, as before). **AccountForm** on co-located `account-form.schema.ts` (every field ↔ `AccountInformation`, password-confirm `.refine`, **no BIRTHDAY** field §8.Q8) — every validator message is `t()`-driven via a schema **factory** `createAccountFormSchema(t)` (memoized on `t`) so RHF errors stay reactive to the language toggle. **ActiveRequestCard** "wrong info" dialog reuses contract `FlagWrongInfoSchema` directly (checkbox-array `fields`, RHF `watch`/`setValue`, no `Controller` needed); "freeze"/admin dialog reuses contract `FreezeRequestSchema` directly; "done" dialog gets a small local email schema (no contract command exists yet, §8.Q4).
- [x] StatsRow values are static translated marketing copy (`public.landing.stats.*`); counter animation kept (§8.Q1).
- [x] Login's raw inline `oklch()` gradients moved into a `--login-glow` CSS var (light + dark variants in `index.css`); the component now references it via one `[background:var(--login-glow)]` class instead of a `dark:[background:...]` duplicate.

**Deviations & implementation notes**
- **Contract-schema error messages.** Zod schemas *imported verbatim from the contract* (`FreezeRequestSchema`, `FlagWrongInfoSchema`) carry no custom messages (correctly — the contract package has no i18n awareness, and shouldn't). Where their validators can actually fail visibly (`FreezeRequestSchema.reason.min(1)`), the component checks *presence* of `errors.reason` and renders its own translated text rather than Zod's English default `.message`. Schemas *authored by the frontend* (`account-form.schema.ts`, the local "done"-dialog schema) get every validator message translated via `t()` directly. This pattern should carry forward to Sub-02/03 wherever a contract schema is reused as-is for a form.
- **`submittedFields` label-matching.** `KeyVerificationDTO.submittedFields` is `{ fieldLabel: string; value: string }[]` — free-text labels, no `AccountInformation` discriminator (unlike `flaggedFields`/`requestedFields`, which do carry `field: AccountInformation`). `AccountForm`'s pending-mode pre-fill has to match on `fieldLabel` text, so it uses a small **stable-English** lookup table (`MOCK_FIELD_LABELS`) decoupled from the (language-reactive) display labels — matching against a `t()` output would silently break under a language other than the one the mock data happens to be written in. **Suggested upstream fix for a later contract revision:** add a `field: AccountInformation` discriminator to the `submittedFields` schema, mirroring `flaggedFields`/`requestedFields`, so the frontend never has to match on display text.
- **`document.title` per route** — sprints.md's own bullet listed this, but no page currently sets it (the MVP's TanStack `head()` per-route titles were flattened to one static `index.html` title in Sprint 1, and nothing in Sprint 2 revisited it). Carried forward as a small open item rather than silently dropped; cheap to add in Sprint 3 alongside the route/layout work.
- **Doc correction:** plan.md §1.2 (Phase 01) always listed the "Toggle Empty State" button and the fake-notifications entries as demo artifacts to strip; this file's own Sprint 1 and Sprint 2 bullets under-specified that (Sprint 1 explicitly deferred all demo-artifact stripping to Sprint 2; Sprint 2's bullet only named two of the four). Resolved this sprint by stripping the debug button (no sprint claimed it) while leaving the notifications dropdown's *structure* intact through Sprint 3, which explicitly owns "empty the shell" — see that sprint's task list. Both docs are now consistent going forward.
- **`ui/pagination.tsx` and shadcn `sr-only` labels are out of scope.** `DataTable` doesn't use the shadcn `Pagination` primitive (pages already had working manual pagination state/controls before this sprint; re-platforming that onto `getPaginationRowModel()` wasn't requested and would have been scope creep) — `ui/pagination.tsx` is now dead code, kept rather than deleted since it's a standard shadcn primitive a future page may still want. Radix-pattern `sr-only` text baked into `ui/dialog.tsx`/`ui/sheet.tsx` ("Close") was treated as vendored primitive code, consistent with the codebase map never flagging `components/ui/*` for `#inline-string`.
- **Language-switcher endonyms.** `LanguageToggle`'s two options render as "English" / "Français" regardless of the active UI language — this is the standard i18n convention (a language names itself in its own language in a switcher), not a missed string.

**Validation**
- [x] `tsc --noEmit` clean (zero errors). `npm run build` succeeds (2413 modules; one expected "chunk >500kB" warning — code-splitting is Sprint 3 scope, not addressed here).
- [x] Zero missing translation keys: a script cross-referencing every literal and enum-templated `t(...)` call against `translations.json` found 0 missing, 0 real orphans (191 keys defined). Zero remaining literal-string `toast.success/error/info(...)` calls anywhere in `src`.
- [x] Grep sweep for stale identifiers (`MOCK_STATS`, `RequestSubStatus`, `HistoryStatus`, `PersonalHistoryRow`, `ActiveRequest`/`PendingRequest` local types, `KeyStatus`, `ClientData`, `@/contexts/*`) — zero hits, all fully migrated.
- [x] Forms validate via RHF `formState.errors` against Zod-4 schemas (both contract-imported and frontend-authored) — confirmed compiling; behavior not yet manually walked in a browser (see below).
- [x] One `StatusBadge`, one `DataTable`, one `StatCard` in the tree — old locals (history's badge, the card's badge, the dashboard's local `StatCard`, 3 hand-rolled `<table>`s) all deleted.
- [ ] **Not verified: interactive browser walk** (language toggle live-flip across pages, theme toggle no-FOUC, RHF error rendering, input-otp paste). Unlike Sprint 1, the Chromium binary download actually succeeded this time (cached at `~/.cache/ms-playwright/`) — but per 2026-07-02 feedback, downloading/driving a browser is left for the user to run rather than done inline mid-sprint. To finish this check: `cd Apps/web && npm install --no-save playwright@1.61.1` (small — browsers are already cached, no re-download), then drive it against `npm run dev` (e.g. via a short Playwright script or the `run` skill / `chromium-cli` if available). Static evidence above (tsc, build, translation cross-check, compiled-bundle string checks) stands in for now.

**Risks**
- Highest-churn sprint (~20 files touched for strings) — ported page-by-page, gated by tsc after each file group, consistent with the plan.
- FR copy was authored directly by the author (not machine-translated) to a professional standard, but has not been reviewed by a native/business French speaker — flag for owner review before this reaches real users.
- RHF `onBlur` timing and input-otp paste behavior compile correctly but are unverified in a real browser (see Validation).
- `DataTable`'s sort semantics are unchanged from before this sprint (client-side, page-level `.sort()` before render) — confirmed by reading the History page's own logic, not by a runtime check.

---

### Sprint 3: Layouts & Boundaries — Status: ⬜ Pending

**Goals**
- Routing concerns live in the router: `PublicLayout`/`ActivatorLayout` as layout routes, guard as `ProtectedRoute`, pages lazy-loaded.
- Every data section has a Skeleton and a local error/empty rendering path; the shell never disappears.

**Tasks**
- [ ] `PublicLayout` (PublicHeader + PublicFooter + `Outlet`) wraps `/`; login stays a standalone centered page (plan §3.1). (#layout)
- [ ] Split ported ActivatorShell → `ActivatorLayout` + `ActivatorHeader` + `ActivatorSidebar` (mobile Sheet kept); nav data → `config/nav-links.ts`; notifications bell reduced to empty dropdown shell, no badge, no action (§8.Q6). (#layout)
- [ ] `ProtectedRoute` (session check → `<Navigate to="/login">`; authenticated users hitting `/login` → `/dashboard`) replaces **both** `useEffect` redirects — MVP behavior kept exactly (no return-to-target invention). (#state)
- [ ] `React.lazy()` all 5 pages + `<Suspense fallback={<PageLoader/>}>` (code-splitting only, rules §5).
- [ ] Shared `NotFoundState`; catch-all `*` route renders it **inside** the active layout (kills the MVP's full-page root 404); also used as the section-level `isError` visual (rules §4).
- [ ] Skeleton set per plan §3.2 (stat-card, chart, request-card, table-row shapes) wired into sections behind `isLoading`/`isError` props (defaulted `false` until Sprint 4). (#shared-component)
- [ ] Router `errorElement` wraps page content only — header/sidebar/footer survive render errors.

**Validation**
- [ ] Gate passes; hard-refresh on `/dashboard` unauthenticated → clean redirect (no null flash); authenticated `/login` visit → `/dashboard`.
- [ ] Unknown URL keeps the surrounding layout and shows `NotFoundState`; build output shows per-page chunks.
- [ ] Dev-only prop flip renders every skeleton and error state correctly inside the intact layout (flip reverted before commit).

**Risks**
- Guard ↔ login redirect loop if session predicate is inconsistent between the two — test both directions.
- Suspense fallback flash on fast loads (acceptable; PageLoader is minimal).
- Splitting ActivatorShell can regress the mobile Sheet nav — verify at <768px.

---

### Sprint 4: Data Decoupling — Status: ⬜ Pending

**Goals**
- Strict Component→Hook→Service: no component imports mocks or calls a service; all server-state via TanStack Query hooks typed by `@my-app/contract`; `mock-data.ts` deleted.
- Plan §5 readiness checklist fully green — Sub-01 exit gate.

**Tasks**
- [ ] Infra (rules §3): `lib/axios.ts` (single instance, `VITE_API_URL` via `.env.example`, cookie config, 401 interceptor with loop-prevention + `setRedirect` bridge registered at app start), `lib/api-path.ts` (verbatim rules §3B), `lib/query-client.ts` (QueryCache/MutationCache global toasts via non-reactive `translate()`, 401 excluded); `QueryClientProvider` + devtools (dev) in `main.tsx`. (#legacy-fetch)
- [ ] Services ×4 — `auth` · `keys` · `activations` · `activator` — signatures typed by contract routes/DTOs, **bodies = typed empty stubs** per plan §4 table (`[]`, zeroed DTOs, empty paginated meta, no-op mutations incl. `activate` §8.Q4), each marked `TODO(Sub-02)`.
- [ ] Hooks per plan §4: query hooks (`useMyStats`, `useActiveRequests`, `usePendingActivations`, `useMyHistory(query)`, `useRecentActivations`, `useActivationStatus`) and mutation hooks (`useVerifyKey`, `useSubmitActivation`, `useUpdateActivation`, `useSubmitAdditionalInfo`, `useTakeActivation`, `useFlagWrongInfo`, `useRequestAdditionalInfo`, `useActivateRequest`, `useReleaseActivation`, `useFreezeActivation`) with hierarchical keys + the plan's invalidation map; success toasts move from components into mutation hooks. (#legacy-fetch)
- [ ] `AuthProvider` rewrite on `auth.service` stubs: login mutation success → **in-memory zeroed `SessionUserDTO` session** (portal stays navigable — honest stub, standardizes the MVP's fake client login); `me` query stubbed `null`; logout clears the query cache; `localStorage("sv_auth")` and `MOCK_USERS` checks deleted. (#state #demo-artifact)
- [ ] Pages/sections consume hooks (`data ?? []`); S3's state props go live from `isLoading`/`isError`; landing step machine retyped to a `ClientActivationStatus`-based view union in `types/`; history filters build the `GetActivatorHistoryQuery` object (`page/limit/status/search`), sorting stays client-side in DataTable (§8.Q3); `ActiveRequestCard` state machine replaced by mutation calls + `isPending`. (#state)
- [ ] `config/constants.ts` → `ACTIVE_SLOTS_CAP = 3` shared by dashboard + requests (§8.Q5); sidebar badge derives from `useActiveRequests` data length, hidden at 0.
- [ ] Delete `lib/mock-data.ts`; relocate `formatTime`/`formatDZD` to `lib/utils.ts` (locale-aware via active language); strip the last demo artifacts ("Toggle Empty State" button, fake notification entries). (#demo-artifact)
- [ ] Exit gate: walk plan §5 checklist item-by-item and record pass/fail inline in this file.

**Validation**
- [ ] Gate passes; every page renders its **empty/skeleton states** with layout intact (empty-by-design until Sub-02 — this is the expected end state, not a defect); stub login navigates the whole portal; console free of query errors.
- [ ] Grep sweeps: `mock-data|MOCK_` → 0 hits; no `useEffect` fetching; `services/` imported **only** from `hooks/` (components never import services); no `axios` import outside `lib/`.
- [ ] No new inline strings (S2 rule holds for all new hook/toast copy).
- [ ] Plan §5 readiness checklist 9/9 green — Sub-01 complete.

**Risks**
- Pages intentionally show empty data — communicate to reviewers so it isn't mistaken for breakage.
- In-memory session drops on refresh (expected until Sub-02 wires `me`); the `me`-query invalidation wiring is written but inert against stubs — first verified for real in Sub-02.
- Deleting mock-data may reveal stragglers (types imported from it) — the S2 retype minimizes this; grep sweep is the net.
