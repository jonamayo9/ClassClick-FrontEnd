import { GalleryCarousel, type GalleryCarouselImage } from '@/components/ui/gallery-carousel'

interface SponsorCard {
  id: string
  name: string
  imageUrl?: string | null
  websiteUrl?: string | null
}

interface SponsorsCarouselProps {
  sponsors: SponsorCard[]
  colors: Record<string, string>
  interactive?: boolean
}

interface SponsorSlide extends GalleryCarouselImage {
  sponsor: SponsorCard
}

function normalizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) {
    const host = trimmed.replace(/^https?:\/\//i, '').split('/')[0]
    return host.includes('.') ? trimmed : null
  }

  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+([/:?#].*)?$/.test(trimmed)) {
    return `https://${trimmed}`
  }

  return null
}

export function SponsorsCarousel({ sponsors, colors, interactive = true }: SponsorsCarouselProps) {
  if (!sponsors || sponsors.length === 0) return null

  const slides: SponsorSlide[] = sponsors.map((s) => ({
    imageUrl: s.imageUrl ?? '',
    altText: s.name,
    caption: null,
    sponsor: s,
  }))

  return (
    <GalleryCarousel
      images={slides}
      className="border border-slate-200"
      style={{ borderColor: `${colors.primary}15` }}
      renderSlide={(item) => {
        const s = (item as SponsorSlide).sponsor
        const href = interactive ? normalizeExternalUrl(s.websiteUrl) : null

        const content = (
          <div className="flex h-full w-full items-center justify-center">
            {s.imageUrl ? (
              <img src={s.imageUrl} alt={s.name} className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-center text-sm font-medium" style={{ color: colors.text }}>
                {s.name}
              </span>
            )}
          </div>
        )

        if (href) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
              {content}
            </a>
          )
        }

        return content
      }}
    />
  )
}
