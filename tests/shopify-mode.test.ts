import fs from 'node:fs/promises'
import path from 'node:path'
import { build, type InlineConfig } from 'vite'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import shopify from 'vite-plugin-shopify'
import vitePluginShopifyImportMaps from '../src'
import { copyFixture, removeFixture } from './helpers/copy-fixture'

const fixturePath = path.resolve('tests/fixtures/shopify-documented')

describe('documented shopify import maps', () => {
  let themeRoot = ''

  beforeEach(async () => {
    themeRoot = await copyFixture(fixturePath)
  })

  afterEach(async () => {
    await removeFixture(themeRoot)
  })

  test('writes an import map from a copied shopify fixture', async () => {
    const config: InlineConfig = {
      configFile: false,
      root: themeRoot,
      logLevel: 'silent',
      plugins: [
        shopify({
          themeRoot,
          sourceCodeDir: path.join(themeRoot, 'frontend'),
          entrypointsDir: path.join(themeRoot, 'frontend', 'entrypoints'),
          versionNumbers: true,
        }),
        vitePluginShopifyImportMaps({ themeRoot }),
      ],
      build: {
        outDir: 'assets',
        emptyOutDir: true,
        minify: false,
        target: 'esnext',
        write: true,
        rollupOptions: {
          input: path.join(themeRoot, 'frontend', 'entrypoints', 'theme.js'),
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: '[name].js',
            assetFileNames: '[name][extname]',
          },
        },
      },
    }

    await build(config)

    const importMap = await fs.readFile(path.join(themeRoot, 'snippets', 'importmap.liquid'), 'utf8')
    const assets = await fs.readdir(path.join(themeRoot, 'assets'))

    expect(importMap).toContain('<script type="importmap">')
    expect(importMap).toContain('{{ \'theme.js\' | asset_url }}')
    expect(importMap).toContain('{{ \'example.js\' | asset_url }}')
    expect(assets).toContain('theme.js')
    expect(assets).toContain('example.js')
  })
})
