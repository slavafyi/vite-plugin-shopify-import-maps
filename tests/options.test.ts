import fs from 'node:fs/promises'
import path from 'node:path'
import { build, type InlineConfig } from 'vite'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import vitePluginShopifyImportMaps from '../src'
import type { BareModules } from '../src/types'
import { copyFixture, readText, removeFixture } from './helpers/copy-fixture'

const fixturePath = path.resolve('tests/fixtures/plain-vite')

async function buildFixture(themeRoot: string, plugin = vitePluginShopifyImportMaps({ themeRoot })): Promise<void> {
  const config: InlineConfig = {
    configFile: false,
    root: themeRoot,
    logLevel: 'silent',
    plugins: [plugin],
    build: {
      outDir: 'assets',
      emptyOutDir: true,
      minify: false,
      target: 'esnext',
      write: true,
      rollupOptions: {
        input: 'src/entry.ts',
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name][extname]',
        },
      },
    },
  }

  await build(config)
}

async function buildWithThemeRoot(buildRoot: string, themeRoot: string, snippetFile?: string): Promise<void> {
  await fs.mkdir(path.join(themeRoot, 'snippets'), { recursive: true })
  await buildFixture(buildRoot, vitePluginShopifyImportMaps({ themeRoot, ...(snippetFile === undefined ? {} : { snippetFile }) }))
}

describe('option coverage', () => {
  let fixtureRoot = ''

  beforeEach(async () => {
    fixtureRoot = await copyFixture(fixturePath)
  })

  afterEach(async () => {
    await removeFixture(fixtureRoot)
  })

  test('defaults resolve themeRoot from cwd and keep current non-bare output', async () => {
    const cwd = process.cwd()
    process.chdir(fixtureRoot)

    try {
      await buildFixture(fixtureRoot, vitePluginShopifyImportMaps())
    }
    finally {
      process.chdir(cwd)
    }

    const importMap = await readText(fixtureRoot, 'snippets', 'importmap.liquid')

    expect(importMap).toContain('{{ \'entry.js\' | asset_url }}')
    expect(importMap).toContain('{{ \'main.js\' | asset_url }}')
    expect(importMap).toContain('{{ \'feature.js\' | asset_url }}')
    expect(importMap).toContain('{{ \'entry.js\' | asset_url | split: \'?\' | first }}')
  })

  test('bareModules false keeps non-bare import map keys and fallback liquid keys', async () => {
    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: fixtureRoot, bareModules: false }))

    const importMap = await readText(fixtureRoot, 'snippets', 'importmap.liquid')

    expect(importMap).toContain('"/entry.js": "{{ \'entry.js\' | asset_url }}"')
    expect(importMap).toContain('"{{ \'entry.js\' | asset_url | split: \'?\' | first }}": "{{ \'entry.js\' | asset_url }}"')
    expect(importMap).not.toContain('"main/entry"')
  })

  test('bareModules true uses the default bare alias group', async () => {
    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: fixtureRoot, bareModules: true }))

    const importMap = await readText(fixtureRoot, 'snippets', 'importmap.liquid')

    expect(importMap).toContain('"main/entry": "{{ \'entry.js\' | asset_url }}"')
    expect(importMap).toContain('"main/main": "{{ \'main.js\' | asset_url }}"')
    expect(importMap).toContain('"main/feature": "{{ \'feature.js\' | asset_url }}"')
    expect(importMap).not.toContain('"/entry.js"')
    expect(importMap).not.toContain('"{{ \'entry.js\' | asset_url | split: \'?\' | first }}"')
  })

  test('bareModules object respects omitted defaultGroup and custom groups', async () => {
    const bareModules = { groups: {} } as unknown as BareModules

    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: fixtureRoot, bareModules }))

    const importMap = await readText(fixtureRoot, 'snippets', 'importmap.liquid')

    expect(importMap).toContain('"main/entry": "{{ \'entry.js\' | asset_url }}"')
  })

  test('bareModules object respects custom defaultGroup and non-default groups', async () => {
    const bareModules = {
      defaultGroup: 'vendors',
      groups: {
        general: ['src/entry'],
        helpers: 'feature.ts',
      },
    } satisfies BareModules

    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: fixtureRoot, bareModules }))

    const importMap = await readText(fixtureRoot, 'snippets', 'importmap.liquid')

    expect(importMap).toContain('"general/entry": "{{ \'entry.js\' | asset_url }}"')
    expect(importMap).toContain('"vendors/main": "{{ \'main.js\' | asset_url }}"')
    expect(importMap).toContain('"helpers/feature": "{{ \'feature.js\' | asset_url }}"')
  })

  test('themeRoot can target a custom snippets directory', async () => {
    const customThemeRoot = path.join(fixtureRoot, 'theme')
    await buildWithThemeRoot(fixtureRoot, customThemeRoot)

    const importMap = await readText(customThemeRoot, 'snippets', 'importmap.liquid')

    expect(importMap).toContain('<script type="importmap">')
  })

  test('snippetFile defaults and can be customized', async () => {
    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: fixtureRoot }))
    expect(await readText(fixtureRoot, 'snippets', 'importmap.liquid')).toContain('<script type="importmap">')

    const customThemeRoot = path.join(fixtureRoot, 'custom-snippet')
    await fs.mkdir(path.join(customThemeRoot, 'snippets'), { recursive: true })
    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: customThemeRoot, snippetFile: 'maps.liquid' }))

    expect(await readText(customThemeRoot, 'snippets', 'maps.liquid')).toContain('<script type="importmap">')
  })

  test('modulePreload defaults off and can emit low-priority preload links', async () => {
    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: fixtureRoot }))
    expect(await readText(fixtureRoot, 'snippets', 'importmap.liquid')).not.toContain('modulepreload')

    const noPreloadThemeRoot = path.join(fixtureRoot, 'no-preload')
    await fs.mkdir(path.join(noPreloadThemeRoot, 'snippets'), { recursive: true })
    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: noPreloadThemeRoot, modulePreload: false }))
    expect(await readText(noPreloadThemeRoot, 'snippets', 'importmap.liquid')).not.toContain('modulepreload')

    const preloadThemeRoot = path.join(fixtureRoot, 'preload')
    await fs.mkdir(path.join(preloadThemeRoot, 'snippets'), { recursive: true })
    await buildFixture(fixtureRoot, vitePluginShopifyImportMaps({ themeRoot: preloadThemeRoot, modulePreload: true }))

    const importMap = await readText(preloadThemeRoot, 'snippets', 'importmap.liquid')
    expect(importMap).toContain('<link rel="modulepreload" href="{{ \'entry.js\' | asset_url }}" fetchpriority="low">')
    expect(importMap).toContain('<link rel="modulepreload" href="{{ \'main.js\' | asset_url }}" fetchpriority="low">')
    expect(importMap).toContain('<link rel="modulepreload" href="{{ \'feature.js\' | asset_url }}" fetchpriority="low">')
  })
})
