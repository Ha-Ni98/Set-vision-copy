# Stage 01 — Prompts

Thin triggers for each phase. The detail lives in the phase files and `contract-rules.md`; these just point the agent at the right inputs. Filenames here match the files on disk exactly.

**Standing rules (apply to every prompt below):**
- Follow the precedence/conflict policy in `contract-rules.md` §0. Resolve HOW conflicts in favour of the rules file and note them; **stop and ask** only on a genuine WHICH conflict (a spec asks for something the rules forbid).
- If anything is genuinely ambiguous, ask explicit clarification questions before continuing. Otherwise proceed.

---

## Phase 1 — Plan

I have generated the per-module specs. Produce the architecture plan for the `@my-app/contract` package.

Read and follow strictly:
- **Phase file:** `stage-01-phase-01-plan.md`
- **Rules:** `contract-rules.md`
- **Input:** the `module-contracts/` folder (contract-relevant sections only) and `prisma.schema`

Constraints:
1. Do not write any code.
2. No business logic, DB code, or backend imports anywhere.
3. Output only `/docs/stage-01-contract/plan.md`.

---

## Phase 2 — Sprints

The plan is done. Produce the sprint plan.

Read and follow strictly:
- **Phase file:** `stage-01-phase-02-sprints.md`
- **Plan:** `/docs/stage-01-contract/plan.md`
- **Rules:** `contract-rules.md`

Constraints:
1. Do not write any code.
2. Sprint 0 is the `common/` foundation; core modules (auth/user) before dependents; 1–3 modules per sprint.
3. Every sprint includes the full Validation block from the template.
4. Output only `/docs/stage-01-contract/sprints.md`.

---

## Phase 3 — Execute

The sprints are defined. Begin execution.

Read and follow strictly:
- **Phase file:** `stage-01-phase-03-execute.md`
- **Sprints:** `/docs/stage-01-contract/sprints.md`
- **Plan:** `/docs/stage-01-contract/plan.md`
- **Rules:** `contract-rules.md`
- **Input:** the `module-contracts/` file(s) for this sprint's module(s)

Instructions:
1. Follow the Context Protocol: load only the files listed for this sprint.
2. Identify the **first sprint not marked ✅** and execute only that one.
3. Strict 6-file-max-per-module structure; zero logic; ISO-string dates.
4. Validate (`tsc --noEmit`, `madge --circular src`, lint), commit on green, write the report, mark the sprint ✅.
5. Stop and wait for `next`.
