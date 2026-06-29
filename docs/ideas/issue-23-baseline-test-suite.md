# Idea: baseline test suite for current build behavior

Created: 2026-06-28
Status: ready-for-spec

## Summary

Add a small baseline test suite for issue #23 that documents current working output from `vite-plugin-shopify-import-maps`. The first suite should prefer real fixture builds in temporary directories, cover usage with `vite-plugin-shopify` as shown in the README and usage without it, and avoid tests for known failing behavior until those bugs are handled separately.

## Problem or opportunity

- The package has `build` and `lint` scripts, but no runnable test command.
- Future preload, import-map, or bare-module fixes need a stable baseline so a bug-specific test can start red without accidentally regressing behavior that already works.
- The plugin claims Vite 5–8 peer support, so tests should avoid patterns that only prove latest Vite behavior.
- The README positions this plugin as an addition to `vite-plugin-shopify`, but the implementation is also useful with a plain Vite/Rollup entry-point setup. Both modes should be represented.

## Options considered

### Option A: direct plugin-hook/unit tests only

- Pros: Fast, deterministic, simple to add, easy to target edge cases in `import-maps`, `bare-modules`, and `preload-helper`.
- Cons: Does not prove the plugin works in a real Vite build or with `vite-plugin-shopify` in the documented order.
- Validation: Useful as supplemental coverage after integration fixtures exist, not as the first baseline.

### Option B: real fixture builds with Vitest

- Pros: Exercises Vite's build lifecycle, real plugin ordering, on-disk `writeBundle` output, and generated `snippets/importmap.liquid` files.
- Cons: Slightly more setup than unit tests; fixtures must be kept small and deterministic.
- Validation: Copy immutable fixtures to `mkdtemp()` directories, run programmatic `vite.build()` with `write: true`, then assert stable substrings and generated files.

### Option C: fixture builds plus one CLI smoke test

- Pros: Adds confidence that `vite build` works from a fixture project, not only via the programmatic API.
- Cons: Slower and more sensitive to package-manager/install details; should not become the main test path.
- Validation: Keep at most one small smoke test if the spec decides install/path fidelity matters now.

### Option D: latest-Vite-only test suite

- Pros: Modern local behavior and early signal for Vite 8/Rolldown changes.
- Cons: Does not prove compatibility with the existing Vite 5–8 peer range and can hide regressions in older supported majors.
- Validation: Good as the local/default development setup only if CI also checks older supported majors.

### Option E: multi-major Vite compatibility matrix

- Pros: Aligns tests with the peer dependency claim.
- Cons: More CI setup and potential version-specific fixture issues.
- Validation: Run at least Vite 5 and Vite 8 as required jobs; Vite 6 and 7 can be required if CI cost is acceptable or optional/nightly if not.

### Option F: latest local tooling plus compatibility CI

- Pros: Keeps day-to-day development on current Vite/Vitest while still proving the published peer range.
- Cons: Requires CI to be the source of truth for older supported Vite majors.
- Validation: Use latest Vite locally, then run required CI jobs for Vite 5 and Vite 8 on a Node version that supports both.

## Current recommendation

- Use `forge-spec` next to define a small Vitest baseline around real fixture builds.
- Prefer latest Vite and latest compatible Vitest for local development.
- Add CI coverage across supported Vite majors rather than relying on latest Vite alone. For the first pass, require Vite 5 and Vite 8; expand to Vite 6 and Vite 7 later if the extra signal is worth the CI cost.
- Run the first compatibility matrix on Node 22.x. Vite 7 and Vite 8 require Node 20.19+ or Node 22.12+; `22.12` is the minimum supported 22.x patch, not a reason to pin CI to that exact patch. Using the latest Node 22 patch is preferable.
- If implementation switches tests/dev tooling to latest Vite/Vitest, update the existing release workflow away from Node 18 to Node 22.x.
- Do not add a Node `engines` restriction just for this test-suite work unless the project intentionally changes its published runtime support policy.
- Prefer fixture groups by behavior, following the `vite-plugin-shopify` style: isolated fixture directories instead of one fixture that tries to cover everything.
- Include two primary fixture modes:
  - documented Shopify mode: `shopify(...)` followed by `vite-plugin-shopify-import-maps(...)`;
  - plain mode: Vite/Rollup entry points without `vite-plugin-shopify`.
- For build tests, use real on-disk builds with `write: true` because this plugin's main snippet output is written during `writeBundle`.
- Stabilize build config with `target: 'esnext'`, `minify: false`, deterministic entry/chunk/asset names, and `logLevel: 'silent'`.
- Assert small stable substrings rather than full generated JS/CSS snapshots. Good checks include snippet existence, `<script type="importmap">`, expected `asset_url` entries, expected `modulepreload` lines with `fetchpriority="low"`, and expected inclusion or omission of bare-module aliases.
- Do not create an ADR for the first pass. A future ADR may be useful only if the project changes its official Vite support policy or CI compatibility contract.

## Node and Vite compatibility notes

- Vite 5: Node 18+.
- Vite 6: Node 18+.
- Vite 7: Node 20.19+ or Node 22.12+.
- Vite 8: Node 20.19+ or Node 22.12+.
- A Node 22.x CI lane can test both the oldest supported Vite major and the newest supported Vite major without creating a larger Node-by-Vite matrix.

## Unknowns

- Whether the first spec should include one CLI smoke test or defer it until after the programmatic fixture baseline lands.
- Whether `vite-plugin-shopify` integration should run in both required Vite 5 and Vite 8 lanes, or only in one lane while plain fixtures cover both.
- Whether this package should keep broad Vite 5–8 peer support after validating real behavior, or narrow support if older majors are costly.
- Exact minimum fixtures needed for `bareModules=true`, `modulePreload=true`, dynamic imports, and duplicate alias behavior without overfitting the baseline.
- Whether serve-mode empty snippet behavior belongs in the baseline or a later focused test.

## Links

- Issue: https://github.com/slavafyi/vite-plugin-shopify-import-maps/issues/23
- Status: `docs/status.md`
- Reference package: https://github.com/barrel/shopify-vite/tree/main/packages/vite-plugin-shopify
- Spec: `docs/specs/baseline-test-suite.md`
- ADR: none yet
