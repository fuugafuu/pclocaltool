'use strict';
(() => {
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const KEY='pclocaltool_launcher_v2';
  const APPS=[
    {id:'math-assist',url:'tools/math-assist/index.html',label:'Math Assist',icon:'∑'},
    {id:'universal-timer',url:'tools/universal-timer/index.html',label:'Universal Timer',icon:'◴'},
    {id:'dev-os',url:'tools/dev-os/index.html',label:'Dev OS Lab',icon:'▣'},
    {id:'agent-bridge',url:'tools/agent-bridge/index.html',label:'Agent Bridge',icon:'⌘'},
    {id:'janken-ai',url:'tools/janken-ai/index.html',label:'Janken AI Lab',icon:'✊'},
    {id:'retro-arcade',url:'tools/retro-arcade/index.html',label:'Retro Arcade Lab',icon:'◈'},
    {id:'scratch-lite',url:'tools/scratch-lite/index.html',label:'Scratch Lite',icon:'S'}
  ];
  let data={pinned:[],recent:[]};
  try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&typeof raw==='object'){data.pinned=Array.isArray(raw.pinned)?raw.pinned:[];data.recent=Array.isArray(raw.recent)?raw.recent:[]}}catch{}
  const cards=$$('.tool-card'),command=$('#command-input');
  let filter='all',query='',scratchHistory=[],lastRetroId='';
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}
  function record(url){
    const path=String(url).split('?')[0].split('#')[0];
    if(!APPS.some(x=>x.url===path))return;
    data.recent=[path,...data.recent.filter(x=>x!==path)].slice(0,24);
    save();
  }
  function route(url){record(url);location.href=url}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function stored(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function tool(id){return APPS.find(x=>x.id===id)}
  function quickParams(path,obj){const q=new URLSearchParams(obj);return path+(q.size?'?'+q:'')}
  function durationSeconds(s){
    const normalized=s.replace(/[０-９]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0xfee0));
    const matches=[...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(時間|時|分|秒|hours?|hrs?|minutes?|mins?|seconds?|secs?|[hms])/gi)];
    if(matches.length===0)return null;
    let total=0;
    for(const m of matches){const value=+m[1],u=m[2].toLowerCase();total+=value*(u==='時間'||u==='時'||u.startsWith('h')?3600:u==='分'||u.startsWith('m')?60:1)}
    return Number.isFinite(total)&&total>=1&&total<=24*3600?Math.round(total):null;
  }
  function interpret(raw){
    const s=String(raw||'').trim(),low=s.toLowerCase();
    if(!s)return null;
    const scratch=/scratch|スクラッチ|ターボワープ|turbowarp|\.sb[23]?\b/i.test(s);
    const scratchId=(s.match(/(?:scratch\.mit\.edu\/projects\/|turbowarp\.org\/)(\d+)/i)||[])[1]||(scratch?(s.match(/\b\d{5,12}\b/)||[])[0]:null);
    if(scratch)return {id:'scratch-lite',url:scratchId?quickParams(tool('scratch-lite').url,{project:scratchId}):tool('scratch-lite').url,title:scratchId?'Scratch #'+scratchId+' を開く':'Scratch Liteを開く',details:scratchId?'保存済みがあれば再取得せず開きます':'Scratchプロジェクトの再生専用ランチャー'};
    if(/ストップウォッチ|stopwatch/i.test(s))return {id:'universal-timer',url:quickParams(tool('universal-timer').url,{view:'stopwatch'}),title:'ストップウォッチを開く',details:'計測モードへ直接移動'};
    const timer=/タイマー|timer|カウントダウン|ポモドーロ|分(だけ|間|タイマー|測|はか)|\d+\s*分\b/i.test(s);
    if(timer){
      const secs=durationSeconds(s);
      if(/ポモドーロ/.test(s))return {id:'universal-timer',url:quickParams(tool('universal-timer').url,{view:'pomodoro'}),title:'ポモドーロを開く',details:'集中と休憩のタイマー'};
      return {id:'universal-timer',url:secs?quickParams(tool('universal-timer').url,{preset:String(secs),start:'1'}):tool('universal-timer').url,title:secs?secs>=3600?Math.floor(secs/3600)+'時間のタイマーを開始':secs>=60?Math.floor(secs/60)+'分'+(secs%60?secs%60+'秒':'')+'タイマーを開始':secs+'秒タイマーを開始':'タイマーツールを開く',details:secs?'時間を引き継ぎ、そのままカウントダウン開始':'タイマー・アラーム・ストップウォッチ'};
    }
    if(/前に遊んだ|続きのゲーム|ゲーム再開|最近のゲーム/.test(s)&&lastRetroId)return {id:'retro-arcade',url:quickParams(tool('retro-arcade').url,{play:lastRetroId}),title:'前回のゲームを再開',details:lastRetroId};
    if(/ゲーム|アーケード|レトロ|マリオ|パックマン/i.test(s))return {id:'retro-arcade',url:tool('retro-arcade').url,title:'レトロゲームを開く',details:'Classic/Modern・オート・倍速'};
    if(/じゃんけん|ジャンケン|janken|グー|チョキ|パー/i.test(s))return {id:'janken-ai',url:tool('janken-ai').url,title:'じゃんけんAIを開く',details:'相手別の傾向学習・予測'};
    if(/仮想|os|bios|デスクトップ|uefi|pcシミュ/i.test(s))return {id:'dev-os',url:tool('dev-os').url,title:'Dev OS Labを開く',details:'仮想PCを起動'};
    if(/json|ファイル編集|フォルダ|エージェント|コード編集|agent|検査|診断/.test(low))return {id:'agent-bridge',url:tool('agent-bridge').url,title:'Agent Bridgeを開く',details:'作業フォルダ内の安全な編集・検査'};
    const math=/計算|数学|方程式|数式|グラフ|微分|平方根|三角関数/.test(s)||/[0-9０-９]/.test(s)&&/[=＝+＋\-−*/×÷^()（）]/.test(s);
    if(math){
      const expr=s.replace(/^(計算|数学|数式|方程式|解いて|を解く|を計算|して)\s*[:：]?/,'').trim();
      return {id:'math-assist',url:quickParams(tool('math-assist').url,{quick:expr||s}),title:'Math Assistで解析する',details:'入力を引き継いで計算画面へ移動'};
    }
    const match=APPS.map(a=>({app:a,score:0})).map(x=>{x.score=(x.app.label.toLowerCase().includes(low)?10:0)+([...''].length);return x}).sort((a,b)=>b.score-a.score)[0];
    if(match?.score>0)return {id:match.app.id,url:match.app.url,title:match.app.label+' を開く',details:'候補ツールを開きます'};
    return {id:'',url:'',title:'具体的な内容を入力してください',details:'例：5分タイマー / 2x+5=15 / Scratch 123456 / じゃんけん',unknown:true};
  }
  function showCommand(){
    const r=interpret(command.value),box=$('#command-preview'),button=$('#command-launch');
    if(!r){
      box.innerHTML='<span class="preview-icon">✦</span><div><b>クイックコマンド</b><small>入力内容に合わせて行き先を自動提案します</small></div>';
      button.disabled=false;button.textContent='実行する ↗';return;
    }
    box.innerHTML='<span class="preview-icon">'+(r.unknown?'?':'↗')+'</span><div><b>'+esc(r.title)+'</b><small>'+esc(r.details)+'</small></div>';
    button.disabled=!!r.unknown;button.textContent=r.unknown?'入力を確認':'ここへ移動 ↗';
  }
  $('#command-form').onsubmit=e=>{e.preventDefault();const r=interpret(command.value);if(!r||r.unknown)return;route(r.url)};
  command.oninput=showCommand;
  $$('[data-suggest]').forEach(b=>b.onclick=()=>{command.value=b.dataset.suggest;showCommand();command.focus()});
  document.addEventListener('keydown',e=>{
    if((e.key==='/'&&!e.ctrlKey&&!e.altKey&&!e.metaKey)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){
      if(e.key==='/'&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      e.preventDefault();command.focus();command.select();
    }
    if(e.key==='Escape'&&document.activeElement===command)command.blur();
  });
  $('#help-shortcuts').onclick=()=>$('#shortcut-dialog').showModal();
  $('#close-shortcuts').onclick=()=>$('#shortcut-dialog').close();

  function renderFavoriteSidebar(){
    const items=APPS.filter(a=>data.pinned.includes(a.url));
    $('#sidebar-favorites').innerHTML=items.length?items.map(x=>'<a class="side-link" href="'+x.url+'"><span>'+esc(x.icon)+'</span>'+esc(x.label)+'</a>').join(''):'<p style="color:#667f96;font-size:11px;padding:0 13px">ツールの☆で追加できます</p>';
  }
  function renderTools(){
    let count=0;
    for(const card of cards){
      const a=tool(card.dataset.id),fav=data.pinned.includes(a.url);
      const btn=card.querySelector('.favorite');btn.textContent=fav?'★':'☆';btn.classList.toggle('active',fav);btn.setAttribute('aria-label',fav?'お気に入りを解除':'お気に入りに追加');
      const matches=(!query||(card.dataset.search+' '+card.textContent).toLowerCase().includes(query.toLowerCase()))&&(filter==='all'||(filter==='favorites'?fav:data.recent.includes(a.url)));
      card.hidden=!matches;if(matches)count++;
    }
    if(filter==='recent'){
      const order=url=>{const i=data.recent.indexOf(url);return i<0?999:i};
      cards.sort((a,b)=>order(tool(a.dataset.id).url)-order(tool(b.dataset.id).url)).forEach(card=>$('#tool-grid').appendChild(card));
    }
    $('#tool-meta').textContent=count+' / 7';$('#no-tools').hidden=count>0;
    $$('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
    $('#insight-used').textContent=new Set(data.recent).size+' / 7';
    renderFavoriteSidebar();
  }
  cards.forEach(card=>{
    const a=tool(card.dataset.id),pin=card.querySelector('.favorite');
    pin.onclick=()=>{if(data.pinned.includes(a.url))data.pinned=data.pinned.filter(x=>x!==a.url);else data.pinned.push(a.url);save();renderTools()};
    card.querySelector('.tool-foot a').onclick=()=>record(a.url);
  });
  $('#tool-search').oninput=e=>{query=e.target.value.trim();renderTools()};
  $$('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderTools()});

  function addResume(items,type,title,desc,url){
    if(!url)return;items.push({type,title:String(title).slice(0,85),desc:String(desc).slice(0,125),url});
  }
  async function scratchRecents(){
    return new Promise(resolve=>{
      if(!('indexedDB' in window))return resolve([]);
      try{
        const request=indexedDB.open('scratch-lite-project-cache',1);
        request.onupgradeneeded=()=>{request.transaction.abort()};
        request.onerror=()=>resolve([]);
        request.onsuccess=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains('recent')){db.close();resolve([]);return}
          const tx=db.transaction('recent','readonly'),req=tx.objectStore('recent').getAll();
          req.onsuccess=()=>{db.close();resolve((req.result||[]).sort((a,b)=>b.lastUsed-a.lastUsed).slice(0,3))};
          req.onerror=()=>{db.close();resolve([])};
        };
      }catch{resolve([])}
    });
  }
  async function renderResume(){
    const items=[],j=stored('pclocaltool_janken_ai_v1'),retro=stored('pclocaltool_retro_arcade_v1'),math=stored('pclocaltool_math_history_v1'),timer=stored('pclocaltool_universal_timer_v1'),os=stored('pclocaltool_dev_os_v1');
    if(Array.isArray(math)&&math.length){
      const x=math[0];
      addResume(items,'∑ MATH ASSIST','前の計算: '+(x.input||'数式'),(x.result||'答え')+' · 最近の計算から再開',quickParams(tool('math-assist').url,{quick:x.input||''}));
    }
    const last=Object.entries(retro?.lastPlayed||{}).sort((a,b)=>b[1]-a[1])[0];
    if(last){
      lastRetroId=last[0];addResume(items,'◈ RETRO ARCADE','ゲームを再開: '+last[0].replaceAll('-',' '),'前回のゲームを直接起動',quickParams(tool('retro-arcade').url,{play:last[0]}));
    }
    if(j?.activeMatch?.ids?.length){
      const names=(j.activeMatch.ids||[]).map(id=>j.profiles?.find(x=>x.id===id)?.name||'参加者').join(' VS ');
      addResume(items,'✊ JANKEN AI','じゃんけん対戦の続き',names+' · '+(j.activeMatch.rounds?.length||0)+'ラウンド記録済み',tool('janken-ai').url);
    }
    if(timer?.countdown?.running){
      const rem=Math.max(0,Math.ceil((timer.countdown.endAt-Date.now())/1000));
      addResume(items,'◴ UNIVERSAL TIMER','タイマー実行中: '+(timer.countdown.name||'タイマー'),Math.floor(rem/60)+'分'+(rem%60)+'秒 残り（保存時刻から計算）',tool('universal-timer').url);
    }
    scratchHistory=await scratchRecents();
    for(const x of scratchHistory.slice(0,2)){
      addResume(items,'S SCRATCH LITE',x.name||'Scratchプロジェクト',(x.analysis?.level||'保存済み')+' · ネット再取得なしで開く',quickParams(tool('scratch-lite').url,{cached:x.id}));
    }
    if(os?.bootCount>0&&items.length<3)addResume(items,'▣ DEV OS LAB','Dev OSを再開','起動履歴 '+os.bootCount+'回 · 仮想PCへ',tool('dev-os').url);
    for(const url of data.recent){if(items.length>=3)break;const x=APPS.find(a=>a.url===url);if(x&&!items.some(y=>y.url.startsWith(x.url)))addResume(items,'↺ RECENT TOOL',x.label,'最近開いたツール',x.url)}
    if(!items.length){
      addResume(items,'◴ QUICK START','5分タイマーを開始','1クリックでタイマー画面に移動',quickParams(tool('universal-timer').url,{preset:'300',start:'1'}));
      addResume(items,'∑ QUICK START','数式を解く','計算ツールへ移動',tool('math-assist').url);
      addResume(items,'S QUICK START','Scratchプロジェクトを開く','保存した作品やURLを読込',tool('scratch-lite').url);
    }
    $('#resume-grid').innerHTML=items.slice(0,3).map(item=>'<a class="resume-card" href="'+esc(item.url)+'"><span class="type">'+esc(item.type)+'</span><span class="arrow">↗</span><div><b>'+esc(item.title)+'</b><small>'+esc(item.desc)+'</small></div></a>').join('');
    $$('.resume-card').forEach(a=>a.onclick=()=>record(a.getAttribute('href')));
    showCommand();
  }
  function status(){
    const online=navigator.onLine;
    $('#network-label').textContent=online?'オンライン · ローカル処理':'オフライン · 保存済み機能を利用';
    $('.sidebar-bottom').classList.toggle('offline',!online);
    $('#insight-cpu').textContent=(navigator.hardwareConcurrency||'—')+(navigator.hardwareConcurrency?'コア':'');
    $('#insight-memory').textContent=navigator.deviceMemory?navigator.deviceMemory+'GB':'非公開';
    $('#insight-used').textContent=new Set(data.recent).size+' / 7';
    if(navigator.storage?.estimate)navigator.storage.estimate().then(({usage,quota})=>{
      const mb=n=>(n/1048576).toFixed(n>100e6?0:1);
      $('#insight-storage').textContent=mb(usage||0)+'MB';
      $('#insight-storage').title='使用量 '+mb(usage||0)+'MB / 上限目安 '+mb(quota||0)+'MB';
    }).catch(()=>$('#insight-storage').textContent='取得不可');
  }
  $('#refresh-insights').onclick=()=>{status();renderResume()};
  addEventListener('online',status);addEventListener('offline',status);
  addEventListener('pageshow',()=>{renderTools();renderResume();status()});
  renderTools();renderResume();status();
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./home-sw.js?v=1').catch(()=>{});
})();