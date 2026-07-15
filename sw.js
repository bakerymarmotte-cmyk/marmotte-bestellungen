// Marmotte Bestellungen – Service Worker
// Bei Änderungen an gecachten Dateien: Versionsnummer erhöhen,
// damit Nutzer:innen automatisch die neue Version erhalten.
const CACHE_VERSION = "v2";
// Achtung: Cache Storage ist pro Origin, nicht pro App. Die Zeiterfassung
// liegt auf derselben Origin und nutzt das Praefix "marmotte-shell-".
// Beim Aufraeumen darf daher nur geloescht werden, was zu DIESER App gehoert.
const CACHE_PREFIX = "marmotte-bestellungen-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// Kernseiten und -dateien, die beim Installieren vorab gecacht werden.
// change-password.html fehlt hier bewusst: die Seite existiert noch nicht.
// Sobald sie im Repo liegt, hier ergaenzen.
//
// Design-System: tokens.css/components.css kommen aus dem Repo marmotte-design
// auf derselben Origin. Sie werden vorab gecacht (damit die App offline nicht
// ungestylt ist), im Betrieb aber network-first geladen – genau wie in der
// Zeiterfassung. Darum braucht es hier keinen ?v=-Cache-Buster.
const DESIGN_PATH = "/marmotte-design/";
const DESIGN_BASE = `https://bakerymarmotte-cmyk.github.io${DESIGN_PATH}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./app.html",
  "./style.css",
  "./firebase-config.js",
  "./manifest.json",
  `${DESIGN_BASE}tokens.css`,
  `${DESIGN_BASE}components.css`,
  "./assets/favicon.ico",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-192.png",
  "./assets/icon-maskable-512.png",
  "./assets/apple-touch-icon-120.png",
  "./assets/apple-touch-icon-152.png",
  "./assets/apple-touch-icon-167.png",
  "./assets/apple-touch-icon-180.png",
  "./assets/tile-150.png",
  "./assets/tile-310.png",
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
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch-Strategie:
// - Navigationen (HTML-Seitenaufrufe): Network-first, Fallback auf Cache,
//   damit man offline trotzdem die zuletzt gecachte Seite bekommt.
// - Design-System (/marmotte-design/): Network-first. Liegt zwar auf derselben
//   Origin, gehoert aber nicht zu dieser App – Aenderungen sollen sofort
//   ankommen, ohne dass irgendwo eine Version hochgezaehlt werden muss.
//   Offline greift der Cache-Fallback.
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

  const isDesignFile = url.pathname.startsWith(DESIGN_PATH);

  if (request.mode === "navigate" || isDesignFile) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return isDesignFile ? Response.error() : caches.match("./index.html");
          })
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
