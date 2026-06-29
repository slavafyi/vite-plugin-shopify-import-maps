import type { InlineConfig } from 'vite'
import { describe, expect, test } from 'vitest'
import vitePluginShopifyImportMaps from '../src'
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

function plainViteConfig(plugins: ReturnType<typeof vitePluginShopifyImportMaps>): InlineConfig {
  return {
    plugins,
    build: {
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
})
