import type { Plugin, Rollup } from 'vite'
import type { BareModules, PluginOptions } from './types'
import path from 'node:path'
import { parse } from 'es-module-lexer'
import MagicString from 'magic-string'

/**
 * Use bare specifier in import module statements defined in bareModules option groups.
 */
export default function bareModules(options: PluginOptions): Plugin {
  const moduleSpecifierMap = new Map<string, string>()

  return {
    name: 'vite-plugin-shopify-import-maps:bare-modules',
    api: {
      get moduleSpecifierMap() {
        return moduleSpecifierMap
      },
    },
    renderChunk(_, chunk) {
      const bareModules = options.bareModules as BareModules
      const { groups } = bareModules
      const moduleId = chunk.facadeModuleId ?? chunk.moduleIds.at(-1)

      let specifierKey: string | undefined

      if (moduleId !== undefined) {
        for (const group in groups) {
          const value = groups[group]

          if (typeof specifierKey === 'string') {
            continue
          }

          if (Array.isArray(value)) {
            const arrayTestPassed = value.some(element => (
              (element instanceof RegExp && element.test(moduleId))
              || (typeof element === 'string' && moduleId.includes(element))
            ))

            if (arrayTestPassed) {
              specifierKey = buildSpecifierKey(chunk.name, group)
              break
            }
          }
          else {
            const regexpTestPassed = value instanceof RegExp && value.test(moduleId)
            const stringTestPassed = typeof value === 'string' && moduleId.includes(value)

            if (regexpTestPassed || stringTestPassed) {
              specifierKey = buildSpecifierKey(chunk.name, group)
              break
            }
          }
        }
      }

      if (specifierKey === undefined) {
        specifierKey = buildSpecifierKey(chunk.name, bareModules.defaultGroup)
      }

      moduleSpecifierMap.set(chunk.fileName, specifierKey)
    },
    generateBundle(options, bundle) {
      Object.keys(bundle).forEach((fileName) => {
        const chunk = bundle[fileName]

        if (chunk.type === 'chunk') {
          const code = new MagicString(chunk.code)
          const [imports] = parse(chunk.code)

          for (let { s, e, d, n } of imports) {
            const name = path.parse(n ?? '').base
            const specifier = moduleSpecifierMap.get(name)

            if (specifier !== undefined) {
              // Keep quotes for dynamic import.
              // https://github.com/guybedford/es-module-lexer/issues/144
              if (d > -1) {
                s += 1
                e -= 1
              }

              code.overwrite(s, e, specifier)
            }
          }

          if (code.hasChanged()) {
            chunk.code = code.toString()

            if (options.sourcemap !== false) {
              chunk.map = code.generateMap({ hires: true }) as Rollup.SourceMap
            }
          }
        }
      })
    },
  }
}

function buildSpecifierKey(name: string, group: string): string {
  return `${group}/${name}`
}
