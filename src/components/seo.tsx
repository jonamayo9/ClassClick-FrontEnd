import { useEffect } from 'react'

interface SeoProps {
  title?: string
  description?: string
  noindex?: boolean
  canonical?: string
}

const BASE_URL = 'https://classclick.com.ar'
const SITE_NAME = 'ClassClick'
const DEFAULT_DESCRIPTION = 'ClassClick es una plataforma de gestión para instituciones educativas, academias, clubes e institutos.'

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
  if (!el) { el = document.createElement('meta'); document.head.appendChild(el) }
  if (name.startsWith('og:') || name.startsWith('twitter:')) el.setAttribute('property', name)
  else el.setAttribute('name', name)
  el.setAttribute('content', content)
}

export function Seo({ title, description, noindex, canonical }: SeoProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Software de gestión para instituciones educativas`
    const desc = description ?? DEFAULT_DESCRIPTION
    const canon = canonical ?? BASE_URL + '/'

    document.title = fullTitle
    setMeta('description', desc)
    setMeta('og:title', fullTitle)
    setMeta('og:description', desc)
    setMeta('og:url', canon)
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', desc)

    const link = document.querySelector('link[rel="canonical"]') ?? document.createElement('link')
    link.setAttribute('rel', 'canonical')
    link.setAttribute('href', canon)
    if (!document.querySelector('link[rel="canonical"]')) document.head.appendChild(link)

    if (noindex) {
      setMeta('robots', 'noindex, nofollow')
      setMeta('googlebot', 'noindex, nofollow')
    } else {
      setMeta('robots', 'index, follow')
      setMeta('googlebot', 'index, follow')
    }
  }, [title, description, noindex, canonical])

  return null
}
