const CACHE_NAME = "dotline-v2"
const STATIC_ASSETS = ["/", "/login"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle share target POST — pass through to network
  if (request.method === "POST" && url.pathname === "/api/share-target") {
    event.respondWith(fetch(request))
    return
  }

  // Skip non-GET requests
  if (request.method !== "GET") return

  // API requests: don't cache in SW (IndexedDB handles data caching).
  // But intercept offline failures so the app can handle them gracefully.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    )
    return
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
      )
    )
  } else {
    // Network-first for pages, fall back to cached shell
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    )
  }
})

// --- Web Push Notifications ---
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || "DotLine"
  const options = {
    body: data.body || "",
    icon: "/icon-192",
    badge: "/notification-badge",
    data: { url: data.url || "/" },
    tag: data.tag || "dotline",
    renotify: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
