import { config } from './config'

export function imgUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  return `${config.apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`
}
