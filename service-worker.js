const CACHE_VERSION = "v14-no-admin-auth-cache";
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
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api")) {
    return;
  }

  const noCachePaths = [
    "/src/pages/admin/",
    "/src/pages/auth/",
    "/src/pages/student/",
    "/shared/js/",
    "/public/config.json",
    "/index.html"
  ];

  if (noCachePaths.some((path) => url.pathname.startsWith(path) || url.pathname === path)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
    return;
  }

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

  if (
    event.request.destination === "script" ||
    event.request.destination === "style"
  ) {
    event.respondWith(fetch(event.request));
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