import { describe, expect, test } from 'vitest'
import shopify from 'vite-plugin-shopify'
import vitePluginShopifyImportMaps from '../src'
import { buildFixture } from './helpers/build-fixture'

describe('shopify import maps', () => {
  test('writes an import map from a copied shopify fixture', async () => {
    const fixture = await buildFixture('shopify-vite', ({ themeRoot }) => ({
      plugins: [
        shopify(),
        vitePluginShopifyImportMaps({ themeRoot }),
      ],
    }), { cwd: 'fixture' })

    try {
      const importMap = await fixture.readSnippet()
      const assets = await fixture.listAssets()

      expect(importMap).toContain('<script type="importmap">')
      expect(importMap).toContain('{{ \'theme.js\' | asset_url }}')
      expect(importMap).toContain('{{ \'example.js\' | asset_url }}')
      expect(assets).toContain('theme.js')
      expect(assets).toContain('example.js')
    }
    finally {
      await fixture.cleanup()
    }
  })
})
