import fs from 'node:fs/promises'
import path from 'node:path'
import { build, type InlineConfig } from 'vite'
import { beforeEach, describe, expect, test } from 'vitest'
import vitePluginShopifyImportMaps from '../src'
import { copyFixture } from './helpers/copy-fixture'

const fixturePath = path.resolve('tests/fixtures/plain-vite')

describe('plain vite import maps', () => {
  let themeRoot = ''

  beforeEach(async () => {
    themeRoot = await copyFixture(fixturePath)
  })

  test('writes an import map in a copied temp fixture', async () => {
    const config: InlineConfig = {
      configFile: false,
      root: themeRoot,
      logLevel: 'silent',
      plugins: [vitePluginShopifyImportMaps({ themeRoot })],
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

    const importMap = await fs.readFile(path.join(themeRoot, 'snippets', 'importmap.liquid'), 'utf8')

    expect(importMap).toContain('<script type="importmap">')
    expect(importMap).toContain('{{ \'entry.js\' | asset_url }}')
    expect(importMap).toContain('{{ \'main.js\' | asset_url }}')
    expect(importMap).toContain('{{ \'feature.js\' | asset_url }}')
  })
})
