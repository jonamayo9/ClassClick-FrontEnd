import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

export interface CourseWallReactionUser {
  id: string
  name: string
}

export interface CourseWallMessage {
  id: string
  senderName: string
  text: string
  imageUrl?: string
  isPrivate: boolean
  parentMessageId?: string | null
  reactions?: Record<string, CourseWallReactionUser[]>
  createdAtUtc: string
}

interface CourseWallProps {
  messages: CourseWallMessage[]
  loading?: boolean
  sending?: boolean
  reacting?: boolean
  canDelete?: boolean
  allowPrivate?: boolean
  privateLabel?: string
  accent?: 'violet' | 'emerald' | 'blue'
  imageUrl?: (url: string) => string
  onSend: (formData: FormData) => void
  onReact: (messageId: string, emoji: string) => void
  onDelete?: (message: CourseWallMessage) => void
}

const COMPOSE_EMOJIS = ['😀', '😊', '😂', '❤️', '🔥', '👍', '🎉', '⚽', '🏆', '📚', '✅', '💪', '🙌', '👏', '✨', '🎯', '🔝', '💯']
const REACT_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '🎉']

const accentClass = {
  violet: {
    button: 'bg-violet-600 text-white hover:bg-violet-700',
    soft: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-200',
    line: 'border-violet-200 dark:border-violet-800',
    focus: 'focus:border-violet-500 focus:ring-violet-500',
  },
  emerald: {
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
    soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200',
    line: 'border-emerald-200 dark:border-emerald-800',
    focus: 'focus:border-emerald-500 focus:ring-emerald-500',
  },
  blue: {
    button: 'bg-blue-600 text-white hover:bg-blue-700',
    soft: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200',
    line: 'border-blue-200 dark:border-blue-800',
    focus: 'focus:border-blue-500 focus:ring-blue-500',
  },
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')
}

export function CourseWall({
  messages,
  loading,
  sending,
  reacting,
  canDelete = false,
  allowPrivate = true,
  privateLabel = 'Privado',
  accent = 'violet',
  imageUrl,
  onSend,
  onReact,
  onDelete,
}: CourseWallProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const style = accentClass[accent]
  const [text, setText] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [openReaction, setOpenReaction] = useState<string | null>(null)

  useEffect(() => {
    if (!openReaction) return
    const close = () => setOpenReaction(null)
    const timer = window.setTimeout(() => document.addEventListener('click', close), 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', close)
    }
  }, [openReaction])

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()),
    [messages],
  )

  const childrenByParent = useMemo(() => {
    const grouped = new Map<string, CourseWallMessage[]>()
    for (const message of orderedMessages) {
      if (!message.parentMessageId) continue
      const list = grouped.get(message.parentMessageId) ?? []
      list.push(message)
      grouped.set(message.parentMessageId, list)
    }
    return grouped
  }, [orderedMessages])

  const posts = orderedMessages.filter((message) => !message.parentMessageId)

  function resetComposer() {
    setText('')
    setImage(null)
    setPreview(null)
    setShowEmojis(false)
    setIsPrivate(false)
  }

  function pickImage(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
    setImage(file)
    setIsPrivate(false)
    setPreview(URL.createObjectURL(file))
  }

  function submitPost() {
    if (!text.trim() && !image) return
    const fd = new FormData()
    if (text.trim()) fd.append('text', text.trim())
    if (image) fd.append('file', image)
    fd.append('isPrivate', String(allowPrivate && isPrivate && !image))
    onSend(fd)
    resetComposer()
  }

  function submitReply(parentId: string) {
    if (!replyText.trim()) return
    const fd = new FormData()
    fd.append('text', replyText.trim())
    fd.append('parentMessageId', parentId)
    fd.append('isPrivate', 'false')
    onSend(fd)
    setReplyText('')
    setReplyTo(null)
  }

  function renderReactions(message: CourseWallMessage, compact = false) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {REACT_EMOJIS.map((emoji) => {
          const users = message.reactions?.[emoji] ?? []
          const count = users.length
          const key = `${message.id}-${emoji}`
          const names = users.map((u) => u.name).join(', ')
          return (
            <div key={emoji} className="relative">
              <button
                type="button"
                title={names || 'Reaccionar'}
                onClick={(event) => {
                  event.stopPropagation()
                  if (count > 0 && openReaction !== key) setOpenReaction(key)
                  onReact(message.id, emoji)
                }}
                className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 ${count > 0 ? style.soft : 'text-slate-500'} ${compact ? 'text-[11px]' : 'text-xs'}`}
                disabled={reacting}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="font-bold">{count}</span>}
              </button>
              {openReaction === key && count > 0 && (
                <div className="absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-52 -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-center text-xs text-white shadow-xl dark:bg-slate-700">
                  {names}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function renderMessage(message: CourseWallMessage, depth = 0) {
    const replies = childrenByParent.get(message.id) ?? []
    const isPost = depth === 0
    return (
      <article
        key={message.id}
        className={
          isPost
            ? `rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${message.isPrivate ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-800'}`
            : 'rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/45'
        }
      >
        <div className="flex items-start gap-3">
          <div className={`${isPost ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'} flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-black text-white dark:bg-white dark:text-slate-900`}>
            {getInitials(message.senderName).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${isPost ? 'text-sm' : 'text-xs'} font-bold text-slate-950 dark:text-white`}>{message.senderName}</span>
              {message.isPrivate && <Badge variant="warning">Privado</Badge>}
              <span className="text-[10px] font-medium text-slate-400">{formatDate(message.createdAtUtc)}</span>
            </div>
            {message.text && (
              <p className={`${isPost ? 'mt-2 text-sm leading-6' : 'mt-1 text-xs leading-5'} whitespace-pre-wrap text-slate-700 dark:text-slate-300`}>
                {message.text}
              </p>
            )}
            {message.imageUrl && (
              <a href={imageUrl?.(message.imageUrl) ?? message.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block w-fit">
                <img
                  src={imageUrl?.(message.imageUrl) ?? message.imageUrl}
                  alt=""
                  className={`${isPost ? 'max-h-64' : 'max-h-40'} max-w-full rounded-xl border border-slate-200 object-cover dark:border-slate-700`}
                />
              </a>
            )}
          </div>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(message)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Eliminar
            </button>
          )}
        </div>

        <div className={`${isPost ? 'mt-4' : 'mt-3'} border-t border-slate-100 pt-3 dark:border-slate-800`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {renderReactions(message, !isPost)}
            <button
              type="button"
              onClick={() => setReplyTo(replyTo === message.id ? null : message.id)}
              className="rounded-full px-3 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Responder
            </button>
          </div>
          {replyTo === message.id && (
            <div className={`mt-3 rounded-xl border p-3 ${style.line} bg-white dark:bg-slate-900`}>
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  autoFocus
                  placeholder="Escribi una respuesta..."
                  className={`min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white ${style.focus}`}
                />
                <Button size="sm" loading={sending} disabled={!replyText.trim()} onClick={() => submitReply(message.id)} className={style.button}>
                  Enviar
                </Button>
              </div>
            </div>
          )}
        </div>

        {replies.length > 0 && (
          <div className={`mt-4 space-y-3 border-l-2 pl-3 ${style.line}`}>
            {replies
              .sort((a, b) => new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime())
              .map((reply) => renderMessage(reply, depth + 1))}
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <Card className="w-full shrink-0 space-y-4 p-4 xl:w-80">
        <div>
          <h2 className="text-sm font-black text-slate-950 dark:text-white">Publicar</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Compartir una publicacion en el curso.</p>
        </div>
        {preview && (
          <div className="relative inline-block">
            <img src={preview} alt="" className="h-20 w-20 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
            <button
              type="button"
              onClick={() => {
                setImage(null)
                setPreview(null)
              }}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
            >
              x
            </button>
          </div>
        )}
        <Textarea value={text} onChange={(event) => setText(event.target.value)} rows={4} placeholder="Escribi una publicacion..." />
        {showEmojis && (
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            {COMPOSE_EMOJIS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => setText((current) => current + emoji)} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                {emoji}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowEmojis((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-base hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            🙂
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-base hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            🖼️
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => pickImage(event.target.files)} />
          {allowPrivate && !image && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              {privateLabel}
            </label>
          )}
        </div>
        <Button onClick={submitPost} loading={sending} disabled={!text.trim() && !image} className={`w-full ${style.button}`}>
          Publicar
        </Button>
      </Card>

      <Card className="min-w-0 flex-1 space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-950 dark:text-white">Muro del curso</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{posts.length} publicaciones</p>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner className="h-6 w-6" /></div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
            Todavia no hay publicaciones.
          </div>
        ) : (
          <div className="space-y-4">{posts.map((post) => renderMessage(post))}</div>
        )}
      </Card>
    </div>
  )
}
