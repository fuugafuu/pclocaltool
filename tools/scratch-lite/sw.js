const CACHE='scratch-lite-v4';
const RUNTIME='https://cdn.jsdelivr.net/npm/@turbowarp/scaffolding@0.4.0/dist/scaffolding-min.js';
const SHELL=['./','./index.html','./style.css?v=4','./app.js?v=4','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await c.addAll(SHELL);
    try{const r=await fetch(RUNTIME,{cache:'reload'});if(r.ok)await c.put(RUNTIME,r.clone())}catch{}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const k of await caches.keys())if(k.startsWith('scratch-lite-')&&k!==CACHE)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.href===RUNTIME){
    event.respondWith((async()=>{const c=await caches.open(CACHE),hit=await c.match(RUNTIME);if(hit)return hit;const r=await fetch(req);if(r.ok)await c.put(RUNTIME,r.clone());return r})());
    return;
  }
  if(url.origin===location.origin){
    event.respondWith((async()=>{const c=await caches.open(CACHE),hit=await c.match(req);try{const fresh=await fetch(req);if(fresh.ok)c.put(req,fresh.clone());return fresh}catch{return hit||Response.error()}})());
  }
});