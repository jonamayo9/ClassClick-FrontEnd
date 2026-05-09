const CACHE_VERSION = "v16-no-html-cache";
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      await self.clients.claim();

      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of clientsList) {
        client.postMessage({
          type: "CLASSCLICK_SW_UPDATED",
          version: CACHE_VERSION
        });
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Nunca tocar API
  if (url.pathname.startsWith("/api")) {
    return;
  }

  // Nunca cachear páginas ni JS/CSS de la app
  if (
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/shared/") ||
    url.pathname === "/index.html" ||
    url.pathname === "/" ||
    url.pathname === "/public/config.json" ||
    event.request.mode === "navigate" ||
    event.request.destination === "script" ||
    event.request.destination === "style"
  ) {
    event.respondWith(
      fetch(event.request, {
        cache: "no-store"
      })
    );
    return;
  }

  // Solo cachear imágenes locales
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
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
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