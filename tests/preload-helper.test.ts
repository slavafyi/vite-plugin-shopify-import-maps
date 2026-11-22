import vm from 'node:vm'
import { describe, expect, test } from 'vitest'
import preloadHelper from '../src/preload-helper'

const importerUrl = 'https://cdn.shopify.com/s/files/1/assets/theme.js'
const resolvedJs = 'https://cdn.shopify.com/s/files/1/assets/lazy-feature.js'
const resolvedCss = 'https://cdn.shopify.com/s/files/1/assets/lazy-feature.css'
const resolvedOther = 'https://cdn.shopify.com/s/files/1/assets/other.js'

interface TestLink {
  rel: string
  as: string
  crossOrigin: string
  href: string
  addEventListener: (type: string, listener: () => void) => void
}

interface TestDocument {
  head: { appendChild: (link: TestLink) => TestLink }
  links: TestLink[]
  createElement: (tag: string) => TestLink
  getElementsByTagName: (tag: string) => TestLink[]
  querySelector: (selector: string) => TestLink | null
}

type Preload = (
  baseModule: () => Promise<unknown>,
  deps: string[],
  importerUrl?: string | null,
) => Promise<unknown> | undefined

function resolveDep(dep: string, _importerUrl?: string): string {
  const resolved: Record<string, string> = {
    './lazy-feature.js': resolvedJs,
    '@theme/lazy-feature': resolvedJs,
    './lazy-feature.css': resolvedCss,
    './other.js': resolvedOther,
  }

  return resolved[dep] ?? dep
}

function createDocument(): TestDocument {
  const links: TestLink[] = []

  const document: TestDocument = {
    links,
    head: {
      appendChild(link: TestLink): TestLink {
        links.push(link)
        return link
      },
    },
    createElement(tag: string): TestLink {
      if (tag !== 'link') {
        throw new Error(`unexpected tag: ${tag}`)
      }

      let href = ''
      const link: TestLink = {
        rel: '',
        as: '',
        crossOrigin: '',
        addEventListener(type: string, listener: () => void): void {
          if (type === 'load') {
            queueMicrotask(listener)
          }
        },
        get href(): string {
          return href
        },
        set href(value: string) {
          const { href: resolvedHref } = new URL(value, 'https://cdn.shopify.com/s/files/1/assets/')
          href = resolvedHref
        },
      }

      return link
    },
    getElementsByTagName(tag: string): TestLink[] {
      return tag === 'link' ? links : []
    },
    querySelector(selector: string): TestLink | null {
      const hrefPrefix = 'link[href="'
      if (!selector.startsWith(hrefPrefix)) {
        return null
      }

      const hrefEnd = selector.indexOf('"]', hrefPrefix.length)
      if (hrefEnd === -1) {
        return null
      }

      const href = selector.slice(hrefPrefix.length, hrefEnd)
      const requireStylesheet = selector.includes('[rel="stylesheet"]')

      return links.find((link) => {
        if (link.href !== href) {
          return false
        }

        return !requireStylesheet || link.rel === 'stylesheet'
      }) ?? null
    },
  }

  return document
}

function loadPreloadSource(): string {
  const plugin = preloadHelper()
  const { load: hook } = plugin
  if (typeof hook !== 'function') {
    throw new Error('expected preload helper load hook')
  }

  const source: unknown = hook.call(plugin, '\0vite/preload-helper')
  if (typeof source !== 'string') {
    throw new Error('expected preload helper source string')
  }

  return source
}

function createPreload(document: TestDocument): Preload {
  const source = loadPreloadSource()
  const seenIndex = source.indexOf('const seen')
  if (seenIndex === -1) {
    throw new Error('preload helper source is missing seen map')
  }

  const runtime = `const assetsURL = __testResolve\n${source.slice(seenIndex).replace('export const __vitePreload', 'const __vitePreload')}\n__vitePreload`
  const preload = vm.runInNewContext(runtime, {
    document,
    window: {
      dispatchEvent(): boolean {
        return true
      },
    },
    __testResolve: resolveDep,
    Promise,
    Error,
    Event,
  }) as Preload

  return preload
}

async function resolvedBaseModule(): Promise<void> {
  await Promise.resolve()
}

async function runPreload(
  preload: Preload,
  deps: string[],
  url: string | null = importerUrl,
): Promise<void> {
  await preload(resolvedBaseModule, deps, url)
}

function hrefsForRel(links: TestLink[], rel: string): string[] {
  return links.filter(link => link.rel === rel).map(link => link.href)
}

describe('preload helper runtime', () => {
  test('does not append a duplicate modulepreload for an existing resolved href', async () => {
    const document = createDocument()
    const existing = document.createElement('link')
    existing.rel = 'modulepreload'
    existing.href = resolvedJs
    document.head.appendChild(existing)

    const preload = createPreload(document)
    await runPreload(preload, ['./lazy-feature.js'])

    expect(hrefsForRel(document.links, 'modulepreload')).toEqual([resolvedJs])
  })

  test('does not append a duplicate modulepreload when specifiers share a resolved URL', async () => {
    const document = createDocument()
    const preload = createPreload(document)

    await runPreload(preload, ['./lazy-feature.js'])
    await runPreload(preload, ['@theme/lazy-feature'])

    expect(hrefsForRel(document.links, 'modulepreload')).toEqual([resolvedJs])
  })

  test('still appends distinct modulepreload links for different resolved URLs', async () => {
    const document = createDocument()
    const preload = createPreload(document)

    await runPreload(preload, ['./lazy-feature.js'])
    await runPreload(preload, ['./other.js'])

    expect(hrefsForRel(document.links, 'modulepreload')).toEqual([resolvedJs, resolvedOther])
  })

  test('does not append a duplicate stylesheet for an existing resolved href', async () => {
    const document = createDocument()
    const existing = document.createElement('link')
    existing.rel = 'stylesheet'
    existing.href = resolvedCss
    document.head.appendChild(existing)

    const preload = createPreload(document)
    await runPreload(preload, ['./lazy-feature.css'])

    expect(hrefsForRel(document.links, 'stylesheet')).toEqual([resolvedCss])
  })

  test('querySelector path also dedupes by resolved URL', async () => {
    const document = createDocument()
    const existing = document.createElement('link')
    existing.rel = 'modulepreload'
    existing.href = resolvedJs
    document.head.appendChild(existing)

    const preload = createPreload(document)
    await runPreload(preload, ['./lazy-feature.js'], null)

    expect(hrefsForRel(document.links, 'modulepreload')).toEqual([resolvedJs])
  })
})
