---
sprint: 2
title: Primitives — Admin Shell + Dashboard
status: ✅ Done
commit: (pending — filled in next commit)
---

# Sprint 2 Report — Admin Shell + Dashboard Primitives

## Work done

### Admin shell (`src/components/layout/`)
| File | Notes |
|---|---|
| `AdminGuard.tsx` (real, was a passthrough stub) | Calls `useSession()` directly. `isPending` → full-screen spinner; `!session` → `<Navigate to="/login"/>`; `session.role !== UserRole.ADMIN` → `<Navigate to="/dashboard"/>`; else `<Outlet/>`. |
| `AdminLayout.tsx` (real, was a passthrough stub) | Chrome (`AdminHeader` + `AdminSidebar`) + `<Outlet/>`. **No socket lifecycle management** — see Decisions. |
| `AdminSidebar.tsx` (new) | `AdminSidebarNav` (shared by desktop aside + mobile `Sheet`, mirroring `ActivatorSidebarNav`) + `AdminSidebar` (desktop wrapper, `hidden lg:block`). Renders `ADMIN_NAV_LINKS`; flat items are active-highlighted `Link`s, groups (`Distributors`, `Activations`) are collapsible (default open, matching the spec mockup's `▼`) with active-child highlighting. |
| `AdminHeader.tsx` (new) | Mirrors `ActivatorHeader` structure exactly: mobile `Sheet` menu, `Logo` → `/admin`, `NotificationBell`, `LanguageToggle`, `ThemeToggle`, user-avatar dropdown with Sign Out `AlertDialog` (`useAuth().logout()` + navigate, same fire-and-forget pattern). |
| `NotificationBell.tsx` (new) | Bell icon + `DropdownMenu`; reconnect indicator (pulsing dot + dropdown text) from `useRealtimeStatus()`. Feed/badge intentionally idle per plan §F-6. |

### Config
| File | Notes |
|---|---|
| `config/nav-links.ts` (edited) | Additive: new `NavGroup` interface + `AdminNavItem` union + `isNavGroup()` type guard + `ADMIN_NAV_LINKS` (renders the full Part 1–3 conception nav; only Part 1 leaves resolve to a real route, everything else is a scope-confined `<Link>`). `NavLink`/`ACTIVATOR_NAV_LINKS` untouched. |
| `lib/utils.ts` (edited) | Renamed `NUMBER_LOCALE` → `LOCALE_TAG` (now serves both currency and date formatting); added `formatDateTime(iso, language)` — no date-formatting helper existed anywhere in the codebase before this. |

### Dashboard (`src/pages/admin/`)
| File | Notes |
|---|---|
| `DashboardPage.tsx` (was a stub, now static composition) | **No hooks.** Composes `PageHeader` + `StatsRow` + the three table sections from literal placeholder props chosen to exercise all three non-success states in one render: stats + Frozen = loading, Recent = empty (`data: []`), Pending = error (`isError`). Sprint 4 replaces each literal with its real query's fields. |
| `components/StatsRow.tsx` (new) | Pure renderer over `DashboardStatCardData[]` — agnostic to which of the 3 summary hooks (plan §D1.1) a card's data comes from; that assembly is Sprint 4's job. |
| `components/FrozenActivationsTable.tsx` (new) | Owns per-row dialog-open state locally; columns reduced per §F-2 (no `frozen_since`). Memoized `ColumnDef[]`. |
| `components/RecentActivationsTable.tsx` (new) | Columns reduced per §F-3. Subscription-label cell is a `<Link>` to `/admin/activations/{id}` — `DataTable` has no whole-row `onClick`, so the primary cell carries the spec's "row click → Link" requirement. |
| `components/PendingActivationsTable.tsx` (new) | Columns reduced per §F-4. Waiting duration renders via `<LiveTimer mode="wait">` directly (see Decisions). |
| `components/ResolveFreezeDialog.tsx` (new) | Presentational `AlertDialog`; both Activate and Cancel variants now have a body (avoids a Radix "missing Description" console warning). |

### i18n (`src/config/translations.json`)
4 keys added beyond Sprint 1's batch, all discovered while wiring components: `admin.shell.bell.empty`, `admin.dashboard.sectionErrorBody`, `admin.dashboard.frozen.activateConfirm.body`, `admin.dashboard.recent.columns.completedAt` (this last one replaced a broken placeholder caught before commit — see Decisions).

## Validation results
- `npx tsc --noEmit` ✅ clean
- `npm run check` (both tsconfigs) ✅ clean
- `npx eslint` on every Sprint 2 file ✅ 0 errors (23 Prettier line-wrap errors auto-fixed via `eslint --fix`, then re-verified with a full `tsc`+`vitest` re-run)
- `npx vitest run` ✅ 37/37 files, 310/310 tests green (no new test files — Sprint 7's job; existing suite is the regression gate)
- **Browser-verified** (see Decisions for the full setup): headless Chromium against the real Vite dev server, unauthenticated, at `/admin`, `/login`, `/admin/activators`. All three resolved correctly; screenshot-confirmed the redirect target renders cleanly (not blank). Zero new console errors/warnings.

## Decisions & deviations
- **`AdminLayout` does not manage the realtime socket, contradicting this sprint's own task list.** Re-reading `AuthProvider.tsx` (Sub-02) during implementation showed its `useEffect` already connects/disconnects the role socket globally, keyed on `[isAuthenticated, role]` — independent of routing, firing the moment any session with a role resolves. Having `AdminLayout` *also* call `connectRoleSocket`/`disconnectRoleSocket` on its own mount/unmount would: (a) redundantly tear down and recreate the socket `AuthProvider` just connected, and (b) risk a real bug — if an admin ever navigated away from `/admin/*` and back without their auth/role changing, `AdminLayout`'s unmount would disconnect the socket, but `AuthProvider`'s effect wouldn't re-fire to reconnect it (its dependencies haven't changed). Resolved by dropping the duplicate management entirely; `AdminLayout` only renders chrome.
- **`AdminGuard` resolves Sprint 1's flagged `useAuth()`-has-no-`role` gap by calling `useSession()` directly**, not by extending `AuthCtx`. Same cache entry (TanStack dedupes by `queryKey`), so this isn't a second network call, and it avoids widening a Sub-02 provider's public interface for a single Sub-03 consumer.
- **Authed-non-admin redirects to `/dashboard`, not `/login`**: the phase/plan text just said "redirect" without a target. `/login` would immediately bounce an already-authenticated user back out via `PublicOnlyRoute`'s own `isAuthenticated → /dashboard` check — sending them to `/dashboard` directly is more correct and avoids the redirect chain.
- **`PendingActivationsTable`'s wait-tier coloring reuses `LiveTimer`'s existing `mode="wait"` thresholds** (green `<5m` / amber `5–15m` / red `>15m`) instead of a bespoke `useMemo` color map. These are the *exact* thresholds the spec calls for, already implemented and used elsewhere (`ActiveRequestCard`) — building a second implementation would just be duplication. **This removes a task from Sprint 4's plan** (flagged there).
- **Browser verification, not just automated gates**: no `.env` existed for local dev (only `.env.example`/`.env.test`) and no backend/DB was running, so I couldn't log in as a real admin. Rather than skip UI verification entirely or spin up a full backend+seed stack unprompted (out of scope, heavy), I created `.env` from the existing template (gitignored, matches documented example, zero risk) and used a **headless Chromium already fully cached locally** (`playwright-core@1.61.1` ↔ cached `chromium-1228`, confirmed matching before use — no network fetch of any kind, consistent with not downloading heavy tooling inline) to verify the one thing that's checkable without a backend: that `AdminGuard`'s redirect logic behaves correctly for an unauthenticated visitor. It does, on all three URLs tested, with a screenshot confirming the landing page rendered rather than a blank/broken frame. **What this does *not* verify**: the authenticated admin shell (sidebar/header/dashboard skeletons actually rendering together) — that needs a live backend + seeded admin session, which don't exist in this environment. Stated explicitly rather than assumed.
- Fixed a leftover broken placeholder in `RecentActivationsTable.tsx` before committing: an early draft of the `completedAt` column header was a nonsensical `t("common.actions.confirm") === undefined ? "" : t("admin.activators.detail.payments.columns.date")` (dead ternary reusing the wrong key). Replaced with a real `admin.dashboard.recent.columns.completedAt` key.
