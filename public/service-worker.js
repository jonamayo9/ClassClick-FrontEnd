const APP_VERSION = '__APP_VERSION__'
const CACHE_PREFIX = 'classclick-'
const CACHE_NAME = CACHE_PREFIX + APP_VERSION
const IMAGE_CACHE_NAME = CACHE_PREFIX + 'images-' + APP_VERSION
const IS_LOCALHOST = ['localhost', '127.0.0.1', '::1'].includes(self.location.hostname)

function isOwnCache(name) {
  return name.startsWith(CACHE_PREFIX)
}

function deleteOwnCaches() {
  return caches.keys().then((keys) =>
    Promise.all(
      keys
        .filter((k) => isOwnCache(k) && k !== CACHE_NAME && k !== IMAGE_CACHE_NAME)
        .map((k) => caches.delete(k))
    )
  )
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    deleteOwnCaches().then(() => {
      self.clients.claim()
      return self.clients.matchAll().then((clients) =>
        clients.forEach((client) =>
          client.postMessage({ type: 'VERSION', version: APP_VERSION })
        )
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  if (IS_LOCALHOST) return

  const { request } = event
  const url = new URL(request.url)

  if (!self.location.protocol.startsWith('http')) return
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api')) return

  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      })
    )
    return
  }

  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      })
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((res) => {
        if (
          res.ok &&
          res.type !== 'opaque' &&
          res.headers.get('Content-Type')?.startsWith('text/html')
        ) {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
        }
        return res
      }).catch(() =>
        caches.match('/').then((r) => r ?? new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  event.respondWith(fetch(request))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PURGE') {
    deleteOwnCaches().then(() => {
      if (event.source && 'postMessage' in event.source) {
        event.source.postMessage({ type: 'PURGED' })
      }
    })
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try { payload = event.data.json() }
  catch { payload = { title: 'ClassClick', body: event.data.text() } }

  const { title = 'ClassClick', body = '', data = {}, actions = [] } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data?.url || '/', ...data },
      actions,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const legacyTargets = {
    '/src/pages/student/home/index.html': '/student',
    '/src/pages/student/profile/index.html': '/student/siblings',
    '/src/pages/student/payments/index.html': '/student/payments',
    '/src/pages/student/documents/index.html': '/student/documents',
    '/src/pages/student/files/index.html': '/student/documents',
    '/src/pages/admin/payments/index.html': '/admin/payments',
    '/src/pages/admin/student-files/index.html': '/admin/records',
    '/src/pages/admin/students/sibling-links/index.html': '/admin/siblings',
  }
  const rawTarget = event.notification.data?.url || '/'
  let target = rawTarget
  try {
    const parsed = new URL(rawTarget, self.location.origin)
    target = legacyTargets[parsed.pathname.toLowerCase()] || `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    target = '/'
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => {
        try { return new URL(c.url).origin === self.location.origin }
        catch { return false }
      })
      if (existing) { existing.focus(); existing.navigate(target); return }
      return clients.openWindow(target)
    })
  )
})
