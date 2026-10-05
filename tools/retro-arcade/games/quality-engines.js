'use strict';
(() => {
const R=window.RetroArcade,K=window.RetroGameKit;
const E=K.engines;
const txt=(c,t,x,y,s=16,col='#fff',a='left')=>{c.fillStyle=col;c.font=s+'px monospace';c.textAlign=a;c.fillText(t,x,y)};
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
const line=(c,x1,y1,x2,y2,col='#fff',w=2)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d}};
const press=(e,k,interval=.1)=>{if(e.autoTap&&['Space','KeyX','KeyZ'].includes(k))e.autoTap(k,interval);else e.autoKeys.add(k)};

E.basketball=function(p,api){
 let pl,ai,ball,owner,scoreA,scoreB,time,shotCd,over;
 function reset(){pl={x:150,y:240};ai={x:470,y:240};ball={x:320,y:240,vx:0,vy:0};owner=null;scoreA=scoreB=0;time=60;shotCd=0;over=false;api.setStatus('相手ゴールへシュート')}reset();
 function shoot(who){if(owner!==who||shotCd>0)return;shotCd=.5;owner=null;const target=who===pl?{x:585,y:185}:{x:55,y:185},n=norm(target.x-who.x,target.y-who.y);ball={x:who.x,y:who.y-8,vx:n.x*360,vy:n.y*360-110}}
 return api.canvas({
  reset,
  auto(e,dt,cfg){if(owner===pl){if(pl.x<470)press(e,'ArrowRight');if(Math.abs(pl.y-240)>20)press(e,pl.y<240?'ArrowDown':'ArrowUp');if(pl.x>455)press(e,'Space',.18)}else{if(pl.x<ball.x-10)press(e,'ArrowRight');if(pl.x>ball.x+10)press(e,'ArrowLeft');if(pl.y<ball.y-10)press(e,'ArrowDown');if(pl.y>ball.y+10)press(e,'ArrowUp')}},
  keyDown(e,k){if(k==='Space')shoot(pl)},
  update(e,dt){if(over)return;time-=dt;shotCd=Math.max(0,shotCd-dt);const sp=195;if(e.keys.has('ArrowLeft'))pl.x-=sp*dt;if(e.keys.has('ArrowRight'))pl.x+=sp*dt;if(e.keys.has('ArrowUp'))pl.y-=sp*dt;if(e.keys.has('ArrowDown'))pl.y+=sp*dt;pl.x=R.clamp(pl.x,35,605);pl.y=R.clamp(pl.y,80,400);
   if(owner===pl){ball.x=pl.x+9;ball.y=pl.y}else if(owner===ai){ball.x=ai.x-9;ball.y=ai.y}
   else{ball.vy+=250*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.y>390){ball.y=390;ball.vy*=-.55;ball.vx*=.88}}
   const n=norm(ball.x-ai.x,ball.y-ai.y);ai.x+=n.x*135*dt;ai.y+=n.y*135*dt;if(!owner&&Math.hypot(pl.x-ball.x,pl.y-ball.y)<25)owner=pl;if(!owner&&Math.hypot(ai.x-ball.x,ai.y-ball.y)<25)owner=ai;
   if(owner===ai){ai.x-=115*dt;if(ai.x<185)shoot(ai)}
   if(!owner&&ball.x>565&&ball.y<230&&ball.y>130){scoreA+=2;api.addScore(200);ball={x:320,y:240,vx:0,vy:0}}if(!owner&&ball.x<75&&ball.y<230&&ball.y>130){scoreB+=2;ball={x:320,y:240,vx:0,vy:0}}
   if(time<=0){over=true;api.setStatus(scoreA>=scoreB?'勝利':'試合終了')}
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#bd7d43');rect(g,24,54,592,372,'#c98a4d');line(g,320,54,320,426,'#fff9');g.strokeStyle='#fff9';g.beginPath();g.arc(320,240,62,0,6.28);g.stroke();rect(g,570,160,5,90,'#eee');rect(g,65,160,5,90,'#eee');line(g,565,200,595,200,'#f64',3);line(g,45,200,75,200,'#f64',3);rect(g,pl.x-10,pl.y-16,20,32,p.player||'#69d7ff');rect(g,ai.x-10,ai.y-16,20,32,p.enemy||'#ff6d69');g.fillStyle='#f18d2c';g.beginPath();g.arc(ball.x,ball.y,8,0,6.28);g.fill();txt(g,scoreA+' - '+scoreB,320,30,20,'#fff','center');txt(g,Math.max(0,Math.ceil(time))+'秒',320,460,12,'#fff','center')}
 })
};

E.gridiron=function(p,api){
 let pl,def,downs,yards,time,score,over,dash;
 function reset(){pl={x:65,y:240};def=Array.from({length:5},(_,i)=>({x:260+i*65,y:90+i*70%330}));downs=1;yards=0;time=70;score=0;over=false;dash=0;api.setStatus('右端のエンドゾーンへ進め')}reset();
 function resetPlay(){pl={x:65,y:240};def=Array.from({length:5},(_,i)=>({x:250+i*70,y:R.rand(80,400)}));dash=0}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const near=[...def].sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.y)-Math.hypot(b.x-pl.x,b.y-pl.y))[0];press(e,'ArrowRight');if(near&&near.x-pl.x<95){press(e,near.y<pl.y?'ArrowDown':'ArrowUp');if(cfg.skill>.55)press(e,'Space',.35)}},
  keyDown(e,k){if(k==='Space'&&dash<=0)dash=.55},
  update(e,dt){if(over)return;time-=dt;dash=Math.max(0,dash-dt);const sp=dash>0?310:185;if(e.keys.has('ArrowRight'))pl.x+=sp*dt;if(e.keys.has('ArrowLeft'))pl.x-=sp*.6*dt;if(e.keys.has('ArrowUp'))pl.y-=170*dt;if(e.keys.has('ArrowDown'))pl.y+=170*dt;pl.y=R.clamp(pl.y,65,415);
   for(const q of def){const n=norm(pl.x-q.x,pl.y-q.y);q.x+=n.x*115*dt;q.y+=n.y*115*dt;if(Math.hypot(q.x-pl.x,q.y-pl.y)<20){yards+=Math.floor((pl.x-65)/8);downs++;if(downs>4){yards=0;downs=1}resetPlay();break}}
   if(pl.x>590){score+=7;api.addScore(700);yards+=65;downs=1;resetPlay()}if(time<=0){over=true;api.setStatus('試合終了 '+score+'点')}
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,'#145b2c');for(let x=50;x<620;x+=55){line(g,x,55,x,425,'#fff5');txt(g,String(Math.abs(50-Math.round((x-50)/5.5))),x,47,9,'#fff8','center')}rect(g,pl.x-11,pl.y-11,22,22,p.player||'#7df');for(const q of def)rect(g,q.x-10,q.y-10,20,20,p.enemy||'#f66');txt(g,'DOWN '+downs,15,25,12,'#fff');txt(g,'得点 '+score,320,25,12,'#fff','center');txt(g,Math.max(0,Math.ceil(time))+'秒',625,25,12,'#fff','right')}
 })
};

E.topRace=function(p,api){
 let car,checkpoints,idx,time,crashes,over;
 function reset(){car={x:120,y:380,a:-.35,v:0};checkpoints=[{x:120,y:380},{x:520,y:360},{x:540,y:110},{x:320,y:75},{x:90,y:120},{x:120,y:380}];idx=1;time=70;crashes=0;over=false;api.setStatus('チェックポイントを順番に通過')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const t=checkpoints[idx],ta=Math.atan2(t.y-car.y,t.x-car.x),d=Math.atan2(Math.sin(ta-car.a),Math.cos(ta-car.a));if(d>.05)press(e,'ArrowRight');if(d<-.05)press(e,'ArrowLeft');press(e,'ArrowUp')},
  update(e,dt){if(over)return;time-=dt;if(e.keys.has('ArrowUp'))car.v+=180*dt;else car.v-=70*dt;if(e.keys.has('ArrowDown'))car.v-=220*dt;car.v=R.clamp(car.v,0,290);const steer=2.2*(.3+car.v/290);if(e.keys.has('ArrowLeft'))car.a-=steer*dt;if(e.keys.has('ArrowRight'))car.a+=steer*dt;car.x+=Math.cos(car.a)*car.v*dt;car.y+=Math.sin(car.a)*car.v*dt;
   if(car.x<35||car.x>605||car.y<45||car.y>435){car.x=R.clamp(car.x,35,605);car.y=R.clamp(car.y,45,435);car.v*=.35;crashes++}
   const t=checkpoints[idx];if(Math.hypot(car.x-t.x,car.y-t.y)<45){idx++;api.addScore(100);if(idx>=checkpoints.length){idx=1;api.addScore(500)}}
   if(time<=0){over=true;api.setStatus('終了 衝突 '+crashes+'回')}
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,'#244d2b');g.strokeStyle='#555';g.lineWidth=86;g.lineJoin='round';g.beginPath();checkpoints.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.stroke();g.strokeStyle='#ddd';g.lineWidth=3;g.setLineDash([15,15]);g.stroke();g.setLineDash([]);const t=checkpoints[idx];g.strokeStyle='#66f0c0';g.beginPath();g.arc(t.x,t.y,28,0,6.28);g.stroke();g.save();g.translate(car.x,car.y);g.rotate(car.a);rect(g,-10,-17,20,34,p.player||'#67b8ff');g.restore();txt(g,'速度 '+Math.floor(car.v),15,25,12,'#fff');txt(g,Math.max(0,Math.ceil(time))+'秒',625,25,12,'#fff','right')}
 })
};

E.rolling=function(p,api){
 let ball,target,holes,time,over,falls;
 function reset(){ball={x:90,y:390,vx:0,vy:0};target={x:555,y:85};holes=[{x:280,y:180,r:32},{x:410,y:315,r:28},{x:180,y:285,r:24}];time=60;over=false;falls=0;api.setStatus('球をゴールまで運べ')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const n=norm(target.x-ball.x,target.y-ball.y);if(n.x>.15)press(e,'ArrowRight');if(n.x<-.15)press(e,'ArrowLeft');if(n.y>.15)press(e,'ArrowDown');if(n.y<-.15)press(e,'ArrowUp');for(const h of holes)if(Math.hypot(ball.x-h.x,ball.y-h.y)<95){press(e,ball.x<h.x?'ArrowLeft':'ArrowRight')}},
  update(e,dt){if(over)return;time-=dt;const a=220;if(e.keys.has('ArrowLeft'))ball.vx-=a*dt;if(e.keys.has('ArrowRight'))ball.vx+=a*dt;if(e.keys.has('ArrowUp'))ball.vy-=a*dt;if(e.keys.has('ArrowDown'))ball.vy+=a*dt;ball.vx*=Math.pow(.975,dt*60);ball.vy*=Math.pow(.975,dt*60);ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.x=R.clamp(ball.x,20,620);ball.y=R.clamp(ball.y,35,445);for(const h of holes)if(Math.hypot(ball.x-h.x,ball.y-h.y)<h.r){falls++;ball={x:90,y:390,vx:0,vy:0};api.setScore(Math.max(0,api.getScore()-100));break}if(Math.hypot(ball.x-target.x,ball.y-target.y)<28){over=true;api.addScore(1000+Math.floor(time)*10);api.setStatus('ゴール！')}if(time<=0){over=true;api.finish('時間切れ')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#7793b8');rect(g,25,35,590,410,'#d2c8a8');for(const h of holes){g.fillStyle='#171717';g.beginPath();g.arc(h.x,h.y,h.r,0,6.28);g.fill()}g.strokeStyle='#58d6a4';g.lineWidth=4;g.beginPath();g.arc(target.x,target.y,24,0,6.28);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(ball.x,ball.y,12,0,6.28);g.fill();txt(g,'落下 '+falls,15,25,12,'#fff');txt(g,Math.max(0,Math.ceil(time))+'秒',625,25,12,'#fff','right')}
 })
};

E.skate=function(p,api){
 let x,speed,combo,time,ramps,over,air;
 function reset(){x=60;speed=0;combo=0;time=60;ramps=[220,430,680,910,1170,1410,1680,1940];over=false;air=0;api.setStatus('技をつないで得点')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){press(e,'ArrowRight');const next=ramps.find(r=>r>x&&r-x<90);if(next)e.autoTap?.('Space',.2)},
  keyDown(e,k){if(k==='Space'&&air<=0){air=.65;combo++;api.addScore(80*combo);api.beep(520,.03)}},
  update(e,dt){if(over)return;time-=dt;if(e.keys.has('ArrowRight'))speed+=150*dt;else speed-=50*dt;if(e.keys.has('ArrowLeft'))speed-=120*dt;speed=R.clamp(speed,0,250);x+=speed*dt;air=Math.max(0,air-dt);if(ramps.some(r=>Math.abs(r-x)<16)&&air<=0){speed*=.45;combo=0}if(x>2050){x=60;api.addScore(300)}if(time<=0){over=true;api.setStatus('終了 コンボ '+combo)}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,'#87b5d8');rect(g,0,360,640,120,'#777');const cam=Math.max(0,x-180);for(const r of ramps){const sx=r-cam;if(sx>-50&&sx<690){g.fillStyle='#b85';g.beginPath();g.moveTo(sx,360);g.lineTo(sx+55,315);g.lineTo(sx+80,360);g.fill()}}const py=air>0?300-Math.sin((.65-air)/.65*Math.PI)*80:330;rect(g,x-cam-10,py,20,28,p.player||'#fff');line(g,x-cam-18,py+30,x-cam+18,py+30,'#222',3);txt(g,'速度 '+Math.floor(speed),15,25,12,'#fff');txt(g,'コンボ '+combo,320,25,12,'#fff','center');txt(g,Math.max(0,Math.ceil(time))+'秒',625,25,12,'#fff','right')}
 })
};

E.qte=function(p,api){
 const keys=['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'];let current,timer,score,lives,round,over,autoWait;
 function next(){current=keys[Math.floor(R.rand(0,keys.length))];timer=1.15;round++;autoWait=R.rand(.08,.3)}
 function reset(){score=0;lives=3;round=0;over=false;next();api.setStatus('表示された方向を時間内に入力')}reset();
 function answer(k){if(over)return;if(k===current){score++;api.addScore(100+Math.floor(timer*50));api.beep(650,.025);next()}else{lives--;api.beep(100,.06);if(lives<=0){over=true;api.finish('失敗')}}}
 return api.canvas({
  reset,
  auto(e,dt,cfg){autoWait-=dt;if(autoWait<=0){if(Math.random()<.72+cfg.skill*.27)e.autoTap?.(current,.05);else e.autoTap?.(keys[Math.floor(R.rand(0,4))],.05);autoWait=999}},
  keyDown(e,k){if(keys.includes(k))answer(k)},
  update(e,dt){if(over)return;timer-=dt;if(timer<=0){lives--;if(lives<=0){over=true;api.finish('失敗')}else next()}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#130d21');txt(g,'反応せよ',320,105,24,'#ddd','center');txt(g,({ArrowLeft:'←',ArrowDown:'↓',ArrowUp:'↑',ArrowRight:'→'})[current],320,265,110,p.accent||'#6ff','center');rect(g,170,330,300,12,'#222');rect(g,170,330,300*R.clamp(timer/1.15,0,1),12,'#59d6a4');txt(g,'成功 '+score,20,30,13,'#fff');txt(g,'残機 '+lives,620,30,13,'#fff','right')}
 })
};

E.pointClick=function(p,api){
 const c=p.cfg||{},rooms=['入口','書斎','機械室','庭園','塔','地下室'];let room,found,clues,over,autoT;
 function reset(){room=0;found=new Set();clues=rooms.map((_,i)=>({room:i,x:R.rand(120,520),y:R.rand(120,340),taken:false}));over=false;autoT=0;api.setStatus('場所を調べて手掛かりを集める')}reset();
 function inspect(){const q=clues.find(x=>x.room===room&&!x.taken);if(q){q.taken=true;found.add(room);api.addScore(120);api.setStatus('手掛かりを発見')}else api.setStatus('ここにはもう何もない')}
 function move(d){room=(room+d+rooms.length)%rooms.length;api.setStatus(rooms[room]+'を探索中')}
 return api.canvas({
  reset,
  auto(e,dt,cfg){autoT-=dt;if(autoT<=0){autoT=.35+(1-cfg.skill)*.7;const q=clues.find(x=>!x.taken);if(!q){return}if(q.room===room)e.autoTap?.('Space',.08);else e.autoTap?.(q.room>room?'ArrowRight':'ArrowLeft',.08)}},
  keyDown(e,k){if(k==='Space')inspect();if(k==='ArrowRight')move(1);if(k==='ArrowLeft')move(-1)},
  pointerDown(e,pnt){inspect()},
  update(e,dt){if(!over&&found.size===rooms.length){over=true;api.addScore(1000);api.setStatus('すべての手掛かりを集めた')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#1f2a31');txt(g,rooms[room],320,55,26,'#fff','center');rect(g,70,85,500,300,'#283844');const q=clues.find(x=>x.room===room&&!x.taken);if(q){txt(g,'?',q.x,q.y,42,p.accent||'#ffd565','center')}txt(g,'← 前の場所　　スペース:調べる　　次の場所 →',320,430,12,'#cdd','center');txt(g,'手掛かり '+found.size+'/'+rooms.length,320,462,12,'#fff','center')}
 })
};

E.dungeonRPG=function(p,api){
 const c=p.cfg||{},W=16,H=12,S=28,OX=96,OY=70;let pl,goal,items,enemies,hp,enc,over,moveCd;
 function reset(){pl={x:1,y:H-2};goal={x:W-2,y:1};items=Array.from({length:c.items||6},()=>({x:Math.floor(R.rand(2,W-2)),y:Math.floor(R.rand(2,H-2)),taken:false}));enemies=Array.from({length:c.enemies||7},()=>({x:Math.floor(R.rand(2,W-2)),y:Math.floor(R.rand(2,H-2)),hp:c.tough?3:2}));hp=100;enc=null;over=false;moveCd=0;api.setStatus('探索して目的地へ')}reset();
 const dirs=[['ArrowRight',1,0],['ArrowLeft',-1,0],['ArrowDown',0,1],['ArrowUp',0,-1]];
 function attack(){if(!enc)return;enc.hp--;api.addScore(25);api.beep(320,.03);if(enc.hp<=0){enemies=enemies.filter(x=>x!==enc);enc=null;api.addScore(100)}else{hp-=R.rand(5,12);if(hp<=0){over=true;api.finish('力尽きた')}}}
 return api.canvas({
  reset,
  auto(e,dt,cfg){if(enc){e.autoTap?.('Space',.13);return}const t=items.find(i=>!i.taken)||goal;let best=null;for(const[k,dx,dy]of dirs){const nx=pl.x+dx,ny=pl.y+dy,s=-(Math.abs(t.x-nx)+Math.abs(t.y-ny));if(nx>0&&nx<W-1&&ny>0&&ny<H-1&&(!best||s>best.s))best={k,s}}if(best)e.autoTap?.(best.k,.12)},
  keyDown(e,k){if(k==='Space'){attack();return}if(enc)return;const d=dirs.find(x=>x[0]===k);if(d){pl.x=R.clamp(pl.x+d[1],1,W-2);pl.y=R.clamp(pl.y+d[2],1,H-2)}},
  update(e,dt){if(over||enc)return;for(const it of items)if(!it.taken&&it.x===pl.x&&it.y===pl.y){it.taken=true;api.addScore(100)}const q=enemies.find(x=>x.x===pl.x&&x.y===pl.y);if(q){enc=q;api.setStatus('敵と遭遇')}if(items.every(i=>i.taken)&&pl.x===goal.x&&pl.y===goal.y){over=true;api.addScore(1200);api.setStatus('目的達成')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#172219');if(enc){txt(g,'戦闘',320,90,28,'#fff','center');rect(g,130,130,160,210,'#22342a');rect(g,350,130,160,210,'#3a2626');txt(g,'YOU',210,210,28,p.player||'#7df','center');txt(g,'ENEMY',430,210,24,p.enemy||'#f66','center');txt(g,'HP '+Math.max(0,Math.floor(hp)),210,300,16,'#fff','center');txt(g,'敵HP '+enc.hp,430,300,16,'#fff','center');txt(g,'スペース:攻撃',320,400,14,'#ddd','center');return}for(let y=0;y<H;y++)for(let x=0;x<W;x++){rect(g,OX+x*S,OY+y*S,S-2,S-2,(x+y)%2?'#25392b':'#2b4131')}for(const it of items)if(!it.taken)txt(g,'◆',OX+it.x*S+14,OY+it.y*S+20,15,'#ffd55f','center');for(const q of enemies)rect(g,OX+q.x*S+7,OY+q.y*S+7,S-14,S-14,p.enemy||'#e66');rect(g,OX+goal.x*S+6,OY+goal.y*S+6,S-12,S-12,items.every(i=>i.taken)?'#6f6':'#555');rect(g,OX+pl.x*S+6,OY+pl.y*S+6,S-12,S-12,p.player||'#7df');txt(g,'HP '+Math.floor(hp),15,28,12,'#fff');txt(g,'重要物 '+items.filter(i=>i.taken).length+'/'+items.length,625,28,12,'#fff','right')}
 })
};

E.lemmings=function(p,api){
 const W=640;let units,blockers,bridges,exit,time,saved,lost,over,autoT;
 function reset(){units=Array.from({length:18},(_,i)=>({x:35-i*7,y:340,vx:34,alive:true,safe:false}));blockers=[];bridges=[];exit={x:585,y:330};time=75;saved=0;lost=0;over=false;autoT=0;api.setStatus('できるだけ多く出口へ導く')}reset();
 function placeBridge(){const u=units.find(x=>x.alive&&!x.safe&&x.x>150&&x.x<470);if(u){bridges.push({x:u.x,y:u.y+8,w:100});api.addScore(10)}}
 return api.canvas({
  reset,
  auto(e,dt,cfg){autoT-=dt;if(autoT<=0){autoT=.9+(1-cfg.skill);placeBridge()}},
  keyDown(e,k){if(k==='Space')placeBridge()},
  pointerDown(){placeBridge()},
  update(e,dt){if(over)return;time-=dt;for(const u of units){if(!u.alive||u.safe)continue;u.x+=u.vx*dt;const pit=u.x>250&&u.x<360;const bridge=bridges.some(b=>u.x>=b.x&&u.x<=b.x+b.w);if(pit&&!bridge){u.y+=150*dt;if(u.y>470){u.alive=false;lost++}}else u.y=340;if(u.x>=exit.x){u.safe=true;saved++;api.addScore(100)}}if((saved+lost===units.length)||time<=0){over=true;api.setStatus('救出 '+saved+'/'+units.length)}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,'#20385b');rect(g,0,360,250,120,'#5f7d43');rect(g,360,360,280,120,'#5f7d43');for(const b of bridges)rect(g,b.x,b.y,b.w,8,'#c49352');rect(g,exit.x,310,35,50,'#eee');for(const u of units)if(u.alive&&!u.safe){rect(g,u.x-4,u.y-14,8,14,'#7fe56e')}txt(g,'救出 '+saved,15,25,12,'#fff');txt(g,'失敗 '+lost,320,25,12,'#fff','center');txt(g,Math.max(0,Math.ceil(time))+'秒',625,25,12,'#fff','right')}
 })
};

E.flightChallenge=function(p,api){
 let craft,gates,idx,time,over;
 function reset(){craft={x:90,y:330,vx:70,vy:0};gates=[{x:180,y:250},{x:300,y:150},{x:420,y:300},{x:550,y:170}];idx=0;time=65;over=false;api.setStatus('順番にゲートを通過')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const t=gates[idx];if(!t)return;if(craft.y<t.y-8)press(e,'ArrowUp');if(craft.y>t.y+8)press(e,'ArrowDown');press(e,'ArrowRight')},
  update(e,dt){if(over)return;time-=dt;if(e.keys.has('ArrowUp'))craft.vy-=90*dt;if(e.keys.has('ArrowDown'))craft.vy+=90*dt;if(e.keys.has('ArrowRight'))craft.vx+=40*dt;if(e.keys.has('ArrowLeft'))craft.vx-=60*dt;craft.vy+=18*dt;craft.vx=R.clamp(craft.vx,30,150);craft.vy=R.clamp(craft.vy,-90,90);craft.x+=craft.vx*dt;craft.y+=craft.vy*dt;craft.y=R.clamp(craft.y,45,420);const t=gates[idx];if(t&&Math.abs(craft.x-t.x)<18&&Math.abs(craft.y-t.y)<55){idx++;api.addScore(200)}if(craft.x>640){craft.x=20}if(idx>=gates.length){over=true;api.addScore(1000);api.setStatus('課題クリア')}if(time<=0){over=true;api.finish('時間切れ')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,'#74a9d6');rect(g,0,420,640,60,'#527c3e');for(let i=idx;i<gates.length;i++){const q=gates[i];line(g,q.x,q.y-55,q.x,q.y+55,i===idx?'#6ff':'#fff8',4);txt(g,String(i+1),q.x+8,q.y-62,12,'#fff')}g.save();g.translate(craft.x,craft.y);g.rotate(Math.atan2(craft.vy,craft.vx));rect(g,-14,-6,28,12,p.player||'#fff');g.restore();txt(g,'ゲート '+idx+'/'+gates.length,15,25,12,'#fff');txt(g,Math.max(0,Math.ceil(time))+'秒',625,25,12,'#fff','right')}
 })
};
})();