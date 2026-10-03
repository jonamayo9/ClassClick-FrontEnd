import * as Popover from '@radix-ui/react-popover'
import { useState } from 'react'

export interface ActionMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

export function ActionMenu({ actions }: { actions: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Acciones"
          aria-haspopup="menu"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="z-[120] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => { setOpen(false); a.onClick() }}
              className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition ${a.danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              {a.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}