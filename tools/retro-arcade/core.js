'use strict';
(() => {
const REG=[], KEY='pclocaltool_retro_arcade_v1';
const DEFAULTS={mode:'classic',speed:1,auto:false,sound:true,autoSkill:75,humanize:15,crt:58,touch:'auto'};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const on=(sel,event,fn)=>{const el=typeof sel==='string'?$(sel):sel;if(el)el.addEventListener(event,fn);return el};
const setText=(sel,text)=>{const el=$(sel);if(el)el.textContent=text};
const jpGenre=g=>({Sports:'スポーツ',Action:'アクション',Shooter:'シューティング',Defense:'防衛',Maze:'迷路',Puzzle:'パズル','Puzzle Action':'パズルアクション',Arcade:'アーケード',Card:'カード',Platform:'プラットフォーム',Simulation:'シミュレーション',Adventure:'アドベンチャー',Fighting:'格闘',RPG:'RPG',Racing:'レース',Rhythm:'リズム','Run & Gun':'ラン＆ガン','Beat ’em up':'ベルトアクション',Stealth:'ステルス',Strategy:'戦略',FPS:'FPS'}[g]||g);
const jpSystem=s=>({ARCADE:'アーケード','ARCADE / DREAMCAST':'アーケード / ドリームキャスト','ARCADE / FAMICOM':'アーケード / ファミコン','ARCADE / MOBILE':'アーケード / モバイル','ARCADE / NES':'アーケード / NES','ARCADE / PS':'アーケード / PlayStation','ATARI 2600':'Atari 2600',COMPUTER:'コンピューター','COMPUTER / CONSOLE':'コンピューター / 家庭用','COMPUTER / GB':'コンピューター / ゲームボーイ',CONSOLE:'家庭用',FAMICOM:'ファミコン','FAMICOM / GAME BOY':'ファミコン / ゲームボーイ','FAMICOM DISK':'ファミコン ディスクシステム','GAME BOY':'ゲームボーイ','MEGA DRIVE':'メガドライブ','MEGA DRIVE / SNES':'メガドライブ / スーパーファミコン',MSX2:'MSX2',NES:'NES','NINTENDO 64':'NINTENDO 64',PLAYSTATION:'PlayStation','PLAYSTATION / PC':'PlayStation / PC',SATURN:'セガサターン','SUPER FAMICOM':'スーパーファミコン',WINDOWS:'Windows'}[s]||s);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(a,b)=>a+Math.random()*(b-a);
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function fresh(){return{version:1,favorites:[],scores:{},played:{},settings:{theme:'dark',global:{...DEFAULTS},perGame:{}},stats:{}}}
function migrate(d){const x=d&&d.version===1?d:fresh();x.favorites=Array.isArray(x.favorites)?x.favorites:[];x.scores=x.scores||{};x.played=x.played||{};x.stats=x.stats||{};x.settings=x.settings||{};x.settings.theme=x.settings.theme||'dark';x.settings.global={...DEFAULTS,...(x.settings.global||{})};x.settings.perGame=x.settings.perGame||{};return x}
function load(){try{return migrate(JSON.parse(localStorage.getItem(KEY)))}catch{return fresh()}}
let db=load(), current=null, currentMeta=null, mode='classic', soundOn=true, favOnly=false, speed=1, autoEnabled=false, autoSkill=75, humanize=15, currentCfg={...DEFAULTS}, page=1, pageSize=48;
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function cfgFor(id){return{...DEFAULTS,...db.settings.global,...(db.settings.perGame?.[id]||{})}}
function setTheme(t){db.settings.theme=t;document.documentElement.dataset.theme=t;setText('#theme-toggle',t==='dark'?'☀️':'🌙');save()}
function scoreKey(id,m){return id+':'+m}
function highScore(id,m){return Number(db.scores[scoreKey(id,m)]||0)}
function setHighScore(id,m,v){const k=scoreKey(id,m);if(v>Number(db.scores[k]||0)){db.scores[k]=Math.floor(v);save();return true}return false}
let audio=null;
function beep(freq=440,dur=.05,type='square',vol=.035){
 if(!soundOn)return;
 try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.stop(audio.currentTime+dur)}catch{}
}
async function loadPacks(paths=[]){
 for(const src of paths){
   if(!src)continue;
   await new Promise((resolve,reject)=>{
     const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('ゲームパックを読み込めませんでした: '+src));document.head.appendChild(s);
   });
 }
}
function register(meta,factory){
 if(!meta?.id||REG.some(g=>g.meta.id===meta.id))return;
 REG.push({meta:{genre:'Arcade',year:1980,color:'#53f0a9',classic:'当時の基本ルール',modern:'操作性・保存機能を補強',controls:'矢印 / スペース',auto:'ゲーム専用AI',...meta},factory});
}
function syncRuntimeUI(){
 const a=$('#auto-toggle'),sp=$('#speed-toggle'),snd=$('#sound-toggle');
 if(a){a.textContent=autoEnabled?'オート 有効':'オート 無効';a.classList.toggle('on',autoEnabled)}
 if(sp){sp.textContent=(Number(speed)%1?Number(speed).toFixed(2).replace(/0+$/,'').replace(/\.$/,''):Number(speed))+'×';sp.classList.toggle('fast',speed>1)}
 if(snd)snd.textContent=soundOn?'♪ 音あり':'♪ ミュート';
 $$('.scanlines').forEach(x=>x.style.opacity=String(clamp((currentCfg.crt??58)/100,0,1)));
}
function applyRuntime(id){
 currentCfg=cfgFor(id);mode=currentCfg.mode==='modern'?'modern':'classic';speed=clamp(Number(currentCfg.speed)||1,.25,6);autoEnabled=!!currentCfg.auto;soundOn=currentCfg.sound!==false;autoSkill=clamp(Number(currentCfg.autoSkill)||75,0,100);humanize=clamp(Number(currentCfg.humanize)||15,0,100);syncRuntimeUI();
}
function apiFor(meta){
 let score=0,status='';
 const api={
   get mode(){return mode},get sound(){return soundOn},get speed(){return speed},get auto(){return autoEnabled},get autoSkill(){return autoSkill/100},get humanize(){return humanize/100},meta,clamp,rand,hit,beep,
   setScore(v){score=Math.max(0,Math.floor(v));$('#score').textContent=String(score).padStart(6,'0');if(setHighScore(meta.id,mode,score))$('#highscore').textContent=String(score).padStart(6,'0')},
   addScore(v){api.setScore(score+v)},getScore(){return score},
   setStatus(t){status=String(t||'');$('#status-info').textContent=status},
   storage:{get(k,fallback=null){try{const x=localStorage.getItem('retro:'+meta.id+':'+k);return x==null?fallback:JSON.parse(x)}catch{return fallback}},set(k,v){localStorage.setItem('retro:'+meta.id+':'+k,JSON.stringify(v))}},
   finish(t='ゲームオーバー'){api.setStatus(t);beep(120,.22,'sawtooth',.05)},
   canvas(spec){return createCanvasGame(api,spec)}
 };
 return api;
}
function createCanvasGame(api,spec){
 const host=$('#game-host');host.innerHTML='';
 const canvas=document.createElement('canvas');canvas.width=spec.width||640;canvas.height=spec.height||480;host.appendChild(canvas);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const manualKeys=new Set(),autoKeys=new Set(),pulseKeys=new Set();let prevAutoKeys=new Set(),simTime=0;const tapRequests=[],lastTap=new Map();
 const keys={has:c=>manualKeys.has(c)||autoKeys.has(c)||pulseKeys.has(c),add:c=>manualKeys.add(c),delete:c=>manualKeys.delete(c),clear:()=>{manualKeys.clear();autoKeys.clear();pulseKeys.clear()}};
 let paused=false,dead=false,last=performance.now(),pointer={x:0,y:0,down:false};
 const env={canvas,ctx,keys,manualKeys,autoKeys,pulseKeys,pointer,api,autoTap(code,interval=.10){tapRequests.push({code,interval:Math.max(.035,interval)})},get mode(){return mode},get paused(){return paused},get speed(){return speed},get auto(){return autoEnabled}};
 if(spec.init)spec.init(env);
 function step(dt){
   simTime+=dt;autoKeys.clear();pulseKeys.clear();tapRequests.length=0;
   if(autoEnabled&&spec.auto)spec.auto(env,dt,{skill:autoSkill/100,humanize:humanize/100,speed,mode});
   for(const code of autoKeys)if(!prevAutoKeys.has(code))spec.keyDown?.(env,code,{auto:true,kind:'hold'});
   for(const code of prevAutoKeys)if(!autoKeys.has(code))spec.keyUp?.(env,code,{auto:true,kind:'hold'});
   prevAutoKeys=new Set(autoKeys);
   for(const req of tapRequests){
     const last=lastTap.get(req.code)??-999;
     if(simTime-last>=req.interval){
       lastTap.set(req.code,simTime);pulseKeys.add(req.code);
       spec.keyDown?.(env,req.code,{auto:true,kind:'tap'});
     }
   }
   if(spec.update)spec.update(env,dt);
   for(const code of pulseKeys)spec.keyUp?.(env,code,{auto:true,kind:'tap'});
 }
 function frame(now){
   if(dead)return;
   const elapsed=Math.min(.08,(now-last)/1000||0);last=now;
   if(!paused){
     let remain=Math.min(.32,elapsed*speed),guard=0;
     while(remain>0.00001&&guard++<24){const dt=Math.min(1/60,remain);step(dt);remain-=dt}
   }
   ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);if(spec.draw)spec.draw(env);ctx.restore();
   requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
 canvas.addEventListener('pointerdown',e=>{pointer={...pos(e),down:true};env.pointer=pointer;canvas.setPointerCapture?.(e.pointerId);spec.pointerDown?.(env,pointer,e)});
 canvas.addEventListener('pointermove',e=>{pointer={...pointer,...pos(e)};env.pointer=pointer;spec.pointerMove?.(env,pointer,e)});
 canvas.addEventListener('pointerup',e=>{pointer={...pointer,...pos(e),down:false};env.pointer=pointer;spec.pointerUp?.(env,pointer,e)});
 return{
   keyDown(code,e){manualKeys.add(code);spec.keyDown?.(env,code,e)},
   keyUp(code,e){manualKeys.delete(code);spec.keyUp?.(env,code,e)},
   pause(v){paused=v==null?!paused:!!v;spec.pause?.(env,paused);return paused},
   reset(){keys.clear();api.setScore(0);api.setStatus('');spec.reset?.(env)},
   destroy(){dead=true;for(const code of prevAutoKeys)spec.keyUp?.(env,code,{auto:true,kind:'hold'});for(const code of pulseKeys)spec.keyUp?.(env,code,{auto:true,kind:'tap'});prevAutoKeys.clear();tapRequests.length=0;lastTap.clear();keys.clear();spec.destroy?.(env);host.innerHTML=''},
   modeChanged(){spec.modeChanged?.(env,mode)},
   runtimeChanged(){spec.runtimeChanged?.(env,{mode,speed,auto:autoEnabled,skill:autoSkill/100,humanize:humanize/100})}
 };
}
function card(g){
 const m=g.meta,hi=Math.max(highScore(m.id,'classic'),highScore(m.id,'modern')),fav=db.favorites.includes(m.id),cfg=cfgFor(m.id);
 return `<article class="game-card" data-game="${m.id}" style="--game-color:${m.color}">
 <div class="card-top"><span class="year">${m.year} · ${jpSystem(m.system||'ARCADE')}</span><button class="fav ${fav?'on':''}" data-fav="${m.id}">${fav?'★':'☆'}</button></div>
 <h3>${m.title}</h3><p>${m.description||''}</p>
 <div class="card-tags"><span class="tag">${jpGenre(m.genre)}</span><span class="tag">${cfg.auto?'オート':'手動'}</span><span class="tag">${cfg.speed}×</span></div>
 <span class="card-score">最高 ${String(hi).padStart(6,'0')}</span></article>`;
}
function render(){
 const search=$('#search'),genreEl=$('#genre-filter'),eraEl=$('#era-filter'),sortEl=$('#sort-filter');
 const q=(search?.value||'').trim().toLowerCase(),genre=genreEl?.value||'',era=eraEl?.value||'',sort=sortEl?.value||'year';
 let list=REG.filter(({meta:m})=>(!q||(`${m.title} ${m.description} ${m.genre} ${m.year} ${m.system||''}`.toLowerCase().includes(q)))&&(!genre||m.genre===genre)&&(!era||String(m.year).startsWith(era.slice(0,3)))&&(!favOnly||db.favorites.includes(m.id)));
 list=[...list].sort((a,b)=>sort==='title'?a.meta.title.localeCompare(b.meta.title,'ja'):sort==='played'?(db.played[b.meta.id]||0)-(db.played[a.meta.id]||0)||a.meta.year-b.meta.year:a.meta.year-b.meta.year||a.meta.title.localeCompare(b.meta.title,'ja'));
 const pages=Math.max(1,Math.ceil(list.length/pageSize));page=clamp(page,1,pages);const start=(page-1)*pageSize,shown=list.slice(start,start+pageSize);
 const grid=$('#game-grid');if(grid)grid.innerHTML=shown.length?shown.map(card).join(''):'<div class="empty">該当するゲームがありません。</div>';
 setText('#result-count',list.length+'本');setText('#page-label',page+' / '+pages);const prev=$('#prev-page'),next=$('#next-page');if(prev)prev.disabled=page<=1;if(next)next.disabled=page>=pages;
 $$('[data-game]').forEach(el=>el.onclick=e=>{if(e.target.closest('[data-fav]'))return;openGame(el.dataset.game)});
 $$('[data-fav]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFavorite(b.dataset.fav);render()});updateStats();
}
function updateStats(){
 setText('#game-count',REG.length+'本');$('#played-count').textContent=Object.keys(db.played||{}).length;$('#favorite-count').textContent=db.favorites.length;$('#highscore-count').textContent=Object.keys(db.scores||{}).filter(k=>db.scores[k]>0).length;
}
function toggleFavorite(id){const i=db.favorites.indexOf(id);if(i>=0)db.favorites.splice(i,1);else db.favorites.push(id);save();if(currentMeta?.id===id)$('#favorite-game').textContent=db.favorites.includes(id)?'★':'☆'}
function instantiate(g){
 setText('#score','000000');setText('#highscore',String(highScore(g.meta.id,mode)).padStart(6,'0'));setText('#status-info','');
 const host=$('#game-host'),api=apiFor(g.meta);if(host)host.innerHTML='';
 try{
   current={...g.factory(host,api),api};syncRuntimeUI();updateTouch(g.meta);setText('#status-info','準備完了');
   return true;
 }catch(err){
   console.error('Game failed:',g.meta.id,err);current=null;
   if(host)host.innerHTML='<div class="game-error"><b>このゲームの起動に失敗しました</b><span>'+String(err?.message||err)+'</span><small>他のゲームはそのまま遊べます。</small></div>';
   setText('#status-info','ゲーム単体の起動エラー');
   return false;
 }
}
function openGame(id){
 const g=REG.find(x=>x.meta.id===id);if(!g)return;closeGame();currentMeta=g.meta;applyRuntime(id);db.played[id]=(db.played[id]||0)+1;save();
 $('#overlay')?.classList.remove('hidden');setText('#game-title',g.meta.title);setText('#game-era',`${g.meta.year} · ${jpSystem(g.meta.system||'ARCADE')} · ${jpGenre(g.meta.genre)}`);setText('#game-subtitle',g.meta.description||'');
 setText('#classic-info',g.meta.classic);setText('#modern-info',g.meta.modern);setText('#control-info',g.meta.controls+' / オート: '+(g.meta.auto||'専用AI'));
 const fav=$('#favorite-game');if(fav)fav.textContent=db.favorites.includes(id)?'★':'☆';$$('[data-play-mode]').forEach(b=>b.classList.toggle('active',b.dataset.playMode===mode));instantiate(g);
}
function closeGame(){try{current?.destroy?.()}catch(err){console.warn('destroy failed',err)}current=null;currentMeta=null;$('#overlay')?.classList.add('hidden')}
function restart(){if(!currentMeta)return;const g=REG.find(x=>x.meta.id===currentMeta.id);try{current?.destroy?.()}catch(err){console.warn('restart cleanup failed',err)}instantiate(g)}
function updateTouch(meta){const cfg=currentMeta?cfgFor(currentMeta.id):db.settings.global,coarse=matchMedia?.('(pointer:coarse)').matches;const need=cfg.touch==='always'||(cfg.touch==='auto'&&coarse);const touch=$('#touch-controls');if(touch)touch.style.display=need?'flex':'none'}
function cycleSpeed(){const vals=[.5,.75,1,1.25,1.5,2,3,4],i=vals.findIndex(v=>Math.abs(v-speed)<.001);speed=vals[(i+1+vals.length)%vals.length];syncRuntimeUI();current?.runtimeChanged?.()}
function populateSettingsTargets(){const s=$('#settings-target'),value=s.value||'global';s.innerHTML='<option value="global">全ゲーム共通</option>'+REG.map(g=>`<option value="${g.meta.id}">${g.meta.title}</option>`).join('');if(value==='global'||REG.some(g=>g.meta.id===value))s.value=value}
function formCfg(){return{mode:$('#setting-mode').value,speed:Number($('#setting-speed').value),auto:$('#setting-auto').value==='true',sound:$('#setting-sound').value==='true',autoSkill:Number($('#setting-skill').value),humanize:Number($('#setting-humanize').value),crt:Number($('#setting-crt').value),touch:$('#setting-touch').value}}
function loadSettingsForm(){
 const target=$('#settings-target').value,cfg=target==='global'?{...DEFAULTS,...db.settings.global}:cfgFor(target);
 $('#setting-mode').value=cfg.mode;$('#setting-speed').value=String(cfg.speed);$('#setting-auto').value=String(!!cfg.auto);$('#setting-sound').value=String(cfg.sound!==false);$('#setting-skill').value=cfg.autoSkill;$('#setting-humanize').value=cfg.humanize;$('#setting-crt').value=cfg.crt;$('#setting-touch').value=cfg.touch||'auto';updateSettingLabels();
}
function updateSettingLabels(){$('#skill-value').textContent=$('#setting-skill').value+'%';$('#humanize-value').textContent=$('#setting-humanize').value+'%';$('#crt-value').textContent=$('#setting-crt').value+'%'}
function openSettings(){populateSettingsTargets();$('#settings-target').value=currentMeta?.id||'global';loadSettingsForm();$('#settings-dialog').showModal()}
function disableZoomAndSelection(){
 document.documentElement.classList.add('no-select');
 document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
 document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
 document.addEventListener('gestureend',e=>e.preventDefault(),{passive:false});
 document.addEventListener('touchmove',e=>{if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false});
 document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
 document.addEventListener('selectstart',e=>e.preventDefault(),{passive:false});
 document.addEventListener('dragstart',e=>e.preventDefault(),{passive:false});
 document.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)e.preventDefault()},{passive:false});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','-','=','0'].includes(e.key))e.preventDefault()});
}
function boot(){
 disableZoomAndSelection();
 const genreEl=$('#genre-filter');
 if(genreEl){const genres=[...new Set(REG.map(x=>x.meta.genre))].sort();genreEl.innerHTML='<option value="">すべてのジャンル</option>'+genres.map(g=>`<option value="${g}">${jpGenre(g)}</option>`).join('')}
 setTheme(db.settings.theme||'dark');populateSettingsTargets();render();

 on('#search','input',()=>{page=1;render()});on('#genre-filter','change',()=>{page=1;render()});on('#era-filter','change',()=>{page=1;render()});on('#sort-filter','change',()=>{page=1;render()});
 on('#favorites-only','click',()=>{favOnly=!favOnly;page=1;$('#favorites-only')?.classList.toggle('active',favOnly);render()});on('#prev-page','click',()=>{if(page>1){page--;render();document.querySelector('main')?.scrollIntoView({block:'start'})}});on('#next-page','click',()=>{page++;render();document.querySelector('main')?.scrollIntoView({block:'start'})});
 on('#theme-toggle','click',()=>setTheme((db.settings.theme||'dark')==='dark'?'light':'dark'));
 on('#launcher-settings','click',openSettings);on('#settings-close','click',()=>$('#settings-dialog')?.close());on('#settings-target','change',loadSettingsForm);
 ['setting-skill','setting-humanize','setting-crt'].forEach(id=>on('#'+id,'input',updateSettingLabels));
 on('#settings-reset','click',()=>{const t=$('#settings-target')?.value;if(!t)return;if(t==='global')db.settings.global={...DEFAULTS};else delete db.settings.perGame[t];save();loadSettingsForm();render()});
 const form=$('#settings-form');if(form)form.onsubmit=e=>{e.preventDefault();const t=$('#settings-target')?.value;if(!t)return;const c=formCfg();if(t==='global')db.settings.global={...c};else db.settings.perGame[t]={...c};save();$('#settings-dialog')?.close();render();if(currentMeta&&(currentMeta.id===t||(t==='global'&&!db.settings.perGame[currentMeta.id]))){applyRuntime(currentMeta.id);current?.runtimeChanged?.();updateTouch(currentMeta)}};

 on('#close-game','click',()=>{closeGame();render()});on('#restart-game','click',restart);on('#favorite-game','click',()=>{if(currentMeta)toggleFavorite(currentMeta.id)});
 on('#pause-game','click',()=>{if(!current)return;const p=current.pause?.();setText('#pause-game',p?'▶ 再開':'Ⅱ 一時停止')});
 on('#auto-toggle','click',()=>{autoEnabled=!autoEnabled;syncRuntimeUI();current?.runtimeChanged?.()});
 on('#speed-toggle','click',cycleSpeed);on('#sound-toggle','click',()=>{soundOn=!soundOn;syncRuntimeUI()});
 $$('[data-play-mode]').forEach(b=>b.onclick=()=>{if(!currentMeta||mode===b.dataset.playMode)return;mode=b.dataset.playMode;$$('[data-play-mode]').forEach(x=>x.classList.toggle('active',x===b));restart()});
 document.addEventListener('keydown',e=>{if(!current)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();current.keyDown?.(e.code,e)});
 document.addEventListener('keyup',e=>current?.keyUp?.(e.code,e));
 $$('[data-key]').forEach(b=>{const code=b.dataset.key,down=e=>{e.preventDefault();current?.keyDown?.(code,e)},up=e=>{e.preventDefault();current?.keyUp?.(code,e)};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',e=>{if(e.buttons)up(e)})});
}
window.RetroArcade={register,boot,loadPacks,createCanvasGame,clamp,rand,hit,beep,get registry(){return REG},get settings(){return db.settings}};
})();