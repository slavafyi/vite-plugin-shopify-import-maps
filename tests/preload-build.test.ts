import type { Plugin } from 'vite'
import { describe, expect, test } from 'vitest'
import vitePluginShopifyImportMaps from '../src'
import { buildFixture } from './helpers/build-fixture'

// A real build must select the helper: calling a plugin hook directly cannot
// catch a wrong virtual module ID or a competing Vite load hook.
describe('preload helper integration', () => {
  test.each([
    { base: './', bareModules: false, minify: false },
    { base: '/', bareModules: false, minify: false },
    { base: './', bareModules: true, minify: false },
    { base: '/', bareModules: true, minify: false },
    { base: './', bareModules: false, minify: true },
    { base: '/', bareModules: false, minify: true },
    { base: './', bareModules: true, minify: true },
    { base: '/', bareModules: true, minify: true },
  ])('emits the custom helper with $base, bareModules=$bareModules, minify=$minify', async ({ base, bareModules, minify }) => {
    const fixture = await buildFixture('preload-vite', ({ themeRoot }) => ({
      base,
      plugins: vitePluginShopifyImportMaps({ themeRoot, modulePreload: true, bareModules }),
      build: {
        modulePreload: true,
        minify,
        rollupOptions: { input: 'src/entry.ts' },
      },
    }))

    try {
      const files = await fixture.listAssets()
      const code = (await Promise.all(files.filter(file => file.endsWith('.js')).map(fixture.readAsset))).join('\n')
      // Unlike Vite's default helper (including newer versions that also use
      // import.meta.resolve), ours passes the importer as a second argument.
      expect(code).toMatch(/import\.meta\.resolve\([^,\(\)]+,\s*[^\)]+\)/v)
      expect(code).not.toContain('new URL(')
      expect(files).toContain('feature.css')
      // bareModules currently rewrites imports before Vite computes preload
      // tables (a separate issue); helper selection must work in either mode.
      if (!bareModules) {
        expect(code).toContain('feature.css')
        expect(code).toContain('shared.js')
      }
      expect(code).toMatch(/import\(["'`](?:\.\/|main\/)feature(?:\.js)?["'`]\)/v)
      expect(await fixture.readSnippet()).toContain('<link rel="modulepreload"')
    }
    finally {
      await fixture.cleanup()
    }
  })

  test('replaces source loaded by Vite after resolution and loading', async () => {
    const resolved: string[] = []
    const loaded: string[] = []
    const transformed: string[] = []
    const observer: Plugin = {
      name: 'observe-vite-preload-helper',
      enforce: 'pre',
      resolveId(id) {
        if (id.includes('vite/preload-helper')) resolved.push(id)
      },
      load(id) {
        if (id.includes('vite/preload-helper')) loaded.push(id)
      },
      transform(code, id) {
        if (id.includes('vite/preload-helper')) transformed.push(code)
      },
    }
    const fixture = await buildFixture('preload-vite', ({ themeRoot }) => ({
      base: './',
      plugins: [observer, ...vitePluginShopifyImportMaps({ themeRoot })],
      build: { rollupOptions: { input: 'src/entry.ts' } },
    }))

    try {
      expect(resolved).toContain('\0vite/preload-helper.js')
      expect(loaded).toContain('\0vite/preload-helper.js')
      expect(transformed).toHaveLength(1)
      expect(transformed[0]).toContain('new URL(dep, importerUrl).href')
      const entry = await fixture.readAsset('entry.js')
      expect(entry).toContain('import.meta.resolve(dep, importerUrl)')
      expect(entry).not.toContain('new URL(dep, importerUrl)')
      // The plugin's modulePreload option only controls Liquid link tags;
      // the helper must also work when that option keeps its default false.
      expect(await fixture.readSnippet()).not.toContain('<link rel="modulepreload"')
    }
    finally {
      await fixture.cleanup()
    }
  })

  test.each(['ssr', 'lib'] as const)('does not inject a browser helper into a %s build', async (mode) => {
    const fixture = await buildFixture('preload-vite', ({ themeRoot }) => ({
      plugins: vitePluginShopifyImportMaps({ themeRoot, modulePreload: true }),
      build: mode === 'ssr'
        ? { ssr: 'src/entry.ts' }
        : { lib: { entry: 'src/entry.ts', formats: ['es'] } },
    }))

    try {
      const files = await fixture.listAssets()
      const code = (await Promise.all(files.filter(file => file.endsWith('.js')).map(fixture.readAsset))).join('\n')
      expect(code).toContain('shared:')
      expect(code).not.toContain('import.meta.resolve(')
      expect(code).not.toContain('document.getElementsByTagName')
    }
    finally {
      await fixture.cleanup()
    }
  })
})
