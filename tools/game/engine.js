/* Standalone deterministic falling-block rules, shared by UI, AI worker and tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StackEngine=api;})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const COLS=10, ROWS=22, HIDDEN=2;
  const SHAPES={I:[[0,1],[1,1],[2,1],[3,1]],O:[[1,0],[2,0],[1,1],[2,1]],T:[[1,0],[0,1],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]]};
  const TYPES=Object.keys(SHAPES);
  // SRS offsets expressed in screen coordinates (positive y points down).
  const JL={ '0>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'1>0':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'1>2':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'2>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'2>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'3>2':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'3>0':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'0>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]]};
  const IK={ '0>1':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],'1>0':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],'1>2':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],'2>1':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],'2>3':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],'3>2':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],'3>0':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],'0>3':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]]};
  function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
  function cells(piece){let out=SHAPES[piece.type];const size=piece.type==='I'?4:3;if(piece.type!=='O')for(let i=0;i<piece.r;i++)out=out.map(([x,y])=>[size-1-y,x]);return out.map(([x,y])=>[x+piece.x,y+piece.y]);}
  function empty(){return Array.from({length:ROWS},()=>Array(COLS).fill(''));}
  function fits(board,p){return cells(p).every(([x,y])=>x>=0&&x<COLS&&y>=0&&y<ROWS&&!board[y][x]);}
  function spawn(type){return {type,x:3,y:1,r:0,lastRotate:false,kick:0};}
  function move(board,p,dx,dy){const q={...p,x:p.x+dx,y:p.y+dy,lastRotate:false};return fits(board,q)?q:null;}
  function rotate(board,p,dir){if(p.type==='O')return null;const r=(p.r+dir+4)%4;const tests=(p.type==='I'?IK:JL)[p.r+'>'+r];for(let k=0;k<tests.length;k++){const [dx,dy]=tests[k],q={...p,x:p.x+dx,y:p.y+dy,r,lastRotate:true,kick:k};if(fits(board,q))return q;}return null;}
  function ghost(board,p){let q={...p};while(fits(board,{...q,y:q.y+1}))q.y++;return q;}
  function spin(board,p){if(p.type!=='T'||!p.lastRotate)return '';const x=p.x+1,y=p.y+1;const full=(dx,dy)=>x+dx<0||x+dx>=COLS||y+dy<0||y+dy>=ROWS||!!board[y+dy][x+dx];const corners=[full(-1,-1),full(1,-1),full(-1,1),full(1,1)];if(corners.filter(Boolean).length<3)return '';const front=[[0,1],[1,3],[2,3],[0,2]][p.r];return (corners[front[0]]&&corners[front[1]])||p.kick===4?'full':'mini';}
  function place(board,p){const next=board.map(row=>row.slice()),s=spin(board,p);for(const [x,y] of cells(p))next[y][x]=p.type;const cleared=[];for(let y=0;y<ROWS;y++)if(next[y].every(Boolean))cleared.push(y);const kept=next.filter((_,y)=>!cleared.includes(y));while(kept.length<ROWS)kept.unshift(Array(COLS).fill(''));return {board:kept,lines:cleared.length,cleared,spin:s,perfect:cleared.length>0&&kept.every(row=>row.every(x=>!x))};}
  function badgeLevel(bits){return bits>=30?4:bits>=14?3:bits>=6?2:bits>=2?1:0;}
  function attack(lines,spinType,combo,b2b,perfect,bits=0){if(!lines)return 0;let base=spinType==='full'?[0,2,4,6][lines]:spinType==='mini'?[0,0,1][lines]:[0,0,1,2,4][lines];const cb=[0,1,1,2,2,3,3,4,4,4,5][Math.min(10,Math.max(0,combo))];base=(base||0)+cb+(b2b?1:0)+(perfect?4:0);return Math.min(20,Math.floor(base*(1+badgeLevel(bits)*.25)));}
  class Player{
    constructor(seed=1){this.board=empty();this.random=rng(seed);this.garbageRandom=rng(seed^0x9e3779b9);this.queue=[];this.hold='';this.holdUsed=false;this.active=null;this.dead=false;this.combo=-1;this.b2b=false;this.lines=0;this.score=0;this.pieces=0;this.sent=0;this.cancelled=0;this.badgeBits=0;this.pending=[];this.last=null;this.fill();this.spawn();}
    fill(){while(this.queue.length<14){const bag=TYPES.slice();for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}this.queue.push(...bag);}}
    spawn(){this.fill();this.active=spawn(this.queue.shift());this.holdUsed=false;if(!fits(this.board,this.active))this.dead=true;}
    swap(){if(this.dead||this.holdUsed)return false;const type=this.active.type;if(this.hold){this.active=spawn(this.hold);this.hold=type;if(!fits(this.board,this.active))this.dead=true;}else{this.hold=type;this.spawn();}this.holdUsed=true;return true;}
    receive(amount,now,delay=3000){const count=this.pending.reduce((n,p)=>n+p.lines,0);amount=Math.min(12-count,amount);if(amount>0)this.pending.push({lines:amount,readyAt:now+delay,hole:Math.floor(this.garbageRandom()*10)});return amount;}
    lock(now=0){if(this.dead)return null;const p=this.active;if(!fits(this.board,p)){this.dead=true;return null;}const result=place(this.board,p);this.board=result.board;this.pieces++;this.lines+=result.lines;this.combo=result.lines?this.combo+1:-1;const difficult=result.lines>0&&(p.type==='T'&&!!result.spin||result.lines===4);const chained=difficult&&this.b2b;if(result.lines)this.b2b=!!difficult;let outgoing=attack(result.lines,result.spin,this.combo,chained,result.perfect,this.badgeBits);const produced=outgoing;let cancelled=0;while(outgoing&&this.pending.length){const packet=this.pending[0],n=Math.min(outgoing,packet.lines);outgoing-=n;packet.lines-=n;cancelled+=n;if(!packet.lines)this.pending.shift();}this.cancelled+=cancelled;this.sent+=outgoing;
      const base=result.spin==='full'?[400,800,1200,1600][result.lines]:[0,100,300,500,800][result.lines];this.score+=(base||0)*(chained?1.5:1)*(1+Math.floor(this.lines/10))+Math.max(0,this.combo)*50+(result.perfect?2000:0);
      let raised=0;
      // A line clear defers incoming garbage; no-clear locks raise the ready packet.
      if(!result.lines&&this.pending.length&&this.pending[0].readyAt<=now){const packet=this.pending.shift();raised=packet.lines;for(let i=0;i<raised;i++){if(this.board.shift().some(Boolean))this.dead=true;this.board.push(Array.from({length:10},(_,x)=>x===packet.hole?'':'G'));}}
      if(!result.lines&&cells(p).every(([,y])=>y<HIDDEN))this.dead=true;
      this.last={...result,locked:{...p},outgoing,produced,cancelled,raised,combo:this.combo,b2b:chained,type:p.type};if(!this.dead)this.spawn();return this.last;
    }
  }
  // Each competitor gets an independent 7-BAG stream. Preserve reproducible seeds
  // while preventing a visually identical opening piece in a new match.
  function createDuelPlayers(seed=1){
    const first=new Player(seed>>>0||1);
    const secondSeed=((seed>>>0)^0x9e3779b9)>>>0;
    const second=new Player(secondSeed);
    if(first.active.type===second.active.type){
      // Swap within the *first* bag: still exactly one of each tetromino.
      const idx=second.queue.slice(0,6).findIndex(type=>type!==first.active.type);
      const next=second.queue[idx];
      second.queue[idx]=second.active.type;
      second.active=spawn(next);
    }
    return [first,second];
  }
  // Reachability search produces an executable route, including SRS tucks/spins.
  function placements(board,active,maxNodes=6500){
    const todo=[],seen=new Set(),out=[],landings=new Set();
    function enqueue(p,path){if(!p||!fits(board,p))return;const key=[p.x,p.y,p.r,+p.lastRotate,p.kick===4?1:0].join(',');if(seen.has(key))return;seen.add(key);todo.push({p,path});}
    enqueue({...active},[]);
    for(let head=0;head<todo.length&&head<maxNodes;head++){
      const {p,path}=todo[head],g=ghost(board,p),lk=[g.x,g.y,g.r,spin(board,g)].join(',');
      if(!landings.has(lk)){landings.add(lk);out.push({p:g,path:[...path,'drop']});}
      for(const [action,q] of [['left',move(board,p,-1,0)],['right',move(board,p,1,0)],['cw',rotate(board,p,1)],['ccw',rotate(board,p,-1)],['down',move(board,p,0,1)]])enqueue(q,[...path,action]);
    }
    return out;
  }
  return {COLS,ROWS,HIDDEN,TYPES,SHAPES,Player,createDuelPlayers,rng,cells,empty,fits,spawn,move,rotate,ghost,spin,place,attack,badgeLevel,placements};
});
