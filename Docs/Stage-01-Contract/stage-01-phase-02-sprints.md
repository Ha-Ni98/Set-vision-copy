# Stage 01 · Phase 02 — Contract Sprint Planning

With the blueprint defined, decompose it into logical, dependency-aware sprints. **No code yet.**

---

## Objective

Turn `plan.md` into an ordered sequence of sprints so that foundational types exist before the modules that depend on them.

---

## Context & Inputs

- **The plan:** `/docs/stage-01-contract/plan.md`.
- **Rules:** `contract-rules.md`.

---

## Sprint Sizing & Ordering

- **Size:** each sprint should be **1–3 related modules**, completable in one focused session/context. Avoid one giant sprint (context overflow, more errors) and avoid one module split across sprints.
- **Order:**
  1. **Sprint 0 — Common foundation:** `common/types.ts` (envelope + `paginated()` factory) and `common/errors.ts`. Nothing else can be exported safely first.
  2. **Core modules:** auth/user and anything most others depend on.
  3. **Dependent modules:** features that import core enums/DTOs.
- A module may only be scheduled after the modules it imports from.

---

## Steps

- **Create:** `/docs/stage-01-contract/sprints.md`.
- **Define each sprint** with the template below.
- **End each sprint's task list** by updating the relevant barrel(s).

---

## Sprint Template

````markdown
### Sprint [N]: [Name]   — Status: ⬜ Pending

**Goals**
- [Clear outcome, e.g. "Implement core user contracts and shared error types."]

**Tasks**
- [ ] [e.g. Create `common/types.ts` (envelope + `paginated()` factory).]
- [ ] [e.g. Implement the `User` module files per `plan.md`.]
- [ ] [e.g. Update `modules/user/index.ts` and root `src/index.ts`.]

**Validation**
- [ ] `tsc --noEmit` is clean.
- [ ] `madge --circular src` reports no cycles.
- [ ] Lint is clean.
- [ ] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [ ] No sensitive field appears in any DTO.
- [ ] No business logic / DB / Express imports.
- [ ] Committed on green.
````

---

## Expected Output

- A single sprint plan file: **`/docs/stage-01-contract/sprints.md`**.
