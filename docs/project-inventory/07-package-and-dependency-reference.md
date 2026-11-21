# Package and Dependency Reference

## Direct dependencies

| Package | Type | What it does | Used by | Need |
|---|---|---|---|---|
| `next` | Production | Framework, routing, middleware, build, server and API runtime | entire application | Essential |
| `react` | Production | Browser component model | all interactive pages | Essential |
| `react-dom` | Production | React rendering integration | Next.js | Essential |
| `firebase-admin` | Production | Firestore, Storage, and server credentials | API routes and server helpers | Essential while Firebase features remain |

## Direct development dependencies

| Package | What it does | Where used |
|---|---|---|
| `typescript` | Static type checking | source and `tsc` |
| `eslint` | JavaScript/TypeScript linting | `npm run lint` |
| `eslint-config-next` | Next.js-specific lint rules | ESLint configuration |
| `@types/node` | Node.js type definitions | server/test code |
| `@types/react` | React type definitions | components |
| `@types/react-dom` | React DOM type definitions | components |
| `vitest` | Unit-test runner | `lib/*.test.ts`, `tests/unit/**` |
| `@vitejs/plugin-react` | JSX transform for Vitest | `vitest.config.ts` |
| `jsdom` | Browser-like unit-test environment | Vitest |
| `@testing-library/jest-dom` | DOM assertions | `tests/setup.ts` |
| `@playwright/test` | Browser/e2e testing | `tests/e2e/**` |
| `@axe-core/playwright` | Axe accessibility checks | accessibility tests |

## Transitive dependencies

Transitive dependencies are packages installed because a direct package requires them. They are not manually imported in application source.

The lockfile controls exact transitive versions. No package removal is recommended from a direct-manifest-only audit.

## Overrides

`package.json` contains overrides for:

- `next.postcss`
- `@typescript-eslint/typescript-estree.minimatch`

These are transitive dependency adjustments, not direct application features.

## No known unnecessary direct package

No direct dependency was independently identified as unused:

- React and Next.js are framework dependencies.
- Firebase Admin is used across API routes.
- Vitest/JSDOM/testing packages support tests.
- Playwright/Axe support browser and accessibility suites.
- ESLint/TypeScript packages support quality checks.
