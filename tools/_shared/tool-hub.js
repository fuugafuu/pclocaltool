'use strict';
(() => {
 if(window.PCToolHub) return;
 const APPS=[
  {id:'math-assist',title:'Math Assist',label:'🧮 計算・グラフ'},
  {id:'universal-timer',title:'Universal Timer',label:'⏱ タイマー'},
  {id:'dev-os',title:'Dev OS Lab',label:'💻 仮想OS'},
  {id:'agent-bridge',title:'Agent Bridge',label:'🤖 AI指示実行'},
  {id:'janken-ai',title:'Janken AI Lab',label:'✊ じゃんけんAI'},
  {id:'retro-arcade',title:'レトロアーケードラボ',label:'🎮 レトロゲーム'},
  {id:'scratch-lite',title:'Scratch Lite Launcher',label:'⚡ Scratch再生'}
 ];
 const current=(location.pathname.match(/\/tools\/([^/]+)\//)||[])[1]||'';

 // NEXT launcher: remember visits even when navigating from another tool.
 try{
  if(current&&APPS.some(a=>a.id===current)){
   const key='pclocaltool_launcher_v2',path='tools/'+current+'/index.html',old=JSON.parse(localStorage.getItem(key)||'null')||{};
   old.pinned=Array.isArray(old.pinned)?old.pinned:[];
   old.recent=Array.isArray(old.recent)?old.recent:[];
   old.recent=[path,...old.recent.filter(x=>x!==path)].slice(0,24);
   localStorage.setItem(key,JSON.stringify(old));
  }
 }catch{}

 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const validKey=k=>/^pclocaltool_[A-Za-z0-9_-]{1,100}$/.test(k)||/^retro:[A-Za-z0-9_.-]{1,100}:[A-Za-z0-9_.-]{1,100}$/.test(k)||k==='scratchLiteSettings';
 const errors=[];const MAX_ERRORS=40;
 let drawer,open=false;
 function logError(error,type){
  if(errors.length>=MAX_ERRORS)errors.shift();
  errors.push({time:new Date().toLocaleTimeString('ja-JP'),type,message:String(error?.message||error||'不明なエラー').slice(0,350)});
  paintErrorCount();
 }
 addEventListener('error',e=>{if(e.target===window)logError(e.error||e.message,'JavaScript');else if(e.target instanceof Element)logError((e.target.tagName||'リソース')+' の読み込みに失敗','読込')},true);
 addEventListener('unhandledrejection',e=>logError(e.reason,'非同期'),true);
 function paintErrorCount(){
  const b=document.getElementById('pct-hub-errors');if(b)b.textContent=errors.length?('⚠ '+errors.length+'件'):'異常を検出していません';
 }
 function readAll(){
  const result={};
  try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(validKey(key))result[key]=localStorage.getItem(key)}}catch(e){logError(e,'保存')}
  return result;
 }
 function download(name,text){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 function backup(){
  const data=readAll(),payload={format:'pclocaltool-backup',version:2,createdAt:new Date().toISOString(),items:data};
  download('pclocaltool-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(payload,null,2));
  status(Object.keys(data).length+'件のブラウザ保存データを出力しました。Scratchの作品本体などIndexedDB内のデータは対象外です。');
 }
 async function restore(file){
  if(!file)return;if(file.size>6*1024*1024){status('バックアップファイルが大きすぎます。','bad');return}
  let obj;
  try{obj=JSON.parse(await file.text())}catch{status('JSON形式として読み取れません。','bad');return}
  if(obj?.format!=='pclocaltool-backup'||obj.version!==2||!obj.items||typeof obj.items!=='object'||Array.isArray(obj.items)){status('PC Local Toolのバックアップ形式ではありません。','bad');return}
  const entries=Object.entries(obj.items);
  if(entries.length>2000||entries.some(([k,v])=>!validKey(k)||typeof v!=='string'||v.length>2*1024*1024)){status('保存キーまたは値に問題があります。','bad');return}
  if(!entries.length){status('復元するデータがありません。');return}
  if(!confirm('保存済み設定・履歴を'+entries.length+'件上書きします。復元後、この画面を再読込してよいですか？'))return;
  const before={};
  try{
   for(const [k] of entries)before[k]=localStorage.getItem(k);
   for(const [k,v] of entries)localStorage.setItem(k,v);
  }catch(e){
   for(const [k,v] of Object.entries(before)){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{}}
   status('保存領域が不足している可能性があります。変更を元に戻しました。','bad');return;
  }
  location.reload();
 }
 function status(msg,bad=false){
  const el=document.getElementById('pct-hub-status');if(!el)return;el.textContent=msg;el.dataset.bad=bad?'1':'0';
 }
 function renderErrorList(){
  const el=document.getElementById('pct-hub-error-list');if(!el)return;
  el.innerHTML=errors.length?errors.slice(-12).reverse().map(x=>'<div class="pct-hub-log"><span>'+esc(x.time)+' · '+esc(x.type)+'</span><p>'+esc(x.message)+'</p></div>').join(''):'<p class="pct-hub-muted">この画面で検出されたエラーはありません。</p>';
 }
 function setOpen(value){
  open=!!value;drawer.hidden=!open;document.getElementById('pct-hub-trigger').setAttribute('aria-expanded',String(open));
  if(open){renderErrorList();paintErrorCount();setTimeout(()=>document.getElementById('pct-hub-search')?.focus(),0)}
 }
 function copyDiagnostic(){
  const info={app:current,location:location.pathname,time:new Date().toISOString(),errors:[...errors]};
  navigator.clipboard?.writeText(JSON.stringify(info,null,2)).then(()=>status('エラー情報をコピーしました。'),()=>status('コピーできませんでした。',true));
 }
 function init(){
  if(!document.body)return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='../_shared/tool-hub.css?v=2';document.head.appendChild(style);
  const outer=document.createElement('div');outer.id='pct-tool-hub';
  outer.innerHTML='<button id="pct-hub-trigger" type="button" aria-label="PC Local Tool メニュー" aria-controls="pct-hub-panel" aria-expanded="false">☷ <span>ツール</span></button>'+
  '<section id="pct-hub-panel" hidden aria-label="ツールの切り替えとバックアップ" role="dialog">'+
  '<header class="pct-hub-header"><div><b>PC Local Tool</b><small>どのツールからでも移動・管理</small></div><button type="button" id="pct-hub-close" aria-label="閉じる">×</button></header>'+
  '<label for="pct-hub-search">ツールを検索</label><input id="pct-hub-search" type="search" placeholder="名前や機能を入力">'+
  '<nav id="pct-hub-links" aria-label="ツール一覧"></nav>'+
  '<div class="pct-hub-section"><b>🔐 データのバックアップ</b><p>計算履歴・タイマー設定・ゲームの記録など、ブラウザの保存データを出力します。Scratch作品本体や作業ファイルは含みません。</p>'+
  '<div class="pct-hub-buttons"><button id="pct-hub-backup" type="button">JSON保存</button><button id="pct-hub-restore" type="button">JSONから復元</button><input type="file" id="pct-hub-file" accept=".json,application/json" hidden></div></div>'+
  '<details class="pct-hub-section"><summary>🔎 この画面のエラー情報 <span id="pct-hub-errors"></span></summary><div id="pct-hub-error-list"></div><button id="pct-hub-copy-errors" type="button">診断結果をコピー</button></details>'+
  '<p id="pct-hub-status" role="status" aria-live="polite"></p><a class="pct-hub-home" href="../../index.html">← 全ツールのトップへ</a></section>';
  document.body.appendChild(outer);drawer=document.getElementById('pct-hub-panel');
  const links=document.getElementById('pct-hub-links');
  const draw=q=>{links.innerHTML=APPS.filter(x=>(x.title+x.label).toLowerCase().includes(q.toLowerCase())).map(a=>
   '<a href="../'+a.id+'/index.html"'+(a.id===current?' aria-current="page"':'')+'>'+esc(a.label)+(a.id===current?'<span>表示中</span>':'')+'</a>').join('')||'<p class="pct-hub-muted">該当するツールがありません。</p>'};
  draw('');
  document.getElementById('pct-hub-trigger').onclick=()=>setOpen(!open);
  document.getElementById('pct-hub-close').onclick=()=>setOpen(false);
  document.getElementById('pct-hub-search').oninput=e=>draw(e.target.value);
  document.getElementById('pct-hub-backup').onclick=backup;
  document.getElementById('pct-hub-restore').onclick=()=>document.getElementById('pct-hub-file').click();
  document.getElementById('pct-hub-file').onchange=e=>{restore(e.target.files[0]);e.target.value=''};
  document.getElementById('pct-hub-copy-errors').onclick=copyDiagnostic;
  document.addEventListener('keydown',e=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(true)}
   if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false)}
  },true);
  document.addEventListener('pointerdown',e=>{if(open&&!outer.contains(e.target))setOpen(false)});
  paintErrorCount();
 }
 window.PCToolHub={open:()=>setOpen(true),errors,backup};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();