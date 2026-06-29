import fs from 'node:fs/promises'
import path from 'node:path'
import type { InlineConfig } from 'vite'
import { describe, expect, test } from 'vitest'
import vitePluginShopifyImportMaps from '../src'
import type { BuiltFixture } from './helpers/build-fixture'
import { buildFixture } from './helpers/build-fixture'

interface ImportMapCase {
  name: string
  cwd?: 'fixture'
  snippetFile?: string
  themeRoot?: (fixture: BuiltFixture) => string
  createPlugin: (fixture: BuiltFixture, themeRoot: string) => ReturnType<typeof vitePluginShopifyImportMaps>
  expected: string[]
  unexpected?: string[]
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

describe('import map builds', () => {
  const cases: ImportMapCase[] = [
    {
      name: 'explicit themeRoot writes a plain Vite import map',
      createPlugin: (_fixture, themeRoot) => vitePluginShopifyImportMaps({ themeRoot }),
      expected: [
        '<script type="importmap">',
        '{{ \'entry.js\' | asset_url }}',
        '{{ \'main.js\' | asset_url }}',
        '{{ \'feature.js\' | asset_url }}',
      ],
    },
    {
      name: 'defaults resolve themeRoot from cwd and keep non-bare fallback keys',
      cwd: 'fixture',
      createPlugin: () => vitePluginShopifyImportMaps(),
      expected: [
        '{{ \'entry.js\' | asset_url }}',
        '{{ \'main.js\' | asset_url }}',
        '{{ \'feature.js\' | asset_url }}',
        '{{ \'entry.js\' | asset_url | split: \'?\' | first }}',
      ],
      unexpected: ['modulepreload'],
    },
    {
      name: 'themeRoot can target a custom snippets directory',
      themeRoot: fixture => path.join(fixture.root, 'theme'),
      createPlugin: (_fixture, themeRoot) => vitePluginShopifyImportMaps({ themeRoot }),
      expected: ['<script type="importmap">'],
    },
    {
      name: 'snippetFile can be customized',
      snippetFile: 'maps.liquid',
      createPlugin: (_fixture, themeRoot) => vitePluginShopifyImportMaps({ themeRoot, snippetFile: 'maps.liquid' }),
      expected: ['<script type="importmap">'],
    },
    {
      name: 'modulePreload false does not emit preload links',
      createPlugin: (_fixture, themeRoot) => vitePluginShopifyImportMaps({ themeRoot, modulePreload: false }),
      expected: ['<script type="importmap">'],
      unexpected: ['modulepreload'],
    },
    {
      name: 'modulePreload true emits low-priority preload links',
      createPlugin: (_fixture, themeRoot) => vitePluginShopifyImportMaps({ themeRoot, modulePreload: true }),
      expected: [
        '<link rel="modulepreload" href="{{ \'entry.js\' | asset_url }}" fetchpriority="low">',
        '<link rel="modulepreload" href="{{ \'main.js\' | asset_url }}" fetchpriority="low">',
        '<link rel="modulepreload" href="{{ \'feature.js\' | asset_url }}" fetchpriority="low">',
      ],
    },
  ]

  test.each(cases)('$name', async (testCase) => {
    const fixture = await buildFixture('plain-vite', async (fixture) => {
      const themeRoot = testCase.themeRoot?.(fixture) ?? fixture.themeRoot
      await fs.mkdir(path.join(themeRoot, 'snippets'), { recursive: true })

      return plainViteConfig(testCase.createPlugin(fixture, themeRoot))
    }, { cwd: testCase.cwd })

    try {
      const themeRoot = testCase.themeRoot?.(fixture) ?? fixture.themeRoot
      const importMap = await fixture.readSnippet(testCase.snippetFile, themeRoot)

      for (const expected of testCase.expected) expect(importMap).toContain(expected)
      for (const unexpected of testCase.unexpected ?? []) expect(importMap).not.toContain(unexpected)
    }
    finally {
      await fixture.cleanup()
    }
  })
})
