'use strict';
importScripts('./offline-assets.js');
const CACHE = 'pct-next-offline-v4';
const scope = new URL(self.registration.scope);
// Normalize version and navigation parameters: every local asset has one cache entry.
function cacheKey(url) { return new Request(url.origin + url.pathname); }
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    let index = 0;
    async function worker() {
      while (index < self.PCT_OFFLINE_ASSETS.length) {
        const url = new URL(self.PCT_OFFLINE_ASSETS[index++], scope);
        const response = await fetch(new Request(url, {cache:'reload'}));
        if (!response.ok) throw new Error('Offline download failed: '+url.pathname);
        await cache.put(cacheKey(url), response);
      }
    }
    // Do not activate a partial download and discard the previous working cache.
    await Promise.all([worker(),worker(),worker(),worker()]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('pct-next-offline-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (url.pathname.endsWith('/')) url.pathname += 'index.html';
  const key = cacheKey(url);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Static assets are installed as a single release; avoid mixing script versions.
    const cached = await cache.match(key);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) return response;
      return cached || response;
    } catch {
      return cached || Response.error();
    }
  })());
});
