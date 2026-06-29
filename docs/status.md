# Project status

Updated: 2026-06-29

## Current focus

- Baseline test suite implementation is in place through Vite 8 CI; final completion is blocked by deferred Vite 5 CI and pre-existing source lint failures.

## Recent work

- Project continuation status was initialized.
- Researched issue #23, Vite plugin test patterns, and `vite-plugin-shopify` fixtures.
- Captured the test-suite direction in an idea note.
- Updated the idea note to prefer latest local tooling with Vite 5 and Vite 8 compatibility CI on Node 22.x.
- Drafted the baseline test-suite spec.
- Resolved the first set of spec questions.
- Marked the spec as draft again pending additional testing notes.
- Added requested option coverage and external fixture source details to the spec.
- Resolved nested `bareModules` undefined handling and marked the spec ready.
- Renamed the spec to a durable slug without the issue prefix.
- Created an active implementation plan for the baseline test suite.
- Added a Vitest integration harness with copied plain Vite fixtures.
- Added a documented Shopify fixture using `vite-plugin-shopify` before this plugin.
- Added focused option coverage for defaults, `bareModules`, `themeRoot`, `snippetFile`, and `modulePreload`.
- Added Vite 8-only GitHub Actions coverage on Node 22.x with an explicit installed Vite major assertion.
- Deferred Vite 5 CI because the current security override for `vite@<=6.4.1` and `vitest@4` make a real Vite 5 lane incompatible without a separate test stack.
- Refactored the test suite into focused `import-map`, `bare-modules`, and `shopify` integration files with a shared temp-fixture build helper.
- Moved the real `vite-plugin-shopify` test dependency to the root dev dependencies and removed the Shopify fixture workspace package/re-export.
- Simplified the Shopify integration test to use `vite-plugin-shopify` defaults for `frontend/entrypoints` and Rollup input while building from a temporary fixture copy.

## Next action

- Decide whether to add a separate Vite 5 compatibility test stack, or keep Vite 5 CI deferred while the security override and Vitest 4 remain in place.
- Separately decide whether to fix pre-existing `src/*` lint failures so `pnpm lint` can become a passing final validation gate.

## Open questions

- Should Vite 5 remain in the published peer range without required CI, or should a separate Vite 5 test stack be added?
- Should the pre-existing lint failures in `src/bare-modules.ts`, `src/import-maps.ts`, and `src/preload-helper.ts` be fixed as part of this branch or separately?

## Validation

- Passed: `pnpm test`.
- Passed: `pnpm build`.
- Passed: targeted lint for test/config files with `pnpm exec eslint --ext .ts tests vitest.config.ts eslint.config.ts`.
- Passed: local Vite 8 version assertion used by CI.
- Passed: `git diff --check` after implementation slices.
- Passed: `pnpm install --lockfile-only`, `pnpm test`, `pnpm build`, and `git diff --check` after isolating the `shopify-vite` fixture dependency.
- Passed: `pnpm test`, `pnpm build`, `pnpm exec eslint --ext .ts tests vitest.config.ts eslint.config.ts`, and `git diff --check` after refactoring the test helper/files and moving `vite-plugin-shopify` to root dev dependencies.
- Failed, known pre-existing: `pnpm lint` reports only `src/*` lint errors that predate the test-suite work.
- Deferred: required Vite 5 CI coverage; current CI covers Vite 8 only.

## Relevant artifacts

- Idea: `docs/ideas/issue-23-baseline-test-suite.md`
- Spec: `docs/specs/baseline-test-suite.md`
- Plan: `docs/plans/baseline-test-suite.md`
