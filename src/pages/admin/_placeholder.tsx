import { Card } from '@/components/ui/card'

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-4 text-5xl">🚧</div>
        <h1 className="text-xl font-black">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description ?? 'Esta sección estará disponible próximamente.'}</p>
      </Card>
    </div>
  )
}
