import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { build, type InlineConfig } from 'vite'

export type FixtureName = 'plain-vite' | 'shopify-vite' | 'preload-vite'

export interface BuiltFixture {
  root: string
  themeRoot: string
  readSnippet: (file?: string, themeRoot?: string) => Promise<string>
  readAsset: (file: string) => Promise<string>
  listAssets: () => Promise<string[]>
  cleanup: () => Promise<void>
}

interface BuildFixtureOptions {
  cwd?: 'fixture'
}

export async function copyFixture(fixtureName: FixtureName): Promise<BuiltFixture> {
  const sourceRoot = path.resolve('tests/fixtures', fixtureName)
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vite-plugin-shopify-import-maps-'))

  await fs.cp(sourceRoot, root, {
    recursive: true,
    filter: source => path.basename(source) !== 'node_modules',
  })

  await fs.mkdir(path.join(root, 'snippets'), { recursive: true })

  return {
    root,
    themeRoot: root,
    readSnippet: async (file = 'importmap.liquid', themeRoot = root) =>
      await fs.readFile(path.join(themeRoot, 'snippets', file), 'utf8'),
    readAsset: async file => await fs.readFile(path.join(root, 'assets', file), 'utf8'),
    listAssets: async () => await fs.readdir(path.join(root, 'assets')),
    cleanup: async () => {
      await fs.rm(root, { recursive: true, force: true })
    },
  }
}

function withBuildDefaults(fixture: BuiltFixture, config: InlineConfig): InlineConfig {
  // Fixture builds intentionally use Rollup options for Vite 5-8.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Vite 5-8 compatibility
  const rollupOptions = config.build?.rollupOptions ?? {}
  const { input, output: rollupOutput } = rollupOptions
  // Rollup (Vite 5-7) resolves input against cwd, while Rolldown uses root.
  const resolveInput = (entry: string): string => path.resolve(fixture.root, entry)
  const resolvedInput = typeof input === 'string'
    ? resolveInput(input)
    : Array.isArray(input)
      ? input.map(resolveInput)
      : input === undefined
        ? undefined
        : Object.fromEntries(Object.entries(input).map(([name, entry]) => [name, resolveInput(entry)]))
  const output = Array.isArray(rollupOutput)
    ? rollupOutput
    : {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        ...(rollupOutput ?? {}),
      }

  return {
    configFile: false,
    root: fixture.root,
    logLevel: 'silent',
    ...config,
    build: {
      outDir: 'assets',
      emptyOutDir: true,
      minify: false,
      target: 'esnext',
      write: true,
      ...config.build,
      rollupOptions: {
        ...rollupOptions,
        input: resolvedInput,
        output,
      },
    },
  }
}

export async function buildFixture(
  fixtureName: FixtureName,
  createConfig: (fixture: BuiltFixture) => InlineConfig | Promise<InlineConfig>,
  options: BuildFixtureOptions = {},
): Promise<BuiltFixture> {
  const fixture = await copyFixture(fixtureName)
  const previousCwd = options.cwd === 'fixture' ? process.cwd() : undefined

  try {
    if (previousCwd !== undefined) process.chdir(fixture.root)

    const config = await createConfig(fixture)
    // Keep Vitest on its supported Vite version while exercising older Vite
    // builders through an npm alias in the compatibility CI jobs.
    const vite: { build: typeof build } = process.env.VITE_TEST_PACKAGE === undefined
      ? { build }
      : await import(process.env.VITE_TEST_PACKAGE) as { build: typeof build }
    await vite.build(withBuildDefaults(fixture, config))

    return fixture
  }
  catch (error) {
    await fixture.cleanup()
    throw error
  }
  finally {
    if (previousCwd !== undefined) process.chdir(previousCwd)
  }
}
