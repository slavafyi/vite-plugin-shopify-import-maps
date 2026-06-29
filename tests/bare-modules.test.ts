import type { InlineConfig } from 'vite'
import { describe, expect, test } from 'vitest'
import vitePluginShopifyImportMaps from '../src'
import bareModulesPlugin from '../src/bare-modules'
import type { BareModules } from '../src/types'
import { buildFixture } from './helpers/build-fixture'

interface BareModulesCase {
  name: string
  options: Parameters<typeof vitePluginShopifyImportMaps>[0]
  expectedImportMap: string[]
  unexpectedImportMap?: string[]
  expectedAssets: Array<{ file: string, contains: string[] }>
  unexpectedAssets?: Array<{ file: string, contains: string[] }>
}

interface TestChunk {
  type: 'chunk'
  fileName: string
  name: string
  code: string
  moduleIds: string[]
  map?: unknown
}

type RenderChunkHook = (code: string, chunk: TestChunk) => void
type GenerateBundleHook = (options: { sourcemap: false }, bundle: Record<string, TestChunk>) => void

function plainViteConfig(
  plugins: ReturnType<typeof vitePluginShopifyImportMaps>,
  options: { minify?: boolean } = {},
): InlineConfig {
  return {
    plugins,
    build: {
      minify: options.minify,
      rollupOptions: {
        input: 'src/entry.ts',
      },
    },
  }
}

describe('bare modules', () => {
  const cases: BareModulesCase[] = [
    {
      name: 'bareModules false keeps path imports',
      options: { bareModules: false },
      expectedImportMap: ['"/entry.js"', '"{{ \'entry.js\' | asset_url | split: \'?\' | first }}"'],
      unexpectedImportMap: ['"main/entry"'],
      expectedAssets: [
        { file: 'entry.js', contains: ['import("./main.js")'] },
        { file: 'main.js', contains: ['import("./feature.js")'] },
        { file: 'feature.js', contains: ['./main.js'] },
      ],
    },
    {
      name: 'bareModules true emits default bare aliases',
      options: { bareModules: true },
      expectedImportMap: ['"main/entry"', '"main/main"', '"main/feature"'],
      unexpectedImportMap: ['"/entry.js"'],
      expectedAssets: [
        { file: 'entry.js', contains: ['import("main/main")'] },
        { file: 'main.js', contains: ['import("main/feature")'] },
        { file: 'feature.js', contains: ['main/main'] },
      ],
      unexpectedAssets: [
        { file: 'entry.js', contains: ['./main.js'] },
        { file: 'main.js', contains: ['./feature.js'] },
      ],
    },
    {
      name: 'bareModules object respects omitted defaultGroup and custom groups',
      options: { bareModules: { groups: {} } as unknown as BareModules },
      expectedImportMap: ['"main/entry"', '"main/main"', '"main/feature"'],
      expectedAssets: [
        { file: 'entry.js', contains: ['import("main/main")'] },
        { file: 'main.js', contains: ['import("main/feature")'] },
      ],
    },
    {
      name: 'bareModules object respects custom defaultGroup with omitted groups',
      options: { bareModules: { defaultGroup: 'vendors' } as unknown as BareModules },
      expectedImportMap: ['"vendors/entry"', '"vendors/main"', '"vendors/feature"'],
      expectedAssets: [
        { file: 'entry.js', contains: ['import("vendors/main")'] },
        { file: 'main.js', contains: ['import("vendors/feature")'] },
      ],
    },
    {
      name: 'bareModules object respects custom defaultGroup and non-default groups',
      options: { bareModules: { defaultGroup: 'vendors', groups: { general: ['src/entry'], helpers: 'feature.ts' } } satisfies BareModules },
      expectedImportMap: ['"general/entry"', '"vendors/main"', '"helpers/feature"'],
      expectedAssets: [
        { file: 'entry.js', contains: ['import("vendors/main")'] },
        { file: 'main.js', contains: ['import("helpers/feature")'] },
        { file: 'feature.js', contains: ['vendors/main'] },
      ],
    },
  ]

  test.each(cases)('$name', async (testCase) => {
    const fixture = await buildFixture('plain-vite', ({ themeRoot }) => plainViteConfig(
      vitePluginShopifyImportMaps({ themeRoot, ...testCase.options }),
    ))

    try {
      const importMap = await fixture.readSnippet()

      for (const expected of testCase.expectedImportMap) expect(importMap).toContain(expected)
      for (const unexpected of testCase.unexpectedImportMap ?? []) expect(importMap).not.toContain(unexpected)

      await Promise.all(testCase.expectedAssets.map(async (asset) => {
        const output = await fixture.readAsset(asset.file)
        for (const expected of asset.contains) expect(output).toContain(expected)
      }))

      await Promise.all((testCase.unexpectedAssets ?? []).map(async (asset) => {
        const output = await fixture.readAsset(asset.file)
        for (const unexpected of asset.contains) expect(output).not.toContain(unexpected)
      }))
    }
    finally {
      await fixture.cleanup()
    }
  })

  test('rewrites no-substitution template-literal dynamic imports', () => {
    const plugin = bareModulesPlugin({
      bareModules: { defaultGroup: 'chunks', groups: {} },
      modulePreload: false,
      snippetFile: 'importmap.liquid',
      themeRoot: '.',
    })
    const renderChunk = plugin.renderChunk as unknown as RenderChunkHook
    const generateBundle = plugin.generateBundle as unknown as GenerateBundleHook
    const bundle = {
      'entry.js': createTestChunk('entry', 'export const load = () => import(`./feature.js`)'),
      'feature.js': createTestChunk('feature', 'export const feature = true'),
    }

    for (const chunk of Object.values(bundle)) renderChunk(chunk.code, chunk)
    generateBundle({ sourcemap: false }, bundle)

    expect(bundle['entry.js'].code).toContain('import(`chunks/feature`)')
    expect(bundle['entry.js'].code).not.toContain('./feature.js')
  })

  test('rewrites bare module imports in minified builds', async () => {
    const fixture = await buildFixture('plain-vite', ({ themeRoot }) => plainViteConfig(
      vitePluginShopifyImportMaps({
        bareModules: { defaultGroup: 'chunks', groups: {} },
        modulePreload: false,
        themeRoot,
      }),
      { minify: true },
    ))

    try {
      const importMap = await fixture.readSnippet()
      const entry = await fixture.readAsset('entry.js')
      const main = await fixture.readAsset('main.js')

      expect(importMap).toContain('"chunks/entry"')
      expect(importMap).toContain('"chunks/main"')
      expect(importMap).toContain('"chunks/feature"')
      expect(entry).toContain('import(`chunks/main`)')
      expect(main).toContain('import(`chunks/feature`)')
      expect(entry).not.toContain('./main.js')
      expect(main).not.toContain('./feature.js')
    }
    finally {
      await fixture.cleanup()
    }
  })
})

function createTestChunk(name: string, code: string): TestChunk {
  return {
    code,
    fileName: `${name}.js`,
    moduleIds: [`/fixture/src/${name}.ts`],
    name,
    type: 'chunk',
  }
}
