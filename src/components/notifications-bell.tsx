import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '@/lib/api'
import { resolveNotificationRoute } from '@/lib/notification-route'
import { useAuth } from '@/stores/auth'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAtUtc: string
  data: Record<string, unknown>
  url?: string
}

function formatDate(v: string) {
  try { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)) }
  catch { return v }
}

export function NotificationsBell() {
  const navigate = useNavigate()
  const activeRole = useAuth((state) => state.activeRole)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUnread = useCallback(async () => {
    try {
      const data = await apiService.get<unknown>('/api/notifications/unread-count')
      const count = typeof data === 'number' ? Number(data) : Number((data as Record<string, unknown>)?.count ?? (data as Record<string, unknown>)?.unreadCount ?? (data as Record<string, unknown>)?.unread ?? 0)
      setUnread(count)
    } catch { /* ignore */ }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiService.get<unknown>('/api/notifications')
      const list = Array.isArray(data) ? data : []
      const items = list.map((n: Record<string, unknown>) => {
        let dataUrl: string | undefined
        let notificationData: Record<string, unknown> = {}
        try {
          const dataJson = (n.dataJson ?? n.DataJson) as string | undefined
          if (dataJson) {
            const parsed = JSON.parse(dataJson)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              notificationData = parsed as Record<string, unknown>
              dataUrl = String(notificationData.url ?? notificationData.Url ?? '') || undefined
            }
          }
        } catch { /* ignore */ }
        return {
          id: String(n.id ?? n.Id ?? ''),
          type: String(n.type ?? n.Type ?? ''),
          title: String(n.title ?? n.Title ?? 'Notificación'),
          message: String(n.message ?? n.Message ?? ''),
          isRead: Boolean(n.isRead ?? n.IsRead ?? false),
          createdAtUtc: String(n.createdAtUtc ?? n.CreatedAtUtc ?? ''),
          data: notificationData,
          url: dataUrl || String(n.url ?? n.Url ?? ''),
        }
      })
      setNotifications(items)
      fetchUnread()
    } catch { setNotifications([]) }
    setLoading(false)
  }, [fetchUnread])

  useEffect(() => {
    fetchUnread()
    intervalRef.current = setInterval(fetchUnread, 60000)
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [fetchUnread])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Notificaciones">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-md">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={panelRef}
            className="fixed right-4 top-14 z-50 w-80 origin-top-right animate-slide-up rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:right-6">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Notificaciones</p>
              <div className="flex gap-2">
                {unread > 0 && (
                  <button onClick={async () => { try { await apiService.post('/api/notifications/read-all'); setUnread(0); notifications.forEach((n) => n.isRead = true) } catch { /* */ } }}
                    className="text-[11px] font-semibold text-violet-600 hover:text-violet-500">Leer</button>
                )}
                {notifications.length > 0 && (
                  <button onClick={async () => { try { await apiService.del('/api/notifications/mine'); setNotifications([]); setUnread(0) } catch { /* */ } }}
                    className="text-[11px] font-semibold text-red-500 hover:text-red-400">Eliminar</button>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">Cargando...</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">Sin notificaciones</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id}
                    className={`group relative border-b border-slate-100 px-4 py-3 transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${!n.isRead ? 'bg-violet-50/50 dark:bg-violet-950/20' : ''}`}>
                    <button onClick={async () => {
                      if (!n.isRead) { try { await apiService.post(`/api/notifications/${n.id}/read`); setUnread((p) => Math.max(0, p - 1)) } catch { /* */ } }
                      setOpen(false)
                      navigate(resolveNotificationRoute({
                        type: n.type,
                        data: n.data,
                        url: n.url,
                        role: activeRole,
                      }))
                    }} className="w-full text-left">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{n.title}</p>
                        {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" />}
                      </div>
                      {n.message && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>}
                      {n.createdAtUtc && <p className="mt-1 text-[10px] text-slate-400">{formatDate(n.createdAtUtc)}</p>}
                    </button>
                    <button onClick={async (e) => { e.stopPropagation(); try { await apiService.del(`/api/notifications/${n.id}`); setNotifications((p) => p.filter((x) => x.id !== n.id)); if (!n.isRead) setUnread((p) => Math.max(0, p - 1)) } catch { /* */ } }}
                      className="absolute right-2 top-2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-[10px] text-red-500 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-400">
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
