# Issue #24: preload helper integration

## Reproduction and cause

`tests/fixtures/preload-vite` is a minimal real application with two dynamic
imports, a shared JS module, and CSS imported by one lazy module. A production
build with `base: './'` and `build.modulePreload: true` exposes the default
helper's `new URL(dep, importerUrl).href` in the emitted JS on the original main
branch. The new helper-selection assertion failed before the correction.

The plugin targeted `\0vite/preload-helper`, but Vite 5-8 resolve and load
`\0vite/preload-helper.js`. Neither original hook matched that ID.

The lifecycle is:

1. Vite's build import analysis wraps dynamic imports with `__vitePreload` and
   injects an import from its virtual helper module.
2. Resolution and loading use `\0vite/preload-helper.js`.
3. Vite loads its default helper, and the plugin's `transform` replaces the
   module source before bundling.
4. Vite still constructs dependency tables in its later output hooks.

The lifecycle regression test observes resolution, loading, and Vite's original
source in an earlier transform, then checks the custom resolver in emitted JS.
Vite 5-7 use Rollup; Vite 8 also exercises the native Rolldown import-analysis
plugin. User `enforce: 'post'` plugins precede Vite's build-post plugins in the
inspected versions, so `enforce` alone was not the cause. Using `transform`
avoids depending on which `load` hook wins its first-result chain.

The resolver is emitted as literal JavaScript. Serializing a function containing
`import.meta` with `toString()` can otherwise capture a test runner's rewritten
metadata object instead of producing valid browser code.

## Coverage and compatibility

The 11 build tests cover relative and absolute bases, bare modules on/off,
minification on/off, the module lifecycle, and absence of a browser helper in
server and library builds. Non-bare builds also retain JS/CSS dependency tables.
Both the plugin's `modulePreload: true` and its default `false` are exercised:
that option controls Liquid preload tags, independently of Vite's build option.

Compatibility runs use an npm alias for the builder so Vitest 4 can keep its
supported Vite 8 dependency. For example:

```sh
pnpm add --save-dev --save-exact vite-compat@npm:vite@5.4.21
VITE_TEST_PACKAGE=vite-compat pnpm exec vitest run tests/preload-build.test.ts
```

CI covers 5.4.21, 6.4.2, 7.2.7, 8.0.0, 8.1.0, and the locked Vite version
(8.2.1 when this fix was developed). Each version passed all 11 integration
tests locally on Node 24.19.0. CI uses Node 22. The complete 25-test suite,
package build, TypeScript check, and a built-package smoke test pass with the
locked dependencies.

## Limits and separate work

Vite exposes no dedicated custom-helper replacement option in
`ModulePreloadOptions`: `resolveDependencies` customizes dependency lists, not
helper implementation. The standard transform hook works across the tested
versions, but the virtual module ID and `__vitePreload` export are internal
contracts. Future Vite changes require revalidation; the build tests guard this
boundary. There is no observed upstream blocker to correcting #24 on Vite 5-8.

This does not change the runtime deduplication algorithm from PR #34. Its tests
that call the former `load` hook directly will need adaptation when combined
with this change. It also does not correct bare-module dependency tables:
rewriting imports before Vite's dependency analysis can still yield empty tables
(the separate #25/#26/#28 problem area). Selecting the custom helper does not
by itself fix those URL/table or runtime behaviors.

Repository lint still reports 21 pre-existing runtime-code errors and one
warning; the new tests, fixture, and test helper pass targeted lint.
