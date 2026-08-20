import { mkdir, readFile, cp } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const version = (await readFile(new URL('VERSION', root), 'utf8')).trim()
const source = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`
const files = [
  'pyodide.js',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'python_stdlib.zip',
]
const cacheDir = new URL(`dist/${version}/`, root)
const targets = [
  new URL('../../apps/desktop/public/pyodide/', root),
  new URL('../../apps/web/public/pyodide/', root),
]

await mkdir(cacheDir, { recursive: true })
for (const file of files) {
  const target = new URL(file, cacheDir)
  try {
    await readFile(target)
  } catch {
    const response = await fetch(`${source}${file}`)
    if (!response.ok) throw new Error(`Failed to download ${file}: ${response.status}`)
    await Bun.write(target, await response.arrayBuffer())
  }
}

for (const target of targets) {
  await mkdir(target, { recursive: true })
  for (const file of files) {
    await cp(new URL(file, cacheDir), new URL(file, target), { force: true })
  }
}

console.log(`Pyodide ${version} copied to ${targets.length} app public directories`)
