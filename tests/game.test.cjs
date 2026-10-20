const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../tools/game/engine.js'),A=require('../tools/game/ai.js');
function tetrisWell(){const b=E.empty();for(let y=18;y<22;y++)b[y]=Array.from({length:10},(_,x)=>x===5?'':'G');return b;}
test('deterministic 7-bag and independent garbage randomness',()=>{const a=new E.Player(42),b=new E.Player(42);assert.deepEqual(a.queue,b.queue);const bag=[a.active.type,...a.queue.slice(0,6)];assert.equal(new Set(bag).size,7);a.receive(4,0);for(let i=0;i<30;i++){a.spawn();b.spawn();assert.equal(a.active.type,b.active.type);}});
test('duel players get separate 7-bags and different opening pieces',()=>{
  for(let seed=1;seed<=1000;seed++){
    const [left,right]=E.createDuelPlayers(seed);
    const initial=p=>[p.active.type,...p.queue.slice(0,6)];
    assert.notEqual(left.active.type,right.active.type,'seed '+seed);
    assert.equal(new Set(initial(left)).size,7,'left 7-bag '+seed);
    assert.equal(new Set(initial(right)).size,7,'right 7-bag '+seed);
    assert.notDeepEqual(initial(left),initial(right),'sequence differs '+seed);
    const [leftAgain,rightAgain]=E.createDuelPlayers(seed);
    assert.deepEqual(initial(left),initial(leftAgain),'left deterministic '+seed);
    assert.deepEqual(initial(right),initial(rightAgain),'right deterministic '+seed);
  }
});
test('hold is once per lock and swaps in a fresh orientation',()=>{const p=new E.Player(5),first=p.active.type;assert.ok(p.swap());assert.equal(p.hold,first);assert.equal(p.swap(),false);p.active=E.ghost(p.board,p.active);p.lock();assert.ok(p.swap());assert.equal(p.active.r,0);assert.equal(p.active.type,first);});
test('SRS rotation succeeds beside a wall without clipping',()=>{const board=E.empty(),p={type:'T',x:-1,y:10,r:1,lastRotate:false,kick:0};assert.ok(E.fits(board,p));const q=E.rotate(board,p,-1);assert.ok(q);assert.ok(E.fits(board,q));assert.equal(q.r,0);assert.equal(q.x,0);});
test('99 attack table, combos, B2B, perfect clear and badges',()=>{assert.equal(E.attack(1,'',0,false,false),0);assert.equal(E.attack(2,'',0,false,false),1);assert.equal(E.attack(3,'',0,false,false),2);assert.equal(E.attack(4,'',0,false,false),4);assert.equal(E.attack(2,'full',0,false,false),4);assert.equal(E.attack(3,'full',0,false,false),6);assert.equal(E.attack(1,'mini',0,false,false),0);assert.equal(E.attack(4,'',1,true,true),10);assert.equal(E.attack(4,'',1,true,true,2),12);assert.equal(E.attack(3,'full',10,true,true,30),20);});
test('four-line clear and perfect clear update state; no-clear preserves B2B',()=>{const p=new E.Player(9);p.board=tetrisWell();p.active={type:'I',r:1,x:3,y:18,lastRotate:false,kick:0};const res=p.lock();assert.equal(res.lines,4);assert.equal(res.perfect,true);assert.equal(res.outgoing,8);assert.equal(p.b2b,true);p.active=E.ghost(p.board,p.active);p.lock();assert.equal(p.b2b,true);assert.equal(p.combo,-1);});
test('T-spin detection distinguishes full, mini and non-rotation',()=>{const b=E.empty(),p={type:'T',r:0,x:3,y:18,lastRotate:true,kick:0};b[18][3]='G';b[18][5]='G';b[20][3]='G';assert.equal(E.spin(b,p),'full');b[18][5]='';b[20][5]='G';assert.equal(E.spin(b,p),'mini');assert.equal(E.spin(b,{...p,lastRotate:false}),'');});
test('incoming cap, timed rise, clear deferral and counter cancellation',()=>{const p=new E.Player(2);assert.equal(p.receive(20,0),12);assert.equal(p.receive(4,0),0);p.active=E.ghost(p.board,p.active);p.lock(2999);assert.equal(p.pending.length,1);p.board=tetrisWell();p.active={type:'I',r:1,x:3,y:18,lastRotate:false,kick:0};const r=p.lock(4000);assert.equal(r.cancelled,8);assert.equal(r.outgoing,0);assert.equal(p.pending[0].lines,4);assert.equal(r.raised,0);p.active=E.ghost(p.board,p.active);const raised=p.lock(5000);assert.equal(raised.raised,4);assert.equal(p.pending.length,0);assert.equal(p.board[21].filter(Boolean).length,9);});
test('garbage overflow top-outs instead of silently discarding blocks',()=>{const p=new E.Player(2);p.board[0][0]='G';p.receive(1,0);p.active=E.ghost(p.board,p.active);p.lock(4000);assert.ok(p.dead);});
test('Apex produces executable legal paths and survives 100 placements',()=>{const p=new E.Player(157);for(let i=0;i<100;i++){const plan=A.think(p,5);assert.ok(plan);if(plan.hold)assert.ok(p.swap());for(const step of plan.path){if(step==='drop'){p.active=E.ghost(p.board,p.active);break;}const q=step==='left'?E.move(p.board,p.active,-1,0):step==='right'?E.move(p.board,p.active,1,0):step==='down'?E.move(p.board,p.active,0,1):E.rotate(p.board,p.active,step==='cw'?1:-1);assert.ok(q,'legal '+step);p.active=q;}assert.deepEqual(E.cells(p.active),E.cells(plan.placement));p.lock(i*200);assert.equal(p.dead,false);}assert.ok(p.lines>=30,'AI clears at least 30 lines');});
