// Marmotte Bestellungen – Service Worker
// Bei Änderungen an gecachten Dateien: Versionsnummer erhöhen,
// damit Nutzer:innen automatisch die neue Version erhalten.
const CACHE_VERSION = "v1";
const CACHE_NAME = `marmotte-bestellungen-${CACHE_VERSION}`;

// Kernseiten und -dateien, die beim Installieren vorab gecacht werden.
// app.html / change-password.html werden hier mit aufgenommen, auch wenn
// sie nicht Teil dieses Uploads sind, da sie live im Repo existieren.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./app.html",
  "./change-password.html",
  "./style.css",
  "./firebase-config.js",
  "./manifest.json",
  "./assets/icon_bestellungen_192.png",
  "./assets/icon_bestellungen_512.png",
  "./assets/icon_bestellungen_maskable192.png",
  "./assets/icon_bestellungen_maskable512.png",
  "./assets/icon_bestellungen_appletouch180.png",
  "./assets/icon_bestellungen_favicon32.png",
];

// Installation: Kern-Dateien in den Cache legen.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll bricht komplett ab, wenn eine Datei fehlt (z. B. app.html
      // noch nicht vorhanden) – daher einzeln laden und Fehler ignorieren.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("SW: Konnte nicht vorab cachen:", url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Aktivierung: alte Cache-Versionen aufräumen.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch-Strategie:
// - Navigationen (HTML-Seitenaufrufe): Network-first, Fallback auf Cache,
//   damit man offline trotzdem die zuletzt gecachte Seite bekommt.
// - Alles andere vom eigenen Origin (CSS, JS, Icons): Cache-first,
//   im Hintergrund aktualisieren (stale-while-revalidate).
// - Fremde Domains (Firebase, Google Fonts etc.): einfach durchreichen,
//   nicht ins Caching-Konzept einbezogen.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    return; // Fremde Requests (Firebase SDK, Firestore, Auth) nicht abfangen
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
