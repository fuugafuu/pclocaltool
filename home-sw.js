'use strict';
const CACHE='pct-next-offline-v1';
const ASSETS=[
 './','./index.html','./home-next.js?v=1','./home-next.css?v=1','./manifest.webmanifest','./pct-next-icon.svg',
 './tools/_shared/tool-hub.js?v=2','./tools/_shared/tool-hub.css?v=2',
 './tools/math-assist/index.html','./tools/math-assist/style.css','./tools/math-assist/final.css',
 './tools/math-assist/core.js','./tools/math-assist/exact.js','./tools/math-assist/smart.js?v=20261008-2',
 './tools/math-assist/smart-extended.js','./tools/math-assist/guided.js','./tools/math-assist/algebra.js','./tools/math-assist/geometry.js','./tools/math-assist/data.js','./tools/math-assist/advanced.js',
 './tools/universal-timer/index.html','./tools/universal-timer/style.css','./tools/universal-timer/app.js?v=20261008-2',
 './tools/janken-ai/index.html','./tools/janken-ai/style.css','./tools/janken-ai/app.js?v=20261008-1','./tools/janken-ai/engine.js',
 './tools/agent-bridge/index.html','./tools/agent-bridge/style.css?v=20261008-1','./tools/agent-bridge/app.js?v=20261008-1','./tools/agent-bridge/input-normalizer.js','./tools/agent-bridge/ui-enhance.js',
 './tools/agent-bridge/tool/catalog.js','./tools/agent-bridge/tool/catalog-agent.js','./tools/agent-bridge/tool/catalog-diagnostics.js',
 './tools/agent-bridge/tool/runtime-agent.js','./tools/agent-bridge/tool/runtime-code.js','./tools/agent-bridge/tool/runtime-data.js',
 './tools/agent-bridge/tool/runtime-diagnostics.js','./tools/agent-bridge/tool/runtime-file.js','./tools/agent-bridge/tool/runtime-text.js',
 './tools/dev-os/index.html','./tools/dev-os/style.css','./tools/dev-os/v2.css','./tools/dev-os/v3.css','./tools/dev-os/update.css',
 './tools/dev-os/core.js','./tools/dev-os/boot-v3.js','./tools/dev-os/task-security.js','./tools/dev-os/event-admin.js',
 './tools/dev-os/explorer-terminal.js','./tools/dev-os/registry-settings.js','./tools/dev-os/main.js','./tools/dev-os/i18n.js',
 './tools/dev-os/desktop-shell.js','./tools/dev-os/package-manager.js','./tools/dev-os/malware-sim.js',
 './tools/dev-os/v2-integrate.js','./tools/dev-os/update-system-3.1.1.js','./tools/dev-os/v3-shell.js',
 './tools/dev-os/malware-advanced.js','./tools/dev-os/repair-ui.js?v=20261008-1',
 './tools/retro-arcade/index.html','./tools/retro-arcade/style.css?v=20261005-3','./tools/retro-arcade/core.js?v=20261008-2',
 './tools/retro-arcade/games/catalog.js?v=20261005-3',
 './tools/scratch-lite/index.html','./tools/scratch-lite/style.css?v=4','./tools/scratch-lite/app.js?v=4',
 './tools/scratch-lite/manifest.webmanifest'
];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  await c.addAll(['./','./index.html','./home-next.js?v=1','./home-next.css?v=1']);
  let index=0;
  async function worker(){
   while(index<ASSETS.length){
    const path=ASSETS[index++];
    try{
     const req=new Request(path,{cache:'reload'});
     const response=await fetch(req);
     if(response.ok)await c.put(req,response.clone());
    }catch{}
   }
  }
  await Promise.all([worker(),worker(),worker(),worker()]);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('pct-next-offline-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const c=await caches.open(CACHE);
  try{
   const response=await fetch(req);
   if(response.ok&&response.type==='basic')c.put(req,response.clone()).catch(()=>{});
   return response;
  }catch{
   return await c.match(req)||await c.match(new Request(url.pathname))||Response.error();
  }
 })());
});