# Stage 02 · Sub-02 · Phase 02 — Module Sprint Planning

Break the module plan into sprints so the foundation (mapper/interface) precedes the logic (service) precedes the API (controller/wiring). **No code yet.**

---

## Objective

Decompose `plan-[module].md` into dependency-ordered sprints for this module.

---

## Context & Inputs

- **Plan:** `/docs/stage-02-backend/sub-02-module/results/plan-[module]-[setnumber].md`.
- **Rules:** `module-implementation-rules.md`.

---

## Suggested Shape (adjust to the module)

1. **Sprint 1 — Foundation:** factories, mapper (pure), service interface, mapper unit test.
2. **Sprint 2 — Logic:** service (implements interface), emits/handles events, service unit tests (mock Prisma).
3. **Sprint 3 — API:** controller, `routes.ts` composition root, integration + conformance tests.

---

## Sprint Template

````markdown
### Sprint [N]: [Name]   — Status: ⬜ Pending

**Goals**
- [e.g. "Implement the User mapper and service interface."]

**Tasks**
- [ ] [Impl: `src/modules/user/user.mapper.ts`.]
- [ ] [Impl: `src/modules/user/user.interface.ts`.]
- [ ] [Test: `test/unit/modules/user/user.mapper.spec.ts`.]

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green (unit + conformance). Run `npm run test:int` once the route is wired and the test DB is up.
- [ ] Routes use contract constants only; responses go through `sendSuccess`; mapper excludes sensitive fields.
- [ ] Committed on green.
````

---

## Expected Output

- **`/docs/stage-02-backend/sub-02-module/results/sprints-[module]-[setnumber].md`**.
