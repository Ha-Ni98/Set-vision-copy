# Stage 03 · Sub-01 · Phase 02 — Refactor Sprint Playbook

Decomposition of [`plan.md`](./plan.md) into 4 incremental sprints per the phase-02 ordering (clean → UI → data). **No code in this phase** — Phase 03 executes these sprints in order, committing on green after each.

**Ground rules carried from the plan:** scaffold-first port into `Apps/web` (the MVP is not refactorable in place); UI components and design are the asset being preserved; services/hooks end as typed empty stubs (Sub-02 wires the real engine); all §8 owner decisions apply.

## Sprint overview

| # | Sprint | Plan § | End state ("runnable" means) |
|---|---|---|---|
| 1 | Purge & Structure | §1 | `Apps/web` builds and serves all 5 routes on the approved stack, strict folder layout, mock data still inline |
| 2 | UI Standardization & i18n | §2 | Same routes, now on shared components + contract types, EN/FR toggle live, zero inline strings |
| 3 | Layouts & Boundaries | §3 | Router-level layouts + guards, lazy pages, skeleton/error states exist (prop-driven) |
| 4 | Data Decoupling | §4, §5 | Component→Hook→Service everywhere, mocks deleted, pages render typed empty states; §5 readiness gate green |

## Transitional artifacts (deliberate, tracked to their kill-sprint)

| Artifact | Lives | Dies | Why it exists |
|---|---|---|---|
| `lib/mock-data.ts` ported as-is | S1 | S4 (deleted) | Keeps pages rendering real content until hooks exist |
| Custom `ThemeContext` (ported) | S1 | S2 (next-themes) | Scaffold runs before provider standardization |
| Custom `AuthContext` mock login + `localStorage` | S1 | S4 (AuthProvider on stubs) | Login/guards must work while data layer doesn't exist |
| In-component `useEffect` route guards | S1 | S3 (`ProtectedRoute`) | Boundaries are Sprint-3 scope |
| `isLoading`/`isError` props defaulted `false` | S3 | S4 (live TanStack Query flags) | States are built before the hooks that drive them |

**Standard validation gate (every sprint, referenced below as "gate"):** `npm run check` (`tsc --noEmit`) clean · `npm run build` succeeds · `npm run dev` walk of `/`, `/login`, `/dashboard`, `/requests`, `/history` in light+dark — renders, no console errors, no layout crash · committed on green.

---

### Sprint 1: Purge & Structure — Status: ⬜ Pending

**Goals**
- `Apps/web` exists on the approved stack with the plan §1.3 folder layout; every MVP file is ported, relocated, or deliberately left behind (plan §1.2); zero unapproved libraries ever installed.
- App runs end-to-end on React Router with mock data untouched.

**Tasks**
- [ ] Scaffold `Apps/web`: Vite **5.4.19** SPA + React **18.3.1** + TS strict; `index.html` + `src/main.tsx` + `src/App.tsx`; `@` alias; scripts `dev/build/preview/lint/format/check(tsc --noEmit)`; eslint/prettier carried; `components.json` paths updated. (#unapproved-lib)
- [ ] Final `package.json` in one pass per plan §1.1 — name `@my-app/web`; add `react-router-dom`, `axios`, `next-themes`, `@tanstack/react-table`, `tailwindcss-animate`, `"@my-app/contract": "file:../contract"`, `@tanstack/react-query-devtools` (dev); **zod ^4**; keeps per plan; nothing from the uninstall lists. Later sprints add no packages.
- [ ] Tailwind **3.4.17**: `tailwind.config.ts` + `src/index.css`. Port oklch tokens **as channel triplets** exposed as `oklch(var(--x) / <alpha-value>)` so the MVP's opacity utilities (`bg-primary/15`, `bg-success/15`, `bg-warning/20`…) keep working; port radius scale, `--shadow-card`/`--shadow-glow`, gradients, `animate-shake`/`pulse-soft`/`pop-in`/`fade-out` keyframes; `darkMode: 'class'`; semantic names per rules §6B. (#layout)
- [ ] Port the **19 kept** `ui/` primitives (map §3) + `lib/utils.ts`; re-idiom `tw-animate-css` → `tailwindcss-animate`; the 25 unused primitives are left behind. (#ui-primitive)
- [ ] Move all app files to the strict layout per map §3 current→proposed columns: `routes/*` → `pages/` (+ `pages/activator/`), `components/setvision|activator/*` → `layout/` · `shared/` · `sections/landing|activator/`, `contexts/*` → `components/providers/` (**ported as-is**, rewrite later), `hooks/use-mobile`, `assets/`. All import paths updated. (#page #layout #shared-component)
- [ ] Swap TanStack Router → **react-router-dom** in `App.tsx`: plain (non-lazy) routes for all 5 pages; migrate `Link`/`useNavigate`/`useLocation` call sites (`NavLink` for sidebar active styling); temporary in-component guards stay. `router.tsx`, `routeTree.gen.ts`, `wrangler.jsonc`, `.wrangler/`, `bunfig.toml`, `bun.lockb`, Lovable `vite.config.ts` do not cross over. (#unapproved-lib)
- [ ] Port `lib/mock-data.ts` **unchanged** (transitional — see table above). (#legacy-fetch)
- [ ] Static `index.html` `<title>`/meta from `__root.tsx` `head()` (SPA equivalent; reactive titles arrive with i18n in S2).

**Validation**
- [ ] Gate passes; mock login (`ahmed/ahmed123`) still reaches the portal; visual diff of all 5 pages vs MVP (especially `/15`-style opacity surfaces and dark mode).
- [ ] `package.json` contains no TanStack Router/Start, Lovable, Cloudflare, or Tailwind-4 packages; `npm ls zod` shows a single ^4 major (contract + web).
- [ ] Folder tree matches plan §1.3 exactly (no `contexts/`, no `routes/`).

**Risks**
- Tailwind 4→3 regressions: opacity modifiers are the big one (mitigated by channel-triplet tokens); minor ring/border default deltas — catch via visual diff.
- Router API drift (active-link logic, navigate-after-login timing) may briefly break nav highlighting.
- SSR head() features (og: tags per route) flatten into static `index.html` — acceptable for the SPA target.

---

### Sprint 2: UI Standardization & i18n — Status: ⬜ Pending

**Goals**
- One implementation per pattern: shared DataTable/StatusBadge/EmptyState/StatCard/PageHeader; forms on RHF + Zod 4; UI typed by contract enums/DTOs.
- Zero inline user-facing strings; EN/FR toggle works everywhere it's rendered.

**Tasks**
- [ ] i18n foundation: `config/translations.json` (full EN + FR trees, key scheme per plan §2.2), `lib/i18n.ts` `translate(key, lang, vars)`, `LanguageProvider` + reactive `useTranslation` (interpolation), persisted language; shared `LanguageToggle` replaces the three dead "EN ▾" buttons. (#inline-string)
- [ ] Full string sweep of all pages/sections/layout/shared files — JSX text, toasts, aria-labels, dialog copy, empty states, placeholders, `document.title` per route; enum label maps once under `enums.*`. Demo copy (demo-keys paragraph, demo credentials line) is **removed, not keyed**. (#inline-string #demo-artifact)
- [ ] `ThemeProvider` → next-themes wrapper (class strategy, persisted, no FOUC); rewire `ThemeToggle` + `ui/sonner` theme; delete custom ThemeContext. (#state)
- [ ] Retype the transitional mock data to **contract shapes** (map §4 mapping tables: camelCase DTO fields, `ActivationStat`, `ClientActivationStatus`, `AccountInformation`) so shared components bind to contract types once — Sprint 4 then swaps only the data source. (#state)
- [ ] Build `shared/`: `StatusBadge` (ActivationStat group map — the two local badges die), `DataTable` (TanStack Table on `ui/table`: client-side sorting §8.Q3, pagination, empty slot, `renderMobileRow` mobile card pattern), `EmptyState` (absorbs `EmptyBox` + inline empties, 📭 pulse kept), `StatCard` (dashboard + StatsRow variants), `PageHeader`, relocated `CopyButton`/`LiveTimer` (named threshold constants)/`Logo`. Swap the 3 hand-rolled tables + hand-rolled pagination to DataTable. (#shared-component)
- [ ] Re-column recent-team table to `RecentActivationDTO` fields — `subscriptionLabel / keyMasked / completedAt / state` (§8.Q2); history status filter options become `ActivationStat` values (translated).
- [ ] Rebuild `OtpStep` on `ui/input-otp` (paste + a11y parity). (#shared-component)
- [ ] Forms → `ui/form` + RHF + Zod 4 (`mode: 'onBlur'`): login on contract `LoginSchema`; `account-form.schema.ts` co-located (fields ↔ `AccountInformation`, password-confirm `.refine`, **no BIRTHDAY** §8.Q8); ActiveRequestCard "done"/"freeze" dialog forms.
- [ ] StatsRow values move to `translations.json` static marketing copy; counter animation kept (§8.Q1).
- [ ] Move login's raw inline `oklch()` gradients into tokens (finishes §2.1 styling note).

**Validation**
- [ ] Gate passes; language toggle live-flips every page incl. enum badges/filters; theme toggle persists with no FOUC.
- [ ] No new inline strings — review-grep for quoted JSX text across `src/pages`, `src/components` (allowlist: `translations.json`, schemas, test ids).
- [ ] Forms validate via RHF (`formState.errors` rendering) with Zod-4 contract schemas compiling.
- [ ] One `StatusBadge`, one table implementation, one stat-card in the tree (old locals deleted).

**Risks**
- Highest-churn sprint (~20 files touched for strings) — port page-by-page, gate per page.
- FR copy is authored best-effort during the sweep — flag machine-feeling strings for owner review.
- RHF `onBlur` changes validation timing vs the old manual checks; input-otp paste behavior needs manual verification.
- DataTable must not change sort semantics beyond the agreed per-page client-side sort (§8.Q3).

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
