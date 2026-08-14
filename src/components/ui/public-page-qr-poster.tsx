import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface PublicPageQrPosterProps {
  companyName: string
  logoUrl?: string | null
  publicUrl: string
  colors?: { primary?: string; accent?: string }
  variant?: 'preview' | 'print'
}

function isLightBackground(hex?: string): boolean {
  if (!hex) return false
  const clean = hex.trim().replace('#', '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return false
  return 0.299 * r + 0.587 * g + 0.114 * b > 150
}

export function PublicPageQrPoster({
  companyName,
  logoUrl,
  publicUrl,
  colors,
  variant = 'preview',
}: PublicPageQrPosterProps) {
  const isPrint = variant === 'print'
  const primary = colors?.primary?.trim() || '#0f172a'
  const accent = colors?.accent?.trim() || '#3b82f6'
  const lightBg = isLightBackground(primary)
  const textColor = lightBg ? '#0f172a' : '#ffffff'

  return (
    <div
      data-primary={primary}
      className={cn(
        'qr-poster flex flex-col items-center text-center',
        isPrint
          ? 'min-h-screen w-full justify-center px-10 py-12'
          : 'mx-auto w-full max-w-[440px] rounded-2xl px-6 py-10 shadow-sm'
      )}
      style={{
        backgroundColor: primary,
        color: textColor,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {logoUrl && (
        <div
          className={cn(
            'overflow-hidden rounded-2xl shadow-sm',
            isPrint ? 'mb-8 h-28 w-28' : 'mb-5 h-20 w-20'
          )}
        >
          <img
            src={logoUrl}
            alt=""
            onError={(e) => { const box = e.currentTarget.closest('div'); if (box) box.style.display = 'none' }}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <h2 className={cn('break-words font-black tracking-tight', isPrint ? 'max-w-[700px] text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl')}>
        {companyName}
      </h2>

      <div className={cn('mt-4 h-1 rounded-full', isPrint ? 'w-24' : 'w-14')} style={{ backgroundColor: accent }} />

      <p className={cn('font-semibold', isPrint ? 'mt-8 text-2xl' : 'mt-5 text-lg')}>
        ¿Querés ser parte de nuestra institución?
      </p>
      <p className={cn('max-w-[520px] leading-relaxed opacity-80', isPrint ? 'mt-3 text-lg' : 'mt-1 text-sm')}>
        Escaneá el QR y conocé todo lo que tenemos para ofrecerte.
      </p>

      <div className={cn('mt-6 rounded-2xl bg-white p-3', isPrint ? 'w-[400px]' : 'w-[280px] sm:w-[300px]')}>
        <QRCodeSVG
          value={publicUrl}
          size={isPrint ? 400 : 320}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
          marginSize={4}
          title={publicUrl}
          className="h-auto w-full"
        />
      </div>

      <p className={cn('font-medium uppercase tracking-widest opacity-60', isPrint ? 'mt-12 text-sm' : 'mt-8 text-[11px]')}>
        Gestionado con ClassClick
      </p>
    </div>
  )
}
