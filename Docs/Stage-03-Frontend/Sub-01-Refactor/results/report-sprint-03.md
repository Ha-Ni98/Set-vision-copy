---
sprint: 3
title: Layouts & Boundaries
status: ✅ Done
commit: TBD
---

# Sprint 3 Report — Layouts & Boundaries

## Work done

### L0 — Route guards & layout routes (new)
| File | Notes |
|---|---|
| `components/layout/ProtectedRoute.tsx` | Exports `ProtectedRoute` (redirect to `/login` if unauthenticated) and `PublicOnlyRoute` (redirect to `/dashboard` if already authenticated) — both declarative `<Outlet/>`-based layout routes replacing the MVP's imperative `useEffect`+`navigate()` guards. Both read the same `useAuth().isAuthenticated`, so they can't structurally disagree with each other. |
| `components/layout/PublicLayout.tsx` | `PublicHeader` + `<Outlet/>` + `PublicFooter`. Accepts an optional `children` override (falls back to `<Outlet/>`) so the catch-all route — which isn't a matched child route — can still reuse it. |
| `components/layout/ActivatorLayout.tsx` | `ActivatorHeader` + `ActivatorSidebar` + `<Outlet/>` (same `children` override pattern as `PublicLayout`). |
| `components/layout/ActivatorHeader.tsx` | Split out of the old `ActivatorShell.tsx`: mobile Sheet trigger (rendering `ActivatorSidebarNav`), logo link, notifications dropdown (**emptied** — see Decisions), `LanguageToggle`, `ThemeToggle`, user dropdown + sign-out `AlertDialog`. |
| `components/layout/ActivatorSidebar.tsx` | Split out of the old `ActivatorShell.tsx`: exports `ActivatorSidebarNav` (the actual `<nav>` list, shared by both the desktop `<aside>` and the mobile Sheet in `ActivatorHeader`) and `ActivatorSidebar` (the desktop `<aside>` wrapper). |
| `config/nav-links.ts` | `ACTIVATOR_NAV_LINKS` — nav data (`to`/`labelKey`/`icon`/`badge`) moved out of the shell component. `badge: 4` on Requests stays a hardcoded placeholder (deriving it from real data is Sprint 4, §8.Q5). |

### L1 — 404 / crash handling (new, replaces two Sprint-1 transitional files)
| File | Notes |
|---|---|
| `components/shared/NotFoundState.tsx` | One content-scoped component (`icon`/`eyebrow`/`title`/`body`/`action`/`debugDetails` props) serving three roles: 404 catch-all content, route-crash content (via `RouteErrorBoundary`), and — ready for Sprint 4 — section-level `isError` content (already used that way in all three activator pages this sprint). No `min-h-screen` — it's designed to sit inside whatever layout wraps it. |
| `components/shared/RouteErrorBoundary.tsx` | `errorElement` content for routes nested inside a layout — reads `useRouteError()`, renders `NotFoundState` with crash copy + "Try again"/"Go home" actions + dev-only stack trace. |
| `components/shared/PageLoader.tsx` | `Suspense` fallback for `React.lazy()` — a single centered spinner, content-scoped (`min-h-[50vh]`, not full-screen). |
| `pages/NotFoundPage.tsx`, `pages/ErrorPage.tsx` | **Deleted** — both were Sprint-1 transitional artifacts explicitly scheduled to die here, superseded by the above. |
| `components/layout/ActivatorShell.tsx` | **Deleted** — replaced by `ActivatorLayout`/`ActivatorHeader`/`ActivatorSidebar` + `ProtectedRoute`. |

### L2 — Skeletons (new)
| File | Notes |
|---|---|
| `components/shared/StatCardSkeleton.tsx` | Matches `StatCard`'s shape (icon box, label line, value line, trend line). |
| `components/shared/ChartSkeleton.tsx` | 7-bar skeleton matching the dashboard's weekly chart. |
| `components/shared/RequestCardSkeleton.tsx` | Matches `ActiveRequestCard`'s shape (badge+timer row, title, two info sections, 5-button action row). |
| `components/shared/TableSkeleton.tsx` | `{ rows, columns }`-parameterized generic row skeleton, reused across all three `DataTable` instances. |

### L3 — Router rewrite
| File | Notes |
|---|---|
| `src/App.tsx` | Full rewrite: all 5 pages now `React.lazy()` + `withSuspense()` helper; nested route tree — `PublicLayout` wraps `/`, `PublicOnlyRoute` wraps `/login` (standalone, no layout chrome), `ProtectedRoute` → `ActivatorLayout` wraps `/dashboard`/`/requests`/`/history`; every **leaf** route gets its own `errorElement={<RouteErrorBoundary/>}` (not the parent layout routes) so a page crash only replaces the `<Outlet/>` slot — header/sidebar/footer keep rendering; `CatchAllRoute` (`*`) picks `ActivatorLayout` or `PublicLayout` based on live `useAuth()` state, so 404s render inside whichever layout the user is actually in, not a fixed default. `document.title` wiring (Sprint 2) carried over unchanged. |
| `pages/LandingPage.tsx` | Dropped its own `PublicHeader`/`PublicFooter`/wrapper `<div>` — now just the `<section>` + `WhoWeAre` + `StatsRow` content, wrapped by `PublicLayout` at the route level. |
| `pages/LoginPage.tsx` | Dropped the `useEffect(() => { if (isAuthenticated) nav(...) })` redirect and the now-unused `isAuthenticated` destructure — `PublicOnlyRoute` handles this before the page ever mounts. The post-submit `nav("/dashboard")` after a successful login stays (that's a normal post-action navigation, not a guard). |

### L4 — isLoading/isError wiring (Dashboard, Requests, History)
| File | Notes |
|---|---|
| `pages/activator/DashboardPage.tsx` | One `isLoading`/`isError` pair covering the stat-cards row + weekly chart + active-slots card (all one future `useMyStats` query). `isError` → `NotFoundState`; `isLoading` → 3×`StatCardSkeleton` + `ChartSkeleton` + `StatCardSkeleton`; else real content. |
| `pages/activator/RequestsPage.tsx` | Two independent pairs: `isLoadingActive`/`isErrorActive` (active-requests grid → 2×`RequestCardSkeleton`) and `isLoadingPending`/`isErrorPending` (pending-pool table → `TableSkeleton`) — matches the two separate Sprint-4 queries (`useActiveRequests`, `usePendingActivations`). |
| `pages/activator/HistoryPage.tsx` | Two independent pairs: `isLoadingRecent`/`isErrorRecent` (recent-team table) and `isLoadingHistory`/`isErrorHistory` (my-history table) — matches `useRecentActivations`/`useMyHistory`. `TableSkeleton` column counts (4/7) roughly match each real table. |

All 8 flags are hardcoded `false` this sprint (per the task list); Sprint 4 replaces each with a live TanStack Query flag — no other code changes needed at that point, the conditional rendering is already in place.

### L5 — Housekeeping
| File | Notes |
|---|---|
| `config/translations.json` | Removed the 6 `activator.shell.notif.*` keys (the fake notification content they backed no longer exists); added `activator.shell.noNotifications` for the emptied dropdown. |

## Validation results
- `tsc --noEmit` ✅ clean, zero errors.
- `npm run build` ✅ 2425 modules. **Per-page code-splitting confirmed directly in the output**: `LandingPage-*.js` (27.7kB), `LoginPage-*.js` (2.7kB), `DashboardPage-*.js` (4.3kB), `RequestsPage-*.js` (20.8kB), `HistoryPage-*.js` (30.1kB) each landed in their own chunk, plus shared chunks (`DataTable`, `schemas`, small icon chunks). Main `index-*.js` dropped from 756kB (post-Sprint-2) to 500kB — the remaining `>500kB` warning is core vendor code (React/Router/Radix), unaddressed since manual vendor chunking wasn't part of this sprint's task list.
- Translation-key cross-check re-run ✅ 0 missing keys (181 used, 187 defined after the notif-key cleanup).
- Grep sweeps: zero references to `ActivatorShell`/`NotFoundPage`/`ErrorPage` anywhere in `src`; zero literal-string `toast.*(...)` calls; zero leftover `useEffect`-based `nav()` redirects.
- Dev server (`npm run dev`) boots clean; `curl` on `/dashboard`, `/login`, and an unknown path from the dev server all return `200` — confirms the SPA fallback is intact (a hard refresh on any client route serves the shell, then the router guards handle redirects client-side).
- **Dev-only skeleton/error flip test** (substitute for a real browser walk): each of the 8 `isLoading`/`isError` flags across the three activator pages was flipped to `true` in turn, `npm run build` re-run to confirm the branch compiles — esbuild's minifier constant-folds the now-unreachable `false`-branch away when a flag is a literal `true`, which is a stronger signal than a bare compile: it proves each skeleton/error branch is real, valid, reachable JSX, not just type-correct dead code. All flags reverted to `false` after; `git diff` on those files was empty going into the commit.
- ⚠️ **Not verified: real interactive browser walk** (visual skeleton/error rendering, mobile Sheet nav at <768px, live redirect-loop check). Same sandbox limitation and same user-directed deferral as Sprint 2 (see that sprint's report for the exact commands — the Chromium binary is still cached from that attempt).

## Decisions & deviations
- **`NotFoundState` reused for three roles** (404, route-crash, future section-`isError`) rather than building three separate components — this is what the sprint task explicitly asked for ("also used as the section-level isError visual"), and having one component now makes Sprint 4's per-section wiring a drop-in rather than a new build.
- **Catch-all route picks its layout from live auth state**, not a fixed default. An earlier design considered always wrapping unknown URLs in `PublicLayout` (simpler, but would show the public header to an authenticated user mid-typo on `/dashboardd`) — the `useAuth()`-driven choice is barely more code and matches "inside the active layout" literally rather than approximately.
- **`errorElement` placement is deliberate**: it's on every leaf page route, never on the parent layout routes. Putting it on the layout route would mean a page crash replaces the *entire* layout (header/sidebar included) with `RouteErrorBoundary` — exactly the "layout disappears on error" failure mode rules §4 forbids. Leaf-level placement means only the `<Outlet/>` content is replaced.
- **`RouteErrorBoundary` is content-scoped** (no `min-h-screen`), unlike the deleted `ErrorPage.tsx`. `/login`'s standalone usage (no layout around it) gets a one-off full-page centering wrapper written directly into its route registration in `App.tsx`, rather than baking full-page sizing into the shared component — keeping `RouteErrorBoundary` correct for its more common nested-route use.
- **Browser-based interactive verification deferred again**, per the 2026-07-02 feedback from Sprint 2 — tracked as an open item, not silently skipped.
