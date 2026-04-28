const CACHE_VERSION = "v5";
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.includes(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

// API: nunca cachear ni interceptar
if (url.pathname.startsWith("/api")) {
  event.respondWith(fetch(event.request));
  return;
}

// Azure / externos: nunca cachear ni interceptar
if (url.origin !== self.location.origin) {
  event.respondWith(fetch(event.request));
  return;
}

  // HTML: network first
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Imágenes locales: cache first
  if (event.request.destination === "image") {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);

        if (response && response.ok) {
          cache.put(event.request, response.clone());
        }

        return response;
      })
    );
    return;
  }

  // JS/CSS: network first
  if (
    event.request.destination === "script" ||
    event.request.destination === "style"
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
});

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

  event.waitUntil(
    self.registration.showNotification(payload.title || "ClassClick", {
      body: payload.body || "",
      icon: "/public/icons/icon-192.png",
      badge: "/public/icons/icon-192.png",
      data: {
        url: payload?.data?.url || payload?.url || "/index.html"
      }
    })
  );
});

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

        return clients.openWindow?.(targetUrl);
      })
  );
});