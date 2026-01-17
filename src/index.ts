import type { Plugin } from 'vite'
import type { BareModules, PluginOptions } from './types'
import preloadHelper from './preload-helper'
import importMaps from './import-maps'
import bareModules from './bare-modules'

/**
 * The Vite plugin enhances Shopify themes by adding support for import maps,
 * which can be used to control the resolution of module specifiers.
 * @see {@link https://github.com/slavamak/vite-plugin-shopify-import-maps GitHub}
 */
const vitePluginShopifyImportMaps = (userOptions?: Partial<PluginOptions>): Plugin[] => {
  const {
    snippetFile = 'importmap.liquid',
    themeRoot = './',
    modulePreload = false,
    bareModules: bareModulesOption = false,
  } = userOptions ?? {}

  const plugins = [
    preloadHelper(),
    importMaps({ snippetFile, themeRoot, modulePreload, bareModules: bareModulesOption }),
  ]

  if (bareModulesOption !== false) {
    plugins.push(bareModules({
      snippetFile,
      themeRoot,
      modulePreload,
      bareModules: { ...{ defaultGroup: 'main', groups: {} }, ...(bareModulesOption as BareModules) },
    }))
  }

  return plugins
}

export default vitePluginShopifyImportMaps
