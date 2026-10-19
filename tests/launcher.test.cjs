const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function launcher(saved) {
  let source = fs.readFileSync('home-next.js','utf8').split('  function showCommand(){')[0];
  source += '\n globalThis.api={interpret,cleanPaths,data,durationSeconds};})();';
  const context = {document:{querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem:()=>saved},URLSearchParams};
  vm.runInNewContext(source,context);
  return context.api;
}
test('commands normalize full width and preserve compound durations',()=>{
  const {interpret} = launcher();
  assert.match(interpret('５分タイマー').url,/preset=300/);
  const result = interpret('1時間30分15秒');
  assert.match(result.url,/preset=5415/);
  assert.match(result.title,/1時間30分15秒/);
  assert.equal(interpret('cos(60)').id,'math-assist');
  assert.equal(interpret('OS').id,'dev-os');
  assert.equal(interpret('stopwatch').id,'universal-timer');
  assert.equal(interpret('Scratch 123456').id,'scratch-lite');
});
test('invalid saved paths are removed and duplicate paths collapse',()=>{
  const api=launcher(JSON.stringify({pinned:['tools/math-assist/index.html','bad','tools/math-assist/index.html'],recent:[null,{},'tools/dev-os/index.html']}));
  assert.equal(api.data.pinned.length,1);
  assert.equal(api.data.recent.length,1);
  assert.equal(launcher('{broken').data.pinned.length,0);
});
test('offline list includes all dynamic arcade packs and HTML dependencies',()=>{
  const ctx={self:{}};vm.runInNewContext(fs.readFileSync('offline-assets.js','utf8'),ctx);
  const assets=new Set(ctx.self.PCT_OFFLINE_ASSETS);
  const packs={window:{}};vm.runInNewContext(fs.readFileSync('tools/retro-arcade/games/catalog.js','utf8'),packs);
  for(const file of packs.window.RETRO_ARCADE_PACKS) assert.ok(assets.has('./tools/retro-arcade/'+file.split('?')[0]),file);
  for(const file of assets) {
    assert.ok(fs.existsSync(file),file);
    if(!file.endsWith('.html'))continue;
    const html=fs.readFileSync(file,'utf8');
    for(const match of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)) {
      const url=new URL(match[1],new URL(file,'https://example.test/project/'));
      if(url.origin!=='https://example.test')continue;
      assert.ok(assets.has('./'+decodeURI(url.pathname.replace('/project/',''))),file+' -> '+match[1]);
    }
  }
});
test('service worker serves versioned assets offline and falls back on HTTP failure',async()=>{
  const listeners={};const cached=new Response('cached');
  const ctx={self:{registration:{scope:'https://example.test/project/'},addEventListener:(n,fn)=>listeners[n]=fn},importScripts:()=>{},URL,Request,Response,caches:{open:async()=>({match:async()=>cached.clone()})},fetch:async()=>new Response('unavailable',{status:503})};
  vm.runInNewContext(fs.readFileSync('home-sw.js','utf8'),ctx);
  let promise;
  listeners.fetch({request:new Request('https://example.test/project/home-next.js?v=4'),respondWith:p=>promise=p});
  assert.equal(await (await promise).text(),'cached');
  const navigation={url:'https://example.test/project/tools/math-assist/?quick=2',method:'GET',mode:'navigate'};
  listeners.fetch({request:navigation,respondWith:p=>promise=p});
  assert.equal(await (await promise).text(),'cached');
  let intercepted=false;
  listeners.fetch({request:new Request('https://example.test/other/file.js'),respondWith:()=>intercepted=true});
  assert.equal(intercepted,false);
});
