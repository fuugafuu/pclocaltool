'use strict';
(() => {
const E=window.TypingEngine, $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
if(!E){document.body.textContent='タイピングエンジンを読み込めませんでした。';return}
const STORE='pclocaltool_typing_arena_v1';
const KEY_ROWS=['qwertyuiop','asdfghjkl','zxcvbnm'];
const names={daily:'日常',tech:'技術',creative:'物語',science:'科学',mixed:'MIX'};
const levelNames=['','ROOKIE','EASY','NORMAL','HARD','EXPERT'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let model=E.freshModel(),mode='ai',phase='idle',prompt=null,tok=[],states=[],typed='',keySnapshots=[],mistakes=0,correct=0,combo=0,bestCombo=0,completed=0,elapsed=0,pauseSince=0,pauseTotal=0,startedAt=0,lastCorrectAt=0,previous='',questIndex=0,history=[],tone=false,context=null,currentErrors=0,lastPromptAt=0,animationTimer=0,lastTick=0;
const summary=()=>{const total=correct+mistakes;return {cpm:elapsed>0?Math.round(correct*60000/Math.max(1000,elapsed)):0,wpm:elapsed>0?Math.round(correct*12000/Math.max(1000,elapsed)):0,accuracy:total?Math.round(correct/total*1000)/10:100}};
try{model=E.normalizeModel(JSON.parse(localStorage.getItem(STORE)||'null'))}catch{}
function save(){try{localStorage.setItem(STORE,JSON.stringify(model))}catch(e){console.warn('タイピング学習データを保存できません',e)}}
function now(){return performance.now()}
function beep(ok){
 if(!tone)return;
 try{
  context=context||new (window.AudioContext||window.webkitAudioContext)();
  if(context.state==='suspended')context.resume().catch(()=>{});
  const t=context.currentTime,o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.setValueAtTime(ok?580:170,t);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(ok?.023:.014,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.065);
  o.connect(g).connect(context.destination);o.start(t);o.stop(t+.075);
 }catch{}
}
function config(){
 return {mode,language:$('#language').value,category:$('#category').value,level:+$('#level').value,adapt:$('#adapt').value,duration:+$('#duration').value};
}
function updateControls(){
 const n=+$('#level').value;setText('#level-label','Lv.'+n+' / '+levelNames[n]);
 $('#adapt').disabled=mode!=='ai';$('#adapt-label').textContent=mode==='ai'?'学習強度':'OFF';
 $('#mode-detail').textContent=mode==='ai'?'打鍵速度と苦手文字を見て、AIが問題を調整します。':'指定の難易度に沿ってランダムな文章を生成します。';
 $$('[data-mode]').forEach(b=>{const on=b.dataset.mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
 if(phase==='idle'){const t=+$('#duration').value;setText('#time',t?String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0'):'∞:∞')}
}
function setText(selector,value){const element=$(selector);if(element)element.textContent=value}
function rank(){const x=E.rankSummary(model),weak=x.filter(a=>a.weakness>.28),sessions=model.sessions;
 return {rank:x,weak,sessions,bestCpm:sessions.reduce((a,x)=>Math.max(a,x.cpm||0),0),bestAccuracy:sessions.filter(x=>x.correct>=10).reduce((a,x)=>Math.max(a,x.accuracy||0),0)}
}
function historyUpdated(){
 const r=rank(),sessions=r.sessions;
 setText('#best-cpm',r.bestCpm?r.bestCpm.toLocaleString():'—');const unit=document.createElement('small');unit.textContent='CPM';$('#best-cpm').append(unit);
 setText('#best-accuracy',r.bestAccuracy||'—');
 setText('#total-runs',model.runs);
 const counts=Object.values(model.keys).reduce((n,x)=>n+(x.hits||0)+(x.errors||0),0);
 setText('#coach-level',counts>1000?'熟練データ':counts>300?'詳細分析中':counts>60?'学習進行中':counts?'学習開始':'未学習');
 setText('#coach-samples',counts?counts.toLocaleString()+'打鍵を解析済み':'まずは打ち始めよう');
 const last=sessions[sessions.length-1];
 if(!last){setText('#coach-headline','最初の練習を始めよう');setText('#coach-advice','ミスや打鍵間隔から苦手なキーを特定します。まずは正確さを意識して入力してみよう。')}
 else if(r.weak.length){
  const top=r.weak.slice(0,3);
  setText('#coach-headline','苦手キー '+top.map(x=>x.key.toUpperCase()).join(' / ')+' を重点練習');
  setText('#coach-advice','最近の正確率 '+last.accuracy+'%、速度 '+last.cpm+' CPM。次は「'+top[0].key.toUpperCase()+'」を含む問題を優先します。ミスを減らしてから速度を上げよう。');
 }else if(last.accuracy>=97){setText('#coach-headline','高い正確性を維持できています');setText('#coach-advice',last.cpm+' CPM、正確率 '+last.accuracy+'%。難易度を1段階上げると新しい課題が見つかるかも。')}
 else{setText('#coach-headline','安定したリズムを育てよう');setText('#coach-advice','正確率 '+last.accuracy+'%、速度 '+last.cpm+' CPM。焦らず確実に、同じリズムで入力することを目指してみよう。')}
 const tags=$('#weak-tags');tags.replaceChildren();
 if(r.weak.length){r.weak.slice(0,6).forEach(x=>{const chip=document.createElement('span');chip.textContent=x.key.toUpperCase()+' · '+x.accuracy+'%';tags.appendChild(chip)})}
 else{const b=document.createElement('span');b.textContent=counts?'目立った苦手キーはまだありません':'まだ学習データはありません';tags.appendChild(b)}
 const chart=$('#history-chart');chart.replaceChildren();
 if(!sessions.length){const box=document.createElement('div');box.className='empty-chart';box.textContent='練習結果がここに表示されます';chart.appendChild(box)}
 else{
  const recent=sessions.slice(-12),max=Math.max(200,...recent.map(x=>x.cpm||0));
  for(const item of recent){
   const el=document.createElement('div');el.className='chart-col';el.title=item.cpm+' CPM / '+item.accuracy+'%';
   const bar=document.createElement('span');bar.className='chart-bar';bar.style.height=Math.max(5,Math.round(100*(item.cpm||0)/max))+'%';
   const acc=document.createElement('i');acc.className='chart-dot';acc.style.bottom=Math.max(0,Math.min(94,item.accuracy-6))+'%';el.append(bar,acc);chart.appendChild(el);
  }
 }
 const heat=$('#heatmap');heat.replaceChildren();
 KEY_ROWS.forEach(row=>{
  const line=document.createElement('div');line.className='heat-row';
  [...row].forEach(k=>{const x=model.keys[k],total=(x?.hits||0)+(x?.errors||0),score=E.weakness(model,k);
   const item=document.createElement('span');item.className='heat-key '+(!total?'neutral':score>.4?'weak':score>.25?'mid':'strong');
   item.textContent=k.toUpperCase();item.title=total?'正確率 '+Math.round(100*x.hits/total)+'% · 平均打鍵 '+Math.round(x.ms||0)+'ms · '+total+'回':'まだ記録なし';line.appendChild(item)});
  heat.appendChild(line);
 });
}
function drawKeyboard(){
 const kb=$('#keyboard');kb.replaceChildren();
 for(const chars of KEY_ROWS){
  const row=document.createElement('div');row.className='key-row';
  for(const c of chars){const key=document.createElement('button');key.type='button';key.className='keycap';key.dataset.key=c;key.textContent=c.toUpperCase();key.setAttribute('aria-label',c+' を入力');key.onclick=()=>virtualKey(c);row.appendChild(key)}
  kb.appendChild(row);
 }
 const row=document.createElement('div');row.className='key-row key-extras';
 for(const [label,value] of [['ー','-'],['スペース',' '],['⌫','Backspace']]){
  const b=document.createElement('button');b.type='button';b.className='keycap key-wide';b.textContent=label;b.setAttribute('aria-label',label);b.onclick=()=>virtualKey(value);row.appendChild(b)
 }
 kb.appendChild(row);
}
function virtualKey(key){
 if(['waiting','running'].includes(phase)&&!document.querySelector('dialog[open]')){
  keyboard({key,target:$('#typing-surface'),preventDefault(){},repeat:false,isComposing:false,ctrlKey:false,metaKey:false,altKey:false});
 }
}
function flashKey(key,bad=false){
 const item=$('.keycap[data-key="'+key+'"]');if(item){item.classList.remove('flash','wrong');void item.offsetWidth;item.classList.add(bad?'wrong':'flash')}
}
function drawQuestion(){
 if(!prompt)return;
 setText('#prompt-display',prompt.display);
 const reading=$('#reading');reading.replaceChildren();
 const most=states.slice().sort((a,b)=>b.idx-a.idx||b.at-a.at)[0]||{idx:0,at:0,word:''};
 for(let i=0;i<tok.length;i++){
  const mark=document.createElement('span');
  mark.className=i<most.idx?'done':i===most.idx?'current':'pending';mark.textContent=tok[i].display;reading.appendChild(mark);
 }
 const line=$('#roman-line');line.replaceChildren();
 const typedEl=document.createElement('span');typedEl.className='typed';typedEl.textContent=typed;
 const rest=document.createElement('span');rest.className='upcoming';rest.textContent=E.currentTarget(tok,states);
 line.append(typedEl,rest);
 $('#progress-fill').style.transform='scaleX('+clamp(E.progress(tok,states),0,1)+')';
 setText('#question-number','QUESTION '+String(questIndex).padStart(2,'0'));
 setText('#prompt-category',names[prompt.category]||'MIX');
 setText('#current-level','LEVEL '+prompt.level+(mode==='ai'?' / AI':''));
 setText('#key-combo','COMBO '+combo);
}
function updateLive(){
 const m=summary();
 setText('#live-cpm',m.cpm);const cpmSmall=document.createElement('small');cpmSmall.textContent='CPM';$('#live-cpm').appendChild(cpmSmall);
 setText('#live-accuracy',m.accuracy);const pct=document.createElement('small');pct.textContent='%';$('#live-accuracy').appendChild(pct);
 setText('#live-chars',correct);setText('#live-misses',mistakes);
 setText('#key-combo','COMBO '+combo);
 const t=config().duration,remaining=Math.max(0, t-elapsed/1000),total=Math.ceil(remaining);
 setText('#time',t?String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0'):'∞:∞');
}
function nextQuestion(){
 const cfg=config();
 const rand=Math.random;
 const recent=history.slice(-12);
 let p;
 if(cfg.mode==='ai'){
  p=E.adaptivePrompt(model,{language:cfg.language,category:cfg.category,level:cfg.level,rand,recent});
  if(cfg.adapt==='gentle')p=E.makePrompt({...cfg,level:Math.max(1,p.level-1),rand});
  if(cfg.adapt==='intensive'){
   const selection=Array.from({length:6},()=>E.adaptivePrompt(model,{language:cfg.language,category:cfg.category,level:Math.min(5,cfg.level+1),rand,recent}));
   p=selection.sort((a,b)=>b.score-a.score)[0];
  }
 }else p=E.makePrompt(cfg);
 prompt=p;tok=E.tokens(p.reading||p.display,p.language);states=E.initialStates(tok);typed='';keySnapshots=[];questIndex++;currentErrors=0;lastPromptAt=now();
 history.push(p.display);if(history.length>30)history.shift();drawQuestion();
 setText('#input-hint',mode==='ai'?(p.reason||'AI出題 · 弱点学習中'):'この問題を正確に入力しよう');
}
function start(){
 model.runs++;save();mode=$('[data-mode].active').dataset.mode;
 mistakes=0;correct=0;combo=0;bestCombo=0;completed=0;elapsed=0;pauseTotal=0;startedAt=0;lastCorrectAt=0;previous='';questIndex=0;history=[];phase='waiting';pauseSince=0;
 $$('select,input[type=range],[data-mode]').forEach(x=>x.disabled=true);
 $('#arena-overlay').hidden=true;$('#results-dialog').open&&$('#results-dialog').close();
 $('#start').textContent='新しいトレーニング';$('#pause').disabled=false;$('#restart').disabled=false;
 setText('#status','READY · TYPE TO BEGIN');$('#live-indicator').classList.add('active');
 nextQuestion();updateLive();$('#typing-surface').focus({preventScroll:true});
}
function end(){
 if(phase==='idle'||phase==='finished')return;
 if(phase==='running')elapsed=Math.max(0,now()-startedAt-pauseTotal);
 phase='finished';
 $$('select,input[type=range],[data-mode]').forEach(x=>x.disabled=false);
 $('#pause').disabled=true;$('#live-indicator').classList.remove('active');
 setText('#status','SESSION COMPLETE');const stats=summary();
 const entry={when:Date.now(),mode,language:$('#language').value,level:+$('#level').value,cpm:stats.cpm,wpm:stats.wpm,accuracy:stats.accuracy,correct,errors:mistakes,questions:completed,combo:bestCombo,duration:Math.round(elapsed/1000)};
 if(correct>0){model.sessions.push(entry);model.sessions=model.sessions.slice(-80)}
 save();historyUpdated();updateControls();
 setText('#result-cpm',stats.cpm);setText('#result-accuracy',stats.accuracy);setText('#result-misses',mistakes);setText('#result-questions',completed);
 setText('#result-grade',E.grade(stats.cpm,stats.accuracy));
 const weakest=E.rankSummary(model).find(x=>x.weakness>.26);
 setText('#result-message',correct===0?'まだ打鍵がありません。開始して最初のキーを打ってみよう。':weakest?'苦手キー「'+weakest.key.toUpperCase()+'」を意識して次の練習へ。自己ベストを更新していこう。':'正確さが安定してきました。次は難易度を上げてみよう。');
 $('#results-dialog').showModal();
}
function completedPrompt(){
 completed++;combo+=2;bestCombo=Math.max(bestCombo,combo);save();
 const box=$('#typing-surface');box.classList.remove('completed');void box.offsetWidth;box.classList.add('completed');
 setTimeout(()=>box.classList.remove('completed'),230);
 if(mode==='ai'){const r=E.rankSummary(model);if(r.length)setText('#input-hint','AI ANALYSIS · '+r[0].key.toUpperCase()+' を重点トレーニング')}
 nextQuestion();
}
function keyboard(e){
 if(document.querySelector('dialog[open]'))return;
 if(['input','select','textarea'].includes(e.target?.tagName?.toLowerCase())||e.target?.isContentEditable)return;
 if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
 if(e.key==='Escape'){if(phase==='running'||phase==='waiting'||phase==='paused'){e.preventDefault();pause()}return}
 if(phase!=='running'&&phase!=='waiting')return;
 if(e.key==='Backspace'){
  e.preventDefault();if(keySnapshots.length){
   const old=keySnapshots.pop();states=old.states;typed=typed.slice(0,-1);correct=Math.max(0,correct-1);combo=Math.max(0,combo-1);previous=old.previous;
   drawQuestion();updateLive();
  }return;
 }
 if(e.repeat||e.key.length!==1)return;
 const ch=e.key.toLowerCase();
 if(!/^[a-z0-9 !?.,\-]$/.test(ch))return;
 e.preventDefault();
 if(phase==='waiting'){phase='running';startedAt=now();setText('#status','LIVE · TRAINING')}
 const instant=now(),delta=lastCorrectAt?instant-lastCorrectAt:null;
 const next=E.step(tok,states,ch);
 if(next.length){
  E.observe(model,ch,true,delta,previous);
  keySnapshots.push({states,previous});
  states=next;typed+=ch;correct++;combo++;bestCombo=Math.max(bestCombo,combo);lastCorrectAt=instant;previous=ch;flashKey(ch);beep(true);
  drawQuestion();updateLive();
  if(E.complete(tok,states))completedPrompt();
 }else{
  const nextPossibilities=states.map(s=>s.word?.[s.at]).filter(Boolean),expected=nextPossibilities[0]||ch;
  E.observe(model,expected,false,null,previous);
  mistakes++;currentErrors++;combo=0;flashKey(ch,true);beep(false);
  const surface=$('#typing-surface');surface.classList.remove('mistake');void surface.offsetWidth;surface.classList.add('mistake');setTimeout(()=>surface.classList.remove('mistake'),200);
  updateLive();
 }
 if(correct%30===0)save();
}
function pause(){
 if(phase==='waiting'||phase==='running'){
  pauseSince=now();phase='paused';$('#arena-overlay').hidden=false;setText('#status','PAUSED');
  $('.arena-overlay .overlay-eyebrow').textContent='GAME PAUSED';
  $('.arena-overlay h2').textContent='ひと休みしよう。';
  $('.arena-overlay p').textContent='準備ができたら再開してね。';
  $('#overlay-start').textContent='▶ 再開する';
  $('#pause').textContent='▶ 再開';
 }else if(phase==='paused'){
  if(startedAt)pauseTotal+=now()-pauseSince;pauseSince=0;phase=startedAt?'running':'waiting';$('#arena-overlay').hidden=true;
  $('#pause').textContent='Ⅱ 一時停止';setText('#status',startedAt?'LIVE · TRAINING':'READY · TYPE TO BEGIN');
  $('#typing-surface').focus({preventScroll:true});
 }
}
function ticker(){
 if(phase==='running'){
  elapsed=now()-startedAt-pauseTotal;
  if(config().duration&&elapsed>=config().duration*1000){elapsed=config().duration*1000;end();return}
  updateLive();
 }
}
function exportModel(){
 const blob=new Blob([JSON.stringify({format:'typing-arena-progress',exported:new Date().toISOString(),model},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='typing-arena-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function resetModel(){
 if(!confirm('すべての学習履歴・キー別分析・自己ベストを初期化します。よろしいですか？'))return;
 model=E.freshModel();save();historyUpdated();
}
function bind(){
 drawKeyboard();
 $$('[data-mode]').forEach(b=>b.onclick=()=>{if(['running','waiting','paused'].includes(phase))return;mode=b.dataset.mode;updateControls()});
 $('#level').oninput=updateControls;$('#duration').onchange=updateControls;
 $('#start').onclick=start;$('#overlay-start').onclick=()=>phase==='paused'?pause():start();
 $('#pause').onclick=pause;$('#restart').onclick=start;
 $('#typing-surface').onclick=()=>{if(phase==='waiting'||phase==='running')$('#typing-surface').focus({preventScroll:true})};
 document.addEventListener('keydown',keyboard);
 $('#sound-toggle').onclick=()=>{tone=!tone;$('#sound-toggle').textContent=tone?'♪ ON':'♪ OFF';$('#sound-toggle').setAttribute('aria-pressed',String(tone))};
 $('#help-toggle').onclick=()=>$('#help-dialog').showModal();
 $('#help-close').onclick=$('#help-ok').onclick=()=>$('#help-dialog').close();
 $('#result-close').onclick=()=>$('#results-dialog').close();
 $('#result-again').onclick=start;
 $('#export').onclick=exportModel;$('#reset-model').onclick=resetModel;
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&['running','waiting'].includes(phase))pause()});
 window.addEventListener('pagehide',save);
 setInterval(ticker,100);
}
function init(){
 bind();updateControls();historyUpdated();
 const qs=new URLSearchParams(location.search);
 if(['ja','en'].includes(qs.get('language')))$('#language').value=qs.get('language');
 if(['ai','normal'].includes(qs.get('mode')))mode=qs.get('mode');
 if(['1','2','3','4','5'].includes(qs.get('level')))$('#level').value=qs.get('level');
 updateControls();updateLive();
}
init();
})();