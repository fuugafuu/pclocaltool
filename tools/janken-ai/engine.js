'use strict';
(() => {
  const MOVES = ['rock','scissors','paper'];
  const LABELS = { rock:'グー', scissors:'チョキ', paper:'パー' };
  const ICONS = { rock:'✊', scissors:'✌️', paper:'🖐️' };
  const BEATS = { rock:'scissors', scissors:'paper', paper:'rock' };
  const LOSES_TO = { rock:'paper', scissors:'rock', paper:'scissors' };
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const emptyDist = ()=>({rock:1/3,scissors:1/3,paper:1/3});
  const normalize = obj => {
    const out = {rock:Math.max(0,+obj.rock||0),scissors:Math.max(0,+obj.scissors||0),paper:Math.max(0,+obj.paper||0)};
    const s = out.rock+out.scissors+out.paper;
    if(!s) return emptyDist();
    for(const m of MOVES) out[m] /= s;
    return out;
  };
  const addWeighted = (base, dist, w)=>{ for(const m of MOVES) base[m] += dist[m]*w; return base; };
  const counterMove = move => LOSES_TO[move];
  const moveResult = (a,b)=> a===b?'draw':BEATS[a]===b?'win':'loss';

  function resolveRound(movesById){
    const entries = Object.entries(movesById).filter(([,m])=>MOVES.includes(m));
    const uniq = [...new Set(entries.map(([,m])=>m))];
    const results = {};
    if(entries.length<2) return {kind:'invalid',results,winners:[],losers:[]};
    if(uniq.length===1 || uniq.length===3){
      for(const [id] of entries) results[id]='draw';
      return {kind:'draw',results,winners:[],losers:[]};
    }
    const [a,b] = uniq;
    const winningMove = BEATS[a]===b?a:b;
    const winners=[], losers=[];
    for(const [id,m] of entries){
      if(m===winningMove){results[id]='win';winners.push(id)}else{results[id]='loss';losers.push(id)}
    }
    return {kind:'decided',winningMove,results,winners,losers};
  }

  function entropy(dist){
    let e=0; for(const m of MOVES){const p=dist[m]; if(p>0)e-=p*Math.log(p)/Math.log(3)} return clamp(e,0,1);
  }

  const topMove = d => MOVES.reduce((a,b)=>d[a]>=d[b]?a:b);

  function distFrom(events, filter=()=>true, decay=1, prior=.55){
    const c={rock:prior,scissors:prior,paper:prior}; let n=0,w=1;
    for(let i=events.length-1;i>=0;i--){ const e=events[i]; if(filter(e,i)&&MOVES.includes(e.move)){ c[e.move]+=w; n++; w*=decay; if(decay<1&&w<.02) break; } }
    return {dist:normalize(c),n};
  }
  function componentWeight(base,n,d,target=8){ const sample=.25+.75*clamp(n/target,0,1), info=.62+.72*(1-entropy(d)); return base*sample*info; }
  function relation(prev,next){ if(!prev||!next)return null; if(next===prev)return 'repeat'; if(next===LOSES_TO[prev])return 'counter'; return 'other'; }
  function moveFromRelation(prev,r){ return r==='repeat'?prev:r==='counter'?LOSES_TO[prev]:BEATS[prev]; }
  function relationModel(events,lastMove){
    if(!lastMove||events.length<2)return null; const c={repeat:.5,counter:.5,other:.5}; let n=0;
    for(let i=1;i<events.length;i++){ const r=relation(events[i-1].move,events[i].move); if(r){c[r]++;n++;} }
    if(!n)return null; const total=c.repeat+c.counter+c.other,d={rock:0,scissors:0,paper:0};
    for(const r of Object.keys(c)) d[moveFromRelation(lastMove,r)]+=c[r]/total;
    return {dist:normalize(d),n};
  }
  function ngramModel(events,order){
    if(events.length<=order)return null; const seq=events.slice(-order).map(e=>e.move); if(seq.some(m=>!MOVES.includes(m)))return null;
    const c={rock:.45,scissors:.45,paper:.45}; let n=0;
    for(let i=order;i<events.length;i++){ let ok=true; for(let j=0;j<order;j++) if(events[i-order+j]?.move!==seq[j]){ok=false;break;} if(ok&&MOVES.includes(events[i].move)){c[events[i].move]++;n++;} }
    return n?{dist:normalize(c),n,seq}:null;
  }
  function specificEvents(events,context){ if(!context.selfId)return []; return events.filter(e=>Array.isArray(e.context?.opponentIds)&&e.context.opponentIds.includes(context.selfId)); }
  function makeComponent(base,name,model,target=8,extra=1){ if(!model||!model.n)return null; return {name,dist:model.dist,n:model.n,weight:componentWeight(base,model.n,model.dist,target)*extra}; }

  function jointDistribution(history,aId,bId){
    const c={}; for(const a of MOVES)for(const b of MOVES)c[`${a}|${b}`]=.18; let n=0,w=1;
    for(let i=(history?.length||0)-1;i>=0;i--){ const h=history[i],ma=h?.round?.moves?.[aId],mb=h?.round?.moves?.[bId]; if(MOVES.includes(ma)&&MOVES.includes(mb)){c[`${ma}|${mb}`]+=w;n++;w*=.965;if(w<.04)break;} }
    const total=Object.values(c).reduce((a,b)=>a+b,0); for(const k in c)c[k]/=total;
    return {pairs:c,n,blend:clamp(n/28,0,.72)};
  }
  function predictionPerformance(history,profileId=null){
    let n=0,topHits=0,probSum=0,brier=0;
    for(const h of history||[]){ const preds=h?.round?.predictions||{},ids=profileId?[profileId]:Object.keys(preds); for(const id of ids){ const p=preds[id],actual=h?.round?.moves?.[id]; if(!p||!MOVES.includes(actual))continue; n++; if(p.top===actual)topHits++; probSum+=p.dist?.[actual]||0; for(const m of MOVES){const y=m===actual?1:0;brier+=Math.pow((p.dist?.[m]||0)-y,2);} } }
    return {n,topAccuracy:n?topHits/n:0,meanActualProbability:n?probSum/n:0,brier:n?brier/n:0};
  }
  function matchupStats(history,aId,bId){
    let rounds=0,win=0,draw=0,loss=0; const aMoves={rock:0,scissors:0,paper:0},bMoves={rock:0,scissors:0,paper:0};
    for(const h of history||[]){ const r=h?.round;if(!r?.moves?.[aId]||!r?.moves?.[bId])continue; rounds++; aMoves[r.moves[aId]]++;bMoves[r.moves[bId]]++; const x=r.resolution?.results?.[aId]; if(x==='win')win++;else if(x==='draw')draw++;else loss++; }
    return {rounds,win,draw,loss,aDist:normalize(aMoves),bDist:normalize(bMoves)};
  }

  function weightedFreq(events, getMove, decay=.88){
    const c={rock:.55,scissors:.55,paper:.55};
    let w=1;
    for(let i=events.length-1;i>=0;i--){ const m=getMove(events[i]); if(MOVES.includes(m)) c[m]+=w; w*=decay; if(w<.025) break; }
    return normalize(c);
  }

  function conditionalFreq(events, predicate, getMove, limit=120){
    const c={rock:.45,scissors:.45,paper:.45}; let n=0;
    for(let i=events.length-1;i>=0 && n<limit;i--){ const e=events[i]; if(!predicate(e,i)) continue; const m=getMove(e); if(MOVES.includes(m)){ c[m]+=1; n++; } }
    return {dist:normalize(c), n};
  }

  function predictProfile(profile, context={}){
    const events=Array.isArray(profile?.events)?profile.events:[];
    if(!events.length)return {dist:emptyDist(),confidence:.06,sample:0,specificSample:0,components:[],top:'rock',agreement:1/3};
    const comps=[],push=x=>x&&comps.push(x);
    push(makeComponent(.9,'全体傾向',distFrom(events,()=>true,.985,.8),28));
    push(makeComponent(1.55,'直近傾向',distFrom(events,()=>true,.80,.58),10));
    if(context.matchId) push(makeComponent(1.65,'この試合の傾向',distFrom(events,e=>e.context?.matchId===context.matchId,.86,.45),5));
    if(context.participants) push(makeComponent(.62,context.participants===3?'3人戦での傾向':'1対1での傾向',distFrom(events,e=>e.context?.participants===context.participants,.94,.5),12));
    const spec=specificEvents(events,context);
    if(spec.length) push(makeComponent(1.45,'あなたとの対戦傾向',distFrom(spec,()=>true,.93,.52),8,1+Math.min(.25,spec.length/80)));
    const lastOwn=context.profilePrevMove||events.at(-1)?.move;
    if(lastOwn){
      push(makeComponent(1.35,`${LABELS[lastOwn]}の次`,distFrom(events,(e,i)=>i>0&&events[i-1]?.move===lastOwn,.96,.42),6));
      push(makeComponent(.78,'手の変え方',relationModel(events,lastOwn),10));
    }
    const userPrev=context.userPrevMove;
    if(userPrev){
      push(makeComponent(1.15,`相手が${LABELS[userPrev]}の次`,distFrom(events,e=>e.context?.opponentPrevMoves?.includes?.(userPrev),.95,.42),6));
      if(context.selfId) push(makeComponent(1.72,`あなたが${LABELS[userPrev]}の次`,distFrom(events,e=>e.context?.opponentPrevById?.[context.selfId]===userPrev,.96,.4),5));
    }
    const lastResult=context.profilePrevResult||events.at(-1)?.result;
    if(lastResult){ const name=lastResult==='win'?'勝った後':lastResult==='loss'?'負けた後':'あいこの後'; push(makeComponent(1.0,name,distFrom(events,(e,i)=>i>0&&events[i-1]?.result===lastResult,.96,.43),7)); }
    for(const order of [2,3,4]) push(makeComponent(order===2?1.15:order===3?1.38:1.55,`${order}手パターン`,ngramModel(events,order),order===2?5:3));
    const last=events.at(-1)?.move; let streak=0; for(let i=events.length-1;i>=0&&events[i].move===last;i--)streak++;
    if(last&&streak>=2){ const d={rock:.2,scissors:.2,paper:.2};d[last]=1.2+Math.min(1.4,(streak-2)*.3);comps.push({name:`${streak}連続中`,dist:normalize(d),n:streak,weight:.52+Math.min(.45,streak*.08)}); }
    const base={rock:0,scissors:0,paper:0};let totalW=0;for(const c of comps){addWeighted(base,c.dist,c.weight);totalW+=c.weight;}
    const dist=normalize(base),top=topMove(dist),votes={rock:0,scissors:0,paper:0};for(const c of comps)votes[topMove(c.dist)]+=c.weight;
    const agreement=totalW?Math.max(...MOVES.map(m=>votes[m]))/totalW:1/3,certainty=1-entropy(dist),sample=events.length,specificSample=spec.length;
    const confidence=clamp(.05+Math.min(.34,sample/70)+certainty*.30+agreement*.20+Math.min(.11,specificSample/45),.05,.97);
    return {dist,confidence,sample,specificSample,components:comps.sort((a,b)=>b.weight-a.weight),top,agreement};
  }
  function expectedForMove(ourMove, opponentPredictions, mode='balanced', joint=null){
    const preds=opponentPredictions.map(p=>p.dist||p);let win=0,draw=0,loss=0;
    if(preds.length===1){
      for(const m of MOVES){const p=preds[0][m],r=moveResult(ourMove,m);if(r==='win')win+=p;else if(r==='draw')draw+=p;else loss+=p;}
    }else{
      for(const a of MOVES)for(const b of MOVES){const independent=preds[0][a]*preds[1][b],jp=joint?.pairs?.[`${a}|${b}`]??independent,blend=joint?.blend||0,p=independent*(1-blend)+jp*blend;const r=resolveRound({self:ourMove,a,b}).results.self;if(r==='win')win+=p;else if(r==='draw')draw+=p;else loss+=p;}
      const t=win+draw+loss;if(t){win/=t;draw/=t;loss/=t;}
    }
    let utility;if(mode==='safe')utility=win+draw*.62-loss;else if(mode==='aggressive')utility=win*1.26+draw*.03-loss*.66;else utility=win+draw*.2-loss*.8;
    return {move:ourMove,win,draw,loss,utility};
  }
  function recommend(opponentPredictions, mode='balanced', joint=null, seed=0){
    const avg=opponentPredictions.length?opponentPredictions.reduce((x,p)=>x+(p.confidence||0),0)/opponentPredictions.length:0;
    const effectiveMode=mode==='adaptive'?(avg<.27?'safe':avg>.58?'aggressive':'balanced'):mode;
    let candidates=MOVES.map(m=>expectedForMove(m,opponentPredictions,effectiveMode,joint)).sort((a,b)=>b.utility-a.utility||b.win-a.win||a.loss-b.loss);
    if(avg<.16&&Math.abs(candidates[0].utility-candidates[1].utility)<.035){const chosen=MOVES[Math.abs(Number(seed)||0)%3],i=candidates.findIndex(x=>x.move===chosen);if(i>0)candidates=[candidates[i],...candidates.slice(0,i),...candidates.slice(i+1)];}
    const best=candidates[0],gap=best.utility-(candidates[1]?.utility??best.utility);
    return {...best,candidates,confidence:clamp(avg*.72+Math.min(.28,Math.max(0,gap)*.9),.04,.97),effectiveMode,jointBlend:joint?.blend||0};
  }
  function profileStats(profile){
    const events=profile?.events||[]; const counts={rock:0,scissors:0,paper:0}; const results={win:0,loss:0,draw:0};
    for(const e of events){if(MOVES.includes(e.move))counts[e.move]++; if(results[e.result]!=null)results[e.result]++;}
    const total=events.length; return {total,counts,dist:normalize({rock:counts.rock+.001,scissors:counts.scissors+.001,paper:counts.paper+.001}),results};
  }

  window.JankenEngine={MOVES,LABELS,ICONS,BEATS,LOSES_TO,counterMove,moveResult,resolveRound,predictProfile,recommend,profileStats,normalize,jointDistribution,predictionPerformance,matchupStats,entropy};
})();