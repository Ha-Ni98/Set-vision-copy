---
sprint: 4
title: Data Decoupling
status: ✅ Done
commit: d377081
---

# Sprint 4 Report — Data Decoupling

Final sprint of Sub-01 (Refactor). Plan §5 readiness checklist is 9/9 green — see `plan.md` §5 and this report's Validation section for the full walk.

## Work done

### L0 — Types & config (new)
| File | Notes |
|---|---|
| `types/key-flow.ts` | `KeyLookupResult` (`KeyVerificationDTO` + the raw `key` string, moved out of `lib/mock-data.ts`) and `KeyFlowView` (the landing page's step-machine union, renamed `STEP1/STEP2/...` → `IDLE/FORM/OTP/COMPLETED/MESSAGE` now that it's a formalized view model, not tied to the old file's naming). |
| `config/constants.ts` | `ACTIVE_SLOTS_CAP = 3` (§8.Q5) — imported by `DashboardPage` and `RequestsPage`, replacing two separate hardcoded `/3`s. |

### L1 — Global infra (rules §3, new)
| File | Notes |
|---|---|
| `lib/axios.ts` | Single instance, `baseURL: import.meta.env.VITE_API_URL`, `withCredentials: true` (cookie auth — no token ever read/attached from JS). 401 response interceptor with loop prevention (skips auth endpoints via `AUTH_ROUTES.BASE` substring match, skips if already on `/login`); `setRedirect(fn)` bridge, called once from `App.tsx` via the data router's own `router.navigate()` — no separate component/hook needed for this. Does no UI/toasts/domain transforms. |
| `lib/api-path.ts` | `apiPath`/`withParams`, verbatim from rules §3B. |
| `lib/query-client.ts` | `QueryCache`/`MutationCache` global `onError` → `sonner` toast; fallback message reuses the existing `common.errors.crashTitle` key via the non-reactive `translate()` (reading `localStorage("sv_lang")` directly, matching the same pattern `LanguageProvider` itself uses) rather than adding a near-duplicate key. 401s excluded — handled only by the axios interceptor. |
| `.env.example` | `VITE_API_URL=http://localhost:3000/api/v1` — matches `Apps/api/.env.example`'s actual `PORT`/`API_PREFIX`, not a guess. |
| `main.tsx` | `QueryClientProvider` wraps the whole tree; `ReactQueryDevtools` mounted dev-only. |

### L2 — Services (new, 4 files, all typed empty stubs)
| File | Exports |
|---|---|
| `services/auth.service.ts` | `login`, `logout`, `me` (stub `null`). |
| `services/keys.service.ts` | `verifyKey` (stub `{status: INVALID}`), `submitActivation`, `updateActivation`, `submitAdditionalInfo`, `getActivationStatus`. |
| `services/activator.service.ts` | `getMyStats` (stub zeroed `ActivatorDashboardDTO`, `weekly: []`). |
| `services/activations.service.ts` | `getActive`/`getPending`/`getRecent` (stub `[]`), `getMyHistory` (stub empty `PaginatedActivatorHistory`), `take`/`flagWrongInfo`/`requestAdditionalInfo`/`release`/`freeze` (stub `void`), `activate` (permanent no-op — §8.Q4, no contract command exists). |

Every function carries a `// TODO(Sub-02): api.<verb>(...)` comment naming its exact real call (route constant + `withParams`/`apiPath` composition) so Sub-02 is a body-swap, not a redesign.

### L3 — Hooks (new, 16 files)
| Query hooks | Mutation hooks |
|---|---|
| `useMyStats`, `useActiveRequests`, `usePendingActivations`, `useMyHistory(query)`, `useRecentActivations`, `useActivationStatus(id, enabled)` | `useVerifyKey`, `useSubmitActivation`, `useUpdateActivation`, `useSubmitAdditionalInfo`, `useTakeActivation`, `useFlagWrongInfo`, `useRequestAdditionalInfo`, `useActivateRequest`, `useReleaseActivation`, `useFreezeActivation` |

Query keys: `["activator","my-stats"]` · `["activations","active"]` · `["activations","pending"]` · `["activations","my-history", query]` · `["activations","recent"]` · `["keys","status", activationId]` (this last one wasn't in plan §4's explicit list — a natural, consistent extension). Invalidations exactly match plan §4's map (take → pending+active+my-stats; activate/release/freeze → active+my-stats+my-history+recent; flag-wrong/request-additional → active only). Every success toast that used to live in a component (`ActiveRequestCard`, `RequestsPage`) now lives in its mutation hook's `onSuccess`.

### L4 — AuthProvider rewrite
| File | Notes |
|---|---|
| `components/providers/AuthProvider.tsx` | Renamed from `AuthContext.tsx` (matching the `ThemeContext→ThemeProvider` precedent). Wraps a real `useQuery(["auth","me"])` + `useMutation` login/logout on top of the service stubs. Exposes `{ isAuthenticated, displayName, login, isLoggingIn, logout }`. See Decisions for the `stubSession` bridge that makes "login stays navigable" work against an honest `me()` stub. |
| 5 files (`LoginPage`, `ActivatorHeader`, `main.tsx`, `App.tsx`, `ProtectedRoute`) | Import path updated from `@/components/providers/AuthContext` → `AuthProvider` (mechanical rename, `sed`-applied). |

### L5 — Pages & sections rewired onto hooks
| File | Notes |
|---|---|
| `pages/LandingPage.tsx` | `lookupKey()` → `useVerifyKey()` mutation; view state typed by `types/key-flow.ts`'s `KeyFlowView` instead of a page-local type. |
| `components/sections/landing/AccountForm.tsx` | `setTimeout` fake submit → `useSubmitActivation`/`useUpdateActivation`, chosen by `isCorrection`; builds a real `AccountField[]` from form values keyed by `AccountInformation`. Local `MOCK_FIELD_LABELS` constant renamed `SUBMITTED_FIELD_LABELS` (see Validation — it tripped my own `MOCK_` grep sweep as a same-named coincidence, not an actual leftover). |
| `components/sections/landing/OtpStep.tsx` | `setTimeout` → `useSubmitAdditionalInfo({activationId, command: {accountFields: [{field: OTP, value}]}})`; takes `activationId` as a new prop from `LandingPage`. |
| `pages/LoginPage.tsx` | `submit` is now `async`, calling `await login(data)` inside a try/catch — success navigates, failure sets the same translated error banner + shake animation as before. `isLoggingIn` (from the mutation) replaces the local `loading` state. |
| `pages/activator/DashboardPage.tsx` | `MOCK_DASHBOARD` → `useMyStats()`; `formatDZD` now called with the active `language`. |
| `components/sections/activator/ActiveRequestCard.tsx` | Every action (wrong-info, OTP, done, cancel/release, admin/freeze) now calls its real mutation hook; **dropped the `onCompleted` prop and the `fading`/`animate-fade-out` local state** — removal from the list is now a natural consequence of query invalidation, not manual array splicing (see Decisions for the animation trade-off). Buttons disable on their own mutation's `isPending`. |
| `pages/activator/RequestsPage.tsx` | `useState(MOCK_...)` ×2 → `useActiveRequests()`/`usePendingActivations()`; `takeRequest` → `useTakeActivation()`; no longer passes `onCompleted` to `ActiveRequestCard`. |
| `pages/activator/HistoryPage.tsx` | Client-side text/status `.filter()` **removed** — replaced by a real `GetActivatorHistoryQuery` (`page`/`limit`/`status`/`search`) sent to `useMyHistory`. Only the Newest/Oldest/Earning **sort** stays client-side (§8.Q3), applied to whatever page the query returns. Pagination footer now reads `meta.total`/`meta.totalPages`/`meta.page` from the server response instead of a locally computed count. |
| `components/layout/ActivatorSidebar.tsx` | `ActivatorSidebarNav` now calls `useActiveRequests()` itself (deduped against the page's own call to the same query — TanStack Query shares one cache entry per key) and computes the Requests badge as `data.length > 0 ? data.length : null`. |
| `config/nav-links.ts` | Static `badge` field removed from `NavLink` entirely — badges are never configured data now, only derived. |

### L6 — Formatter relocation & mock deletion
| File | Notes |
|---|---|
| `lib/utils.ts` | Gained `formatTime` (unchanged, kept locale-agnostic — M:SS isn't culturally sensitive) and `formatDZD(amount, language)` (now `Intl.NumberFormat`-driven per `en-US`/`fr-FR`). |
| `lib/mock-data.ts` | **Deleted.** |

## Validation results
- `tsc --noEmit` ✅ clean, zero errors, on the **first full pass** after every file in this sprint — no follow-up type fixes needed across services, hooks, the provider rewrite, or any of the five page rewrites.
- `npm run build` ✅ 2553 modules. Per-page chunking still intact (`LandingPage` 28.5kB, `HistoryPage` 30.6kB, `RequestsPage` 23.9kB, `DashboardPage` 6.0kB, `LoginPage` 2.7kB). Main chunk grew 500kB→583kB (axios + the full hook/service layer now in the shared bundle) — still one expected `>500kB` warning, unaddressed (never in scope for any Sub-01 sprint).
- Grep sweeps (all four required by the sprint task):
  - `mock-data|MOCK_` → 0 real hits. One local constant `MOCK_FIELD_LABELS` in `AccountForm.tsx` matched by coincidence (unrelated to the deleted file) — renamed to `SUBMITTED_FIELD_LABELS` to keep this sweep meaningful for future sprints.
  - Data-fetching `useEffect` → 0 hits. Four real `useEffect` calls remain in the tree (`LiveTimer`'s 1s tick, `StatsRow`'s `IntersectionObserver`, `LanguageProvider`'s `localStorage` read, `OtpStep`'s countdown) — none fetch data, all legitimate non-network UI concerns.
  - `axios` imported outside `lib/` → 0 hits.
  - `services/` imported outside `hooks/` → 1 hit, `AuthProvider.tsx`, which is the documented, intentional exception (see Decisions).
- No new inline strings — same capitalized-JSX-text grep sweep as Sprints 2–3, re-run across every file touched this sprint: 0 hits.
- Dev server boots clean; `curl` against `/`, `/login`, `/dashboard`, `/requests`, `/history`, and an unknown path all return `200`.
- **Plan §5 readiness checklist: 9/9 green.** Full item-by-item verification is recorded in `sprints.md`'s Sprint 4 entry and mirrored (checkboxes ticked) in `plan.md` §5.
- ⚠️ **Not verified: real interactive browser walk.** Same sandbox limitation and same user-directed deferral as Sprints 2–3 (see those reports for the exact commands — unchanged).

## Decisions & deviations
- **`stubSession` bridge in `AuthProvider`.** `me()` always resolves `null` (no backend exists to authenticate against), so invalidating/refetching `["auth","me"]` after a stub login can't reflect "logged in." `isAuthenticated`/`displayName` are computed as `meQuery.data ?? stubSession`, where `stubSession` is ordinary React state (never written into the query cache by hand — the rules' "never mutate cache data manually" stays honored) set to a zeroed `SessionUserDTO` on login success, cleared on logout. Explicitly commented as Sub-01-only; a real `me()` in Sub-02 (backed by a session cookie the login response sets) makes plain invalidate+refetch correct and this bridge goes away.
- **`AuthProvider` is the one place a component imports a service directly.** The plan's own framing — "AuthProvider exposing `useAuth`" — makes `AuthProvider` the *hook layer* for auth specifically, just implemented as a Context provider (because auth needs app-wide singleton state, not a per-call-site independent query) and living in `components/providers/` per the rules' own folder convention. Documented so it isn't mistaken for a crack in the "services only from hooks" rule.
- **Dropped `ActiveRequestCard`'s fade-out exit animation.** Query-invalidation-driven list updates don't have a clean way to animate an item's removal without an exit-animation library (not in the approved stack), so the card now disappears immediately on refetch instead of fading over 350ms. A minor, expected visual simplification flowing directly from the architecture change, not a defect.
- **History's local text/status filtering is gone, not merely disabled.** It's now genuinely a server-side concern expressed via `GetActivatorHistoryQuery` — since the stub always returns an empty page, the search box and status filter currently have no visible effect on screen. This is the correct "typed empty defaults" behavior for this stage, not a bug to chase.
- **Non-null assertions trust contract invariants** (e.g. `keyData.activationId!` when `AccountForm` is in NEEDS_CORRECTION mode) rather than adding defensive runtime guards for states the contract's own semantics already rule out — matches "trust internal code and framework guarantees," reserving real validation for actual system boundaries (user input, the Zod schemas already doing that job on every form).
- Browser-based interactive verification remains deferred, per the 2026-07-02 feedback carried from Sprint 2 — tracked as an open item across all four sprint reports, not silently dropped from any of them.

## Sub-01 (Refactor) — complete
All four sprints are ✅ Done. `Apps/web` builds on the approved stack, follows the strict folder layout, has zero inline strings, and implements Component→Hook→Service end to end with typed empty stubs standing in for the real backend. Sub-02 (Integration) is a body-swap on the services layer — no architecture changes expected there based on this stage's work.
