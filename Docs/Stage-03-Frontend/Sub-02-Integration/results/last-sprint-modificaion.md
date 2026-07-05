---
title: Post-Sprint-9 modification — AuthProvider real session wiring
status: ✅ Done
commit: TBD
---

# Post-Sprint-9 Modification Report — AuthProvider Real Session Wiring

This is ad hoc follow-up work requested directly by the user after Sub-02's 9-sprint plan
closed out (report-sprint-09.md). It is **not** a numbered sprint — it resolves the one
known, intentionally-deferred item that every sprint's execution constraint
(`never touch /src/components or /src/pages`) had left in place since Sprint 2:
`AuthProvider.tsx`'s `TODO(Sub-02)` marker and `stubSession` bridge.

## Work done

### `src/components/providers/AuthProvider.tsx` (modified)
- Removed the `stubSession` bridge and its inline `useQuery`/`useMutation` calls (which
  hardcoded the literal `["auth","me"]` key and called `authService.*` directly), replacing
  them with the real `useSession` / `useLogin` / `useLogout` hooks built in Sprint 2 —
  restoring the Component→Hook→Service layering plan.md §2.1 and §8.7 called for.
- Added `isReady` (`!sessionQuery.isPending`) to the `AuthCtx` — true once the session query
  has settled (success or error) at least once, letting route gates hold rendering during
  the cold-start restore instead of immediately assuming "logged out."
- Added the realtime role-socket lifecycle binding specified in plan.md §5.1: an effect
  keyed on `isAuthenticated` and `role` (the primitive value, not the session object) calls
  `connectRoleSocket(role)` when a session is present and `disconnectRoleSocket()` on
  logout or unmount. Keying on the role value rather than the session object reference
  avoids reconnecting the socket on every unrelated `me()` refetch that happens to return
  the same role.

### `src/components/layout/ProtectedRoute.tsx` (modified)
- `ProtectedRoute` and `PublicOnlyRoute` now render a full-screen loading state while
  `!isReady`, instead of immediately flashing to `/login` before the silent refresh
  (axios's 401 interceptor + refresh-token retry) has a chance to resolve.
- Deliberately did **not** reuse the existing `PageLoader` component — its own comment
  scopes it to `React.lazy()` Suspense fallbacks, not data-loading states. Added a small
  local `AuthRestoring` helper (full-screen, vs. `PageLoader`'s content-scoped
  `min-h-[50vh]`, since no layout has mounted yet at this gate) instead of repurposing it
  against its documented intent.

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint --fix` ✅ 0 errors (one pre-existing `react-refresh/only-export-components`
  warning on `AuthProvider.tsx`, unchanged from before this modification — the file already
  exported both a component and a hook)
- `npx vitest run` ✅ 310/310 tests pass, 37/37 files (no regression; neither file had
  existing test coverage to update)
- `npx vite build` ✅ production build succeeds. Note: the main `index` bundle grew
  (~587 kB → ~631 kB gzip) because `socket.io-client` is now reachable from `AuthProvider`,
  which is always eagerly loaded — expected, not a regression.
- **Not verified in a live browser.** No browser-automation tool is available in this
  environment, and exercising the login / cold-start-restore / logout flow end-to-end would
  additionally require `Apps/api` running. This is manual-verification debt if issues
  surface later — flagged explicitly per instructions rather than claimed as tested.

## Decisions & deviations
- **No component tests added.** The user was asked whether to add RTL coverage for
  `AuthProvider`/`ProtectedRoute` as part of this change and declined — revisit if needed
  later.
- **`LandingPage.tsx`'s "Check Another Key" reset → `unsubscribeActivation(id)` wiring is
  still open.** This was the other half of Sprint 4's deferred realtime binding
  (report-sprint-04.md) and lives in a page, not a provider; it was out of scope for this
  request and was not touched.
- **Not committed as part of this report.** The `AuthProvider.tsx`/`ProtectedRoute.tsx`
  changes remain uncommitted in the working tree as of this report's writing, pending the
  user's instruction to commit.
