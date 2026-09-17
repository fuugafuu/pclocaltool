'use strict';
(() => {
const E=window.JankenEngine,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='pclocaltool_janken_ai_v1';
const COLORS=['#6aa8ff','#6fd9b6','#f5bb6b','#d58aff','#ff8398','#71d9f2'];
let db=load(), match=null, currentRecommendation=null;

function uid(){return crypto.randomUUID?.()||('p'+Date.now().toString(36)+Math.random().toString(36).slice(2))}
function fresh(){return{version:1,profiles:[],history:[],settings:{theme:'dark'},createdAt:Date.now()}}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&x.version===1)return x}catch{}return fresh()}
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function pct(n){return Math.round((+n||0)*100)+'%'}
function profile(id){return db.profiles.find(p=>p.id===id)}
function ensureSeeds(){if(db.profiles.length)return;db.profiles.push({id:uid(),name:'自分',icon:'🙂',note:'',color:COLORS[0],events:[],createdAt:Date.now()},{id:uid(),name:'対戦相手A',icon:'😎',note:'',color:COLORS[1],events:[],createdAt:Date.now()});localStorage.setItem(KEY,JSON.stringify(db))}
ensureSeeds();

function renderProfiles(){
 const list=$('#profile-list');list.innerHTML=db.profiles.map(p=>{const s=E.profileStats(p);return`<div class="profile-item"><div class="profile-icon" style="box-shadow:inset 0 0 0 1px ${p.color||COLORS[0]}55">${esc(p.icon||'👤')}</div><div class="profile-meta"><b>${esc(p.name)}</b><span>${s.total}手 学習済み</span></div><div class="profile-actions"><button data-edit="${p.id}" title="編集">✎</button><button data-delete="${p.id}" title="削除">×</button></div></div>`}).join('');
 $$('[data-edit]').forEach(b=>b.onclick=()=>openProfile(b.dataset.edit));$$('[data-delete]').forEach(b=>b.onclick=()=>deleteProfile(b.dataset.delete));
}
function fillSelect(sel,value){const opts=db.profiles.map(p=>`<option value="${p.id}" ${p.id===value?'selected':''}>${esc(p.icon||'👤')} ${esc(p.name)}</option>`).join('');sel.innerHTML=opts}
function renderSelects(){
 const vals={self:$('#self-profile').value,a:$('#opponent-a').value,b:$('#opponent-b').value,ana:$('#analytics-profile').value};
 fillSelect($('#self-profile'),vals.self||db.profiles[0]?.id);fillSelect($('#opponent-a'),vals.a||db.profiles[1]?.id||db.profiles[0]?.id);fillSelect($('#opponent-b'),vals.b||db.profiles[2]?.id||db.profiles[0]?.id);fillSelect($('#analytics-profile'),vals.ana||db.profiles[0]?.id);
}
function renderTotals(){const total=db.profiles.reduce((s,p)=>s+(p.events?.length||0),0);$('#total-events').textContent=total;$('#storage-pill').textContent=`LOCAL · ${db.profiles.length} profiles`}
function renderAll(){renderProfiles();renderSelects();renderTotals();renderAnalytics();renderSessionStats();}

function openProfile(id=null){const p=id?profile(id):null;$('#profile-dialog-title').textContent=p?'プロフィール編集':'プロフィール作成';$('#profile-id').value=p?.id||'';$('#profile-name').value=p?.name||'';$('#profile-icon').value=p?.icon||'';$('#profile-note').value=p?.note||'';$('#profile-dialog').showModal()}
function deleteProfile(id){if(match?.ids?.includes(id))return alert('対戦中のプロフィールは削除できません。');if(db.profiles.length<=2)return alert('最低2プロフィール必要です。');const p=profile(id);if(!confirm(`${p?.name||'このプロフィール'}を削除しますか？ 学習履歴も削除されます。`))return;db.profiles=db.profiles.filter(x=>x.id!==id);save()}
$('#profile-form').addEventListener('submit',e=>{e.preventDefault();const id=$('#profile-id').value,name=$('#profile-name').value.trim();if(!name)return;const icon=$('#profile-icon').value.trim()||'👤',note=$('#profile-note').value.trim();if(id){const p=profile(id);p.name=name;p.icon=icon;p.note=note}else db.profiles.push({id:uid(),name,icon,note,color:COLORS[db.profiles.length%COLORS.length],events:[],createdAt:Date.now()});localStorage.setItem(KEY,JSON.stringify(db));$('#profile-dialog').close();renderAll()});
$('#new-profile').onclick=()=>openProfile();$('.dialog-cancel').forEach(b=>b.onclick=()=>$('#profile-dialog').close());

let gameMode='duel';
$$('#mode-segment button').forEach(b=>b.onclick=()=>{gameMode=b.dataset.mode;$$('#mode-segment button').forEach(x=>x.classList.toggle('active',x===b));$('#opponent-b-wrap').classList.toggle('hidden',gameMode!=='trio')});

function startMatch(){
 const ids=gameMode==='duel'?[$('#self-profile').value,$('#opponent-a').value]:[$('#self-profile').value,$('#opponent-a').value,$('#opponent-b').value];
 if(new Set(ids).size!==ids.length){$('#setup-error').textContent='同じプロフィールを複数の席に選ぶことはできません。';return}
 $('#setup-error').textContent='';match={id:uid(),mode:gameMode,ids,selfId:ids[0],opponentIds:ids.slice(1),aiMode:$('#ai-mode').value,rounds:[],startedAt:Date.now()};$('#setup-panel').classList.add('hidden');$('#match-area').classList.remove('hidden');computeRecommendation();renderMatch();
}
function endMatch(){match=null;currentRecommendation=null;$('#setup-panel').classList.remove('hidden');$('#match-area').classList.add('hidden');renderAll()}
$('#start-match').onclick=startMatch;$('#end-match').onclick=endMatch;

function contextForOpponent(pid){
 const rounds=match?.rounds||[];const last=rounds.at(-1);return{profilePrevMove:last?.moves?.[pid],profilePrevResult:last?.resolution?.results?.[pid],userPrevMove:last?.moves?.[match.selfId]};
}
function computeRecommendation(){
 const preds=match.opponentIds.map(id=>({id,...E.predictProfile(profile(id),contextForOpponent(id))}));const rec=E.recommend(preds,match.aiMode);currentRecommendation={...rec,predictions:preds};
}
function reasonText(){
 const parts=currentRecommendation.predictions.map(p=>{const pr=profile(p.id);return`${pr.name}は ${E.ICONS[p.top]}${E.LABELS[p.top]} 予測 ${pct(p.dist[p.top])}（確信度 ${pct(p.confidence)}）`});return parts.join(' ／ ')+(currentRecommendation.confidence<.25?'。まだデータが少ないので予測は弱めです。':'。複数の学習特徴を合成して期待値が最大の手を選んでいます。')
}
function renderRecommendation(){const r=currentRecommendation;if(!r)return;$('#recommended-move').innerHTML=`<span class="move-emoji">${E.ICONS[r.move]}</span><strong>${E.LABELS[r.move]}</strong>`;$('#confidence-bar').style.width=pct(r.confidence);$('#confidence-text').textContent=pct(r.confidence);$('#exp-win').textContent=pct(r.win);$('#exp-draw').textContent=pct(r.draw);$('#exp-loss').textContent=pct(r.loss);$('#recommend-reason').textContent=reasonText();$('#candidate-cards').innerHTML=r.candidates.map((c,i)=>`<div class="candidate ${i===0?'best':''}"><div class="candidate-head"><b>${E.ICONS[c.move]} ${E.LABELS[c.move]}</b><small>${i===0?'推奨':''}</small></div><small>勝 ${pct(c.win)} / あ ${pct(c.draw)} / 負 ${pct(c.loss)}</small></div>`).join('')}
function renderPredictions(){const box=$('#prediction-grid');box.innerHTML=currentRecommendation.predictions.map(p=>{const pr=profile(p.id);const topComponents=[...p.components].sort((a,b)=>b.weight-a.weight).slice(0,3).map(x=>x.name).join('・');return`<article class="prediction-card"><div class="prediction-head"><div class="prediction-name">${esc(pr.icon||'👤')} ${esc(pr.name)}</div><div class="confidence-chip">学習 ${p.sample}手 · 確信 ${pct(p.confidence)}</div></div>${E.MOVES.map(m=>`<div class="dist-row"><span>${E.ICONS[m]} ${E.LABELS[m]}</span><div class="dist-track"><i style="width:${pct(p.dist[m])}"></i></div><b>${pct(p.dist[m])}</b></div>`).join('')}<div class="prediction-note">主な判断: ${esc(topComponents||'データ不足・均等予測')}</div></article>`}).join('')}
function renderMoveInputs(){const ids=match.ids;$('#move-inputs').innerHTML=ids.map((id,idx)=>{const p=profile(id),self=id===match.selfId;return`<div class="move-player" data-player="${id}"><div class="move-player-head"><b>${esc(p.icon||'👤')} ${esc(p.name)}</b><small>${self?'自分':''}</small></div><div class="move-options">${E.MOVES.map(m=>`<button class="move-btn ${self&&m===currentRecommendation.move?'active':''}" data-move="${m}"><span>${E.ICONS[m]}</span><small>${E.LABELS[m]}</small></button>`).join('')}</div></div>`}).join('');
 const selected={};selected[match.selfId]=currentRecommendation.move;$$('.move-player').forEach(card=>{const id=card.dataset.player;card.querySelectorAll('.move-btn').forEach(btn=>btn.onclick=()=>{card.querySelectorAll('.move-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');selected[id]=btn.dataset.move;$('#record-round').disabled=match.ids.some(x=>!selected[x]);})});window.__jankenSelected=selected;$('#record-round').disabled=match.ids.some(x=>!selected[x])}
function renderMatch(){renderRecommendation();renderPredictions();renderMoveInputs();$('#round-number').textContent=`ROUND ${match.rounds.length+1}`;renderHistory();renderSessionStats()}

function outcomeLabel(res,selfId){const r=res.results[selfId];if(r==='draw')return'あいこ';if(r==='win')return res.winners.length>1?'共同勝ち':'勝ち';return'負け'}
function recordRound(){const moves={...window.__jankenSelected};if(match.ids.some(id=>!moves[id]))return;const resolution=E.resolveRound(moves);const now=Date.now(), round={id:uid(),time:now,moves,resolution,recommendation:{move:currentRecommendation.move,confidence:currentRecommendation.confidence,win:currentRecommendation.win,draw:currentRecommendation.draw,loss:currentRecommendation.loss}};match.rounds.push(round);db.history.push({matchId:match.id,mode:match.mode,ids:[...match.ids],selfId:match.selfId,round});
 for(const id of match.ids){const p=profile(id);p.events=p.events||[];p.events.push({time:now,move:moves[id],result:resolution.results[id],context:{opponentPrevMoves:(match.rounds.at(-2)?match.ids.filter(x=>x!==id).map(x=>match.rounds.at(-2).moves[x]):[]),participants:match.ids.length}})}
 localStorage.setItem(KEY,JSON.stringify(db));const label=outcomeLabel(resolution,match.selfId);$('#round-result').classList.remove('hidden');$('#round-result').innerHTML=`<b>${label}</b>　${match.ids.map(id=>`${esc(profile(id).name)} ${E.ICONS[moves[id]]}`).join('　')}`;computeRecommendation();renderMatch();renderAll();setTimeout(()=>$('#round-result').classList.add('hidden'),2400)}
$('#record-round').onclick=recordRound;

function renderHistory(){if(!match)return;const box=$('#match-history');if(!match.rounds.length){box.innerHTML='<div class="empty">まだラウンドがありません。</div>';return}box.innerHTML=[...match.rounds].reverse().map((r,rev)=>{const n=match.rounds.length-rev,res=outcomeLabel(r.resolution,match.selfId),cls=res.includes('勝')?'result-win':res==='あいこ'?'result-draw':'result-loss';return`<div class="history-item"><b>#${n}</b><div class="moves">${match.ids.map(id=>`${esc(profile(id).name)} ${E.ICONS[r.moves[id]]}`).join(' · ')}</div><span class="result-tag ${cls}">${res}</span></div>`}).join('')}
function renderSessionStats(){const rs=match?.rounds||[];let w=0,d=0,l=0;for(const r of rs){const x=r.resolution.results[match.selfId];if(x==='win')w++;else if(x==='draw')d++;else l++}$('#session-rounds').textContent=rs.length;$('#session-wins').textContent=w;$('#session-draws').textContent=d;$('#session-losses').textContent=l;$('#undo-round').disabled=!rs.length}
$('#undo-round').onclick=()=>{if(!match?.rounds.length)return;const r=match.rounds.pop();db.history=db.history.filter(h=>h.round.id!==r.id);for(const id of match.ids){const p=profile(id);const idx=p.events.findLastIndex?.(e=>e.time===r.time&&e.move===r.moves[id])??-1;if(idx>=0)p.events.splice(idx,1)}localStorage.setItem(KEY,JSON.stringify(db));computeRecommendation();renderMatch();renderAll()};

function renderAnalytics(){const id=$('#analytics-profile').value||db.profiles[0]?.id,p=profile(id);if(!p){$('#analytics-content').innerHTML='';return}const s=E.profileStats(p),pred=E.predictProfile(p,{}),top=pred.top;const maxMove=E.MOVES.reduce((a,b)=>s.counts[a]>=s.counts[b]?a:b);const repeat=s.total>=3?(()=>{let r=0;for(let i=1;i<p.events.length;i++)if(p.events[i].move===p.events[i-1].move)r++;return r/(p.events.length-1)})():0;const insight=[];insight.push(`最も多い手は ${E.ICONS[maxMove]}${E.LABELS[maxMove]}（${pct(s.dist[maxMove])}）。`);insight.push(`同じ手を続ける率は ${pct(repeat)}。`);insight.push(`現在の次手予測は ${E.ICONS[top]}${E.LABELS[top]} が ${pct(pred.dist[top])}。`);if(s.total<8)insight.push('まだ学習データが少ないため、数ラウンド追加すると予測が安定します。');else if(pred.confidence>.55)insight.push('手の偏りやパターンが比較的はっきり出ています。');else insight.push('手の分布が比較的均等で、読みづらいタイプです。');$('#analytics-content').innerHTML=`<div class="analytics-top"><div class="stat-box"><span>学習手数</span><b>${s.total}</b></div><div class="stat-box"><span>勝ち</span><b>${s.results.win}</b></div><div class="stat-box"><span>あいこ</span><b>${s.results.draw}</b></div><div class="stat-box"><span>負け</span><b>${s.results.loss}</b></div></div><div class="analytics-grid"><div class="bar-list"><b>出し手の分布</b>${E.MOVES.map(m=>`<div class="bar-row"><span>${E.ICONS[m]} ${E.LABELS[m]}</span><div class="bar-track"><i style="width:${pct(s.dist[m])}"></i></div><b>${pct(s.dist[m])}</b></div>`).join('')}</div><div class="insight-list">${insight.map(x=>`<div class="insight">${esc(x)}</div>`).join('')}</div></div>`}
$('#analytics-profile').onchange=renderAnalytics;

$('#export-data').onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`janken-ai-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('#import-data').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const x=JSON.parse(await f.text());if(x?.version!==1||!Array.isArray(x.profiles))throw Error('形式が違います');if(!confirm('現在のデータを読み込んだバックアップで置き換えますか？'))return;db=x;localStorage.setItem(KEY,JSON.stringify(db));match=null;$('#setup-panel').classList.remove('hidden');$('#match-area').classList.add('hidden');renderAll()}catch(err){alert('読み込み失敗: '+err.message)}e.target.value=''};

function setTheme(t){db.settings=db.settings||{};db.settings.theme=t;document.documentElement.dataset.theme=t;$('#theme-toggle').textContent=t==='dark'?'☀️':'🌙';localStorage.setItem(KEY,JSON.stringify(db))}
$('#theme-toggle').onclick=()=>setTheme((db.settings?.theme||'dark')==='dark'?'light':'dark');setTheme(db.settings?.theme||'dark');

renderAll();
})();