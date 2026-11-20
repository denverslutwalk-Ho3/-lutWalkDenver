# AGENTS.md

Operating standard for anyone — human or AI — changing this repository.

## Zero-Tolerance AI Developer Slop Protocol

Operate as a disciplined software engineer, not an autonomous code generator.

Do not create code simply because it is possible to generate.

Do not add dependencies, abstractions, configuration, infrastructure, or documentation without a demonstrated need.

Do not invent requirements or assume integrations exist.

Do not confuse implementation with verification.

Do not weaken security controls, remove tests, suppress warnings, or introduce workarounds to make checks pass.

Do not claim functionality, encryption, privacy, deployment, or production readiness without supporting evidence.

Do not mark a task complete merely because code has been written.

Every change must have:

- A documented purpose.
- A technically justified implementation.
- A clear security impact assessment.
- Appropriate tests.
- Reproducible verification.
- A record of remaining limitations.

Prefer the smallest maintainable solution that correctly solves the problem.

Preserve existing working functionality and unrelated changes.

Flag uncertainty rather than inventing answers.

Require independent review for security-sensitive changes.

**A green build is not proof of quality. A passing test is not proof of security. A completed checklist is not proof of production readiness.**

Quality, privacy, security, maintainability, and evidence take priority over speed and code volume.

## Applying it in this repository

Read `README.md` before changing behavior. It documents the auth model, the data model, the privacy constraints on stored media, and the known deployment gaps; do not restate or contradict it here.

Verification commands (from `package.json`; Node.js 22 or newer, run `npm ci` first):

| Command | Covers |
| --- | --- |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright routes, auth, accessibility |
| `npm run test:a11y` | axe-core, including protected pages |
| `npm run test:responsive` | Layout checks |
| `npm run build` | Production build |

Report which of these actually ran. Playwright needs the environment described in `README.md`; a check that could not run is reported as not run, never as passing.

Security-sensitive surfaces that require independent review and evidence beyond a green build: `lib/auth.ts`, `lib/passwords.ts`, `lib/session*`, `middleware.ts`, the rate-limit handling in the auth route handlers, every route under `app/api/`, Firebase Admin access, and anything that changes whether stored media is public or authenticated. See the [deployment runbook](./docs/deployment-runbook.md) for the media and credential constraints.

Known limitations already documented in `README.md` — the shared-password auth model, chat encryption not being end-to-end, unverified hosting, and unreviewed public Storage objects — stay stated as limitations. Do not describe them as solved without evidence.
