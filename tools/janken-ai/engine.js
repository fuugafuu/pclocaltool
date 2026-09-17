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
    const events = Array.isArray(profile?.events)?profile.events:[];
    if(!events.length) return {dist:emptyDist(),confidence:0.08,sample:0,components:[],top:'rock'};
    const base={rock:0,scissors:0,paper:0}; const components=[];
    const overall = weightedFreq(events,e=>e.move,.97); addWeighted(base,overall,1.0); components.push({name:'全体傾向',weight:1.0,dist:overall});
    const recent = weightedFreq(events,e=>e.move,.79); addWeighted(base,recent,1.45); components.push({name:'直近傾向',weight:1.45,dist:recent});

    const lastOwn = context.profilePrevMove || events.at(-1)?.move;
    if(lastOwn){
      const cf = conditionalFreq(events,(e,i)=>i>0 && events[i-1]?.move===lastOwn,e=>e.move);
      if(cf.n){ const w=clamp(cf.n/5,.45,1.55); addWeighted(base,cf.dist,w); components.push({name:`${LABELS[lastOwn]}の次`,weight:w,dist:cf.dist,n:cf.n}); }
    }

    const userPrev = context.userPrevMove;
    if(userPrev){
      const cf = conditionalFreq(events,e=>e.context?.opponentPrevMoves?.includes(userPrev),e=>e.move);
      if(cf.n){ const w=clamp(cf.n/4,.5,1.65); addWeighted(base,cf.dist,w); components.push({name:`相手が${LABELS[userPrev]}の次`,weight:w,dist:cf.dist,n:cf.n}); }
    }

    const lastResult = context.profilePrevResult || events.at(-1)?.result;
    if(lastResult){
      const cf = conditionalFreq(events,(e,i)=>i>0 && events[i-1]?.result===lastResult,e=>e.move);
      if(cf.n){ const w=clamp(cf.n/6,.35,1.15); addWeighted(base,cf.dist,w); components.push({name:`${lastResult==='win'?'勝ち':lastResult==='loss'?'負け':'あいこ'}後`,weight:w,dist:cf.dist,n:cf.n}); }
    }

    if(events.length>=2){
      const pair = events.slice(-2).map(e=>e.move).join('>');
      const cf = conditionalFreq(events,(e,i)=>i>1 && `${events[i-2]?.move}>${events[i-1]?.move}`===pair,e=>e.move);
      if(cf.n){ const w=clamp(cf.n/4,.35,1.2); addWeighted(base,cf.dist,w); components.push({name:'2手パターン',weight:w,dist:cf.dist,n:cf.n}); }
    }

    const last=events.at(-1)?.move;
    let streak=0; for(let i=events.length-1;i>=0 && events[i].move===last;i--) streak++;
    if(last && streak>=2){
      const repeat={rock:.15,scissors:.15,paper:.15}; repeat[last]=1.35+Math.min(1.2,(streak-2)*.25); const d=normalize(repeat);
      addWeighted(base,d,.55); components.push({name:`${streak}連続`,weight:.55,dist:d});
    }

    const dist=normalize(base);
    const top=MOVES.reduce((a,b)=>dist[a]>=dist[b]?a:b);
    const sample=events.length;
    const certainty=1-entropy(dist);
    const confidence=clamp(.08 + Math.min(.48,sample/45) + certainty*.44, .08, .96);
    return {dist,confidence,sample,components,top};
  }

  function expectedForMove(ourMove, opponentPredictions, mode='balanced'){
    const preds = opponentPredictions.map(p=>p.dist||p);
    if(preds.length===1){
      let win=0,draw=0,loss=0;
      for(const m of MOVES){const p=preds[0][m]; const r=moveResult(ourMove,m); if(r==='win')win+=p; else if(r==='draw')draw+=p; else loss+=p;}
      const utility = mode==='safe' ? win + draw*.55 - loss*.9 : mode==='aggressive' ? win*1.2 + draw*.05 - loss*.65 : win + draw*.18 - loss*.78;
      return {move:ourMove,win,draw,loss,utility};
    }
    let win=0,draw=0,loss=0;
    for(const a of MOVES) for(const b of MOVES){
      const p=preds[0][a]*preds[1][b];
      const rr=resolveRound({self:ourMove,a,b}).results.self;
      if(rr==='win')win+=p; else if(rr==='draw')draw+=p; else loss+=p;
    }
    const utility = mode==='safe' ? win + draw*.52 - loss*.92 : mode==='aggressive' ? win*1.22 + draw*.03 - loss*.64 : win + draw*.16 - loss*.8;
    return {move:ourMove,win,draw,loss,utility};
  }

  function recommend(opponentPredictions, mode='balanced'){
    const candidates=MOVES.map(m=>expectedForMove(m,opponentPredictions,mode)).sort((a,b)=>b.utility-a.utility || b.win-a.win || a.loss-b.loss);
    const best=candidates[0];
    const gap=best.utility-(candidates[1]?.utility??best.utility);
    const avgConf=opponentPredictions.length?opponentPredictions.reduce((s,p)=>s+(p.confidence||0),0)/opponentPredictions.length:0;
    return {...best,candidates,confidence:clamp(avgConf*.72 + Math.min(.28,Math.max(0,gap)*.9),.05,.97)};
  }

  function profileStats(profile){
    const events=profile?.events||[]; const counts={rock:0,scissors:0,paper:0}; const results={win:0,loss:0,draw:0};
    for(const e of events){if(MOVES.includes(e.move))counts[e.move]++; if(results[e.result]!=null)results[e.result]++;}
    const total=events.length; return {total,counts,dist:normalize({rock:counts.rock+.001,scissors:counts.scissors+.001,paper:counts.paper+.001}),results};
  }

  window.JankenEngine={MOVES,LABELS,ICONS,BEATS,LOSES_TO,counterMove,moveResult,resolveRound,predictProfile,recommend,profileStats,normalize};
})();