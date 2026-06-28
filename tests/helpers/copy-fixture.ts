import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

async function copyDirectory(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true })

  const entries = await fs.readdir(source, { withFileTypes: true })

  await Promise.all(entries.map(async (entry) => {
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(from, to)
    }
    else if (entry.isFile()) {
      await fs.copyFile(from, to)
    }
  }))
}

export async function copyFixture(fixturePath: string): Promise<string> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'vite-plugin-shopify-import-maps-'))
  await copyDirectory(fixturePath, tempRoot)
  await fs.mkdir(path.join(tempRoot, 'snippets'), { recursive: true })
  return tempRoot
}

export async function removeFixture(fixturePath: string): Promise<void> {
  await fs.rm(fixturePath, { recursive: true, force: true })
}

export async function readText(fixturePath: string, ...segments: string[]): Promise<string> {
  return await fs.readFile(path.join(fixturePath, ...segments), 'utf8')
}
