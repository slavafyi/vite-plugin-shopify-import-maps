[![npm](https://img.shields.io/npm/v/vite-plugin-shopify-import-maps?color=brightgreen)](https://www.npmjs.com/package/vite-plugin-shopify-import-maps) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# vite-plugin-shopify-import-maps

The `vite-plugin-shopify-import-maps` enhances Shopify theme development by adding support for [import-maps](https://github.com/WICG/import-maps) which can be used to control the resolution of module specifiers.

## Requirements

Before using this plugin, make sure you have the [vite-plugin-shopify](https://github.com/barrel/shopify-vite/tree/main/packages/vite-plugin-shopify) installed. This plugin provides the necessary underlying setup for developing Shopify themes with Vite.

## Install

```bash
npm i -D vite-plugin-shopify-import-maps

# yarn
yarn add -D vite-plugin-shopify-import-maps

# pnpm
pnpm add -D vite-plugin-shopify-import-maps
```

## Usage

1. Add [ES Module Shims](https://github.com/guybedford/es-module-shims#usage) to the `<head>` tag in your `theme.liquid` file.

2. Render the `importmap` snippet file **before** performing any imports:

```liquid
<script src="{{ 'es-module-shims.js' | asset_url }}" async></script>

{% liquid
  render 'importmap'
  render 'vite-tag' with 'theme.js'
  render 'vite-tag' with 'customers.js'
%}
```

3. Add the `vite-plugin-shopify-import-maps` to your `vite.config.js` file:

```js
import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'
import importMaps from 'vite-plugin-shopify-import-maps'

// Recommended configuration
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    shopify({ versionNumbers: true }),
    importMaps({ bareModules: true })
  ]
})
```

After executing the build command, the `importmap.liquid` file will be generated in the `snippets` folder in your theme root directory.

## Options

### themeRoot

- **Type:** `string`
- **Default:** `'./'`

Root path to your Shopify theme directory.

### snippetFile

- **Type:** `string`
- **Default:** `'importmap.liquid'`

Specifies the file name of the snippet that include import map.

### bareModules

- **Type:** `boolean | BareModules`
- **Default:** `false`

```ts
export interface BareModules {
  defaultGroup: string
  groups: Record<string, string | RegExp | Array<string | RegExp>>
}
```

Configure bare specifier remapping for JavaScript modules.

Example:

```ts
export default defineConfig({
  plugins: [
    importMap({
      bareModules: {
        defaultGroup: 'main', // By default is 'main'
        groups: {
          helpers: /frontend\/lib/, // RegExp pattern
          vendors: 'node_modules', // String
          general: ['frontend/entrypoints', /vite/] // Array of string or RegExp pattern
        }
      }
    })
  ]
})
```

This generates the `importmap.liquid` file:

```liquid
<script type="importmap">
{
  "imports": {
    "general/customers": "{{ 'customers.js' | asset_url }}",
    "general/modulepreload-polyfill": "{{ 'modulepreload-polyfill.js' | asset_url }}",
    "general/theme": "{{ 'theme.js' | asset_url }}",
    "helpers/customer-address": "{{ 'customer-address.js' | asset_url }}",
    "helpers/shopify_common": "{{ 'shopify_common.js' | asset_url }}",
    "helpers/utils": "{{ 'utils.js' | asset_url }}",
    "main/header-drawer": "{{ 'header-drawer.js' | asset_url }}",
    "main/localization-form": "{{ 'localization-form.js' | asset_url }}",
    "main/product-recommendations": "{{ 'product-recommendations.js' | asset_url }}",
    "vendors/lodash": "{{ 'lodash.js' | asset_url }}"
  }
}
</script>
```

### modulePreload

- **Type:** `boolean`
- **Default:** `false`

This option when set to `true`, generates `modulepreload` link tags below the import map script tag.

```liquid
<link rel="modulepreload" href="{{ 'customers.js' | asset_url }}">
<link rel="modulepreload" href="{{ 'theme.js' | asset_url }}">
```

## Troubleshooting

If you have any problems or have suggestions, welcome to [issues](https://github.com/slavamak/vite-plugin-shopify-import-maps/issues).

### Importing asset files (e.g. fonts, images) does not use the version parameter from Shopify CDN

This is not the scope of import map, as it is are designed to manage javascript modules. But you can load assets from Liquid files using the `asset_url` filter and consume them via CSS variables:

```liquid
{% #theme.liquid %}

{% style %}
  @font-face {
    font-family: 'Anton';
    src: url("{{ 'anton-v23-latin-regular.woff2' | asset_url }}") format('woff2');
    font-display: swap;
  }

  :root {
    --font-heading-family: 'Anton', sans-serif;
    --background-image: url('{{ 'background-image.svg' | asset_url }}');
  }
{% endstyle %}
```

```css
/* styles.css */

h1,
h2,
h3 {
  font-family: var(--font-heading-family);
}

body {
  background-image: var(--background-image);
}
```

## Acknowledges

- [vite-plugin-shopify](https://github.com/barrel/shopify-vite) - Shopify theme development using Vite
