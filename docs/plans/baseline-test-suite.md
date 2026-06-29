# Plan: baseline test suite

Created: 2026-06-29
Status: active; Vite 5 CI and full lint validation deferred

Spec: `docs/specs/baseline-test-suite.md`

## Strategy

Build the suite in risk-first vertical slices: first prove the programmatic Vitest/Vite fixture harness can create real on-disk import-map output in plain Vite mode, then add the documented Shopify integration, then broaden option coverage, and only then wire the full suite into Vite-major CI compatibility lanes. Each slice should keep fixtures immutable by copying them to temporary directories before builds.

## Slices

### 1. Plain Vite integration harness

Status: completed (`a6a5130`)

Outcome:
- Add the minimal test runner setup and a plain Vite fixture that runs through a real `vite.build({ write: true })` path.
- Expose `pnpm test` and prove the copied plain fixture writes `snippets/importmap.liquid` without touching committed fixture sources.
- Include the small passing dynamic-import shape from the spec in this plain fixture.

Acceptance criteria covered:
- `pnpm test` runs the baseline suite and exits successfully on a local checkout.
- The plain Vite fixture performs a real build without `vite-plugin-shopify` and creates `snippets/importmap.liquid` in the copied fixture theme root.
- Generated import-map snippets include `<script type="importmap">` and expected `asset_url` Liquid values for emitted JavaScript chunks.
- A small dynamic-import case passes today and asserts only current working output.
- The plain Vite fixture is based on the `import-map-plugin-repro` entry/main/feature dynamic import pattern.
- No test writes generated build output into committed fixture source directories.

Likely files or modules:
- `package.json`
- `pnpm-lock.yaml`
- `vitest.config.ts` or test-local config in the test file
- `tests/import-maps.test.ts` or `tests/plain-vite.test.ts`
- `tests/helpers/*`
- `tests/fixtures/plain-vite/**/*`
- `src/import-maps.ts`
- `src/preload-helper.ts`

Test strategy:
- Portfolio fit: required baseline integration coverage; no unit tests needed for this slice.
- Layer: Vitest integration test around real Vite build output.
- Seam: programmatic Vite build against a temporary copy of an immutable fixture.
- Regression needed: yes, for current plain-mode import-map output and dynamic-import build success.
- Contract/property/specialized test needed: no contract matrix yet; CI compatibility comes later.
- Testcontainers or real dependency needed: no.
- CI tier: local `pnpm test` now; GitHub Actions later.

Validation:
- `pnpm test`
- `pnpm build` if package/test dependency changes expose type or bundling issues.

Dependencies:
- None.

Risks:
- The dynamic-import fixture may accidentally exercise behavior known to be broken by issue #23.
- Vite output names can vary unless the test config pins deterministic entry/chunk names.
- Console output from the plugin can make failures noisy unless test builds use quiet logging where possible.

Stop conditions:
- Stop and return to the spec if the smallest passing dynamic-import fixture requires changing plugin runtime behavior.
- Stop if the harness writes generated output into committed fixture directories instead of temporary copies.

### 2. Documented Shopify fixture

Status: completed (`f69b008`)

Outcome:
- Add a minimized Shopify-mode fixture based on the `hydrogen-theme` frontend/entrypoints plus lib/islands pattern.
- Configure `vite-plugin-shopify` before `vite-plugin-shopify-import-maps`, matching the README order.
- Prove a copied Shopify fixture writes `snippets/importmap.liquid` through a real build.

Acceptance criteria covered:
- The documented Shopify fixture performs a real build and creates `snippets/importmap.liquid` in the copied fixture theme root.
- Generated import-map snippets include `<script type="importmap">` and expected `asset_url` Liquid values for emitted JavaScript chunks.
- The Shopify fixture is based on the `hydrogen-theme` frontend/entrypoints plus lib/islands pattern.
- No test writes generated build output into committed fixture source directories.

Likely files or modules:
- `package.json`
- `pnpm-lock.yaml`
- `tests/shopify-vite.test.ts` or shared integration test file
- `tests/fixtures/shopify-vite/frontend/entrypoints/theme.js`
- `tests/fixtures/shopify-vite/frontend/lib/*`
- `tests/fixtures/shopify-vite/frontend/islands/*`
- `tests/helpers/*`

Test strategy:
- Portfolio fit: required documented-mode integration coverage.
- Layer: Vitest integration test around real Vite plus `vite-plugin-shopify` build output.
- Seam: README-style plugin order in a temporary copied theme fixture.
- Regression needed: yes, for current documented Shopify setup behavior.
- Contract/property/specialized test needed: not in this slice; Vite-major contract coverage comes in CI.
- Testcontainers or real dependency needed: no real Shopify store, credentials, or network.
- CI tier: local first, then Vite 5/8 matrix later.

Validation:
- `pnpm test`

Dependencies:
- Slice 1 harness and fixture-copy utilities.

Risks:
- `vite-plugin-shopify` may need additional theme structure or config beyond the minimized fixture.
- Directly copied fixture code may require license attribution; prefer minimized original code that only preserves the specified behavior.
- Shopify-mode failures can be version-specific and must not be skipped silently.

Stop conditions:
- Stop for a compatibility/product decision if documented Shopify mode fails in a way that requires changing public plugin behavior or dropping supported Vite versions.
- Stop if a faithful minimized fixture cannot be built without network access or real Shopify credentials.

### 3. Focused option coverage

Status: completed (`7fc3bf3`, follow-up `91e28e2`)

Outcome:
- Expand tests with table-driven cases for option defaults and selected overrides.
- Cover `bareModules`, `themeRoot`, `snippetFile`, and `modulePreload` without a full cross-product matrix.
- Assert stable import-map substrings, alias presence/absence, custom output paths, and modulepreload `fetchpriority="low"` lines.

Acceptance criteria covered:
- A `bareModules: false` case asserts the current non-bare import-map keys and fallback Liquid asset-url keys that the plugin emits today.
- A `bareModules`-enabled case asserts the expected configured bare-module alias keys and verifies unwanted non-bare aliases are not present for that case.
- A `modulePreload: true` case asserts generated `<link rel="modulepreload" ... fetchpriority="low">` lines for expected emitted chunks.
- Focused option tests cover no user options, `bareModules`, `themeRoot`, `snippetFile`, and `modulePreload` default/override behavior without a full cross-product matrix.

Likely files or modules:
- `tests/options.test.ts` or shared integration test file
- `tests/helpers/*`
- `tests/fixtures/plain-vite/**/*`
- `src/index.ts`
- `src/import-maps.ts`
- `src/bare-modules.ts`

Test strategy:
- Portfolio fit: baseline regression coverage for current observable option behavior.
- Layer: Vitest integration tests using real fixture builds.
- Seam: plugin public options passed through real Vite configs.
- Regression needed: yes, especially for fallback Liquid keys, bare-module aliases, and modulepreload tags.
- Contract/property/specialized test needed: no exhaustive matrix or property tests.
- Testcontainers or real dependency needed: no.
- CI tier: local now; required Vite-major matrix later.

Validation:
- `pnpm test`

Dependencies:
- Slice 1 harness.
- Slice 2 only if any option cases intentionally reuse Shopify mode; otherwise option cases can stay on plain fixtures for speed.

Risks:
- Chunk names and specifier aliases can shift if fixture entry names are not deterministic.
- `bareModules` object cases with omitted nested properties must be represented as omitted properties, not explicit `undefined` runtime inputs.
- Combining too many options in one case can make failures hard to diagnose.

Stop conditions:
- Stop if an option case only fails for invalid runtime input outside the typed public API; record it as a follow-up decision instead of changing behavior.
- Stop if satisfying a case requires modifying generated Liquid output rather than documenting current output.

### 4. Vite 5 and Vite 8 compatibility CI

Status: partially completed (`66015c4`); Vite 5 deferred

Outcome:
- Add required GitHub Actions coverage for the baseline suite on Node 22.x against Vite 5 and Vite 8.
- Run the same baseline suite, including documented Shopify mode, in both Vite-major lanes.
- Keep release workflow changes limited to what is necessary; update Node there only if it starts installing or validating the project with test/dev dependencies.

Implementation note:
- Added Vite 8-only GitHub Actions coverage on Node 22.x with an explicit installed Vite major assertion.
- Vite 5 was deferred by user decision because the current security override for `vite@<=6.4.1` and `vitest@4` make an honest Vite 5 lane incompatible without a separate test stack.

Acceptance criteria covered:
- Required CI runs the baseline suite, including documented Shopify mode, for Vite 5 and Vite 8 on Node 22.x.

Likely files or modules:
- `.github/workflows/test.yaml` or `.github/workflows/ci.yaml`
- `.github/workflows/release.yaml` only if required by dependency installation or validation changes
- `package.json`
- `pnpm-lock.yaml`

Test strategy:
- Portfolio fit: compatibility contract for the published peer range endpoints.
- Layer: CI integration test matrix.
- Seam: install dependencies, select Vite major per matrix lane, run the complete baseline suite.
- Regression needed: yes, to prevent baseline passing only on the local Vite major.
- Contract/property/specialized test needed: Vite 5/Vite 8 contract lanes are required; Vite 6/Vite 7 remain out of scope.
- Testcontainers or real dependency needed: no.
- CI tier: required GitHub Actions workflow.

Validation:
- `pnpm test` locally before committing workflow changes.
- Local workflow syntax review by inspection.
- If practical, run a local Vite-major swap for the non-local major before relying on CI.

Dependencies:
- Slices 1 through 3 complete enough that the baseline suite is meaningful.

Risks:
- The package's dev dependency and lockfile may pin a single Vite major locally while CI needs to exercise another.
- Current or latest Vitest versions may impose Node or Vite compatibility constraints that affect the CI install strategy.
- Documented Shopify mode may expose Vite-major incompatibilities that cannot be skipped silently.

Stop conditions:
- Stop if Vite 8 or Shopify-mode compatibility fails in CI without a clear compatibility solution.
- Stop if making CI green would require narrowing the published Vite peer range or skipping documented Shopify tests.

### 5. Final validation and continuation update

Status: in progress; final completion blocked by deferred Vite 5 CI and pre-existing source lint failures

Outcome:
- Run the complete local validation set and update continuation docs after implementation.
- Confirm no generated fixture output is left in committed source directories.
- Mark acceptance criteria complete only after the corresponding tests and CI coverage exist.

Acceptance criteria covered:
- `pnpm lint`, `pnpm build`, and `pnpm test` all pass after the baseline suite is added.

Likely files or modules:
- `docs/status.md`
- `docs/specs/baseline-test-suite.md` if acceptance checkboxes are updated after completion
- Any test or workflow files touched by earlier slices

Test strategy:
- Portfolio fit: final aggregate validation and project continuation hygiene.
- Layer: lint, build, test, and diff review.
- Seam: repository-level commands.
- Regression needed: yes, complete suite should catch accidental changes from final cleanup.
- Contract/property/specialized test needed: CI workflow should already provide Vite-major contract coverage.
- Testcontainers or real dependency needed: no.
- CI tier: local validation plus GitHub Actions after push.

Validation:
- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `git status --short`

Dependencies:
- Slices 1 through 4.

Risks:
- Generated build output, temp directories, or lockfile changes may be accidentally committed.
- Documentation may claim completion before CI compatibility is actually wired.

Stop conditions:
- Stop if any validation command fails and route to `forge-fix` instead of marking the plan done.
- Stop if CI compatibility has not been implemented; do not mark the baseline complete from local Vite results alone.

## Plan-level risks

- `vite-plugin-shopify` integration remains the highest-risk local dependency; keep it isolated in the private `tests/fixtures/shopify-vite` workspace fixture.
- Vite 8 compatibility may require CI install mechanics that differ from the local lockfile's Vite 5 development dependency.
- Fixture source should be minimized or attributed to avoid introducing untracked licensing obligations.
- Assertion stability depends on deterministic output names and avoiding broad generated-code snapshots.

## Checkpoints

- Before changing public API: stop; this plan is baseline tests only and must not change plugin runtime behavior.
- Before touching data migrations: not applicable.
- Before declaring done: `pnpm lint`, `pnpm build`, and `pnpm test` must pass locally, generated fixture output must be absent from committed fixture sources, and the CI workflow must include Vite 5 and Vite 8 on Node 22.x.

## Links

- Status: `docs/status.md`
- Spec: `docs/specs/baseline-test-suite.md`
- Idea: `docs/ideas/issue-23-baseline-test-suite.md`
- Issue: https://github.com/slavafyi/vite-plugin-shopify-import-maps/issues/23
- ADR: none
