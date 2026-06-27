# Frontend Best Practices (Stack & UI/UX)

Companion to `front-end-rules.md` (architecture) and `front-end-test-rules.md` (testing). Every phase reads all three.

## UI/UX

- **Mobile-first** for public pages; **desktop-first** for admin pages (mobile best-effort).
- **Componentization:** build from `shadcn/ui` (Radix) primitives.
- **Data tables:** TanStack Table for sortable, filterable grids (via the shared `DataTable`).
- **State:** React state/context for UI state; **TanStack Query for all server state**.
- **Forms:** React Hook Form + Zod for every form.
- **Routing:** React Router DOM with route protection.
- **Layout-specific header/footer** (resolves the admin-vs-public split in `front-end-rules.md` §6C):
  - **PublicLayout header:** Logo, Search, Auth links/menu, Cart, EN/FR toggle, Theme toggle.
  - **PublicLayout footer:** Shipping, Returns, Privacy, Terms, store locator, support, social.
  - **AdminLayout header:** Logo, Auth menu, EN/FR toggle, Theme toggle — **no Cart, no store locator.**
- **Accessibility:** WCAG 2.1 AA via Radix primitives.

## Versions (the whole monorepo shares one Zod major)

- **Vite 5.4.19** — HMR, built-in splitting/tree-shaking, `import.meta.env` (never `process.env`), `?url` asset imports.
- **React 18.3.1** — `Suspense` for code-splitting, `<StrictMode>` in dev, error boundaries, Rules of Hooks.
- **TanStack Query 5.83.0** — hierarchical query keys; **global error handling on `QueryCache`/`MutationCache`** (the per-hook `onError` was removed in v5); configure `staleTime`/`gcTime`; mutation pending is `isPending`; DevTools in dev.
- **React Hook Form 7.61.x + Zod 4** — schemas for all forms, `z.infer` for types, prefer `mode: 'onBlur'`/`'onSubmit'`, field errors via `formState.errors`. **Zod must match the contract's major (Zod 4)** — a version split breaks shared schemas and `zodResolver`.
- **Tailwind 3.4.17** — theme vars in config, mobile-first prefixes, `dark:`, production purge.
- **TypeScript 5.x** — strict mode, generics for reuse, utility types, type guards.
