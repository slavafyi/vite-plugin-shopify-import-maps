import type { Plugin } from 'vite'

const preloadMethod = '__vitePreload'
const preloadHelperId = '\0vite/preload-helper.js'

/**
 * Customizes the Vite preload helper to work with import-maps.
 * @see {@link https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/importAnalysisBuild.ts Source code}
 */
export default function preloadHelper(): Plugin {
  // Emit import.meta literally instead of serializing a tool-transformed function.
  const preloadCode = `
    const assetsURL = (dep, importerUrl) => import.meta.resolve(dep, importerUrl)
    const seen = {}
    export const ${preloadMethod} = ${preload.toString()}
  `

  return {
    name: 'vite-plugin-shopify-import-maps:preload-helper',
    apply: 'build',
    enforce: 'post',
    // Let Vite resolve and load its virtual module, then replace its source.
    // Unlike load hooks, transform hooks do not stop at the first result.
    // The internal module ID is shared by Vite 5-8; build tests guard it.
    transform(_, id) {
      if (id === preloadHelperId) {
        return { code: preloadCode, map: { mappings: '' } }
      }
    },
  }
}

declare function assetsURL(dep: string, importerUrl?: string): string

declare const seen: Record<string, boolean>

function preload(baseModule: () => Promise<unknown>, deps: string[], importerUrl?: string): Promise<unknown> | undefined {
  if (deps === undefined || deps.length === 0) {
    return baseModule()
  }

  const links = document.getElementsByTagName('link')

  return Promise.all(
    deps.map(async (dep) => {
      const depUrl = assetsURL(dep, importerUrl)

      if (dep in seen) {
        return dep
      }

      seen[dep] = true

      const isCss = dep.endsWith('.css')
      const cssSelector = isCss ? '[rel="stylesheet"]' : ''
      const isBaseRelative = !(importerUrl === null)

      if (isBaseRelative) {
        for (let i = links.length - 1; i >= 0; i--) {
          const link = links[i]

          if (link.href === dep && (!isCss || link.rel === 'stylesheet')) {
            return dep
          }
        }
      }
      else if (document.querySelector(`link[href="${dep}"]${cssSelector}`) !== null) {
        return dep
      }

      const link = document.createElement('link')
      link.rel = isCss ? 'stylesheet' : 'modulepreload'

      if (!isCss) {
        link.as = 'script'
        link.crossOrigin = ''
      }

      link.href = depUrl

      document.head.appendChild(link)

      if (isCss) {
        return await new Promise((resolve, reject) => {
          link.addEventListener('load', resolve)
          link.addEventListener('error', () => { reject(new Error(`Unable to preload CSS for ${dep}`)) },
          )
        })
      }

      return dep
    }),
  )
    .then(async () => await baseModule())
    .catch((err: unknown) => {
      const e = new Event('vite:preloadError', { cancelable: true })
      // @ts-expect-error custom payload
      e.payload = err
      window.dispatchEvent(e)
      if (!e.defaultPrevented) {
        throw err
      }
    })
}
