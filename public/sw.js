// Minimal service worker — required for a page to qualify as an installable PWA.
// This also caches the app shell — including the CDN libraries index.html
// loads — so the app itself can open with no connection at all.

const CACHE_NAME = 'vytpg-attendance-v3'; // bumped so returning users pick up this update
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/college_logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cached one at a time rather than cache.addAll(), so one missing or
      // blocked file (e.g. an icon that hasn't actually been uploaded yet)
      // can't fail the whole precache and leave nothing to fall back on.
      Promise.all(APP_SHELL.map((url) =>
        cache.add(url).catch((err) => console.warn('SW: failed to precache', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Firestore/Auth traffic is never intercepted here — Firebase's own offline
// persistence (enabled in index.html) already caches and queues that, and
// a service worker sitting in front of its streaming requests can conflict
// with it.
function isFirebaseApi(url) {
  return url.hostname === 'firestore.googleapis.com'
      || url.hostname === 'identitytoolkit.googleapis.com'
      || url.hostname === 'securetoken.googleapis.com'
      || url.hostname.endsWith('.firebaseio.com');
}

// Network-first for everything else (app shell + CDN libs), so updates are
// always fresh when online; falls back to cache only if the network request
// fails (e.g. offline). Firestore/Auth calls pass straight through untouched.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // don't touch POST/Firestore writes

  const url = new URL(event.request.url);
  if (isFirebaseApi(url)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
