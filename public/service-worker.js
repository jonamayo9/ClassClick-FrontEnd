const CACHE = 'classclick-v2'
const ASSETS = ['/', '/offline']
const IS_LOCALHOST = ['localhost', '127.0.0.1', '::1'].includes(self.location.hostname)

self.addEventListener('install', (event) => {
  if (IS_LOCALHOST) {
    self.skipWaiting()
    return
  }

  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  if (IS_LOCALHOST) {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
    )
    return
  }

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (IS_LOCALHOST) return

  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api')) return

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
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
      caches.open('images').then(async (cache) => {
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
      fetch(request).catch(() =>
        caches.match('/').then((r) => r ?? new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  event.respondWith(fetch(request))
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
