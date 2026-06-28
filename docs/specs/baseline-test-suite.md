# Spec: baseline test suite

Created: 2026-06-28
Status: ready

## Goal

Add a small automated baseline test suite that documents the current working build output of `vite-plugin-shopify-import-maps` before issue #23 fixes or related preload/import-map/bare-module changes are made.

The suite should prove the plugin works in the README-documented Shopify setup and in a plain Vite/Rollup setup, while avoiding tests for behavior that is already known to be broken and should be fixed separately.

## Background

The package currently has `build` and `lint` scripts, but no runnable test command. The plugin writes its main observable output, `snippets/importmap.liquid`, during Vite/Rollup `writeBundle`, so the first baseline should exercise real build output rather than only direct helper or hook calls.

The README documents usage with `vite-plugin-shopify` followed by `vite-plugin-shopify-import-maps`, but the implementation can also be used with a plain Vite project that declares Rollup entry points. Both modes are part of the expected baseline.

The package peer dependency currently claims support for Vite 5, 6, 7, and 8. Local development may use current Vite/Vitest tooling, but CI should provide compatibility signal for at least the oldest and newest supported Vite majors.

## Scope

### In scope

- Add a runnable automated test command for the repository.
- Add Vitest-based integration tests that run real Vite builds against copied fixture projects in temporary directories.
- Cover the documented Shopify mode: `vite-plugin-shopify` configured before `vite-plugin-shopify-import-maps` as shown in the README.
- Cover plain Vite mode: explicit Rollup entry points without `vite-plugin-shopify`.
- Assert generated on-disk output, especially `snippets/importmap.liquid`.
- Cover current working output for import maps, optional bare-module aliases, and optional modulepreload links.
- Add required CI compatibility coverage for Vite 5 and Vite 8 on Node 22.x.
- Update any existing release or validation workflow that installs test/dev dependencies to use Node 22.x if the implementation requires Vite/Vitest versions that no longer support Node 18.
- Include a small dynamic-import fixture case that passes with the current plugin behavior.
- Cover option defaulting and selected option overrides for `bareModules`, `themeRoot`, `snippetFile`, and `modulePreload` without creating a full cross-product matrix.

### Out of scope

- Fixing issue #23 or any other plugin behavior bug.
- Adding tests that intentionally fail for known broken behavior before that bug is being fixed.
- Changing the plugin runtime behavior, public options, or generated Liquid output as part of the baseline suite.
- Narrowing the package's published Vite peer range.
- Adding a Node `engines` restriction only because the test suite uses newer local tooling.
- Requiring Vite 6 and Vite 7 in the first CI matrix.
- Adding a CLI smoke test in the first baseline; use programmatic real fixture builds instead.
- Creating an ADR for this first-pass baseline.
- Testing Vite dev-server or serve-mode behavior, including the current empty-snippet behavior in `serve`.

## Requirements

- The repository must expose a test command that can be run with `pnpm test`.
- Tests must use real fixture builds with `write: true` so `writeBundle` output is created on disk.
- Fixture source directories must be treated as immutable inputs. Each test must copy the needed fixture into a temporary directory before building.
- Test builds must use deterministic output settings: `target: 'esnext'`, `minify: false`, deterministic entry/chunk/asset names, and quiet logging.
- Assertions must prefer small stable substrings and file-existence checks over full snapshots of generated JavaScript, CSS, or Liquid.
- The Shopify-mode fixture must keep plugin ordering consistent with the README: `shopify(...)` before `vite-plugin-shopify-import-maps(...)`.
- The plain-mode fixture must prove the import-map plugin can run without `vite-plugin-shopify` when Rollup input entries are configured directly.
- The baseline must include at least one passing case with `bareModules: false`.
- The baseline must include at least one passing case with `bareModules` enabled and a configured group mapping.
- The baseline must include at least one passing case with `modulePreload: true`.
- The baseline must include a small dynamic-import case that builds successfully today and documents current working output without asserting known broken behavior.
- The option coverage must include a no-user-options case and focused override/defaulting cases for `bareModules`, `themeRoot`, `snippetFile`, and `modulePreload`.
- The option coverage must avoid exhaustive combinations; each case should isolate one behavior unless combining options is necessary to produce useful build output.
- Compatibility CI must run the baseline suite, including documented Shopify mode with `vite-plugin-shopify`, against Vite 5 and Vite 8 on Node 22.x.
- Version-specific failures in documented Shopify mode must not be ignored or skipped silently; they should block completion until there is a compatibility solution or an explicit follow-up product decision.
- Vite 6 and Vite 7 may be added later, but their absence must not make this first baseline incomplete.

## Acceptance criteria

- [ ] `pnpm test` runs the baseline suite and exits successfully on a local checkout.
- [ ] The documented Shopify fixture performs a real build and creates `snippets/importmap.liquid` in the copied fixture theme root.
- [ ] The plain Vite fixture performs a real build without `vite-plugin-shopify` and creates `snippets/importmap.liquid` in the copied fixture theme root.
- [ ] Generated import-map snippets include `<script type="importmap">` and expected `asset_url` Liquid values for emitted JavaScript chunks.
- [ ] A `bareModules: false` case asserts the current non-bare import-map keys and fallback Liquid asset-url keys that the plugin emits today.
- [ ] A `bareModules`-enabled case asserts the expected configured bare-module alias keys and verifies unwanted non-bare aliases are not present for that case.
- [ ] A `modulePreload: true` case asserts generated `<link rel="modulepreload" ... fetchpriority="low">` lines for expected emitted chunks.
- [ ] A small dynamic-import case passes today and asserts only current working output.
- [ ] Focused option tests cover no user options, `bareModules`, `themeRoot`, `snippetFile`, and `modulePreload` default/override behavior without a full cross-product matrix.
- [ ] The Shopify fixture is based on the `hydrogen-theme` frontend/entrypoints plus lib/islands pattern.
- [ ] The plain Vite fixture is based on the `import-map-plugin-repro` entry/main/feature dynamic import pattern.
- [ ] No test writes generated build output into committed fixture source directories.
- [ ] Required CI runs the baseline suite, including documented Shopify mode, for Vite 5 and Vite 8 on Node 22.x.
- [ ] `pnpm lint`, `pnpm build`, and `pnpm test` all pass after the baseline suite is added.

## UX, API, or behavior details

- The primary developer-facing command is `pnpm test`.
- The baseline tests should document current observable output; they should not redefine the plugin API or expected generated markup beyond behavior that already works.
- Test fixture names should make the covered mode clear, for example Shopify/documented mode versus plain Vite mode.
- The suite should favor table-driven tests for option coverage so each option case is visible without duplicating fixture setup.

## Option coverage details

The first baseline should cover these option cases with the smallest number of focused builds that keeps failures easy to understand:

- No user options: calling `vite-plugin-shopify-import-maps()` should use the default snippet file, default theme root, `bareModules: false`, and `modulePreload: false` behavior.
- `bareModules`: cover `bareModules: true`, `bareModules: false`, an object with an omitted/default `defaultGroup`, an object with a custom `defaultGroup`, an object with `groups: {}`, and an object with non-default groups based on the README example.
- `themeRoot`: cover default/omitted `themeRoot` behavior and a custom non-default theme root that writes `snippets/importmap.liquid` under that root.
- `snippetFile`: cover default/omitted `snippetFile` behavior and a custom non-default snippet file name.
- `modulePreload`: cover default/omitted behavior, `modulePreload: false`, and `modulePreload: true`.
- `modulePreload: true`: specifically assert generated modulepreload links include `fetchpriority="low"`.

Top-level omitted options should use the plugin defaults. Nested `bareModules` object properties should be tested as omitted properties, not explicit `undefined` values. Explicit `undefined` values inside `bareModules` are outside the typed public API for this baseline because `BareModules.defaultGroup` and `BareModules.groups` are typed as required properties.

## Fixture source details

- Shopify fixture: base the fixture shape on `montalvomiguelo/hydrogen-theme` at `1d9445604a6e49d8e9abb958ea2c85bdc334fc36`, especially `frontend/entrypoints/theme.js`, `frontend/lib/revive.js`, and `frontend/islands/*.js`. The important behavior is a theme entrypoint that imports `vite/modulepreload-polyfill`, imports frontend lib modules through an alias, and uses an islands pattern through `import.meta.glob('@/islands/*.js')`.
- Plain Vite fixture: base the fixture shape on `JasonHassold/import-map-plugin-repro` at `f7be9ed3688b119a7dd36e33be84eb822e9d4b1d`, especially `src/entry.js`, `src/main.js`, and `src/feature.js`. The important behavior is an entry module that dynamically imports `main.js`, while `main.js` dynamically imports `feature.js` and `feature.js` statically imports from `main.js`.
- Fixtures may be minimized rather than copied wholesale. If source code is copied directly from an external repository, preserve any required license attribution.

## Edge cases

- Build output must be deterministic enough that tests do not fail because of hashes, minification, absolute temporary paths, or noisy logs.
- Fixture copies must isolate tests from each other and from the repository working tree.
- Assertions should avoid full generated-code snapshots because Vite/Rollup output can vary between supported majors.
- CI should use a Node 22.x version new enough for Vite 7 and Vite 8 compatibility, while still being valid for Vite 5.
- If a candidate dynamic-import fixture exposes behavior that fails today, the baseline must be adjusted to a smaller passing dynamic-import case rather than adding a red regression test to this issue.
- If a requested option case only fails when using invalid runtime input that is outside the typed public API, keep the baseline green and record the behavior as a separate follow-up decision instead of fixing it in this issue.

## Constraints

- Existing ADRs: none found.
- Project-local skills: none found.
- Compatibility: Vite 5 through Vite 8 are the current peer dependency range; first-pass required CI covers Vite 5 and Vite 8.
- Security/privacy: tests should not require network access, external Shopify stores, credentials, or a real Shopify theme.
- Performance: keep fixture builds small enough for regular local and CI use.

## Test and validation expectations

- Small/unit tests: optional later; not required for this first baseline.
- Component/integration/real dependency tests: required through Vitest-driven real Vite fixture builds.
- Contract/schema compatibility tests: required through Vite 5 and Vite 8 CI coverage, including documented Shopify mode in both lanes.
- Property/fuzz tests: out of scope.
- E2E/broad-stack tests: out of scope; no real Shopify store or theme deployment is required.
- Specialized tests: visual, accessibility, LLM eval, performance, and security tests are out of scope.
- Regression proof: the baseline should protect current working import-map, bare-module, and modulepreload output from accidental regressions.
- Manual checks: none required beyond reviewing generated fixture expectations when the suite is introduced.
- Out of scope: CLI smoke tests until the programmatic fixture baseline is in place.

## Open questions

- None.

Resolved decisions:
  - Test omitted nested `bareModules` properties, not explicit `undefined` values.
  - Keep explicit `undefined` values inside `bareModules` out of scope for this baseline unless a later hardening issue chooses to support them.
  - Defer CLI smoke tests; use programmatic real fixture builds for the first baseline.
  - Run documented `vite-plugin-shopify` integration in required Vite 5 and Vite 8 CI lanes; solve version-specific problems rather than ignoring them.
  - Include dynamic imports only as a small case that passes with current behavior.

## Links

- Status: `docs/status.md`
- Idea: `docs/ideas/issue-23-baseline-test-suite.md`
- Issue: https://github.com/slavafyi/vite-plugin-shopify-import-maps/issues/23
- Plan: `docs/plans/baseline-test-suite.md`
- ADR: none
