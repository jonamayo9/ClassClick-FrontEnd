import { useModule } from '@/hooks/useModule'

export function ModuleGuard({ moduleCode, children }: { moduleCode?: string; children: React.ReactNode }) {
  const enabled = useModule(moduleCode)
  if (!enabled) return null
  return <>{children}</>
}
