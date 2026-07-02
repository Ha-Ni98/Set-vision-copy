---
sprint: 1
title: Purge & Structure
status: ✅ Done
commit: 0313216
---

# Sprint 1 Report — Purge & Structure

## Work done

### L0 — Workspace & build config
| File | Notes |
|---|---|
| `Apps/web/package.json` | `@my-app/web`; scripts `dev/build/preview/lint/format/check(tsc --noEmit)`; deps: `react-router-dom`, `axios`, `next-themes`, `@tanstack/react-table`, `@tanstack/react-query`(+`-devtools` dev), `"@my-app/contract": "file:../contract"`, `sonner`, `react-hook-form`+`@hookform/resolvers`, kept Radix peers for the 20 retained primitives; **`zod ^4.0.0`** (matches contract major); `postcss`/`autoprefixer` added as a build-tool necessity for Tailwind 3 (mechanical, not in the plan's library table) |
| `Apps/web/vite.config.ts` | Plain Vite 5 + `@vitejs/plugin-react` + `@` → `./src` alias — no Lovable black-box config |
| `Apps/web/tsconfig.json` / `tsconfig.node.json` | Strict mode, `@/*` paths; node config scoped only to `vite.config.ts` (not solution-style project references, per the plan's literal two-file split) |
| `Apps/web/tailwind.config.ts` | `darkMode: ["class"]`; semantic color scale as `oklch(var(--x) / <alpha-value>)` channel-triplet pattern (Tailwind-3 equivalent of the MVP's Tailwind-4 `@theme inline`); `borderRadius` sm/md/lg/xl/2xl remapped to a `calc(var(--radius) ± Npx)` chain (Tailwind 3's defaults differ from the MVP's design); `tailwindcss-animate` plugin |
| `Apps/web/postcss.config.js` | `tailwindcss` + `autoprefixer` |
| `Apps/web/eslint.config.js`, `.prettierrc`, `.prettierignore`, `.gitignore` | Carried from the MVP; Cloudflare/Vinxi-specific ignores dropped |
| `Apps/web/components.json` | shadcn config repointed at `tailwind.config.ts` / `src/index.css` |
| `Apps/web/index.html` | Static `<title>`/meta ported from `__root.tsx`'s `head()` (SPA equivalent; reactive titles arrive with i18n in Sprint 2) |

### L1 — Design tokens
| File | Notes |
|---|---|
| `src/index.css` | Full oklch token set (light + dark) stored as **bare `L C H` triplets** so Tailwind 3's `<alpha-value>` substitution works (the MVP's Tailwind-4 tokens were full `oklch(...)` values, incompatible with opacity modifiers under Tailwind 3 without this rewrite); `@layer base` sets border/background/foreground via the new semantic utility classes; all 4 custom keyframes (`shake`, `pop-in`, `pulse-soft`, `fade-out-up`) ported verbatim as plain CSS |

### L2 — UI primitives & low-level lib (ported unchanged)
| File | Notes |
|---|---|
| `components/ui/*.tsx` (20 files) | `button, input, label, select, checkbox, textarea, dialog, alert-dialog, dropdown-menu, sheet, sonner, skeleton, badge, table, pagination, form, card, input-otp, separator, tooltip` — byte-identical copies; every internal import is alias-based (`@/lib/utils`, `@/components/ui/button`) so relocation needed zero edits. The other 25 MVP primitives were left behind per the map's audit (unused) |
| `lib/utils.ts`, `lib/mock-data.ts` | Unchanged. `mock-data.ts` is the sprint's central **transitional artifact** — dies in Sprint 4 when services/hooks replace it |
| `hooks/use-mobile.ts` | Extension renamed `.tsx` → `.ts` only (no JSX in the file); content unchanged |

### L3 — Providers
| File | Notes |
|---|---|
| `components/providers/AuthContext.tsx` | Ported unchanged (zero relative imports). Still backed by `MOCK_USERS` + `localStorage` — dies in Sprint 4 (`AuthProvider` rewrite on service stubs) |
| `components/providers/ThemeContext.tsx` | Ported unchanged. Still a custom context, not next-themes — dies in Sprint 2 |

### L4 — Layout & shared components
| File | Notes |
|---|---|
| `components/layout/PublicHeader.tsx`, `PublicFooter.tsx` | Relocated; relative `./Logo` / `./ThemeToggle` imports repointed to `@/components/shared/*` |
| `components/layout/ActivatorShell.tsx` | **Merged** the MVP's `routes/_activator.tsx` (auth guard: `useEffect` redirect-if-unauthenticated + null-return-while-redirecting) with `components/activator/ActivatorShell.tsx` (chrome) into one file, now wrapping `children` instead of `<Outlet/>`. Ported onto `react-router-dom`'s `useNavigate`/`useLocation`/`Link`; sidebar active-state kept the original's `useLocation().pathname === item.to` check rather than switching to `NavLink`, to stay a faithful port. This merge is explicitly temporary — Sprint 3 splits it into a router-level `ProtectedRoute` + real `ActivatorLayout` |
| `components/shared/Logo.tsx`, `CopyButton.tsx`, `LiveTimer.tsx` | Relocated, no import changes (asset path and external-lib imports only) |
| `components/shared/ThemeToggle.tsx` | Relocated; `@/contexts/ThemeContext` repointed to `@/components/providers/ThemeContext` |

### L5 — Sections
| File | Notes |
|---|---|
| `components/sections/landing/{StepIndicator,AccountForm,OtpStep,CompletedStep,StatsRow,WhoWeAre}.tsx` | Relocated, no import changes needed (alias-only imports) |
| `components/sections/activator/ActiveRequestCard.tsx` | Relocated; relative `./LiveTimer` / `./CopyButton` repointed to `@/components/shared/*` |

### L6 — Pages & routing
| File | Notes |
|---|---|
| `pages/LandingPage.tsx`, `pages/LoginPage.tsx` | Converted from TanStack Start file-routes (`createFileRoute`) to plain default-export components; import paths repointed to new component locations |
| `pages/activator/{DashboardPage,RequestsPage,HistoryPage}.tsx` | Same conversion; `Link`/navigation calls moved to `react-router-dom` |
| `pages/NotFoundPage.tsx`, `pages/ErrorPage.tsx` | New **transitional files**, not in the original plan/sprints task list — verbatim ports of `__root.tsx`'s `NotFoundComponent` and `router.tsx`'s `DefaultErrorComponent` so the app has *some* 404/error rendering. Added to `sprints.md`'s transitional-artifacts table; die in Sprint 3 when the real layout-preserving `NotFoundState` is built |
| `src/App.tsx` | `createBrowserRouter` + `RouterProvider` (react-router-dom's data-router API, chosen over plain `<BrowserRouter><Routes>` so every route gets a real `errorElement` — closest honest equivalent of the MVP's router-level `defaultErrorComponent`, and sets up Sprint 3's nested layout routes for free) |
| `src/main.tsx` | `StrictMode` → `ThemeProvider` → `AuthProvider` → `App` + `Toaster`, mirroring `__root.tsx`'s provider order |

Demo artifacts (demo-keys paragraph, demo login credentials, "Toggle Empty State" button, fake notifications dropdown) were **kept untouched** — stripping them is Sprint 2 scope (i18n string sweep), not this sprint's structural move.

## Validation results
- `tsc --noEmit` ✅ clean, zero errors.
- `npm run build` ✅ 1846 modules transformed, valid `dist/` output.
- `npm run dev` ✅ boots clean (`VITE ready`), serves the correct HTML shell/meta, no errors in the server log after sustained idle.
- Compiled production CSS inspected directly for the sprint's named risk: `.bg-primary\/15{background-color:oklch(var(--primary) / .15)}` and `.bg-warning\/20{...oklch(var(--warning) / .2)}` confirm the channel-triplet + `<alpha-value>` approach compiles correctly — Tailwind-4→3 opacity modifiers are **not** broken. `:root` triplets, the `.dark{}` override block, and all 4 custom keyframes are present in the bundle.
- `package.json` audit: no TanStack Router/Start, Lovable, Cloudflare, or Tailwind-4 packages; `zod` is `^4.0.0` in both `Apps/web` and `Apps/contract`.
- Folder tree matches plan §1.3 exactly (`assets/ components/ config/ hooks/ lib/ pages/ services/ types/` — no `contexts/`, no `routes/`).
- ⚠️ **Not verified: interactive browser walk** (mock login → `/dashboard`, dark-mode toggle, visual diff, console errors). This sandbox's network reaches the npm registry but not the Playwright/Chromium CDN host (`cdn.playwright.dev` → `EAI_AGAIN`, repeated retries), and no `chromium-cli` or browser binary is preinstalled, so no headless browser could be launched. Static evidence above stands in for it — **recommend a real browser pass before Sub-02 integration**.

## Decisions & deviations
- `createBrowserRouter`/`RouterProvider` used instead of plain `<BrowserRouter><Routes>` (see L6) — not specified in the original task list, chosen to give every route a real `errorElement` and set up Sprint 3's layout-route nesting in advance.
- `routes/_activator.tsx` (guard) and `components/activator/ActivatorShell.tsx` (chrome) were merged into one file rather than kept as two, since react-router-dom's plain-route setup in this sprint has no direct equivalent to TanStack's nested file-route guard yet (that arrives with Sprint 3's `ProtectedRoute`).
- Corrected a scrivener miscount in `sprints.md`: the "kept" UI-primitive set is **20** files (per the codebase map's own list), not 19 as the sprint task text said.
- `postcss` + `autoprefixer` added to devDependencies — a mechanical requirement for Tailwind 3's build pipeline, not called out in the plan's library table (it doesn't add an application-facing library, just build plumbing Tailwind 3 needs to run at all).
- Browser-based visual verification could not be completed in this sandbox (see Validation results); this is an environment limitation, not a code defect, and is tracked as an open item rather than silently skipped.
