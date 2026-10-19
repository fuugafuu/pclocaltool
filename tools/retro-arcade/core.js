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
function fresh(){return{version:1,favorites:[],scores:{},played:{},lastPlayed:{},settings:{theme:'dark',global:{...DEFAULTS},perGame:{}},stats:{}}}
function migrate(d){const x=d&&d.version===1?d:fresh();x.favorites=Array.isArray(x.favorites)?x.favorites:[];x.scores=x.scores||{};x.played=x.played||{};x.lastPlayed=x.lastPlayed||{};x.stats=x.stats||{};x.settings=x.settings||{};x.settings.theme=x.settings.theme||'dark';x.settings.global={...DEFAULTS,...(x.settings.global||{})};x.settings.perGame=x.settings.perGame||{};return x}
function load(){try{return migrate(JSON.parse(localStorage.getItem(KEY)))}catch{return fresh()}}
let db=load(), current=null, currentMeta=null, mode='classic', soundOn=true, favOnly=false, speed=1, autoEnabled=false, autoSkill=75, humanize=15, currentCfg={...DEFAULTS}, page=1, pageSize=48;
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){console.warn('ゲーム設定を保存できません:',e?.message||e)}}
function cfgFor(id){return{...DEFAULTS,...db.settings.global,...(db.settings.perGame?.[id]||{})}}
function setTheme(t){db.settings.theme=t;document.documentElement.dataset.theme=t;setText('#theme-toggle',t==='dark'?'☀️':'🌙');save()}
function scoreKey(id,m){return id+':'+m}
function highScore(id,m){return Number(db.scores[scoreKey(id,m)]||0)}
function setHighScore(id,m,v){const k=scoreKey(id,m);if(v>Number(db.scores[k]||0)){db.scores[k]=Math.floor(v);save();return true}return false}
let audio=null;
function beep(freq=440,dur=.05,type='square',vol=.035){
 if(!soundOn)return;
 try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.stop(audio.currentTime+dur)}catch{}
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
 currentCfg=cfgFor(id);mode=currentCfg.mode==='modern'?'modern':'classic';speed=clamp(Number(currentCfg.speed)||1,.25,6);autoEnabled=!!currentCfg.auto;soundOn=currentCfg.sound!==false;autoSkill=clamp(Number.isFinite(Number(currentCfg.autoSkill))?Number(currentCfg.autoSkill):75,0,100);humanize=clamp(Number.isFinite(Number(currentCfg.humanize))?Number(currentCfg.humanize):15,0,100);syncRuntimeUI();
}
function apiFor(meta){
 let score=0,status='',finished=false,scorePulse=0;

 const api={
   get finished(){return finished},get status(){return status},get scorePulse(){return scorePulse},clearFinished(){finished=false;scorePulse=0},get mode(){return mode},get sound(){return soundOn},get speed(){return speed},get auto(){return autoEnabled},get autoSkill(){return autoSkill/100},get humanize(){return humanize/100},meta,clamp,rand,hit,beep,
   setScore(v){const next=Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):score;if(next>score)scorePulse++;score=next;$('#score').textContent=String(score).padStart(6,'0');if(setHighScore(meta.id,mode,score))$('#highscore').textContent=String(score).padStart(6,'0')},
   addScore(v){api.setScore(score+v)},getScore(){return score},
   setStatus(t){status=String(t||'');$('#status-info').textContent=status},
   storage:{get(k,fallback=null){try{const x=localStorage.getItem('retro:'+meta.id+':'+k);return x==null?fallback:JSON.parse(x)}catch{return fallback}},set(k,v){localStorage.setItem('retro:'+meta.id+':'+k,JSON.stringify(v))}},
   finish(t='ゲームオーバー'){if(finished)return;finished=true;api.setStatus(t);beep(120,.22,'sawtooth',.05)},
   canvas(spec){return createCanvasGame(api,spec)}
 };
 return api;
}
function createCanvasGame(api,spec){
 const host=$('#game-host');host.innerHTML='';
 const canvas=document.createElement('canvas');canvas.width=spec.width||640;canvas.height=spec.height||480;host.appendChild(canvas);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const manualKeys=new Set(),autoKeys=new Set(),pulseKeys=new Set(),padKeys=new Set();let prevAutoKeys=new Set(),simTime=0;const tapRequests=[],lastTap=new Map();
 const keys={has:c=>manualKeys.has(c)||autoKeys.has(c)||pulseKeys.has(c)||padKeys.has(c),add:c=>manualKeys.add(c),delete:c=>manualKeys.delete(c),clear:()=>{manualKeys.clear();autoKeys.clear();pulseKeys.clear();padKeys.clear()}};
 let padStart=false;let paused=false,dead=false,manual=false,accumulator=0,lastPulse=0,fx=[],flash=0,activeMs=0,last=performance.now(),pointer={x:0,y:0,down:false};
 const env={canvas,ctx,keys,manualKeys,autoKeys,pulseKeys,pointer,api,autoTap(code,interval=.10){tapRequests.push({code,interval:Math.max(.035,interval)})},get mode(){return mode},get paused(){return paused},get speed(){return speed},get auto(){return autoEnabled}};
 if(spec.init)spec.init(env);
 function step(dt){
   if(api.finished)return;
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
 function pollPad(){
   let pad;try{pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected)}catch{}const pressed=i=>!!pad?.buttons?.[i]?.pressed,start=pressed(9);
   if(start&&!padStart){clearInput();paused=!paused;spec.pause?.(env,paused);setText('#pause-game',paused?'▶ 再開':'Ⅱ 一時停止');}padStart=start;
   setText('#input-status',pad?'PAD CONNECTED':'KEYBOARD / TOUCH');const next=new Set();if(pad&&!paused&&!api.finished){if(pressed(14)||(pad.axes[0]||0)<-.35)next.add('ArrowLeft');if(pressed(15)||(pad.axes[0]||0)>.35)next.add('ArrowRight');if(pressed(12)||(pad.axes[1]||0)<-.35)next.add('ArrowUp');if(pressed(13)||(pad.axes[1]||0)>.35)next.add('ArrowDown');for(const [i,key] of [[0,'Space'],[1,'KeyX'],[2,'KeyZ']])if(pressed(i))next.add(key);}
   for(const code of next)if(!padKeys.has(code))spec.keyDown?.(env,code,{gamepad:true});for(const code of padKeys)if(!next.has(code))spec.keyUp?.(env,code,{gamepad:true});padKeys.clear();for(const code of next)padKeys.add(code);
 }
 function clearInput(){for(const code of padKeys)spec.keyUp?.(env,code,{gamepad:true});for(const code of manualKeys)spec.keyUp?.(env,code,{});for(const code of prevAutoKeys)spec.keyUp?.(env,code,{auto:true});keys.clear();prevAutoKeys.clear();tapRequests.length=0;pointer.down=false;}
 function advance(ms){if(dead||paused||api.finished)return;activeMs+=ms;accumulator+=Math.min(ms/1000,1)*speed;let guard=0;while(accumulator>=1/60&&guard++<360){step(1/60);accumulator-=1/60;}}
 function draw(delta=16){
   if(document.fullscreenElement?.contains(canvas)){const box=host.getBoundingClientRect(),ratio=canvas.width/canvas.height,w=Math.min(box.width,box.height*ratio);canvas.style.setProperty('--display-width',w+'px');canvas.style.setProperty('--display-height',w/ratio+'px');}
   ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);spec.draw?.(env);ctx.restore();
   if(api.scorePulse!==lastPulse){lastPulse=api.scorePulse;flash=130;if(mode==='modern'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)for(let i=0;i<12;i++)fx.push({x:canvas.width*.5,y:canvas.height*.15,vx:rand(-2,2),vy:rand(-2,1),life:450});}
   if(mode==='modern'){ctx.save();for(const p of fx){p.life-=delta;p.x+=p.vx*delta/16;p.y+=p.vy*delta/16;ctx.globalAlpha=Math.max(0,p.life/450);ctx.fillStyle=api.meta.color;ctx.fillRect(p.x,p.y,3,3);}fx=fx.filter(p=>p.life>0);ctx.restore();}
   if(paused||api.finished){ctx.save();ctx.fillStyle='#07111ac9';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.textAlign='center';ctx.fillStyle=api.meta.color;ctx.font='bold 28px monospace';ctx.fillText(paused?'PAUSED':'RUN COMPLETE',canvas.width/2,canvas.height*.43);ctx.fillStyle='#e9f3ff';ctx.font='15px sans-serif';ctx.fillText(paused?'P / ポーズボタンで再開':api.status,canvas.width/2,canvas.height*.52);ctx.font='12px sans-serif';ctx.fillText('SCORE '+api.getScore()+' · '+Math.floor(activeMs/1000)+'s',canvas.width/2,canvas.height*.6);ctx.restore();}
 }
 function frame(now){if(dead)return;pollPad();const elapsed=Math.min(80,now-last);last=now;if(!document.hidden&&!manual)advance(elapsed);draw(elapsed);requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
 function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
 canvas.addEventListener('pointerdown',e=>{pointer={...pos(e),down:true};env.pointer=pointer;canvas.setPointerCapture?.(e.pointerId);spec.pointerDown?.(env,pointer,e)});
 canvas.addEventListener('pointermove',e=>{pointer={...pointer,...pos(e)};env.pointer=pointer;spec.pointerMove?.(env,pointer,e)});
 canvas.addEventListener('pointercancel',()=>{pointer.down=false;clearInput()});
 canvas.addEventListener('pointerup',e=>{pointer={...pointer,...pos(e),down:false};env.pointer=pointer;spec.pointerUp?.(env,pointer,e)});
 return{
   keyDown(code,e){if(paused||api.finished)return;manualKeys.add(code);spec.keyDown?.(env,code,e)},
   keyUp(code,e){manualKeys.delete(code);spec.keyUp?.(env,code,e)},
   state(){return {paused,finished:api.finished,score:api.getScore(),status:api.status,simTime,activeMs,keys:[...manualKeys],gamepadKeys:[...padKeys],autoKeys:[...autoKeys],pointer:{...pointer},entities:spec.describe?.(env)||null}},advanceTime(ms){manual=true;pollPad();advance(ms);draw(ms)},clearInput,
   pause(v){clearInput();paused=v==null?!paused:!!v;spec.pause?.(env,paused);return paused},
   reset(){clearInput();api.clearFinished();accumulator=0;simTime=0;activeMs=0;api.setScore(0);api.setStatus('');spec.reset?.(env)},
   destroy(){dead=true;for(const code of prevAutoKeys)spec.keyUp?.(env,code,{auto:true,kind:'hold'});for(const code of pulseKeys)spec.keyUp?.(env,code,{auto:true,kind:'tap'});prevAutoKeys.clear();tapRequests.length=0;lastTap.clear();keys.clear();spec.destroy?.(env);host.innerHTML=''},
   modeChanged(){spec.modeChanged?.(env,mode)},
   runtimeChanged(){clearInput();spec.runtimeChanged?.(env,{mode,speed,auto:autoEnabled,skill:autoSkill/100,humanize:humanize/100})}
 };
}
function card(g){
 const m=g.meta,hi=Math.max(highScore(m.id,'classic'),highScore(m.id,'modern')),fav=db.favorites.includes(m.id),cfg=cfgFor(m.id);
 return `<article class="game-card" data-game="${m.id}" style="--game-color:${m.color}">
 <div class="card-top"><span class="year">${m.year} · ${jpSystem(m.system||'ARCADE')}</span><button class="fav ${fav?'on':''}" data-fav="${m.id}" aria-label="${fav?'お気に入りを解除':'お気に入りに追加'}" aria-pressed="${fav}">${fav?'★':'☆'}</button></div>
 <h3>${m.title}</h3><p>${m.description||''}</p>
 <div class="card-tags"><span class="tag">${jpGenre(m.genre)}</span><span class="tag">${cfg.auto?'オート':'手動'}</span><span class="tag">${cfg.speed}×</span></div>
 <span class="card-score">最高 ${String(hi).padStart(6,'0')}</span></article>`;
}
function render(){
 const search=$('#search'),genreEl=$('#genre-filter'),eraEl=$('#era-filter'),sortEl=$('#sort-filter');
 const q=(search?.value||'').trim().toLowerCase(),genre=genreEl?.value||'',era=eraEl?.value||'',sort=sortEl?.value||'year';
 let list=REG.filter(({meta:m})=>(!q||(q.split(/\s+/).every(word=>`${m.title} ${m.description} ${m.genre} ${jpGenre(m.genre)} ${m.year} ${m.system||''} ${jpSystem(m.system)}`.toLowerCase().includes(word))))&&(!genre||m.genre===genre)&&(!era||String(m.year).startsWith(era.slice(0,3)))&&(!favOnly||db.favorites.includes(m.id)));
 list=[...list].sort((a,b)=>sort==='title'?a.meta.title.localeCompare(b.meta.title,'ja'):sort==='recent'?(db.lastPlayed[b.meta.id]||0)-(db.lastPlayed[a.meta.id]||0)||a.meta.year-b.meta.year:sort==='played'?(db.played[b.meta.id]||0)-(db.played[a.meta.id]||0)||a.meta.year-b.meta.year:a.meta.year-b.meta.year||a.meta.title.localeCompare(b.meta.title,'ja'));
 const limit=pageSize===0?Math.max(1,list.length):pageSize,pages=Math.max(1,Math.ceil(list.length/limit));page=clamp(page,1,pages);const start=(page-1)*limit,shown=list.slice(start,start+limit);
 const grid=$('#game-grid');if(grid)grid.innerHTML=shown.length?shown.map(card).join(''):'<div class="empty">該当するゲームがありません。</div>';
 setText('#result-count',list.length+' / '+REG.length+'本');setText('#page-label',list.length?(start+1)+'〜'+(start+shown.length)+' / '+list.length+'本（'+page+' / '+pages+'ページ）':'0 / 0本');const prev=$('#prev-page'),next=$('#next-page');if(prev)prev.disabled=page<=1;if(next)next.disabled=page>=pages;
 Array.from(document.querySelectorAll('[data-game]')).forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',el.querySelector('h3')?.textContent+' をプレイ');el.onclick=e=>{if(e.target.closest('[data-fav]'))return;openGame(el.dataset.game)};el.onkeydown=e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openGame(el.dataset.game)}}});
 $$('[data-fav]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFavorite(b.dataset.fav);render()});updateStats();
}
function updateStats(){
 setText('#game-count',REG.length+'本');setText('#played-count',Object.keys(db.played||{}).length);setText('#favorite-count',db.favorites.length);setText('#highscore-count',Object.keys(db.scores||{}).filter(k=>db.scores[k]>0).length);
}
function toggleFavorite(id){const i=db.favorites.indexOf(id);if(i>=0)db.favorites.splice(i,1);else db.favorites.push(id);save();if(currentMeta?.id===id)$('#favorite-game').textContent=db.favorites.includes(id)?'★':'☆'}
function instantiate(g){
 setText('#pause-game','Ⅱ 一時停止');setText('#score','000000');setText('#highscore',String(highScore(g.meta.id,mode)).padStart(6,'0'));setText('#status-info','');
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
 const g=REG.find(x=>x.meta.id===id);if(!g)return;closeGame();currentMeta=g.meta;applyRuntime(id);db.played[id]=(db.played[id]||0)+1;db.lastPlayed[id]=Date.now();save();
 $('#overlay')?.classList.remove('hidden');setText('#game-title',g.meta.title);setText('#game-era',`${g.meta.year} · ${jpSystem(g.meta.system||'ARCADE')} · ${jpGenre(g.meta.genre)}`);setText('#game-subtitle',g.meta.description||'');
 setText('#classic-info',g.meta.classic);setText('#modern-info',g.meta.modern);setText('#control-info',g.meta.controls+' / オート: '+(g.meta.auto||'専用AI'));
 const fav=$('#favorite-game');if(fav)fav.textContent=db.favorites.includes(id)?'★':'☆';$$('[data-play-mode]').forEach(b=>b.classList.toggle('active',b.dataset.playMode===mode));instantiate(g);
}
function closeGame(){if(currentMeta&&current?.state){const st=current.state(),old=db.stats[currentMeta.id]||{seconds:0,sessions:0};db.stats[currentMeta.id]={seconds:(old.seconds||0)+Math.floor(st.activeMs/1000),sessions:(old.sessions||0)+1,lastScore:st.score};save();}if(document.fullscreenElement===document.querySelector('.cabinet'))document.exitFullscreen().catch(()=>{});try{current?.destroy?.()}catch(err){console.warn('destroy failed',err)}current=null;currentMeta=null;$('#overlay')?.classList.add('hidden')}
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
function disableZoomAndSelection(){const host=$('#game-host');if(host)host.style.touchAction='none';}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.cabinet').requestFullscreen();}catch{}}
function boot(){
 disableZoomAndSelection();
 const genreEl=$('#genre-filter');
 if(genreEl){const genres=[...new Set(REG.map(x=>x.meta.genre))].sort();genreEl.innerHTML='<option value="">すべてのジャンル</option>'+genres.map(g=>`<option value="${g}">${jpGenre(g)}</option>`).join('')}
 setTheme(db.settings.theme||'dark');populateSettingsTargets();render();

 on('#page-size','change',e=>{pageSize=e.target.value==='all'?0:Number(e.target.value)||48;page=1;render()});
 on('#search','input',()=>{page=1;render()});on('#genre-filter','change',()=>{page=1;render()});on('#era-filter','change',()=>{page=1;render()});on('#sort-filter','change',()=>{page=1;render()});
 on('#favorites-only','click',()=>{favOnly=!favOnly;page=1;$('#favorites-only')?.classList.toggle('active',favOnly);render()});on('#prev-page','click',()=>{if(page>1){page--;render();document.getElementById('library-main')?.scrollIntoView({block:'start'})}});on('#next-page','click',()=>{page++;render();document.getElementById('library-main')?.scrollIntoView({block:'start'})});
 on('#theme-toggle','click',()=>setTheme((db.settings.theme||'dark')==='dark'?'light':'dark'));
 on('#launcher-settings','click',openSettings);on('#settings-close','click',()=>$('#settings-dialog')?.close());on('#settings-target','change',loadSettingsForm);
 ['setting-skill','setting-humanize','setting-crt'].forEach(id=>on('#'+id,'input',updateSettingLabels));
 on('#settings-reset','click',()=>{const t=$('#settings-target')?.value;if(!t)return;if(t==='global')db.settings.global={...DEFAULTS};else delete db.settings.perGame[t];save();loadSettingsForm();render()});
 const form=$('#settings-form');if(form)form.onsubmit=e=>{e.preventDefault();const t=$('#settings-target')?.value;if(!t)return;const c=formCfg();if(t==='global')db.settings.global={...c};else db.settings.perGame[t]={...c};save();$('#settings-dialog')?.close();render();if(currentMeta&&(currentMeta.id===t||(t==='global'&&!db.settings.perGame[currentMeta.id]))){applyRuntime(currentMeta.id);current?.runtimeChanged?.();updateTouch(currentMeta)}};

 on('#close-game','click',()=>{closeGame();render()});on('#restart-game','click',restart);on('#favorite-game','click',()=>{if(currentMeta)toggleFavorite(currentMeta.id)});
 on('#fullscreen-game','click',fullscreen);on('#shuffle-game','click',()=>{const choices=REG.filter(g=>!favOnly||db.favorites.includes(g.meta.id));if(choices.length)openGame(choices[Math.floor(Math.random()*choices.length)].meta.id)});
 on('#pause-game','click',()=>{if(!current)return;const p=current.pause?.();setText('#pause-game',p?'▶ 再開':'Ⅱ 一時停止')});
 on('#auto-toggle','click',()=>{autoEnabled=!autoEnabled;syncRuntimeUI();current?.runtimeChanged?.()});
 on('#speed-toggle','click',cycleSpeed);on('#sound-toggle','click',()=>{soundOn=!soundOn;syncRuntimeUI()});
 $$('[data-play-mode]').forEach(b=>b.onclick=()=>{if(!currentMeta||mode===b.dataset.playMode)return;mode=b.dataset.playMode;$$('[data-play-mode]').forEach(x=>x.classList.toggle('active',x===b));restart()});
 document.addEventListener('keydown',e=>{if(current&&!e.repeat&&!e.target?.closest?.('input,textarea,select')&&!e.ctrlKey&&!e.metaKey){if(e.code==='KeyP'){e.preventDefault();const p=current.pause?.();setText('#pause-game',p?'▶ 再開':'Ⅱ 一時停止');return;}if(e.code==='KeyF'){e.preventDefault();fullscreen();return;}}if(!current||e.target?.closest?.('input,textarea,select,[contenteditable="true"]')||e.ctrlKey||e.metaKey||document.getElementById('pct-hub-panel')?.hidden===false)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();current.keyDown?.(e.code,e)});
 document.addEventListener('keyup',e=>current?.keyUp?.(e.code,e));
 Array.from(document.querySelectorAll('[data-key]')).forEach(b=>{const code=b.dataset.key,down=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);current?.keyDown?.(code,e)},up=e=>{e.preventDefault();current?.keyUp?.(code,e)};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);b.addEventListener('pointerleave',e=>{if(e.buttons)up(e)})});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&current){current.pause?.(true);setText('#pause-game','▶ 再開')}});window.addEventListener('blur',()=>current?.clearInput?.());
 const nextGame=new URLSearchParams(location.search).get('play');if(nextGame&&REG.some(x=>x.meta.id===nextGame))openGame(nextGame);
}
window.advanceTime=ms=>current?.advanceTime?.(ms);window.render_game_to_text=()=>JSON.stringify({game:currentMeta?.id||null,mode,speed,auto:autoEnabled,coordinateSystem:'canvas origin top-left; x right, y down',...current?.state?.()});
window.RetroArcade={predictBounce:RetroRuntime.predictBounce,openGame,closeGame,restart,register,boot,loadPacks,createCanvasGame,clamp,rand,hit,beep,get registry(){return REG},get settings(){return db.settings}};
})();
