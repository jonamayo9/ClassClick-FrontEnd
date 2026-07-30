import { writeFileSync } from 'fs'
import { resolve } from 'path'

const version = process.env.GITHUB_SHA
  ? process.env.GITHUB_SHA.slice(0, 7)
  : Date.now().toString(36)

const dest = resolve(import.meta.dirname, '..', '.app-version')
writeFileSync(dest, version, 'utf-8')
