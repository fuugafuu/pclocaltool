'use strict';
(() => {
const REG=[], KEY='pclocaltool_retro_arcade_v1';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(a,b)=>a+Math.random()*(b-a);
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
let db=load(), current=null, currentMeta=null, mode='classic', soundOn=true, favOnly=false;
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.version===1)return d}catch{}return{version:1,favorites:[],scores:{},played:{},settings:{theme:'dark'},stats:{}}}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function setTheme(t){db.settings.theme=t;document.documentElement.dataset.theme=t;$('#theme-toggle').textContent=t==='dark'?'☀️':'🌙';save()}
function scoreKey(id,m){return id+':'+m}
function highScore(id,m){return Number(db.scores[scoreKey(id,m)]||0)}
function setHighScore(id,m,v){const k=scoreKey(id,m);if(v>Number(db.scores[k]||0)){db.scores[k]=Math.floor(v);save();return true}return false}
let audio=null;
function beep(freq=440,dur=.05,type='square',vol=.035){
 if(!soundOn)return;
 try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.stop(audio.currentTime+dur)}catch{}
}
function register(meta,factory){
 if(!meta?.id||REG.some(g=>g.meta.id===meta.id))return;
 REG.push({meta:{genre:'Arcade',year:1980,color:'#53f0a9',classic:'当時の基本ルール',modern:'操作性・保存機能を補強',controls:'矢印 / Space',...meta},factory});
}
function apiFor(meta){
 let score=0,status='';
 const api={
   get mode(){return mode}, get sound(){return soundOn}, meta, clamp,rand,hit,beep,
   setScore(v){score=Math.max(0,Math.floor(v));$('#score').textContent=String(score).padStart(6,'0');if(setHighScore(meta.id,mode,score))$('#highscore').textContent=String(score).padStart(6,'0')},
   addScore(v){api.setScore(score+v)}, getScore(){return score},
   setStatus(t){status=String(t||'');$('#status-info').textContent=status},
   storage:{
     get(k,fallback=null){try{const x=localStorage.getItem('retro:'+meta.id+':'+k);return x==null?fallback:JSON.parse(x)}catch{return fallback}},
     set(k,v){localStorage.setItem('retro:'+meta.id+':'+k,JSON.stringify(v))}
   },
   finish(t='GAME OVER'){api.setStatus(t);beep(120,.22,'sawtooth',.05)},
   canvas(spec){return createCanvasGame(api,spec)}
 };
 return api;
}
function createCanvasGame(api,spec){
 const host=$('#game-host');host.innerHTML='';
 const canvas=document.createElement('canvas');canvas.width=spec.width||640;canvas.height=spec.height||480;host.appendChild(canvas);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const keys=new Set();let paused=false,dead=false,last=performance.now(),pointer={x:0,y:0,down:false};
 const env={canvas,ctx,keys,pointer,api,get mode(){return mode},get paused(){return paused}};
 if(spec.init)spec.init(env);
 function frame(now){
   if(dead)return;const dt=Math.min(.04,(now-last)/1000||0);last=now;
   if(!paused&&spec.update)spec.update(env,dt);
   ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);if(spec.draw)spec.draw(env);ctx.restore();
   requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
 canvas.addEventListener('pointerdown',e=>{pointer={...pos(e),down:true};canvas.setPointerCapture?.(e.pointerId);spec.pointerDown?.(env,pointer,e)});
 canvas.addEventListener('pointermove',e=>{pointer={...pointer,...pos(e)};spec.pointerMove?.(env,pointer,e)});
 canvas.addEventListener('pointerup',e=>{pointer={...pointer,...pos(e),down:false};spec.pointerUp?.(env,pointer,e)});
 return {
   keyDown(code,e){keys.add(code);spec.keyDown?.(env,code,e)},
   keyUp(code,e){keys.delete(code);spec.keyUp?.(env,code,e)},
   pause(v){paused=v==null?!paused:!!v;spec.pause?.(env,paused);return paused},
   reset(){keys.clear();api.setScore(0);api.setStatus('');spec.reset?.(env)},
   destroy(){dead=true;keys.clear();spec.destroy?.(env);host.innerHTML=''},
   modeChanged(){spec.modeChanged?.(env,mode)}
 };
}
function card(g){
 const m=g.meta,hi=Math.max(highScore(m.id,'classic'),highScore(m.id,'modern')),fav=db.favorites.includes(m.id);
 return `<article class="game-card" data-game="${m.id}" style="--game-color:${m.color}">
 <div class="card-top"><span class="year">${m.year} · ${m.system||'ARCADE'}</span><button class="fav ${fav?'on':''}" data-fav="${m.id}">${fav?'★':'☆'}</button></div>
 <h3>${m.title}</h3><p>${m.description||''}</p>
 <div class="card-tags"><span class="tag">${m.genre}</span><span class="tag">CLASSIC</span><span class="tag">MODERN</span></div>
 <span class="card-score">HI ${String(hi).padStart(6,'0')}</span></article>`;
}
function render(){
 const q=$('#search').value.trim().toLowerCase(),genre=$('#genre-filter').value,era=$('#era-filter').value;
 const list=REG.filter(({meta:m})=>(!q||(`${m.title} ${m.description} ${m.genre} ${m.year}`.toLowerCase().includes(q)))&&(!genre||m.genre===genre)&&(!era||String(m.year).startsWith(era.slice(0,3)))&&(!favOnly||db.favorites.includes(m.id)));
 $('#game-grid').innerHTML=list.length?list.map(card).join(''):'<div class="empty">該当するゲームがありません。</div>';
 $$('[data-game]').forEach(el=>el.onclick=e=>{if(e.target.closest('[data-fav]'))return;openGame(el.dataset.game)});
 $$('[data-fav]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFavorite(b.dataset.fav);render()});
 updateStats();
}
function updateStats(){
 $('#game-count').textContent=REG.length+' GAMES';
 $('#played-count').textContent=Object.keys(db.played||{}).length;
 $('#favorite-count').textContent=db.favorites.length;
 $('#highscore-count').textContent=Object.keys(db.scores||{}).filter(k=>db.scores[k]>0).length;
}
function toggleFavorite(id){const i=db.favorites.indexOf(id);if(i>=0)db.favorites.splice(i,1);else db.favorites.push(id);save();if(currentMeta?.id===id)$('#favorite-game').textContent=db.favorites.includes(id)?'★':'☆'}
function openGame(id){
 const g=REG.find(x=>x.meta.id===id);if(!g)return;closeGame();currentMeta=g.meta;mode='classic';
 db.played[id]=(db.played[id]||0)+1;save();
 $('#overlay').classList.remove('hidden');$('#game-title').textContent=g.meta.title;$('#game-era').textContent=`${g.meta.year} · ${g.meta.system||'ARCADE'} · ${g.meta.genre}`;$('#game-subtitle').textContent=g.meta.description||'';
 $('#classic-info').textContent=g.meta.classic;$('#modern-info').textContent=g.meta.modern;$('#control-info').textContent=g.meta.controls;
 $('#favorite-game').textContent=db.favorites.includes(id)?'★':'☆';$$('[data-play-mode]').forEach(b=>b.classList.toggle('active',b.dataset.playMode==='classic'));
 $('#score').textContent='000000';$('#highscore').textContent=String(highScore(id,mode)).padStart(6,'0');
 const api=apiFor(g.meta);current={...g.factory($('#game-host'),api),api};
 updateTouch(g.meta);
}
function closeGame(){if(current?.destroy)current.destroy();current=null;currentMeta=null;$('#overlay')?.classList.add('hidden')}
function restart(){if(!currentMeta)return;const id=currentMeta.id;openGame(id)}
function updateTouch(meta){const need=meta.touch!==false;$('#touch-controls').style.display=need?'flex':'none'}
function boot(){
 const genres=[...new Set(REG.map(x=>x.meta.genre))].sort();$('#genre-filter').innerHTML='<option value="">すべてのジャンル</option>'+genres.map(g=>`<option>${g}</option>`).join('');
 setTheme(db.settings.theme||'dark');render();
 $('#search').oninput=render;$('#genre-filter').onchange=render;$('#era-filter').onchange=render;$('#favorites-only').onclick=()=>{favOnly=!favOnly;$('#favorites-only').classList.toggle('active',favOnly);render()};
 $('#theme-toggle').onclick=()=>setTheme((db.settings.theme||'dark')==='dark'?'light':'dark');
 $('#close-game').onclick=()=>{closeGame();render()};$('#restart-game').onclick=restart;$('#favorite-game').onclick=()=>{if(currentMeta)toggleFavorite(currentMeta.id)};
 $('#pause-game').onclick=()=>{if(!current)return;const p=current.pause?.();$('#pause-game').textContent=p?'▶ RESUME':'Ⅱ PAUSE'};
 $('#sound-toggle').onclick=()=>{soundOn=!soundOn;$('#sound-toggle').textContent=soundOn?'♪ SOUND':'♪ MUTED'};
 $$('[data-play-mode]').forEach(b=>b.onclick=()=>{if(!currentMeta||mode===b.dataset.playMode)return;mode=b.dataset.playMode;$$('[data-play-mode]').forEach(x=>x.classList.toggle('active',x===b));$('#highscore').textContent=String(highScore(currentMeta.id,mode)).padStart(6,'0');current?.modeChanged?.();restart()});
 document.addEventListener('keydown',e=>{if(!current)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();current.keyDown?.(e.code,e)});
 document.addEventListener('keyup',e=>current?.keyUp?.(e.code,e));
 $$('[data-key]').forEach(b=>{const code=b.dataset.key;const down=e=>{e.preventDefault();current?.keyDown?.(code,e)};const up=e=>{e.preventDefault();current?.keyUp?.(code,e)};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',e=>{if(e.buttons)up(e)})});
 }
window.RetroArcade={register,boot,createCanvasGame,clamp,rand,hit,beep,get registry(){return REG}};
})();