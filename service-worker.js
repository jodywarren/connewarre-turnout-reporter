const CACHE_NAME = "turnout-reporter-v3";

const FILES_TO_CACHE = [
  "/connewarre-turnout-reporter/",
  "/connewarre-turnout-reporter/index.html",
  "/connewarre-turnout-reporter/styles.css",
  "/connewarre-turnout-reporter/app.js",
  "/connewarre-turnout-reporter/members.json",
  "/connewarre-turnout-reporter/manifest.json"
];

/* Install */
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

/* Activate */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

/* Fetch */
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => response)
      .catch(() => caches.match(event.request))
  );
});
