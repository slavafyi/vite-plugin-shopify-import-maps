export async function runMain(): Promise<unknown> {
  return await import('./feature')
}

void runMain()
