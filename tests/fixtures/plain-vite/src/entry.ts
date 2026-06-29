export async function runEntry(): Promise<unknown> {
  return await import('./main')
}

void runEntry()
