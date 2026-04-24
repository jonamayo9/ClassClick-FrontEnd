const CACHE_VERSION = "v3";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// INSTALL
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!key.includes(CACHE_VERSION)) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ❌ API → nunca cachear
  if (url.pathname.startsWith("/api")) return;

  // 🔄 navegación → network first
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 🖼️ IMÁGENES
  if (event.request.destination === "image") {

    // 🚨 SI ES EXTERNA (Azure) → NO INTERCEPTAR
    if (url.origin !== self.location.origin) {
      return;
    }

    // ✅ SOLO imágenes propias
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);

        try {
          const response = await fetch(event.request);

          if (!response || !response.ok) {
            return cached || Response.error();
          }

          cache.put(event.request, response.clone());
          return response;

        } catch {
          return cached || Response.error();
        }
      })
    );

    return;
  }

  // 📦 JS / CSS → cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});


// =======================
// 🔔 PUSH
// =======================

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "ClassClick",
      body: event.data.text()
    };
  }

  const title = payload.title || "ClassClick";

  const options = {
    body: payload.body || "",
    icon: "/public/icons/icon-192.png",
    badge: "/public/icons/icon-192.png",
    data: {
      url: payload?.data?.url || payload?.url || "/index.html"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// CLICK
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});