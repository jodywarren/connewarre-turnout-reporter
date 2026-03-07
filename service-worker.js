const CACHE_NAME = "turnout-reporter-v1";

const FILES_TO_CACHE = [
  "/cfa-turnout-reporter/",
  "/cfa-turnout-reporter/index.html",
  "/cfa-turnout-reporter/styles.css",
  "/cfa-turnout-reporter/app.js",
  "/cfa-turnout-reporter/members.json",
  "/cfa-turnout-reporter/manifest.json"
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
      .then(response => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
