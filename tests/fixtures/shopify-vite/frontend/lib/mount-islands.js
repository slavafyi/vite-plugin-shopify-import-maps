export async function mountIsland() {
  const modules = import.meta.glob('@/islands/*.js')
  const [island] = Object.values(modules)

  if (island) {
    await island()
  }
}
