'use strict';
(() => {
const E=window.JankenEngine,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='pclocaltool_janken_ai_v1';
const AI_ID='@janken-ai';
const aiProfile={id:AI_ID,name:'AI',icon:'🤖',events:[]};
let resultTimer;
const COLORS=['#6aa8ff','#6fd9b6','#f5bb6b','#d58aff','#ff8398','#71d9f2'];
let db=load(), match=null, currentRecommendation=null;
let battleSession=null, battleMatchId=null;

function uid(){return crypto.randomUUID?.()||('p'+Date.now().toString(36)+Math.random().toString(36).slice(2))}
function fresh(){return{version:1,profiles:[],history:[],activeMatch:null,settings:{theme:'dark'},createdAt:Date.now()}}
function normalizeData(data){
 if(data?.version!==1||!Array.isArray(data.profiles))return null;
 const profiles=[];
 const ids=new Set();
 for(const item of data.profiles){
   if(typeof item?.id!=='string'||!item.id||item.id===AI_ID||ids.has(item.id))return null;
   ids.add(item.id);
   profiles.push({...item,color:/^#[0-9a-f]{6}$/i.test(item.color)?item.color:COLORS[profiles.length%COLORS.length],
     events:Array.isArray(item.events)?item.events.filter(event=>E.MOVES.includes(event?.move)):[]});
 }
 const settings=data.settings&&typeof data.settings==='object'&&!Array.isArray(data.settings)?data.settings:{};
 const history=Array.isArray(data.history)?data.history.filter(entry=>entry?.round?.moves):[];
 return {...data,profiles,settings,history};
}
function load(){try{return normalizeData(JSON.parse(localStorage.getItem(KEY)))||fresh()}catch{return fresh()}}
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function pct(n){return Math.round((+n||0)*100)+'%'}
function profile(id){return id===AI_ID?aiProfile:db.profiles.find(p=>p.id===id)}
function ensureSeeds(){if(db.profiles.length>=2)return;const defaults=[{id:uid(),name:'自分',icon:'🙂',note:'',color:COLORS[0],events:[],createdAt:Date.now()},{id:uid(),name:'対戦相手A',icon:'😎',note:'',color:COLORS[1],events:[],createdAt:Date.now()}];db.profiles.push(...defaults.slice(db.profiles.length));localStorage.setItem(KEY,JSON.stringify(db))}
ensureSeeds();

function renderProfiles(){
 const list=$('#profile-list');list.innerHTML=db.profiles.map(p=>{const s=E.profileStats(p);return`<div class="profile-item"><div class="profile-icon" style="box-shadow:inset 0 0 0 1px ${p.color||COLORS[0]}55">${esc(p.icon||'👤')}</div><div class="profile-meta"><b>${esc(p.name)}</b><span>${s.total}手 学習済み</span></div><div class="profile-actions"><button data-edit="${esc(p.id)}" title="編集">✎</button><button data-delete="${esc(p.id)}" title="削除">×</button></div></div>`}).join('');
 $$('[data-edit]').forEach(b=>b.onclick=()=>openProfile(b.dataset.edit));$$('[data-delete]').forEach(b=>b.onclick=()=>deleteProfile(b.dataset.delete));
}
function fillSelect(sel,value){const opts=db.profiles.map(p=>`<option value="${esc(p.id)}" ${p.id===value?'selected':''}>${esc(p.icon||'👤')} ${esc(p.name)}</option>`).join('');sel.innerHTML=opts}
function renderSelects(){
 const vals={self:$('#self-profile').value,a:$('#opponent-a').value,b:$('#opponent-b').value,ana:$('#analytics-profile').value,rival:$('#analytics-rival')?.value||'',train:$('#train-profile')?.value||''};
 fillSelect($('#self-profile'),vals.self||db.profiles[0]?.id);fillSelect($('#opponent-a'),vals.a||db.profiles[1]?.id||db.profiles[0]?.id);fillSelect($('#opponent-b'),vals.b||db.profiles[2]?.id||db.profiles[0]?.id);fillSelect($('#analytics-profile'),vals.ana||db.profiles[0]?.id);
 if($('#train-profile'))fillSelect($('#train-profile'),vals.train||db.profiles[0]?.id);
 if($('#analytics-rival')){const selected=vals.rival;$('#analytics-rival').innerHTML='<option value="">全対戦相手</option>'+db.profiles.map(p=>`<option value="${esc(p.id)}">${esc(p.icon||'👤')} ${esc(p.name)}</option>`).join('');if(selected&&profile(selected))$('#analytics-rival').value=selected;}
}
function renderTotals(){const total=db.profiles.reduce((s,p)=>s+(p.events?.length||0),0);$('#total-events').textContent=total;$('#storage-pill').textContent=`LOCAL · ${db.profiles.length} profiles`}
function renderAll(){renderProfiles();renderSelects();renderTotals();renderAnalytics();renderSessionStats();}

function openProfile(id=null){const p=id?profile(id):null;$('#profile-dialog-title').textContent=p?'プロフィール編集':'プロフィール作成';$('#profile-id').value=p?.id||'';$('#profile-name').value=p?.name||'';$('#profile-icon').value=p?.icon||'';$('#profile-note').value=p?.note||'';$('#profile-dialog').showModal()}
function deleteProfile(id){if(match?.ids?.includes(id))return alert('対戦中のプロフィールは削除できません。');if(db.profiles.length<=2)return alert('最低2プロフィール必要です。');const p=profile(id);if(!confirm(`${p?.name||'このプロフィール'}を削除しますか？ 学習履歴も削除されます。`))return;db.profiles=db.profiles.filter(x=>x.id!==id);save()}
$('#profile-form').addEventListener('submit',e=>{e.preventDefault();const id=$('#profile-id').value,name=$('#profile-name').value.trim();if(!name)return;const icon=$('#profile-icon').value.trim()||'👤',note=$('#profile-note').value.trim();if(id){const p=profile(id);p.name=name;p.icon=icon;p.note=note}else db.profiles.push({id:uid(),name,icon,note,color:COLORS[db.profiles.length%COLORS.length],events:[],createdAt:Date.now()});localStorage.setItem(KEY,JSON.stringify(db));$('#profile-dialog').close();renderAll()});
$('#new-profile').onclick=()=>openProfile();$$('.dialog-cancel').forEach(b=>b.onclick=()=>$('#profile-dialog').close());

let gameMode='duel';
function persistActiveMatch(){db.activeMatch=match?JSON.parse(JSON.stringify(match)):null;localStorage.setItem(KEY,JSON.stringify(db));}
function validActiveMatch(m){
 if(!m||!Array.isArray(m.ids)||!Array.isArray(m.rounds)||!Array.isArray(m.opponentIds))return false;
 const [self,...opponents]=m.ids;
 return (m.mode==='trio'?m.ids.length===3:['duel','ai'].includes(m.mode)&&m.ids.length===2)
   && (m.mode==='ai'?opponents[0]===AI_ID&&self!==AI_ID:!m.ids.includes(AI_ID))
   && new Set(m.ids).size===m.ids.length && m.ids.every(profile)
   && m.selfId===self && m.opponentIds.length===opponents.length
   && opponents.every((id,index)=>m.opponentIds[index]===id)
   && m.rounds.every(round=>round?.resolution?.results&&m.ids.every(id=>E.MOVES.includes(round?.moves?.[id])));
}
function seedForMatch(){return [...String(match?.id||'')].reduce((a,c)=>a+c.charCodeAt(0),0)+(match?.rounds?.length||0);}
function selectMode(mode){
 gameMode=mode;
 $$('#mode-segment button').forEach(button=>{
   const active=button.dataset.mode===mode;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',String(active));
 });
 $('#opponent-a').closest('label').classList.toggle('hidden',mode==='ai');
 $('#opponent-b-wrap').classList.toggle('hidden',mode!=='trio');
 if(mode==='trio'){
   const occupied=[$('#self-profile').value,$('#opponent-a').value];
   const third=$('#opponent-b');
   if(occupied.includes(third.value)){
     const available=db.profiles.find(candidate=>!occupied.includes(candidate.id));
     if(available)third.value=available.id;
   }
 }
}
$$('#mode-segment button').forEach(button=>button.onclick=()=>selectMode(button.dataset.mode));
selectMode(gameMode);

function startMatch(){
 const ids=[$('#self-profile').value,gameMode==='ai'?AI_ID:$('#opponent-a').value];
 if(gameMode==='trio')ids.push($('#opponent-b').value);
 clearResult();
 if(new Set(ids).size!==ids.length){$('#setup-error').textContent='同じプロフィールを複数の席に選ぶことはできません。';return}
 $('#setup-error').textContent='';match={id:uid(),mode:gameMode,ids,selfId:ids[0],opponentIds:ids.slice(1),aiMode:$('#ai-mode').value,rounds:[],startedAt:Date.now()};persistActiveMatch();$('#setup-panel').classList.add('hidden');$('#match-area').classList.remove('hidden');computeRecommendation();renderMatch();
}
function endMatch(){clearResult();match=null;currentRecommendation=null;persistActiveMatch();$('#setup-panel').classList.remove('hidden');$('#match-area').classList.add('hidden');renderAll()}
$('#start-match').onclick=startMatch;$('#end-match').onclick=endMatch;

function contextForOpponent(pid){
 const rounds=match?.rounds||[],last=rounds.at(-1),observer=match.mode==='ai'?AI_ID:match.selfId;
 const order=['rock','paper','scissors'];
 const pairs=match.ids.length===2?rounds.slice(-64).flatMap(round=>{
   const human=order.indexOf(round.moves?.[pid]),other=order.indexOf(round.moves?.[observer]);
   return human<0||other<0?[]:[human*3+other];
 }):null;
 return{pairs,profilePrevMove:last?.moves?.[pid],profilePrevResult:last?.resolution?.results?.[pid],userPrevMove:last?.moves?.[observer],selfId:observer,opponentId:pid,matchId:match.id,mode:match.mode,participants:match.ids.length};
}
function computeRecommendation(){
 const versusAI=match.mode==='ai';
 const targets=versusAI?[match.selfId]:match.opponentIds;
 const preds=targets.map(id=>({id,...E.predictProfile(profile(id),contextForOpponent(id))}));
 const joint=match.opponentIds.length===2?E.jointDistribution(db.history,match.opponentIds[0],match.opponentIds[1]):null;
 const seed=versusAI?crypto.getRandomValues(new Uint32Array(1))[0]:seedForMatch();
 const rec=E.recommend(preds,match.aiMode,joint,seed);
 if (versusAI) {
   const model = window.JankenLearnedModel;
   const order = ['rock','paper','scissors'];
   if (battleMatchId !== match.id || battleSession?.diagnostics().rounds !== match.rounds.length) {
     const settings = { ...model?.battlePolicy };
     if (match.aiMode === 'safe') settings.exploration = Math.max(settings.exploration || 0, 0.2);
     if (match.aiMode === 'aggressive') settings.temperature = Math.min(settings.temperature || 0.16, 0.04);
     battleSession = window.JankenOpponent.createSession({
       settings, network: model?.predictBattleFeatures,
       featureVersion: model?.battleFeatureVersion,
       state: match.battleState?.round === match.rounds.length ? match.battleState : undefined
     });
     battleMatchId = match.id;
     if (battleSession.diagnostics().rounds !== match.rounds.length) {
       for (const round of match.rounds) {
         battleSession.prepare(round.battlePrior);
         battleSession.observe(order.indexOf(round.moves[match.selfId]), order.indexOf(round.moves[AI_ID]));
       }
     }
     match.battleState = battleSession.exportState();
   }
   const prior = order.map(move => preds[0].dist[move]);
   const prepared = battleSession.prepare(prior);
   const dist = Object.fromEntries(order.map((move,index) => [move,prepared.forecast[index]]));
   const top = order[prepared.forecast.indexOf(Math.max(...prepared.forecast))];
   const tactical = [{ ...preds[0], dist, top }];
   currentRecommendation = {
     ...rec, move: order[window.JankenOpponent.sample(prepared.action)],
     predictions: tactical, joint, battlePrior: prior
   };
 } else {
   currentRecommendation={...rec,predictions:preds,joint};
 }
}
function reasonText(){
 const parts=currentRecommendation.predictions.map(p=>{const pr=profile(p.id),specific=p.specificSample?`・対あなた ${p.specificSample}手`:'';return`${pr.name}は ${E.ICONS[p.top]}${E.LABELS[p.top]} 予測 ${pct(p.dist[p.top])}（確信 ${pct(p.confidence)}${specific}）`});
 const joint=currentRecommendation.jointBlend>0?`。3人戦の同時出し相関を ${pct(currentRecommendation.jointBlend)} 反映`:'';
 const mode=currentRecommendation.effectiveMode==='safe'?'負けにくさ重視':currentRecommendation.effectiveMode==='aggressive'?'勝ち狙い':'バランス';
 return parts.join(' ／ ')+`。現在は「${mode}」判定${joint}。`+(currentRecommendation.confidence<.24?'まだ不確実性が高いため、データ追加で大きく変わる可能性があります。':'複数モデルの一致度とサンプル数を加味しています。');
}
function renderRecommendation(){const r=currentRecommendation;if(!r)return;$('#recommended-move').innerHTML=`<span class="move-emoji">${E.ICONS[r.move]}</span><strong>${E.LABELS[r.move]}</strong>`;$('#confidence-bar').style.width=pct(r.confidence);$('#confidence-text').textContent=pct(r.confidence);$('#exp-win').textContent=pct(r.win);$('#exp-draw').textContent=pct(r.draw);$('#exp-loss').textContent=pct(r.loss);$('#recommend-reason').textContent=reasonText();$('#candidate-cards').innerHTML=r.candidates.map((c,i)=>`<div class="candidate ${i===0?'best':''}"><div class="candidate-head"><b>${E.ICONS[c.move]} ${E.LABELS[c.move]}</b><small>${i===0?'推奨':''}</small></div><small>勝 ${pct(c.win)} / あ ${pct(c.draw)} / 負 ${pct(c.loss)}</small></div>`).join('')}
function renderPredictions(){const box=$('#prediction-grid');box.innerHTML=currentRecommendation.predictions.map(p=>{const pr=profile(p.id);const topComponents=[...p.components].sort((a,b)=>b.weight-a.weight).slice(0,3).map(x=>x.name).join('・');return`<article class="prediction-card"><div class="prediction-head"><div class="prediction-name">${esc(pr.icon||'👤')} ${esc(pr.name)}</div><div class="confidence-chip">学習 ${p.sample}手 · 確信 ${pct(p.confidence)}</div></div>${E.MOVES.map(m=>`<div class="dist-row"><span>${E.ICONS[m]} ${E.LABELS[m]}</span><div class="dist-track"><i style="width:${pct(p.dist[m])}"></i></div><b>${pct(p.dist[m])}</b></div>`).join('')}<div class="prediction-note">主な判断: ${esc(topComponents||'データ不足・均等予測')}${p.specificSample?` · 対あなた ${p.specificSample}手`:''}</div></article>`}).join('')}
function renderMoveInputs(){const ids=match.mode==='ai'?[match.selfId]:match.ids;$('#move-inputs').innerHTML=ids.map((id,idx)=>{const p=profile(id),self=id===match.selfId;return`<div class="move-player" data-player="${esc(id)}"><div class="move-player-head"><b>${esc(p.icon||'👤')} ${esc(p.name)}</b><small>${self?'自分':''}</small></div><div class="move-options">${E.MOVES.map(m=>`<button class="move-btn ${match.mode!=='ai'&&self&&m===currentRecommendation.move?'active':''}" data-move="${m}"><span>${E.ICONS[m]}</span><small>${E.LABELS[m]}</small></button>`).join('')}</div></div>`}).join('');
 if(match.mode==='ai'){
   $$('#move-inputs .move-btn').forEach(button=>button.onclick=()=>recordRound(button.dataset.move));
   return;
 }
 const selected={};selected[match.selfId]=currentRecommendation.move;$$('.move-player').forEach(card=>{const id=card.dataset.player;card.querySelectorAll('.move-btn').forEach(btn=>btn.onclick=()=>{card.querySelectorAll('.move-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');selected[id]=btn.dataset.move;$('#record-round').disabled=match.ids.some(x=>!selected[x]);})});window.__jankenSelected=selected;$('#record-round').disabled=match.ids.some(x=>!selected[x])}
function renderMatch(){
 const versusAI=match.mode==='ai';
 for(const selector of ['.recommend-main','#candidate-cards','#prediction-grid','.record-actions'])$(selector).classList.toggle('hidden',versusAI);
 $('.recommend-head h3').textContent=versusAI?'AIと対戦':'次に出す手';
 $('.record-panel h3').textContent=versusAI?'出す手を選択':'2. 実際に出た手を記録';
 $('.record-panel .panel-head p').textContent=versusAI?'あなたが手を選ぶと、AIの手と勝敗を表示します。':'推奨手を出したあと、全員の手を選んで記録';
 $('#move-inputs').classList.toggle('versus-ai',versusAI);
 if(versusAI){
   for(const selector of ['#recommended-move','#candidate-cards','#prediction-grid'])$(selector).replaceChildren();
 }else{renderRecommendation();renderPredictions()}
 renderMoveInputs();$('#round-number').textContent=`ROUND ${match.rounds.length+1}`;renderHistory();renderSessionStats()}

function outcomeLabel(res,selfId){const r=res.results[selfId];if(r==='draw')return'あいこ';if(r==='win')return res.winners.length>1?'共同勝ち':'勝ち';return'負け'}
function clearResult(){clearTimeout(resultTimer);$('#round-result').classList.add('hidden')}
function recordRound(humanMove){
 if(!match)return;
 const versusAI=match.mode==='ai';
 const moves=versusAI?{[match.selfId]:humanMove,[AI_ID]:currentRecommendation.move}:{...window.__jankenSelected};
 if(match.ids.some(id=>!E.MOVES.includes(moves[id])))return;
 const resolution=E.resolveRound(moves),now=Date.now(),previous=match.rounds.at(-1);
 const predictions=Object.fromEntries(currentRecommendation.predictions.map(p=>[p.id,{dist:{...p.dist},confidence:p.confidence,top:p.top,sample:p.sample,specificSample:p.specificSample}]));
 const round={id:uid(),time:now,moves,resolution,predictions,recommendation:versusAI?null:{move:currentRecommendation.move,confidence:currentRecommendation.confidence,win:currentRecommendation.win,draw:currentRecommendation.draw,loss:currentRecommendation.loss,effectiveMode:currentRecommendation.effectiveMode,jointBlend:currentRecommendation.jointBlend,followed:moves[match.selfId]===currentRecommendation.move}};
 if (versusAI) {
   const order = ['rock','paper','scissors'];
   round.battlePrior = currentRecommendation.battlePrior;
   battleSession.observe(order.indexOf(moves[match.selfId]), order.indexOf(moves[AI_ID]));
   match.battleState = battleSession.exportState();
 }
 match.rounds.push(round);db.history.push({matchId:match.id,mode:match.mode,ids:[...match.ids],selfId:match.selfId,round});
 for(const id of match.ids){
   if(id===AI_ID)continue;
   const p=profile(id);p.events=p.events||[];const opponents=match.ids.filter(x=>x!==id),prevById={};for(const oid of opponents)if(previous?.moves?.[oid])prevById[oid]=previous.moves[oid];
   p.events.push({time:now,move:moves[id],result:resolution.results[id],context:{source:'match',matchId:match.id,roundId:round.id,mode:match.mode,roundIndex:match.rounds.length,participants:match.ids.length,participantIds:[...match.ids],opponentIds:opponents,opponentMoves:Object.fromEntries(opponents.map(oid=>[oid,moves[oid]])),opponentPrevMoves:Object.values(prevById),opponentPrevById:prevById}});
 }
 persistActiveMatch();
 clearResult();
 const label=outcomeLabel(resolution,match.selfId);$('#round-result').classList.remove('hidden');$('#round-result').innerHTML=`<b>${label}</b>　${match.ids.map(id=>`${esc(profile(id).name)} ${E.ICONS[moves[id]]}`).join('　')}`;
 computeRecommendation();renderMatch();renderAll();if(!versusAI)resultTimer=setTimeout(clearResult,2400);
}
$('#record-round').onclick=recordRound;

function renderHistory(){if(!match)return;const box=$('#match-history');if(!match.rounds.length){box.innerHTML='<div class="empty">まだラウンドがありません。</div>';return}box.innerHTML=[...match.rounds].reverse().map((r,rev)=>{const n=match.rounds.length-rev,res=outcomeLabel(r.resolution,match.selfId),cls=res.includes('勝')?'result-win':res==='あいこ'?'result-draw':'result-loss';return`<div class="history-item"><b>#${n}</b><div class="moves">${match.ids.map(id=>`${esc(profile(id).name)} ${E.ICONS[r.moves[id]]}`).join(' · ')}</div><span class="result-tag ${cls}">${res}</span></div>`}).join('')}
function renderSessionStats(){
 const rs=match?.rounds||[];let w=0,d=0,l=0,predN=0,predHit=0,followN=0,followW=0;
 for(const r of rs){const x=r.resolution.results[match.selfId];if(x==='win')w++;else if(x==='draw')d++;else l++;for(const oid of match.mode==='ai'?[match.selfId]:match.opponentIds){const p=r.predictions?.[oid],actual=r.moves?.[oid];if(p&&actual){predN++;if(p.top===actual)predHit++;}}if(r.recommendation?.followed){followN++;if(x==='win')followW++;}}
 $('#session-rounds').textContent=rs.length;$('#session-wins').textContent=w;$('#session-draws').textContent=d;$('#session-losses').textContent=l;$('#session-ai-hit').textContent=predN?pct(predHit/predN):'—';$('#session-follow').textContent=followN?pct(followW/followN):'—';$('#undo-round').disabled=!rs.length;
}
$('#undo-round').onclick=()=>{
 if(!match?.rounds.length)return;
 clearResult();
 const r=match.rounds.pop();
 db.history=db.history.filter(h=>h.round.id!==r.id);
 for(const id of match.ids){
   if(id===AI_ID)continue;
   const p=profile(id);
   const idx=p.events.findLastIndex?.(e=>e.context?.roundId===r.id||(e.context?.source==='match'&&!e.context?.roundId&&e.context?.matchId===match.id&&e.time===r.time&&e.move===r.moves[id]))??-1;
   if(idx>=0)p.events.splice(idx,1);
 }
 delete match.battleState;
 computeRecommendation();
 persistActiveMatch();
 renderMatch();
 renderAll();
};

function transitionDist(events,prev){const c={rock:.4,scissors:.4,paper:.4};let n=0;for(let i=1;i<events.length;i++)if(events[i-1]?.move===prev&&E.MOVES.includes(events[i]?.move)){c[events[i].move]++;n++;}return{n,dist:E.normalize(c)}}
function renderAnalytics(){
 const id=$('#analytics-profile').value||db.profiles[0]?.id,p=profile(id);if(!p){$('#analytics-content').innerHTML='';return}
 const rivalId=$('#analytics-rival')?.value||'',s=E.profileStats(p),ctx=rivalId?{selfId:rivalId}:{},pred=E.predictProfile(p,ctx),perf=E.predictionPerformance(db.history,id),top=pred.top;
 const maxMove=E.MOVES.reduce((a,b)=>s.counts[a]>=s.counts[b]?a:b),repeat=s.total>=3?(()=>{let r=0;for(let i=1;i<p.events.length;i++)if(p.events[i].move===p.events[i-1].move)r++;return r/(p.events.length-1)})():0;
 const insight=[`最も多い手は ${E.ICONS[maxMove]}${E.LABELS[maxMove]}（${pct(s.dist[maxMove])}）。`,`同じ手を続ける率は ${pct(repeat)}。`,`現在の次手予測は ${E.ICONS[top]}${E.LABELS[top]} ${pct(pred.dist[top])}、確信度 ${pct(pred.confidence)}。`];
 if(rivalId&&pred.specificSample)insight.push(`${profile(rivalId)?.name||'相手'}との直接対戦データ ${pred.specificSample}手を重点反映。`);
 if(s.total<8)insight.push('まだ学習データが少ないため、クイック学習や数ラウンド追加で安定します。');else if(pred.confidence>.58)insight.push('複数モデルが比較的一致しており、クセが見えやすい状態です。');else insight.push('モデル間の予測が割れており、読みづらい状態です。');
 const matchup=rivalId?E.matchupStats(db.history,id,rivalId):null;
 const matchupHtml=matchup?`<div class="analysis-card"><b>🤝 ${esc(profile(rivalId)?.name||'相手')}との相性</b><div class="mini-stat-grid"><div><span>対戦</span><b>${matchup.rounds}</b></div><div><span>勝ち</span><b>${matchup.win}</b></div><div><span>あいこ</span><b>${matchup.draw}</b></div><div><span>負け</span><b>${matchup.loss}</b></div></div></div>`:'';
 const transitions=E.MOVES.map(m=>{const t=transitionDist(p.events,m),tm=E.MOVES.reduce((a,b)=>t.dist[a]>=t.dist[b]?a:b);return`<div class="transition-row"><span>${E.ICONS[m]}の次</span><b>${E.ICONS[tm]} ${pct(t.dist[tm])}</b><small>${t.n}例</small></div>`}).join('');
 const models=pred.components.slice(0,7).map(c=>`<div class="model-row"><span>${esc(c.name)}</span><div class="model-meter"><i style="width:${Math.min(100,Math.round(c.weight/2.2*100))}%"></i></div><b>${c.n||0}</b></div>`).join('');
 $('#analytics-content').innerHTML=`<div class="analytics-top analytics-top-6"><div class="stat-box"><span>学習手数</span><b>${s.total}</b></div><div class="stat-box"><span>勝 / あ / 負</span><b>${s.results.win}/${s.results.draw}/${s.results.loss}</b></div><div class="stat-box"><span>AI TOP命中</span><b>${perf.n?pct(perf.topAccuracy):'—'}</b></div><div class="stat-box"><span>実手への平均確率</span><b>${perf.n?pct(perf.meanActualProbability):'—'}</b></div><div class="stat-box"><span>現在の確信度</span><b>${pct(pred.confidence)}</b></div><div class="stat-box"><span>対人専用データ</span><b>${pred.specificSample||0}</b></div></div><div class="analytics-grid"><div class="bar-list"><b>出し手の分布</b>${E.MOVES.map(m=>`<div class="bar-row"><span>${E.ICONS[m]} ${E.LABELS[m]}</span><div class="bar-track"><i style="width:${pct(s.dist[m])}"></i></div><b>${pct(s.dist[m])}</b></div>`).join('')}</div><div class="insight-list">${insight.map(x=>`<div class="insight">${esc(x)}</div>`).join('')}</div></div><div class="analytics-grid analytics-deep"><div class="analysis-card"><b>🔁 1手遷移</b>${transitions}</div><div class="analysis-card"><b>🧠 現在効いている学習モデル</b>${models||'<div class="muted small">データ不足</div>'}</div></div>${matchupHtml}<div class="small muted" style="margin-top:10px">AI精度は、この強化版で予測値を保存したラウンドから集計します。現在 ${perf.n}予測を検証済み。</div>`;
}
$('#analytics-profile').onchange=renderAnalytics;$('#analytics-rival').onchange=renderAnalytics;


function parseTrainSequence(text){
 let t=String(text||'').replaceAll('✊',' rock ').replaceAll('✌️',' scissors ').replaceAll('✌',' scissors ').replaceAll('🖐️',' paper ').replaceAll('🖐',' paper ').replaceAll('グー',' rock ').replaceAll('ぐー',' rock ').replaceAll('チョキ',' scissors ').replaceAll('ちょき',' scissors ').replaceAll('パー',' paper ').replaceAll('ぱー',' paper ');
 return t.split(/[\s,、>→|/]+/).map(x=>x.trim().toLowerCase()).filter(Boolean).map(x=>x==='r'||x==='g'||x==='rock'?'rock':x==='s'||x==='c'||x==='scissors'||x==='choki'?'scissors':x==='p'||x==='paper'?'paper':null).filter(Boolean);
}
function updateTrainPreview(){const seq=parseTrainSequence($('#train-sequence')?.value);if($('#train-preview'))$('#train-preview').textContent=`${seq.length}手 認識`}
$('#quick-train').onclick=()=>{$('#train-sequence').value='';renderSelects();updateTrainPreview();$('#train-dialog').showModal()};
$$('.train-cancel').forEach(b=>b.onclick=()=>$('#train-dialog').close());$('#train-sequence').oninput=updateTrainPreview;
$('#train-form').addEventListener('submit',e=>{e.preventDefault();const p=profile($('#train-profile').value),seq=parseTrainSequence($('#train-sequence').value);if(!p||!seq.length)return alert('認識できる手を入力してください。');const batch=uid(),base=Date.now()-seq.length;for(let i=0;i<seq.length;i++)p.events.push({time:base+i,move:seq[i],result:null,context:{source:'manual',trainingBatch:batch,participants:0,opponentIds:[]}});localStorage.setItem(KEY,JSON.stringify(db));$('#train-dialog').close();renderAll();});

$('#export-data').onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`janken-ai-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('#import-data').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const x=normalizeData(JSON.parse(await f.text()));if(!x)throw Error('形式が違います');if(!confirm('現在のデータを読み込んだバックアップで置き換えますか？'))return;db=x;db.activeMatch=null;ensureSeeds();localStorage.setItem(KEY,JSON.stringify(db));match=null;$('#setup-panel').classList.remove('hidden');$('#match-area').classList.add('hidden');renderAll()}catch(err){alert('読み込み失敗: '+err.message)}e.target.value=''};

function setTheme(t){db.settings=db.settings||{};db.settings.theme=t;document.documentElement.dataset.theme=t;$('#theme-toggle').textContent=t==='dark'?'☀️':'🌙';localStorage.setItem(KEY,JSON.stringify(db))}
$('#theme-toggle').onclick=()=>setTheme((db.settings?.theme||'dark')==='dark'?'light':'dark');setTheme(db.settings?.theme||'dark');

function restoreActiveMatch(){
 const m=db.activeMatch;if(!validActiveMatch(m)){db.activeMatch=null;localStorage.setItem(KEY,JSON.stringify(db));return;}
 match=m;selectMode(m.mode);
 $('#self-profile').value=m.selfId;if(m.mode!=='ai')$('#opponent-a').value=m.opponentIds[0];if(m.opponentIds?.[1])$('#opponent-b').value=m.opponentIds[1];$('#ai-mode').value=m.aiMode||'adaptive';
 $('#setup-panel').classList.add('hidden');$('#match-area').classList.remove('hidden');computeRecommendation();renderMatch();
}

function exportSessionCSV(){
 if(!match){alert('まず対戦を開始してください。');return}
 const names=match.ids.map(id=>profile(id)?.name||'参加者');
 const headers=['ラウンド','日時',...names,'自分の結果','AI推奨','推奨採用'];
 const rows=match.rounds.map((r,i)=>[
  i+1,new Date(r.time).toLocaleString('ja-JP'),
  ...match.ids.map(id=>E.LABELS[r.moves?.[id]]||''),
  outcomeLabel(r.resolution,match.selfId),
  E.LABELS[r.recommendation?.move]||'',
  r.recommendation?.followed?'はい':'いいえ'
 ]);
 const cell=v=>{let value=String(v??'');if(/^[=+\-@\t\r]/.test(value))value="'"+value;return '"'+value.replaceAll('"','""')+'"'};
 const csv='\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='janken-session-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
document.getElementById('export-session')?.addEventListener('click',exportSessionCSV);
window.render_game_to_text=()=>JSON.stringify({mode:match?.mode||gameMode,active:Boolean(match),rounds:match?.rounds.length||0,
 recommendation:match?.mode==='ai'?undefined:currentRecommendation?.move,profiles:db.profiles.length,recordReady:!$('#record-round').disabled});
renderAll();restoreActiveMatch();
})();
