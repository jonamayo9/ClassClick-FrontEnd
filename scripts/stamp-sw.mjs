import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const dist = resolve(import.meta.dirname, '..', 'dist')
const versionFile = resolve(import.meta.dirname, '..', '.app-version')

if (!existsSync(versionFile)) {
  console.error('.app-version not found — run compute-version.mjs first')
  process.exit(1)
}

const appVersion = readFileSync(versionFile, 'utf-8').trim()

const targets = [
  resolve(dist, 'service-worker.js'),
  resolve(dist, 'index.html'),
]

for (const filePath of targets) {
  if (!existsSync(filePath)) {
    console.error(`Missing ${filePath}`)
    process.exit(1)
  }
  let content = readFileSync(filePath, 'utf-8')
  if (!content.includes('__APP_VERSION__')) {
    console.error(`No __APP_VERSION__ placeholder in ${filePath}`)
    process.exit(1)
  }
  content = content.replace(/__APP_VERSION__/g, appVersion)
  if (content.includes('__APP_VERSION__')) {
    console.error(`Failed to stamp ${filePath}`)
    process.exit(1)
  }
  writeFileSync(filePath, content)
  console.log(`Stamped ${filePath}`)
}
