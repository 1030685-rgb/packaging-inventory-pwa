const CACHE_NAME = "packaging-inventory-pwa-v3";
const FIREBASE_SDK_ORIGIN = "https://www.gstatic.com";
const SCOPE_URL = new URL(self.registration.scope);
const SCOPE_PATH = SCOPE_URL.pathname;
const APP_SHELL = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "firebase.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
].map((path) => new URL(path, self.registration.scope).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isAppRequest = requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith(SCOPE_PATH);
  const isFirebaseSdkRequest = requestUrl.origin === FIREBASE_SDK_ORIGIN && requestUrl.pathname.startsWith("/firebasejs/10.12.5/");

  if (!isAppRequest && !isFirebaseSdkRequest) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      }).catch(() => caches.match(new URL("index.html", self.registration.scope).toString()));
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(self.registration.scope);
      return undefined;
    })
  );
});
