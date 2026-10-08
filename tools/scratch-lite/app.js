'use strict';
(() => {
const VERSION='1.1.0';
const RUNTIME_VERSION='0.4.0';
const RUNTIME_URL='https://cdn.jsdelivr.net/npm/@turbowarp/scaffolding@'+RUNTIME_VERSION+'/dist/scaffolding-min.js';
const OFFLINE_RUNTIME_URL='https://cdn.jsdelivr.net/npm/@turbowarp/scaffolding@'+RUNTIME_VERSION+'/dist/scaffolding-with-music.js';
const $=s=>document.querySelector(s);
const state={runner:null,projectBuffer:null,projectName:'',analysis:null,device:null,profile:null,settings:null,loading:false,autoMonitor:null,rafStats:[],slowWindows:0,fastWindows:0,lastAdjust:0,recents:[],currentCacheId:null};

const DEFAULTS={mode:'auto',quality:'auto',fps:'auto',interpolation:'auto',hqPen:'auto',turbo:'off',warp:'auto',clones:'auto',fencing:'auto',misc:'auto',autostart:true};
const loadSettings=()=>({...DEFAULTS,...JSON.parse(localStorage.getItem('scratchLiteSettings')||'{}')});
const saveSettings=()=>localStorage.setItem('scratchLiteSettings',JSON.stringify(state.settings));
const setText=(id,v)=>{const e=$(id);if(e)e.textContent=v};
const show=(id,on=true)=>$(id)?.classList.toggle('hidden',!on);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const DB_NAME='scratch-lite-project-cache',DB_VERSION=1,CACHE_MAX_ITEMS=12,CACHE_MAX_BYTES=512*1024*1024;
let dbPromise=null;
const reqP=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB error'))});
function openProjectDB(){
 if(!('indexedDB' in window))return Promise.reject(new Error('このブラウザはプロジェクト保存に対応していません'));
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'});
   if(!db.objectStoreNames.contains('recent')){
    const st=db.createObjectStore('recent',{keyPath:'id'});
    st.createIndex('sourceKey','sourceKey',{unique:false});
    st.createIndex('lastUsed','lastUsed',{unique:false});
   }
  };
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 return dbPromise;
}
function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存が中断されました'))})}
async function cacheList(){
 try{const db=await openProjectDB(),tx=db.transaction('recent','readonly'),items=await reqP(tx.objectStore('recent').getAll());return items.sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||b.lastUsed-a.lastUsed)}catch(e){console.warn('recent list unavailable',e);return[]}
}
async function cacheFindBySourceKey(sourceKey){
 if(!sourceKey)return null;
 try{const db=await openProjectDB(),tx=db.transaction('recent','readonly'),idx=tx.objectStore('recent').index('sourceKey');return await reqP(idx.get(sourceKey))||null}catch{return null}
}
async function cacheGet(id){
 const db=await openProjectDB(),tx=db.transaction(['projects','recent'],'readonly');
 const [project,meta]=await Promise.all([reqP(tx.objectStore('projects').get(id)),reqP(tx.objectStore('recent').get(id))]);
 return project&&meta?{...project,meta}:null;
}
async function cacheTouch(id){
 try{const db=await openProjectDB(),tx=db.transaction('recent','readwrite'),st=tx.objectStore('recent'),m=await reqP(st.get(id));if(m){m.lastUsed=Date.now();st.put(m)}await txDone(tx)}catch{}
}
async function cacheTogglePinned(id){
 try{
  const db=await openProjectDB(),tx=db.transaction('recent','readwrite'),st=tx.objectStore('recent'),m=await reqP(st.get(id));
  if(m){m.pinned=!m.pinned;st.put(m)}
  await txDone(tx);
 }catch(e){console.warn('pin update failed',e)}
 await renderRecents();
}
async function cacheDelete(id){
 try{const db=await openProjectDB(),tx=db.transaction(['projects','recent'],'readwrite');tx.objectStore('projects').delete(id);tx.objectStore('recent').delete(id);await txDone(tx)}catch(e){console.warn('cache delete failed',e)}
 await renderRecents();
}
async function cacheClear(){
 try{const db=await openProjectDB(),tx=db.transaction(['projects','recent'],'readwrite');tx.objectStore('projects').clear();tx.objectStore('recent').clear();await txDone(tx)}catch(e){console.warn('cache clear failed',e)}
 state.recents=[];renderRecents();
}
async function pruneCache(keepId){
 const items=await cacheList();let total=0,kept=0,remove=[];
 for(const item of items){
  const shouldKeep=item.id===keepId||item.pinned||(kept<CACHE_MAX_ITEMS&&total+(item.size||0)<=CACHE_MAX_BYTES);
  if(shouldKeep){kept++;total+=item.size||0}else remove.push(item.id);
 }
 if(!remove.length)return;
 const db=await openProjectDB(),tx=db.transaction(['projects','recent'],'readwrite');
 for(const id of remove){tx.objectStore('projects').delete(id);tx.objectStore('recent').delete(id)}
 await txDone(tx);
}
async function cacheProject(buffer,name,analysis,info={}){
 if(!buffer?.byteLength)return;
 const sourceKey=info.sourceKey||('memory:'+name+':'+buffer.byteLength),id=sourceKey;
 const original=await cacheFindBySourceKey(sourceKey),now=Date.now(),meta={id,sourceKey,name:name||'Scratch Project',size:buffer.byteLength,lastUsed:now,pinned:!!original?.pinned,sourceType:info.sourceType||'file',source:info.source||'',analysis};
 try{
  const db=await openProjectDB(),tx=db.transaction(['projects','recent'],'readwrite');
  tx.objectStore('projects').put({id,buffer,analysis});
  tx.objectStore('recent').put(meta);
  await txDone(tx);
  state.currentCacheId=id;
  if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
  await pruneCache(id);await renderRecents();
 }catch(e){console.warn('project cache failed',e)}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function recentSourceLabel(x){return x.sourceType==='scratch'?'Scratch':x.sourceType==='url'?'URL':'ファイル'}
async function renderRecents(){
 const box=$('#recent-projects'),section=$('#recent-section');if(!box||!section)return;
 const list=state.recents=await cacheList();show('#recent-section',list.length>0);setText('#recent-storage',list.length+'件 · 約'+formatBytes(list.reduce((n,x)=>n+(x.size||0),0))+'保存');
 if(!list.length){box.innerHTML='<div class="recent-empty">まだ保存されたプロジェクトはありません。</div>';return}
 box.innerHTML=list.map((x,i)=>'<article class="recent-card" data-recent="'+i+'" tabindex="0"><div class="recent-icon">S</div><div class="recent-copy"><b>'+esc(x.name)+'</b><span>'+recentSourceLabel(x)+' · '+formatBytes(x.size)+' · '+esc(x.analysis?.level||'解析済み')+'</span></div><span class="recent-open">すぐ開く →</span><button class="recent-remove" data-remove="'+i+'" title="履歴から削除">×</button></article>').join('');
 box.querySelectorAll('[data-recent]').forEach(el=>{const open=()=>loadCached(list[Number(el.dataset.recent)]?.id).catch(fail);el.onclick=e=>{if(!e.target.closest('[data-remove],[data-pin]'))open()};el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('[data-remove],[data-pin]')){e.preventDefault();open()}}});
 box.querySelectorAll('[data-pin]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const item=list[Number(btn.dataset.pin)];if(item)cacheTogglePinned(item.id)});
 box.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const item=list[Number(btn.dataset.remove)];if(item)cacheDelete(item.id)});
}
async function loadCached(id){
 const cached=await cacheGet(id);if(!cached)throw new Error('保存済みプロジェクトが見つかりません');
 await cacheTouch(id);await renderRecents();
 setProgress('保存済みデータから開いています',35,'再取得なし');
 await loadBuffer(cached.buffer,cached.meta.name,{analysis:cached.analysis||cached.meta.analysis,skipCache:true,cacheId:id});
}
function sourceKeyForInput(input){
 const id=projectIdFrom(input);return id?'scratch:'+id:'url:'+input.trim();
}


function deviceProfile(){
 const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4,mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),save=!!navigator.connection?.saveData;
 let score=0;if(cores>=8)score+=3;else if(cores>=4)score+=2;else score+=1;if(mem>=8)score+=3;else if(mem>=4)score+=2;else score+=1;if(mobile)score-=1;if(save)score-=1;
 const tier=score>=5?'高性能':score>=3?'標準':'軽量';
 return {cores,mem,mobile,save,score,tier};
}
function formatBytes(n){if(!Number.isFinite(n))return '不明';const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return (i? n.toFixed(n>=100?0:n>=10?1:2):Math.round(n))+' '+u[i]}

async function loadRuntime(){
 if(window.Scaffolding)return;
 setText('#engine-state','ランタイム読込中');
 let code=null;
 if(location.protocol!=='file:'){
   try{const r=await fetch('./vendor/scaffolding-min.js',{cache:'force-cache'});if(r.ok)code=await r.text()}catch{}
   if(!code&&'caches' in window){try{const hit=await caches.match(RUNTIME_URL);if(hit)code=await hit.text()}catch{}}
 }
 if(!code){
   const r=await fetch(RUNTIME_URL,{cache:'force-cache'});if(!r.ok)throw new Error('TurboWarpランタイムを取得できません');
   const clone=r.clone();code=await r.text();
   if('caches' in window&&location.protocol!=='file:'){try{const c=await caches.open('scratch-lite-runtime-v1');await c.put(RUNTIME_URL,clone)}catch{}}
 }
 await new Promise((resolve,reject)=>{const blob=new Blob([code],{type:'text/javascript'}),url=URL.createObjectURL(blob),s=document.createElement('script');s.src=url;s.onload=()=>{URL.revokeObjectURL(url);resolve()};s.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('ランタイム実行に失敗'))};document.head.appendChild(s)});
 if(!window.Scaffolding)throw new Error('Scaffoldingが初期化されませんでした');
 $('#engine-state')?.classList.add('ready');setText('#engine-state','TurboWarp準備完了');
}

function createRunner(){
 if(state.runner){try{state.runner.vm?.stopAll?.()}catch{};try{state.runner.root?.remove?.()}catch{}}
 const r=new Scaffolding.Scaffolding();
 r.width=480;r.height=360;r.resizeMode='preserve-ratio';r.editableLists=false;r.shouldConnectPeripherals=true;r.usePackagedRuntime=false;r.setup();
 const st=r.storage;
 try{st.addWebStore([st.AssetType.ImageVector,st.AssetType.ImageBitmap,st.AssetType.Sound],asset=>'https://assets.scratch.mit.edu/internalapi/asset/'+asset.assetId+'.'+asset.dataFormat+'/get/')}catch{}
 r.appendTo($('#project-mount'));state.runner=r;return r;
}

async function unzipProjectJSON(buffer){
 try{
  const dv=new DataView(buffer);let eocd=-1;for(let i=Math.max(0,buffer.byteLength-65557);i<=buffer.byteLength-22;i++){if(dv.getUint32(i,true)===0x06054b50)eocd=i}
  if(eocd<0)return null;const count=dv.getUint16(eocd+10,true),cd=dv.getUint32(eocd+16,true);let p=cd;
  for(let n=0;n<count;n++){
   if(dv.getUint32(p,true)!==0x02014b50)break;
   const method=dv.getUint16(p+10,true),comp=dv.getUint32(p+20,true),nameLen=dv.getUint16(p+28,true),extra=dv.getUint16(p+30,true),comment=dv.getUint16(p+32,true),local=dv.getUint32(p+42,true);
   const name=new TextDecoder().decode(new Uint8Array(buffer,p+46,nameLen));
   if(name==='project.json'){
    const ln=dv.getUint16(local+26,true),le=dv.getUint16(local+28,true),start=local+30+ln+le;let bytes=new Uint8Array(buffer,start,comp);
    if(method===8&&typeof DecompressionStream!=='undefined'){const ds=new DecompressionStream('deflate-raw');bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer())}
    else if(method!==0)return null;
    return JSON.parse(new TextDecoder().decode(bytes));
   }
   p+=46+nameLen+extra+comment;
  }
 }catch(e){console.warn('project.json pre-analysis skipped',e)}
 return null;
}

function analyzeJSON(json,size){
 const a={size,targets:0,blocks:0,costumes:0,sounds:0,monitors:Array.isArray(json?.monitors)?json.monitors.length:0,pen:false,threeD:false,cloneBlocks:0,warpProcedures:0,video:false,music:false,largeLists:0};
 const targets=json?.targets||[];a.targets=targets.length;
 for(const t of targets){
  a.costumes+=(t.costumes||[]).length;a.sounds+=(t.sounds||[]).length;
  for(const v of Object.values(t.lists||{})){if(Array.isArray(v?.[1])&&v[1].length>1000)a.largeLists++}
  const blocks=t.blocks||{};a.blocks+=Object.keys(blocks).length;
  for(const b of Object.values(blocks)){
   const op=String(b?.opcode||'').toLowerCase();if(op.startsWith('pen_'))a.pen=true;if(op.includes('3d')||op.includes('raycast'))a.threeD=true;if(op==='control_create_clone_of')a.cloneBlocks++;if(op.startsWith('videosensing_'))a.video=true;if(op.startsWith('music_'))a.music=true;
   if(b?.mutation?.warp==='true'||b?.mutation?.warp===true)a.warpProcedures++;
  }
 }
 const mb=size/1048576;a.complexity=mb*2+a.blocks/900+a.targets*.35+a.costumes*.08+a.sounds*.12+a.largeLists*2+a.cloneBlocks*.45;
 a.level=a.complexity>22?'超重量':a.complexity>12?'重量':a.complexity>6?'中量':'軽量';
 return a;
}
async function analyzeProject(buffer){
 const json=await unzipProjectJSON(buffer);return json?analyzeJSON(json,buffer.byteLength):{size:buffer.byteLength,level:buffer.byteLength>25e6?'重量':'不明',complexity:buffer.byteLength/1048576,targets:0,blocks:0,costumes:0,sounds:0,pen:false,threeD:false,cloneBlocks:0,warpProcedures:0,video:false,music:false,largeLists:0};
}

function autoProfile(a,d,mode){
 const heavy=a.complexity>12||a.size>18e6,veryHeavy=a.complexity>22||a.size>35e6,low=d.score<3,high=d.score>=5;
 if(mode==='compat')return {label:'互換重視',quality:1,fps:30,interpolation:false,hqPen:false,turbo:false,warpTimer:true,maxClones:300,fencing:true,miscLimits:true};
 if(mode==='performance')return {label:'速度重視',quality:low?.55:.7,fps:30,interpolation:false,hqPen:false,turbo:false,warpTimer:false,maxClones:low?900:3000,fencing:false,miscLimits:false};
 let quality=veryHeavy||low?.55:heavy?.7:high?1:.85;
 let interpolation=!a.pen&&!a.threeD&&!heavy&&!low;
 let hqPen=!!a.pen&&high&&!heavy;
 let maxClones=low?600:heavy?1200:Infinity;
 return {label:veryHeavy||low?'軽量AUTO':heavy?'性能AUTO':'高品質AUTO',quality,fps:30,interpolation,hqPen,turbo:false,warpTimer:false,maxClones,fencing:false,miscLimits:false};
}
function resolvedProfile(){
 const s=state.settings,a=state.analysis||{complexity:0,size:0},d=state.device||deviceProfile();let p=autoProfile(a,d,s.mode==='manual'?'auto':s.mode);
 if(s.mode==='manual'||s.mode==='auto'){
  if(s.quality!=='auto')p.quality=Number(s.quality);if(s.fps!=='auto')p.fps=Number(s.fps);
  if(s.interpolation!=='auto')p.interpolation=s.interpolation==='on';if(s.hqPen!=='auto')p.hqPen=s.hqPen==='on';
  if(s.warp!=='auto')p.warpTimer=s.warp==='on';if(s.clones!=='auto')p.maxClones=s.clones==='inf'?Infinity:Number(s.clones);
  if(s.fencing!=='auto')p.fencing=s.fencing==='on';if(s.misc!=='auto')p.miscLimits=s.misc==='on';
 }
 p.turbo=s.turbo==='on';return p;
}
function applyProfile(){
 if(!state.runner)return;const p=state.profile=resolvedProfile(),vm=state.runner.vm;
 try{vm.runtime?.setCompilerOptions?.({enabled:true,warpTimer:p.warpTimer})}catch(e){console.warn(e)}
 try{vm.runtime?.setRuntimeOptions?.({maxClones:p.maxClones,fencing:p.fencing,miscLimits:p.miscLimits})}catch(e){console.warn(e)}
 try{vm.setInterpolation?.(p.interpolation)}catch(e){console.warn(e)}
 try{vm.renderer?.setUseHighQualityRender?.(p.hqPen)}catch(e){console.warn(e)}
 try{vm.runtime?.frameLoop?.setFramerate?.(p.fps)}catch(e){console.warn(e)}
 try{vm.setTurboMode?.(p.turbo)}catch(e){console.warn(e)}
 applyQuality(p.quality);
 setText('#auto-state',p.label);setText('#quality-state',Math.round(p.quality*100)+'%');setText('#fps-state',p.fps===0?'同期':String(p.fps));setText('#interp-state',p.interpolation?'ON':'OFF');
 updateAnalysisText();
}
function applyQuality(q){
 q=Math.max(.35,Math.min(1,Number(q)||1));const surface=$('#project-surface');if(!surface)return;surface.style.width=(q*100)+'%';surface.style.height=(q*100)+'%';surface.style.transform='scale('+(1/q)+')';requestAnimationFrame(()=>state.runner?.relayout?.());
}
function updateAnalysisText(){
 const a=state.analysis,d=state.device,p=state.profile;if(!a||!d)return;
 setText('#weight-state',a.level+' / '+formatBytes(a.size));setText('#device-state',d.tier+' '+d.cores+'C/'+d.mem+'GB');
 setText('#analysis-details','作品: '+a.level+'、'+formatBytes(a.size)+' / ブロック '+a.blocks.toLocaleString()+' / ターゲット '+a.targets+' / コスチューム '+a.costumes+' / 音 '+a.sounds+' / クローン生成 '+a.cloneBlocks+' / ペン '+(a.pen?'あり':'なし')+' / 3D系 '+(a.threeD?'検出':'未検出')+'。端末: '+d.tier+'、CPU論理 '+d.cores+'、メモリ目安 '+d.mem+'GB。適用: '+(p?.label||'未適用')+'。');
}

function setProgress(text,pct=null,detail=''){show('#load-progress',true);setText('#progress-text',text);setText('#progress-value',detail);if(pct!==null)$('#progress-bar').style.width=Math.max(0,Math.min(100,pct))+'%'}
function hideProgress(){show('#load-progress',false);$('#progress-bar').style.width='0%'}
async function readFile(file){
 return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onprogress=e=>{if(e.lengthComputable)setProgress('ファイルを読み込んでいます',e.loaded/e.total*40,Math.round(e.loaded/e.total*100)+'%')};fr.onerror=()=>reject(fr.error);fr.onload=()=>resolve(fr.result);fr.readAsArrayBuffer(file)});
}
async function fetchBuffer(url,label='ダウンロード中'){
 const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);const total=Number(r.headers.get('content-length'))||0;if(!r.body)return r.arrayBuffer();
 const reader=r.body.getReader(),parts=[];let got=0;while(true){const {done,value}=await reader.read();if(done)break;parts.push(value);got+=value.length;setProgress(label,total?got/total*40:20,total?Math.round(got/total*100)+'%':formatBytes(got))}
 const out=new Uint8Array(got);let off=0;for(const p of parts){out.set(p,off);off+=p.length}return out.buffer;
}
function projectIdFrom(input){
 const s=input.trim();if(/^\d+$/.test(s))return s;const m=s.match(/(?:scratch\.mit\.edu\/projects\/|turbowarp\.org\/)(\d+)/i);return m?.[1]||null;
}
async function loadURL(input){
 const id=projectIdFrom(input);if(id){
  setProgress('Scratchプロジェクト情報を取得',4,'ID '+id);
  const meta=await fetch('https://trampoline.turbowarp.org/api/projects/'+id);if(!meta.ok)throw new Error('共有されていないか、存在しないプロジェクトです');
  const j=await meta.json();return fetchBuffer('https://projects.scratch.mit.edu/'+id+'?token='+encodeURIComponent(j.project_token),'プロジェクトを取得しています');
 }
 let url=input.trim();if(!/^https?:\/\//i.test(url))throw new Error('URLまたはScratchプロジェクトIDを入力してください');
 return fetchBuffer(url,'URLから取得しています');
}

async function loadBuffer(buffer,name,opts={}){
 if(state.loading)return;state.loading=true;state.projectBuffer=buffer;state.projectName=name||'Scratch Project';state.currentCacheId=opts.cacheId||null;show('#stage-loading',true);setText('#stage-loading-text',opts.analysis?'保存済み解析結果を適用しています…':'作品を先読み解析しています…');setProgress(opts.analysis?'解析済みデータを再利用':'作品を解析しています',45,formatBytes(buffer.byteLength));
 try{
  state.analysis=opts.analysis||await analyzeProject(buffer);state.device=deviceProfile();setProgress('端末に合わせて最適化',55,state.analysis.level);
  const r=createRunner();applyProfile();setText('#stage-loading-text','TurboWarpコンパイラで読み込んでいます…');setProgress('プロジェクトをコンパイル・展開',68,'');
  await r.loadProject(buffer);setProgress('描画を準備',96,'');
  show('#loader',false);show('#player-panel',true);setText('#project-name',state.projectName);setText('#project-info',state.analysis.level+' · '+formatBytes(state.analysis.size)+' · コード表示なし');
  requestAnimationFrame(()=>r.relayout?.());await sleep(60);if(state.settings.autostart)r.greenFlag();startAutoMonitor();setProgress('完了',100,opts.skipCache?'保存済みから起動':'端末に保存');if(!opts.skipCache)cacheProject(buffer,state.projectName,state.analysis,opts.cacheInfo||{}).catch(()=>{});await sleep(250);hideProgress();
 }finally{show('#stage-loading',false);state.loading=false}
}
async function fromFile(file){if(!file)return;const sourceKey='file:'+file.name+':'+file.size+':'+(file.lastModified||0),hit=await cacheFindBySourceKey(sourceKey);if(hit)return loadCached(hit.id);const buffer=await readFile(file);await loadBuffer(buffer,file.name,{cacheInfo:{sourceKey,sourceType:'file',source:file.name}})}
async function fromURL(){const input=$('#url-input').value.trim();if(!input)return;try{const sourceKey=sourceKeyForInput(input),hit=await cacheFindBySourceKey(sourceKey);if(hit)return loadCached(hit.id);const id=projectIdFrom(input),b=await loadURL(input);await loadBuffer(b,id?'Scratch #'+id:input.split('/').pop()||'URL Project',{cacheInfo:{sourceKey,sourceType:id?'scratch':'url',source:input}})}catch(e){fail(e)}}
function fail(e){console.error(e);hideProgress();show('#stage-loading',false);state.loading=false;alert('読み込みに失敗しました。\n'+String(e?.message||e))}

function startAutoMonitor(){
 stopAutoMonitor();let last=performance.now(),sum=0,count=0,windowStart=last;
 const tick=now=>{const dt=now-last;last=now;if(dt<250){sum+=dt;count++}if(now-windowStart>=3000){const avg=count?sum/count:16.7;autoAdjust(avg);sum=0;count=0;windowStart=now}state.autoMonitor=requestAnimationFrame(tick)};state.autoMonitor=requestAnimationFrame(tick);
}
function stopAutoMonitor(){if(state.autoMonitor)cancelAnimationFrame(state.autoMonitor);state.autoMonitor=null}
function autoAdjust(avg){
 if(state.settings.mode!=='auto'||!state.profile)return;const now=performance.now();if(now-state.lastAdjust<5000)return;
 if(avg>27){state.slowWindows++;state.fastWindows=0}else if(avg<19){state.fastWindows++;state.slowWindows=0}else{state.slowWindows=state.fastWindows=0}
 if(state.slowWindows>=2){
  const q=state.profile.quality;state.profile.quality=q>.85?.85:q>.7?.7:q>.55?.55:.4;state.profile.interpolation=false;state.profile.hqPen=false;state.lastAdjust=now;state.slowWindows=0;
  try{state.runner.vm.setInterpolation?.(false);state.runner.vm.renderer?.setUseHighQualityRender?.(false)}catch{}applyQuality(state.profile.quality);setText('#auto-state','負荷軽減AUTO');setText('#quality-state',Math.round(state.profile.quality*100)+'%');setText('#interp-state','OFF');
 }else if(state.fastWindows>=4){
  const ceiling=autoProfile(state.analysis,state.device,'auto').quality,q=state.profile.quality;if(q<ceiling){state.profile.quality=Math.min(ceiling,q+.15);applyQuality(state.profile.quality);setText('#quality-state',Math.round(state.profile.quality*100)+'%');state.lastAdjust=now}state.fastWindows=0;
 }
}

function stopProject(){try{state.runner?.vm?.stopAll?.()}catch{try{state.runner?.vm?.runtime?.stopAll?.()}catch{}}}
function greenFlag(){try{state.runner?.greenFlag?.()}catch(e){fail(e)}}
async function reloadProject(){if(!state.projectBuffer)return;stopAutoMonitor();$('#project-mount').innerHTML='';await loadBuffer(state.projectBuffer,state.projectName)}
function newProject(){stopProject();stopAutoMonitor();try{state.runner?.root?.remove?.()}catch{}state.runner=null;state.currentCacheId=null;$('#project-mount').innerHTML='';show('#player-panel',false);show('#loader',true);hideProgress();renderRecents()}
async function fullscreen(){const el=$('#stage-viewport');try{if(document.fullscreenElement)await document.exitFullscreen();else await el.requestFullscreen();setTimeout(()=>state.runner?.relayout?.(),80)}catch{}}

function syncSettingsUI(){
 const s=state.settings;$('#quick-mode').value=s.mode;$('#autostart').checked=s.autostart;
 for(const [id,key] of [['#set-mode','mode'],['#set-quality','quality'],['#set-fps','fps'],['#set-interpolation','interpolation'],['#set-hq-pen','hqPen'],['#set-turbo','turbo'],['#set-warp','warp'],['#set-clones','clones'],['#set-fencing','fencing'],['#set-misc','misc']])$(id).value=String(s[key]);
}
function readSettingsUI(){
 const s={...state.settings};for(const [id,key] of [['#set-mode','mode'],['#set-quality','quality'],['#set-fps','fps'],['#set-interpolation','interpolation'],['#set-hq-pen','hqPen'],['#set-turbo','turbo'],['#set-warp','warp'],['#set-clones','clones'],['#set-fencing','fencing'],['#set-misc','misc']])s[key]=$(id).value;s.autostart=$('#autostart').checked;return s;
}
async function exportOffline(){
 const btn=$('#offline-export'),old=btn.textContent;btn.disabled=true;btn.textContent='完全ローカル版を作成中…';
 try{
  const [runtime,css,js,baseHTML]=await Promise.all([
    fetch(OFFLINE_RUNTIME_URL).then(r=>{if(!r.ok)throw Error('オフラインランタイム取得失敗');return r.text()}),
    fetch('style.css?v=3').then(r=>r.text()),
    fetch('app.js?v=3').then(r=>r.text()),
    fetch('index.html').then(r=>r.text())
  ]);
  const safeRuntime=runtime.replace(/<\/script/gi,'<\\/script'),safeJS=js.replace(/<\/script/gi,'<\\/script');
  const cleanBody=(baseHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]||'')
    .replace(/<script src="app\.js[^>]*><\/script>/i,'');
  const out='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><meta name="theme-color" content="#10141c"><title>Scratch Lite Launcher Offline</title><style>'+css+'</style></head><body>'+cleanBody+'<script>window.__SL_STANDALONE__=true;<\/script><script>'+safeRuntime+'<\/script><script>'+safeJS+'<\/script></body></html>';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out],{type:'text/html'}));a.download='scratch-lite-offline.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
 }catch(e){fail(e)}finally{btn.disabled=false;btn.textContent=old}
}

function bind(){
 $('#file-btn').onclick=()=>$('#file-input').click();$('#file-input').onchange=e=>fromFile(e.target.files[0]).catch(fail);$('#url-btn').onclick=()=>fromURL();$('#url-input').onkeydown=e=>{if(e.key==='Enter')fromURL()};
 const dz=$('#drop-zone');['dragenter','dragover'].forEach(x=>dz.addEventListener(x,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(x=>dz.addEventListener(x,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>fromFile(e.dataTransfer.files[0]).catch(fail));dz.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')$('#file-input').click()};
 $('#flag-btn').onclick=greenFlag;$('#stop-btn').onclick=stopProject;$('#reload-btn').onclick=()=>reloadProject().catch(fail);$('#new-btn').onclick=newProject;$('#fullscreen-btn').onclick=fullscreen;
 $('#settings-btn').onclick=()=>{syncSettingsUI();updateAnalysisText();$('#settings-dialog').showModal()};$('#apply-btn').onclick=()=>{state.settings=readSettingsUI();saveSettings();$('#quick-mode').value=state.settings.mode;if(state.runner)applyProfile();$('#settings-dialog').close()};
 $('#defaults-btn').onclick=()=>{state.settings={...DEFAULTS};syncSettingsUI()};$('#quick-mode').onchange=e=>{state.settings.mode=e.target.value;saveSettings();syncSettingsUI();if(state.runner)applyProfile()};$('#autostart').onchange=e=>{state.settings.autostart=e.target.checked;saveSettings()};
 $('#offline-export').onclick=exportOffline;const clear=$('#clear-recents');if(clear)clear.onclick=()=>{if(confirm('保存済みプロジェクトをすべて削除しますか？'))cacheClear()};
 window.addEventListener('resize',()=>state.runner?.relayout?.());document.addEventListener('visibilitychange',()=>{if(!document.hidden)state.runner?.relayout?.()});
}

async function boot(){
 state.settings=loadSettings();state.device=deviceProfile();syncSettingsUI();bind();setText('#device-state',state.device.tier+' '+state.device.cores+'C/'+state.device.mem+'GB');renderRecents();
 try{await loadRuntime()}catch(e){setText('#engine-state','ランタイム取得失敗');$('#engine-state')?.classList.add('error');console.error(e)}
 if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js?v=3').catch(()=>{});
}
boot();
})();