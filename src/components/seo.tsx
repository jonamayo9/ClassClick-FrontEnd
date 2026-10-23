import { useEffect } from 'react'

interface SeoProps {
  title?: string
  description?: string
  noindex?: boolean
  canonical?: string
  image?: string
  imageAlt?: string
}

const BASE_URL = 'https://classclick.com.ar'
const SITE_NAME = 'ClassClick'
const DEFAULT_DESCRIPTION = 'ClassClick es una plataforma de gestión para instituciones educativas y deportivas.'
const DEFAULT_IMAGE = `${BASE_URL}/landing/og-classclick.png`
const DEFAULT_IMAGE_ALT = 'ClassClick: tu institución, en un solo lugar'

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
  if (!el) { el = document.createElement('meta'); document.head.appendChild(el) }
  if (name.startsWith('og:') || name.startsWith('twitter:')) el.setAttribute('property', name)
  else el.setAttribute('name', name)
  el.setAttribute('content', content)
}

export function Seo({ title, description, noindex, canonical, image, imageAlt }: SeoProps) {
  useEffect(() => {
    const fullTitle = title
      ? title.startsWith(SITE_NAME)
        ? title
        : `${title} | ${SITE_NAME}`
      : `${SITE_NAME} | Gestión para instituciones`
    const desc = description ?? DEFAULT_DESCRIPTION
    const canon = canonical ?? BASE_URL + '/'
    const ogImage = image ?? DEFAULT_IMAGE
    const ogImageAlt = imageAlt ?? DEFAULT_IMAGE_ALT

    document.title = fullTitle
    setMeta('description', desc)
    setMeta('og:type', 'website')
    setMeta('og:title', fullTitle)
    setMeta('og:description', desc)
    setMeta('og:url', canon)
    setMeta('og:image', ogImage)
    setMeta('og:image:alt', ogImageAlt)
    setMeta('og:image:width', '1200')
    setMeta('og:image:height', '630')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', desc)
    setMeta('twitter:image', ogImage)
    setMeta('twitter:image:alt', ogImageAlt)

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
  }, [title, description, noindex, canonical, image, imageAlt])

  return null
}
