# Stage 02 · Sub-01 · Phase 02 — Backend Init Sprint Planning

Decompose the init plan into dependency-aware sprints. Infrastructure and its tests are built before anything that uses them. **No code yet.**

---

## Objective

Turn `plan.md` into ordered sprints so each layer's dependencies (and tests) exist before the next.

---

## Context & Inputs

- **Plan:** `/docs/stage-02-backend/sub-01-init/plan.md`.
- **Rules:** `back-end-rules.md`, `test-rules.md`.

---

## Ordering

Follow the dependency chain: **env → errors → prisma singleton → config/logger + http/response + events → utils → middleware → app → server**. Each sprint ships its implementation *and* its tests. Keep sprints to one coherent layer.

Suggested shape (adjust to the plan):
1. **Sprint 1 — Foundation:** scaffold, `tsconfig`, scripts, `env.ts` (+ crash test), errors, prisma singleton.
2. **Sprint 2 — Framework:** logger, response helper, event bus, utils (+ unit tests), db fixture, user factory.
3. **Sprint 3 — Guards:** Request augmentation, `validateRequest`, `requireAuth`, error handler, pino-http (+ middleware unit tests).
4. **Sprint 4 — Boot:** `app.ts`, `server.ts`, `/health` smoke test.

---

## Sprint Template

````markdown
### Sprint [N]: [Name]   — Status: ⬜ Pending

**Goals**
- [Clear outcome.]

**Tasks**
- [ ] [Impl: e.g. `src/common/utils/token.utils.ts`.]
- [ ] [Data: e.g. `test/data/user.factory.ts` returning contract-shaped objects.]
- [ ] [Test: e.g. `test/unit/utils/token.utils.spec.ts`.]

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` — all new unit tests pass.
- [ ] Test files in the correct folder; no hardcoded data (factories only).
- [ ] No `console.*`; no `process.env` outside `env.ts`; no DB calls in middleware (except `requireAuth({checkDB})`).
- [ ] Committed on green.
````

---

## Expected Output

- **`/docs/stage-02-backend/sub-01-init/sprints.md`**.
