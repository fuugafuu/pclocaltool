'use strict';
(() => {
const R=window.RetroArcade;
const K={};
const txt=(c,t,x,y,s=16,col='#fff',a='left')=>{c.fillStyle=col;c.font=s+'px monospace';c.textAlign=a;c.fillText(t,x,y)};
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
const line=(c,x1,y1,x2,y2,col='#fff',w=2)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
const press=(e,k,interval=.10)=>{if(e.autoTap&&['Space','KeyX','KeyZ'].includes(k))e.autoTap(k,interval);else e.autoKeys.add(k)};
const choose=(a)=>a[Math.floor(Math.random()*a.length)];
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d}};
const human=(cfg,s=1)=>R.rand(-1,1)*(cfg.humanize||0)*s*(1-(cfg.skill||.75)*.45);
const commonMeta=(p)=>({
 id:p.id,title:p.title,year:p.year,system:p.system||'ARCADE',genre:p.genre||'Action',color:p.color||'#66ffaa',
 description:p.description||p.title+'の代表的な遊びをブラウザ向けに再構成。',
 classic:p.classic||'当時の核となるルールとテンポを重視。',
 modern:p.modern||'視認性・操作補助・コンボや短時間パワーアップを自然に追加。',
 controls:p.controls||'矢印 / スペース',auto:p.auto||'ゲーム状態を見て専用AIが操作'
});

function fixedShooter(p,api){
 let px,enemies,shots,eb,cool,lives,wave,over,combo;
 const c=p.cfg||{},cols=c.cols||9,rows=c.rows||4;
 function build(){enemies=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)enemies.push({x:70+x*(500/(cols-1||1)),y:60+y*34,alive:true,phase:R.rand(0,6.28),dive:false})}
 function reset(){px=305;shots=[];eb=[];cool=0;lives=c.lives||3;wave=1;over=false;combo=0;build();api.setStatus('ウェーブ '+wave)}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const d=eb.filter(b=>b.y>320&&Math.abs(b.x-(px+15))<70).sort((a,b)=>b.y-a.y)[0];if(d)press(e,d.x<px?'ArrowRight':'ArrowLeft');else{const t=enemies.filter(x=>x.alive).sort((a,b)=>Math.abs(a.x-px)-Math.abs(b.x-px))[0];if(t){if(px<t.x-10)press(e,'ArrowRight');if(px>t.x+10)press(e,'ArrowLeft')}}press(e,'Space')},
  update(e,dt){if(over)return;const sp=c.playerSpeed||320;if(e.keys.has('ArrowLeft'))px-=sp*dt;if(e.keys.has('ArrowRight'))px+=sp*dt;px=R.clamp(px,8,602);cool-=dt;if(e.keys.has('Space')&&cool<=0){shots.push({x:px+15,y:420});cool=api.mode==='modern'?.14:.2;api.beep(560,.02)}
   for(const s of shots)s.y-=430*dt;shots=shots.filter(s=>s.y>-12);for(const b of eb)b.y+=170*dt;eb=eb.filter(b=>b.y<490);
   for(const en of enemies)if(en.alive){en.phase+=dt;en.x+=Math.sin(en.phase*1.4)*8*dt;if(c.dive&&Math.random()<dt*.035){en.y+=95*dt;if(en.y>390)en.y=60+R.rand(0,rows*34)}if(Math.random()<dt*(c.fireRate||.045))eb.push({x:en.x,y:en.y+10})}
   for(let i=shots.length-1;i>=0;i--){for(const en of enemies)if(en.alive&&Math.abs(shots[i].x-en.x)<16&&Math.abs(shots[i].y-en.y)<15){en.alive=false;shots.splice(i,1);combo++;api.addScore((c.enemyScore||25)+(api.mode==='modern'?combo:0));break}}
   for(const b of eb)if(Math.abs(b.x-(px+15))<14&&Math.abs(b.y-430)<14){b.y=999;lives--;combo=0;if(lives<=0){over=true;api.finish('ゲームオーバー')}}
   if(enemies.every(x=>!x.alive)){wave++;api.addScore(300);build();api.setStatus('ウェーブ '+wave)}
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#000012');for(const en of enemies)if(en.alive){rect(g,en.x-10,en.y-7,20,14,p.enemy||'#72ff9a');if(c.dive)rect(g,en.x-4,en.y+7,8,4,p.enemy2||'#ffcf5a')}rect(g,px,427,30,14,p.player||'#9ee7ff');for(const s of shots)rect(g,s.x-2,s.y-7,4,10,'#fff');for(const b of eb)rect(g,b.x-2,b.y,4,9,'#ff6677');txt(g,'残機 '+lives,10,470,12,'#ddd');txt(g,'波 '+wave,630,470,12,'#ddd','right')}
 })
}

function scrollShooter(p,api){
 let pl,en,shots,eb,spawn,cool,lives,dist,over,power;
 const c=p.cfg||{},vertical=!!c.vertical;
 function reset(){pl={x:vertical?320:80,y:vertical?400:240};en=[];shots=[];eb=[];spawn=.2;cool=0;lives=3;dist=0;over=false;power=0;api.setStatus(c.objective||'前進せよ')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const d=eb.filter(b=>Math.hypot(b.x-pl.x,b.y-pl.y)<95).sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.y)-Math.hypot(b.x-pl.x,b.y-pl.y))[0];if(d){press(e,d.y<pl.y?'ArrowDown':'ArrowUp');press(e,d.x<pl.x?'ArrowRight':'ArrowLeft')}else{const t=en[0];if(t){if(pl.y<t.y-12)press(e,'ArrowDown');if(pl.y>t.y+12)press(e,'ArrowUp')}}press(e,'Space')},
  update(e,dt){if(over)return;const sp=c.playerSpeed||240;if(e.keys.has('ArrowLeft'))pl.x-=sp*dt;if(e.keys.has('ArrowRight'))pl.x+=sp*dt;if(e.keys.has('ArrowUp'))pl.y-=sp*dt;if(e.keys.has('ArrowDown'))pl.y+=sp*dt;pl.x=R.clamp(pl.x,15,625);pl.y=R.clamp(pl.y,20,455);cool-=dt;power=Math.max(0,power-dt);
   if(e.keys.has('Space')&&cool<=0){shots.push({x:pl.x,y:pl.y,vx:vertical?0:380,vy:vertical?-380:0});if(power>0)shots.push({x:pl.x,y:pl.y+8,vx:vertical?80:360,vy:vertical?-360:70});cool=power>0?.09:.17}
   spawn-=dt;if(spawn<=0){en.push({x:vertical?R.rand(30,610):660,y:vertical?-20:R.rand(40,420),vx:vertical?R.rand(-30,30):-(c.enemySpeed||110),vy:vertical?(c.enemySpeed||110):R.rand(-20,20),hp:c.tough?2:1,phase:R.rand(0,6.28)});spawn=R.rand(.28,.72)/(1+dist/3000)}
   for(const q of en){q.phase+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt+Math.sin(q.phase*2)*18*dt;if(Math.random()<dt*(c.fireRate||.08))eb.push({x:q.x,y:q.y,vx:vertical?0:-150,vy:vertical?160:0})}
   for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt}for(const b of eb){b.x+=b.vx*dt;b.y+=b.vy*dt}
   for(let i=shots.length-1;i>=0;i--){for(let j=en.length-1;j>=0;j--){if(Math.hypot(shots[i].x-en[j].x,shots[i].y-en[j].y)<16){shots.splice(i,1);en[j].hp--;if(en[j].hp<=0){en.splice(j,1);api.addScore(c.enemyScore||35);if(api.mode==='modern'&&Math.random()<.06)power=5}break}}}
   for(const b of eb)if(Math.hypot(b.x-pl.x,b.y-pl.y)<14){b.dead=true;lives--;if(lives<=0){over=true;api.finish('撃墜')}}eb=eb.filter(b=>!b.dead&&b.x>-20&&b.x<660&&b.y>-20&&b.y<500);en=en.filter(q=>q.x>-40&&q.x<680&&q.y>-40&&q.y<520);shots=shots.filter(s=>s.x>-20&&s.x<680&&s.y>-20&&s.y<520);dist+=dt*100;api.addScore(dt*(c.travelScore||2))
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#030617');for(let i=0;i<70;i++){const x=(i*97+dist*.7)%640,y=(i*53+(vertical?dist:0))%480;rect(g,x,y,2,2,'#ffffff77')}for(const q of en){rect(g,q.x-10,q.y-8,20,16,p.enemy||'#ff776f')}rect(g,pl.x-10,pl.y-8,20,16,p.player||'#7df');for(const s of shots)rect(g,s.x-3,s.y-3,6,6,'#fff');for(const b of eb)rect(g,b.x-3,b.y-3,6,6,'#f55');txt(g,'残機 '+lives,10,470,12,'#fff')}
 })
}

function arena(p,api){
 let pl,en,bullets,cool,spawn,lives,over;
 const c=p.cfg||{};
 function reset(){pl={x:320,y:240};en=[];bullets=[];cool=0;spawn=.2;lives=3;over=false;api.setStatus(c.objective||'敵を倒せ')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const t=[...en].sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.y)-Math.hypot(b.x-pl.x,b.y-pl.y))[0];if(!t)return;const dx=t.x-pl.x,dy=t.y-pl.y;if(Math.hypot(dx,dy)<100){press(e,Math.abs(dx)>Math.abs(dy)?(dx>0?'ArrowLeft':'ArrowRight'):(dy>0?'ArrowUp':'ArrowDown'))}else{if(Math.abs(dx)>15)press(e,dx>0?'ArrowRight':'ArrowLeft');if(Math.abs(dy)>15)press(e,dy>0?'ArrowDown':'ArrowUp')}press(e,'Space')},
  update(e,dt){if(over)return;const sp=c.playerSpeed||220;if(e.keys.has('ArrowLeft'))pl.x-=sp*dt;if(e.keys.has('ArrowRight'))pl.x+=sp*dt;if(e.keys.has('ArrowUp'))pl.y-=sp*dt;if(e.keys.has('ArrowDown'))pl.y+=sp*dt;pl.x=R.clamp(pl.x,10,630);pl.y=R.clamp(pl.y,10,470);spawn-=dt;if(spawn<=0){const side=Math.floor(R.rand(0,4));en.push({x:side===0?0:side===1?640:R.rand(0,640),y:side===2?0:side===3?480:R.rand(0,480),hp:c.tough?2:1});spawn=R.rand(.35,.7)}
   cool-=dt;if(e.keys.has('Space')&&cool<=0&&en.length){const t=[...en].sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.y)-Math.hypot(b.x-pl.x,b.y-pl.y))[0],n=norm(t.x-pl.x,t.y-pl.y);bullets.push({x:pl.x,y:pl.y,vx:n.x*360,vy:n.y*360});cool=.15}
   for(const q of en){const n=norm(pl.x-q.x,pl.y-q.y);q.x+=n.x*(c.enemySpeed||70)*dt;q.y+=n.y*(c.enemySpeed||70)*dt;if(Math.hypot(q.x-pl.x,q.y-pl.y)<17){q.dead=true;lives--;if(lives<=0){over=true;api.finish('包囲された')}}}for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;for(const q of en)if(!q.dead&&Math.hypot(q.x-b.x,q.y-b.y)<13){q.hp--;b.dead=true;if(q.hp<=0){q.dead=true;api.addScore(c.enemyScore||20)}}}en=en.filter(q=>!q.dead);bullets=bullets.filter(b=>!b.dead&&b.x>0&&b.x<640&&b.y>0&&b.y<480)
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#07100d');for(const q of en)rect(g,q.x-9,q.y-9,18,18,p.enemy||'#f66');rect(g,pl.x-9,pl.y-9,18,18,p.player||'#8ff');for(const b of bullets)rect(g,b.x-2,b.y-2,4,4,'#fff');txt(g,'残機 '+lives,10,470,12,'#fff')}
 })
}

function platform(p,api){
 let pl,cam,en,coins,goal,lives,over,attackCd;
 const c=p.cfg||{},levelW=c.levelW||2200;
 function reset(){pl={x:70,y:350,vx:0,vy:0,on:false};cam=0;lives=3;over=false;attackCd=0;en=Array.from({length:c.enemies||10},(_,i)=>({x:260+i*(levelW-400)/(c.enemies||10)+R.rand(-50,50),y:360,hp:c.beat?2:1}));coins=Array.from({length:18},(_,i)=>({x:150+i*(levelW-250)/18,y:300-R.rand(0,130),taken:false}));goal=levelW-110;api.setStatus(c.objective||'ゴールへ進め')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const near=en.find(q=>Math.abs(q.x-pl.x)<85);if(near&&c.beat){press(e,'Space');if(near.x<pl.x)press(e,'ArrowLeft');else press(e,'ArrowRight')}else press(e,'ArrowRight');if((near&&!c.beat)||Math.sin(pl.x*.02)>0.82){if(e.autoTap)e.autoTap('ArrowUp',.18);else press(e,'ArrowUp')}},
  keyDown(e,k){if(k==='ArrowUp'&&pl.on){pl.vy=-(c.jump||330);pl.on=false}if(k==='Space'&&c.beat&&attackCd<=0)attackCd=.35},
  update(e,dt){if(over)return;const accel=c.beat?300:480;if(e.keys.has('ArrowLeft'))pl.vx-=accel*dt;if(e.keys.has('ArrowRight'))pl.vx+=accel*dt;pl.vx*=Math.pow(c.slippery?.992:.94,dt*60);pl.vy+=(c.gravity||700)*dt;pl.x+=pl.vx*dt;pl.y+=pl.vy*dt;const ground=390+Math.sin(pl.x*.006)*16;if(pl.y>ground){pl.y=ground;pl.vy=0;pl.on=true}pl.x=R.clamp(pl.x,0,levelW);attackCd=Math.max(0,attackCd-dt);for(const q of en){if(c.beat){if(Math.abs(q.x-pl.x)<45&&attackCd>.25){q.hp--;q.x+=Math.sign(q.x-pl.x)*35;if(q.hp<=0){q.dead=true;api.addScore(100)}}else if(Math.abs(q.x-pl.x)<18){lives--;pl.x=Math.max(0,pl.x-120)}}else if(Math.abs(q.x-pl.x)<18&&Math.abs(q.y-pl.y)<28){if(pl.vy>40){q.dead=true;pl.vy=-220;api.addScore(100)}else{lives--;pl.x=Math.max(0,pl.x-100)}}}en=en.filter(q=>!q.dead);for(const coin of coins)if(!coin.taken&&Math.hypot(coin.x-pl.x,coin.y-pl.y)<24){coin.taken=true;api.addScore(20)}if(lives<=0){over=true;api.finish('ゲームオーバー')}if(pl.x>=goal){over=true;api.addScore(1000);api.setStatus('クリア！')}cam=R.clamp(pl.x-190,0,levelW-640)},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#203b7c');rect(g,0,400,640,80,p.ground||'#5f9b43');for(const coin of coins)if(!coin.taken&&coin.x-cam>-20&&coin.x-cam<660){g.fillStyle='#ffd84a';g.beginPath();g.arc(coin.x-cam,coin.y,7,0,6.28);g.fill()}for(const q of en)if(q.x-cam>-30&&q.x-cam<670)rect(g,q.x-cam-10,q.y-20,20,20,p.enemy||'#e55');rect(g,pl.x-cam-10,pl.y-24,20,24,p.player||'#fff');rect(g,goal-cam,330,8,70,'#fff');txt(g,'残機 '+lives,10,470,12,'#fff')}
 })
}

function racer(p,api){
 let lane,speed,pos,obs,spawn,lap,damage,over;
 const c=p.cfg||{},lanes=c.lanes||4;
 function reset(){lane=Math.floor(lanes/2);speed=0;pos=0;obs=[];spawn=.4;lap=1;damage=0;over=false;api.setStatus(c.objective||'コースを走れ')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const danger=obs.filter(o=>o.y>300&&o.y<450).sort((a,b)=>b.y-a.y)[0];if(danger&&danger.lane===lane)press(e,lane<lanes-1?'ArrowRight':'ArrowLeft');press(e,'ArrowUp')},
  update(e,dt){if(over)return;if(e.keys.has('ArrowUp'))speed+=90*dt;else speed-=35*dt;if(e.keys.has('ArrowDown'))speed-=120*dt;speed=R.clamp(speed,0,c.maxSpeed||260);if(e.keys.has('ArrowLeft'))lane=Math.max(0,lane-1);if(e.keys.has('ArrowRight'))lane=Math.min(lanes-1,lane+1);spawn-=dt;if(spawn<=0){obs.push({lane:Math.floor(R.rand(0,lanes)),y:-30,type:Math.random()<.15?'boost':'car'});spawn=R.rand(.55,1.0)*(180/Math.max(80,speed))}
   for(const o of obs)o.y+=speed*dt*1.8;for(const o of obs)if(!o.hit&&o.y>370&&o.y<440&&o.lane===lane){o.hit=true;if(o.type==='boost'&&api.mode==='modern'){speed=Math.min(c.maxSpeed||260,speed+70);api.addScore(100)}else{speed*=.35;damage++;api.beep(90,.08)}}obs=obs.filter(o=>o.y<500);pos+=speed*dt;if(pos>(c.lapLength||5000)){lap++;pos=0;api.addScore(1000)}api.addScore(speed*dt*.08);if(damage>=5){over=true;api.finish('マシン大破')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.sky||'#18213b');const roadL=120,roadW=400;rect(g,roadL,0,roadW,480,'#30343c');for(let i=1;i<lanes;i++)for(let y=-40;y<520;y+=60)rect(g,roadL+i*roadW/lanes-2,(y+(pos*.8)%60),4,28,'#ddd');for(const o of obs){const x=roadL+(o.lane+.5)*roadW/lanes;rect(g,x-18,o.y-25,36,50,o.type==='boost'?'#52f5b2':'#f55')}const x=roadL+(lane+.5)*roadW/lanes;rect(g,x-19,395,38,58,p.player||'#6cf');txt(g,'速度 '+Math.floor(speed),10,24,13,'#fff');txt(g,'周 '+lap,630,24,13,'#fff','right')}
 })
}

function maze(p,api){
 const W=19,H=15,S=28,OX=54,OY=28,c=p.cfg||{};let grid,pl,en,items,lives,over,moveT;
 function make(){grid=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x===0||y===0||x===W-1||y===H-1||((x%4===0)&&(y%3!==1))));for(let i=0;i<32;i++){const x=Math.floor(R.rand(1,W-1)),y=Math.floor(R.rand(1,H-1));grid[y][x]=false}}
 function reset(){make();pl={x:1,y:1};en=Array.from({length:c.enemies||4},(_,i)=>({x:W-2-i,y:H-2}));items=[];for(let i=0;i<(c.items||35);i++){let x,y;do{x=Math.floor(R.rand(1,W-1));y=Math.floor(R.rand(1,H-1))}while(grid[y][x]);items.push({x,y,taken:false})}lives=3;over=false;moveT=0;api.setStatus(c.objective||'全部集めろ')}reset();
 const dirs=[['ArrowRight',1,0],['ArrowLeft',-1,0],['ArrowDown',0,1],['ArrowUp',0,-1]],open=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&!grid[y][x];
 function autoDir(){let best=null;for(const [k,dx,dy] of dirs){const nx=pl.x+dx,ny=pl.y+dy;if(!open(nx,ny))continue;let score=0;const item=items.filter(x=>!x.taken).sort((a,b)=>Math.abs(a.x-nx)+Math.abs(a.y-ny)-Math.abs(b.x-nx)-Math.abs(b.y-ny))[0];if(item)score-=Math.abs(item.x-nx)+Math.abs(item.y-ny);for(const q of en)score+=Math.min(10,Math.abs(q.x-nx)+Math.abs(q.y-ny))*2;if(!best||score>best.s)best={k,s:score}}return best?.k}
 return api.canvas({
  reset,auto(e){const k=autoDir();if(k)press(e,k)},
  update(e,dt){if(over)return;moveT+=dt;if(moveT<.105)return;moveT=0;for(const[k,dx,dy]of dirs)if(e.keys.has(k)&&open(pl.x+dx,pl.y+dy)){pl.x+=dx;pl.y+=dy;break}for(const it of items)if(!it.taken&&it.x===pl.x&&it.y===pl.y){it.taken=true;api.addScore(10)}for(const q of en){const opts=dirs.filter(d=>open(q.x+d[1],q.y+d[2]));opts.sort((a,b)=>Math.abs(q.x+a[1]-pl.x)+Math.abs(q.y+a[2]-pl.y)-Math.abs(q.x+b[1]-pl.x)-Math.abs(q.y+b[2]-pl.y));const d=opts[Math.random()<(c.smart||.7)?0:Math.floor(Math.random()*Math.max(1,opts.length))];if(d){q.x+=d[1];q.y+=d[2]}if(q.x===pl.x&&q.y===pl.y){lives--;pl={x:1,y:1};if(lives<=0){over=true;api.finish('捕まった')}}}if(items.every(x=>x.taken)){over=true;api.addScore(500);api.setStatus('クリア！')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#050611');for(let y=0;y<H;y++)for(let x=0;x<W;x++){const xx=OX+x*S,yy=OY+y*S;if(grid[y][x])rect(g,xx,yy,S-2,S-2,p.wall||'#2147aa')}for(const it of items)if(!it.taken){g.fillStyle='#ffd75c';g.beginPath();g.arc(OX+it.x*S+S/2,OY+it.y*S+S/2,4,0,6.28);g.fill()}for(const q of en)rect(g,OX+q.x*S+6,OY+q.y*S+6,S-12,S-12,p.enemy||'#f66');rect(g,OX+pl.x*S+6,OY+pl.y*S+6,S-12,S-12,p.player||'#fff');txt(g,'残機 '+lives,10,470,12,'#fff')}
 })
}

function tank(p,api){
 let pl,en,shots,cool,lives,over;
 const c=p.cfg||{};
 function reset(){pl={x:320,y:400,a:-Math.PI/2};en=Array.from({length:c.enemies||5},(_,i)=>({x:80+i*110,y:70+R.rand(0,100),a:Math.PI/2,hp:c.tough?2:1,cool:R.rand(0,1)}));shots=[];cool=0;lives=3;over=false;api.setStatus('敵車両を撃破')}reset();
 const fire=(o,enemy=false)=>{shots.push({x:o.x,y:o.y,vx:Math.cos(o.a)*260,vy:Math.sin(o.a)*260,enemy,t:2})};
 return api.canvas({
  reset,
  auto(e,dt,cfg){const t=en[0];if(!t)return;const ta=Math.atan2(t.y-pl.y,t.x-pl.x),d=Math.atan2(Math.sin(ta-pl.a),Math.cos(ta-pl.a));if(d>.08)press(e,'ArrowRight');if(d<-.08)press(e,'ArrowLeft');if(Math.abs(d)<.28)press(e,'Space');if(Math.hypot(t.x-pl.x,t.y-pl.y)>160)press(e,'ArrowUp')},
  update(e,dt){if(over)return;if(e.keys.has('ArrowLeft'))pl.a-=2.8*dt;if(e.keys.has('ArrowRight'))pl.a+=2.8*dt;if(e.keys.has('ArrowUp')){pl.x+=Math.cos(pl.a)*110*dt;pl.y+=Math.sin(pl.a)*110*dt}if(e.keys.has('ArrowDown')){pl.x-=Math.cos(pl.a)*75*dt;pl.y-=Math.sin(pl.a)*75*dt}pl.x=R.clamp(pl.x,15,625);pl.y=R.clamp(pl.y,15,465);cool-=dt;if(e.keys.has('Space')&&cool<=0){fire(pl);cool=.3}
   for(const q of en){q.cool-=dt;const ta=Math.atan2(pl.y-q.y,pl.x-q.x),d=Math.atan2(Math.sin(ta-q.a),Math.cos(ta-q.a));q.a+=Math.sign(d)*1.5*dt;if(Math.abs(d)<.35&&q.cool<=0){fire(q,true);q.cool=R.rand(.7,1.4)}}
   for(const b of shots){b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;if(b.enemy&&Math.hypot(b.x-pl.x,b.y-pl.y)<15){b.t=0;lives--;if(lives<=0){over=true;api.finish('撃破された')}}if(!b.enemy)for(const q of en)if(Math.hypot(b.x-q.x,b.y-q.y)<16){b.t=0;q.hp--;if(q.hp<=0){q.dead=true;api.addScore(100)}}}shots=shots.filter(b=>b.t>0&&b.x>0&&b.x<640&&b.y>0&&b.y<480);en=en.filter(q=>!q.dead);if(!en.length){over=true;api.addScore(1000);api.setStatus('勝利')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#182313');for(const q of en)drawTank(g,q,p.enemy||'#d66');drawTank(g,pl,p.player||'#8fd');for(const b of shots)rect(g,b.x-2,b.y-2,4,4,b.enemy?'#f66':'#fff');txt(g,'残機 '+lives,10,470,12,'#fff')},
 });
 function drawTank(g,o,col){g.save();g.translate(o.x,o.y);g.rotate(o.a);rect(g,-11,-8,22,16,col);rect(g,0,-2,18,4,'#ddd');g.restore()}
}

function sports(p,api){
 const c=p.cfg||{},type=c.type||'goal';let pl,ai,ball,scoreA,scoreB,time,over,meter;
 function reset(){pl={x:160,y:240};ai={x:480,y:240};ball={x:320,y:240,vx:0,vy:0};scoreA=scoreB=0;time=c.time||60;over=false;meter=0;api.setStatus(c.objective||'試合開始')}reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const tx=ball.x,ty=ball.y;if(pl.x<tx-12)press(e,'ArrowRight');if(pl.x>tx+12)press(e,'ArrowLeft');if(pl.y<ty-12)press(e,'ArrowDown');if(pl.y>ty+12)press(e,'ArrowUp');if(Math.hypot(pl.x-ball.x,pl.y-ball.y)<38)press(e,'Space')},
  update(e,dt){if(over)return;time-=dt;const sp=190;if(e.keys.has('ArrowLeft'))pl.x-=sp*dt;if(e.keys.has('ArrowRight'))pl.x+=sp*dt;if(e.keys.has('ArrowUp'))pl.y-=sp*dt;if(e.keys.has('ArrowDown'))pl.y+=sp*dt;pl.x=R.clamp(pl.x,20,620);pl.y=R.clamp(pl.y,35,445);const n=norm(ball.x-ai.x,ball.y-ai.y);ai.x+=n.x*(c.aiSpeed||130)*dt;ai.y+=n.y*(c.aiSpeed||130)*dt;if(e.keys.has('Space')&&Math.hypot(pl.x-ball.x,pl.y-ball.y)<42){const d=norm(640-ball.x,240-ball.y);ball.vx=d.x*(c.ballSpeed||330);ball.vy=d.y*(c.ballSpeed||330)}if(Math.hypot(ai.x-ball.x,ai.y-ball.y)<38){const d=norm(-ball.x,240-ball.y);ball.vx=d.x*280;ball.vy=d.y*280}ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=.992;ball.vy*=.992;if(ball.y<25||ball.y>455)ball.vy*=-1;if(ball.x>632){scoreA++;api.addScore(100);ball={x:320,y:240,vx:0,vy:0}}if(ball.x<8){scoreB++;ball={x:320,y:240,vx:0,vy:0}}if(time<=0){over=true;api.setStatus(scoreA>=scoreB?'勝利':'試合終了')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#145b2c');line(g,320,20,320,460,'#fff8',2);g.strokeStyle='#fff8';g.beginPath();g.arc(320,240,70,0,6.28);g.stroke();rect(g,8,190,12,100,'#fff');rect(g,620,190,12,100,'#fff');rect(g,pl.x-10,pl.y-10,20,20,p.player||'#7df');rect(g,ai.x-10,ai.y-10,20,20,p.enemy||'#f66');g.fillStyle='#fff';g.beginPath();g.arc(ball.x,ball.y,8,0,6.28);g.fill();txt(g,scoreA+' - '+scoreB,320,32,20,'#fff','center');txt(g,Math.max(0,Math.ceil(time))+'秒',320,468,12,'#fff','center')}
 })
}

function adventure(p,api){
 const c=p.cfg||{},W=20,H=14,S=28,OX=40,OY=36;let grid,pl,en,items,keys,exit,lives,over,moveT;
 function reset(){grid=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x===0||y===0||x===W-1||y===H-1||Math.random()<.08));pl={x:1,y:1};en=Array.from({length:c.enemies||6},()=>({x:Math.floor(R.rand(3,W-2)),y:Math.floor(R.rand(3,H-2)),hp:c.tough?2:1}));items=Array.from({length:c.items||5},()=>({x:Math.floor(R.rand(2,W-2)),y:Math.floor(R.rand(2,H-2)),taken:false}));keys=0;exit={x:W-2,y:H-2};lives=3;over=false;moveT=0;api.setStatus(c.objective||'遺物を集め出口へ')}reset();
 const dirs=[['ArrowRight',1,0],['ArrowLeft',-1,0],['ArrowDown',0,1],['ArrowUp',0,-1]],open=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&!grid[y][x];
 function autoDir(){const target=items.find(x=>!x.taken)||exit;let best=null;for(const[k,dx,dy]of dirs){const nx=pl.x+dx,ny=pl.y+dy;if(!open(nx,ny))continue;let s=-(Math.abs(target.x-nx)+Math.abs(target.y-ny));for(const q of en)s+=Math.min(7,Math.abs(q.x-nx)+Math.abs(q.y-ny));if(!best||s>best.s)best={k,s}}return best?.k}
 return api.canvas({
  reset,auto(e){const k=autoDir();if(k)press(e,k);if(en.some(q=>Math.abs(q.x-pl.x)+Math.abs(q.y-pl.y)<=1))press(e,'Space')},
  update(e,dt){if(over)return;moveT+=dt;if(moveT<.11)return;moveT=0;if(e.keys.has('Space'))for(const q of en)if(Math.abs(q.x-pl.x)+Math.abs(q.y-pl.y)<=1){q.hp--;if(q.hp<=0){q.dead=true;api.addScore(50)}}for(const[k,dx,dy]of dirs)if(e.keys.has(k)&&open(pl.x+dx,pl.y+dy)){pl.x+=dx;pl.y+=dy;break}en=en.filter(q=>!q.dead);for(const q of en){if(Math.random()<.6){const o=dirs.filter(d=>open(q.x+d[1],q.y+d[2]));if(o.length){o.sort((a,b)=>Math.abs(q.x+a[1]-pl.x)+Math.abs(q.y+a[2]-pl.y)-Math.abs(q.x+b[1]-pl.x)-Math.abs(q.y+b[2]-pl.y));q.x+=o[0][1];q.y+=o[0][2]}}if(q.x===pl.x&&q.y===pl.y){lives--;pl={x:1,y:1};if(lives<=0){over=true;api.finish('倒れた')}}}for(const it of items)if(!it.taken&&it.x===pl.x&&it.y===pl.y){it.taken=true;keys++;api.addScore(100)}if(keys===items.length&&pl.x===exit.x&&pl.y===exit.y){over=true;api.addScore(1000);api.setStatus('冒険クリア')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#132117');for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(grid[y][x])rect(g,OX+x*S,OY+y*S,S-2,S-2,p.wall||'#3b5137');for(const it of items)if(!it.taken)txt(g,'◆',OX+it.x*S+14,OY+it.y*S+20,15,'#ffd54b','center');rect(g,OX+exit.x*S+5,OY+exit.y*S+5,S-10,S-10,keys===items.length?'#6f6':'#555');for(const q of en)rect(g,OX+q.x*S+6,OY+q.y*S+6,S-12,S-12,p.enemy||'#f66');rect(g,OX+pl.x*S+6,OY+pl.y*S+6,S-12,S-12,p.player||'#fff');txt(g,'遺物 '+keys+'/'+items.length+'  残機 '+lives,10,470,12,'#fff')}
 })
}

function strategy(p,api){
 const c=p.cfg||{},W=12,H=8,S=42,OX=68,OY=70;let cells,res,pop,enemy,turn,over,autoT;
 function reset(){cells=Array.from({length:H},()=>Array(W).fill(0));res=120;pop=5;enemy=0;turn=0;over=false;autoT=0;api.setStatus(c.objective||'街を発展させる')}reset();
 function place(x,y,t){if(over||cells[y]?.[x]||res<(t===1?20:35))return false;cells[y][x]=t;res-=t===1?20:35;return true}
 function autoPlace(){let best=null;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!cells[y][x]){let n=0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(cells[y+dy]?.[x+dx])n++;if(!best||n>best.n)best={x,y,n}}if(best)place(best.x,best.y,res>80?2:1)}
 return api.canvas({
  reset,auto(e,dt,cfg){autoT-=dt;if(autoT<=0){autoT=.25+(1-cfg.skill)*.8;autoPlace()}},
  pointerDown(e,pnt){const x=Math.floor((pnt.x-OX)/S),y=Math.floor((pnt.y-OY)/S);if(x>=0&&x<W&&y>=0&&y<H)place(x,y,1)},
  update(e,dt){if(over)return;turn+=dt;if(turn>=1){turn=0;const homes=cells.flat().filter(x=>x===1).length,prod=cells.flat().filter(x=>x===2).length;res+=4+prod*5;pop+=homes*.15;enemy+=c.pressure||.45;if(enemy>20+prod*3){pop-=1;enemy*=.6}api.setScore(Math.floor(pop*20+res));if(pop<=0){over=true;api.finish('都市崩壊')}if(pop>=(c.goal||60)){over=true;api.addScore(1000);api.setStatus('目標達成')}}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#1b2d1d');for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=cells[y][x],xx=OX+x*S,yy=OY+y*S;rect(g,xx,yy,S-3,S-3,v===1?'#77b6ff':v===2?'#f7c75f':'#24422b');if(v===1)txt(g,'住',xx+S/2,yy+26,14,'#fff','center');if(v===2)txt(g,'産',xx+S/2,yy+26,14,'#222','center')}txt(g,'資源 '+Math.floor(res),12,24,13,'#fff');txt(g,'人口 '+Math.floor(pop),200,24,13,'#fff');txt(g,'脅威 '+Math.floor(enemy),400,24,13,'#fff')}
 })
}

function stealth(p,api){
 const c=p.cfg||{},W=20,H=14,S=28,OX=40,OY=36;let walls,pl,guards,target,exit,over,moveT,alert;
 function reset(){walls=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x===0||y===0||x===W-1||y===H-1||Math.random()<.09));pl={x:1,y:H-2};guards=Array.from({length:c.guards||5},()=>({x:Math.floor(R.rand(3,W-2)),y:Math.floor(R.rand(2,H-2)),dir:choose([[1,0],[-1,0],[0,1],[0,-1]])}));target={x:W-2,y:1,taken:false};exit={x:1,y:H-2};over=false;moveT=0;alert=0;api.setStatus(c.objective||'見つからず目標を回収')}reset();
 const dirs=[['ArrowRight',1,0],['ArrowLeft',-1,0],['ArrowDown',0,1],['ArrowUp',0,-1]],open=(x,y)=>!walls[y]?.[x];
 function seen(g){if(g.x===pl.x){const sy=Math.sign(pl.y-g.y);if(sy===g.dir[1]&&Math.abs(pl.y-g.y)<=5)return true}if(g.y===pl.y){const sx=Math.sign(pl.x-g.x);if(sx===g.dir[0]&&Math.abs(pl.x-g.x)<=5)return true}return false}
 return api.canvas({
  reset,
  auto(e){const t=target.taken?exit:target;let best=null;for(const[k,dx,dy]of dirs){const nx=pl.x+dx,ny=pl.y+dy;if(!open(nx,ny))continue;let risk=0;for(const g of guards)risk+=Math.max(0,6-(Math.abs(g.x-nx)+Math.abs(g.y-ny)))*3;const s=-(Math.abs(t.x-nx)+Math.abs(t.y-ny))-risk;if(!best||s>best.s)best={k,s}}if(best)press(e,best.k)},
  update(e,dt){if(over)return;moveT+=dt;if(moveT<.12)return;moveT=0;for(const[k,dx,dy]of dirs)if(e.keys.has(k)&&open(pl.x+dx,pl.y+dy)){pl.x+=dx;pl.y+=dy;break}for(const g of guards){if(Math.random()<.35){const o=dirs.filter(d=>open(g.x+d[1],g.y+d[2]));if(o.length){const d=choose(o);g.x+=d[1];g.y+=d[2];g.dir=[d[1],d[2]]}}if(seen(g))alert++}if(alert>5){over=true;api.finish('発見された')}if(!target.taken&&pl.x===target.x&&pl.y===target.y){target.taken=true;api.addScore(500);api.setStatus('脱出地点へ')}if(target.taken&&pl.x===exit.x&&pl.y===exit.y){over=true;api.addScore(1000);api.setStatus('任務完了')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#08140f');for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(walls[y][x])rect(g,OX+x*S,OY+y*S,S-2,S-2,'#27342f');for(const q of guards){rect(g,OX+q.x*S+7,OY+q.y*S+7,S-14,S-14,'#e66');line(g,OX+q.x*S+14,OY+q.y*S+14,OX+(q.x+q.dir[0]*3)*S+14,OY+(q.y+q.dir[1]*3)*S+14,'#f668',3)}if(!target.taken)txt(g,'★',OX+target.x*S+14,OY+target.y*S+21,17,'#fd5','center');rect(g,OX+pl.x*S+6,OY+pl.y*S+6,S-12,S-12,'#8ff');txt(g,'警戒 '+alert,10,470,12,'#fff')}
 })
}

function rhythm(p,api){
 let notes=[],spawn=0,combo=0,time=0,miss=0,over=false;const c=p.cfg||{},lanes=4,keys=['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'];
 function reset(){notes=[];spawn=.4;combo=0;time=c.time||60;miss=0;over=false;api.setStatus('リズムに合わせろ')}reset();
 function hitLane(l){let best=null;for(const n of notes)if(!n.hit&&n.lane===l){const d=Math.abs(n.y-390);if(!best||d<best.d)best={n,d}}if(best&&best.d<48){best.n.hit=true;combo++;api.addScore(best.d<12?100:best.d<25?70:40);api.beep(500+l*90,.025)}else{combo=0;miss++}}
 return api.canvas({
  reset,auto(e,dt,cfg){for(const n of notes)if(!n.hit&&n.y>370&&n.y<400&&Math.random()<cfg.skill*.95+(1-cfg.skill)*.3){if(e.autoTap)e.autoTap(keys[n.lane],.055);else press(e,keys[n.lane])}},
  keyDown(e,k){const i=keys.indexOf(k);if(i>=0)hitLane(i)},
  update(e,dt){if(over)return;time-=dt;spawn-=dt;if(spawn<=0){notes.push({lane:Math.floor(R.rand(0,lanes)),y:-20,hit:false});spawn=(c.interval||.6)*R.rand(.75,1.2)}for(const n of notes)n.y+=(c.speed||220)*dt;for(const n of notes)if(!n.hit&&n.y>430){n.hit=true;combo=0;miss++}notes=notes.filter(n=>n.y<470);if(time<=0){over=true;api.setStatus('終了')}} ,
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#100720');for(let i=0;i<lanes;i++){rect(g,120+i*100,20,80,420,'#ffffff08');rect(g,120+i*100,390,80,4,p.accent||'#6ff');txt(g,['←','↓','↑','→'][i],160+i*100,425,22,'#fff','center')}for(const n of notes)if(!n.hit)rect(g,135+n.lane*100,n.y,50,14,p.note||'#ff69c8');txt(g,'コンボ '+combo,10,25,13,'#fff');txt(g,'ミス '+miss,630,25,13,'#fff','right');txt(g,Math.max(0,Math.ceil(time))+'秒',320,25,13,'#fff','center')}
 })
}

function physics(p,api){
 let angle,power,proj,target,wind,shots,over;const c=p.cfg||{};
 function reset(){angle=45;power=65;proj=null;target={x:R.rand(430,590),y:385,r:18};wind=R.rand(-20,20);shots=c.shots||10;over=false;api.setStatus('角度と威力を合わせろ')}reset();
 function fire(){if(proj||shots<=0)return;const a=-angle*Math.PI/180;proj={x:70,y:390,vx:Math.cos(a)*power*4,vy:Math.sin(a)*power*4};shots--;api.beep(250,.03)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const dx=target.x-70,dy=390-target.y;let best=null;for(let a=15;a<=75;a+=2)for(let pw=35;pw<=95;pw+=3){const rad=a*Math.PI/180,vx=Math.cos(rad)*pw*4,vy=Math.sin(rad)*pw*4,tt=dx/Math.max(1,vx),y=390-vy*tt+0.5*(180)*tt*tt;if(!best||Math.abs(y-target.y)<best.err)best={a,pw,err:Math.abs(y-target.y)}}angle=best.a+human(cfg,8);power=best.pw+human(cfg,10);press(e,'Space')},
  keyDown(e,k){if(k==='Space')fire()},
  update(e,dt){if(over)return;if(e.keys.has('ArrowUp'))angle=Math.min(80,angle+40*dt);if(e.keys.has('ArrowDown'))angle=Math.max(10,angle-40*dt);if(e.keys.has('ArrowRight'))power=Math.min(100,power+45*dt);if(e.keys.has('ArrowLeft'))power=Math.max(20,power-45*dt);if(proj){proj.vx+=wind*dt;proj.vy+=180*dt;proj.x+=proj.vx*dt;proj.y+=proj.vy*dt;if(Math.hypot(proj.x-target.x,proj.y-target.y)<target.r+6){api.addScore(500+shots*20);target={x:R.rand(430,590),y:385,r:18};proj=null;wind=R.rand(-20,20)}else if(proj.y>430||proj.x>650){proj=null;if(shots<=0){over=true;api.finish('弾切れ')}}}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#1b2947');rect(g,0,410,640,70,'#4a5534');g.fillStyle=p.target||'#f65';g.beginPath();g.arc(target.x,target.y,target.r,0,6.28);g.fill();const rad=-angle*Math.PI/180;line(g,70,390,70+Math.cos(rad)*50,390+Math.sin(rad)*50,'#fff',4);if(proj){g.fillStyle='#fff';g.beginPath();g.arc(proj.x,proj.y,6,0,6.28);g.fill()}txt(g,'角度 '+Math.round(angle),10,24,13,'#fff');txt(g,'威力 '+Math.round(power),180,24,13,'#fff');txt(g,'風 '+wind.toFixed(1),360,24,13,'#fff');txt(g,'残弾 '+shots,630,24,13,'#fff','right')}
 })
}

function management(p,api){
 const c=p.cfg||{};let needs,money,day,autoT,over,selected;
 function reset(){needs={energy:70,food:70,fun:60,social:55};money=100;day=1;autoT=0;over=false;selected='work';api.setStatus(c.objective||'生活を維持する')}reset();
 const actions={work:()=>{money+=25;needs.energy-=14;needs.fun-=8},eat:()=>{if(money>=8){money-=8;needs.food+=32}},rest:()=>{needs.energy+=35;needs.food-=7},fun:()=>{if(money>=5){money-=5;needs.fun+=30;needs.social+=8}},social:()=>{needs.social+=30;needs.fun+=10;needs.energy-=5}};
 function doAction(a){actions[a]?.();for(const k in needs)needs[k]=R.clamp(needs[k],0,100);api.addScore(10)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){autoT-=dt;if(autoT<=0){autoT=.35+(1-cfg.skill)*.7;const low=Object.entries(needs).sort((a,b)=>a[1]-b[1])[0][0];doAction(low==='energy'?'rest':low==='food'?'eat':low==='fun'?'fun':low==='social'?'social':'work')}},
  keyDown(e,k){const m={ArrowUp:'work',ArrowDown:'rest',ArrowLeft:'eat',ArrowRight:'fun',Space:'social'};if(m[k])doAction(m[k])},
  update(e,dt){if(over)return;day+=dt*.08;needs.food-=dt*1.1;needs.energy-=dt*.7;needs.fun-=dt*.45;needs.social-=dt*.35;for(const k in needs)needs[k]=R.clamp(needs[k],0,100);if(Object.values(needs).some(v=>v<=0)){over=true;api.finish('生活崩壊')}if(day>=(c.days||30)){over=true;api.addScore(Math.floor(money*5));api.setStatus('期間終了')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#24304a');txt(g,p.title||'LIFE',320,55,24,'#fff','center');const arr=[['体力','energy','#65d4ff'],['食事','food','#7ee081'],['楽しさ','fun','#ffcc5c'],['交流','social','#f58ad5']];arr.forEach((q,i)=>{txt(g,q[0],120,130+i*60,14,'#fff');rect(g,200,115+i*60,320,24,'#0006');rect(g,200,115+i*60,320*needs[q[1]]/100,24,q[2]);txt(g,Math.round(needs[q[1]])+'%',530,133+i*60,12,'#fff')});txt(g,'所持 '+Math.floor(money),120,390,16,'#fff');txt(g,'日 '+Math.floor(day),520,390,16,'#fff','right');txt(g,'↑仕事　←食事　↓休息　→遊び　Space交流',320,445,13,'#ddd','center')}
 })
}


function fighter(p,api){
 const c=p.cfg||{};let a,b,time,over,combo;
 function reset(){a={x:150,y:350,hp:100,vx:0,vy:0,on:true,cool:0};b={x:490,y:350,hp:100,vx:0,vy:0,on:true,cool:0};time=c.time||75;over=false;combo=0;api.setStatus('ラウンド開始')}reset();
 function attack(from,to,strong=false){if(from.cool>0)return;from.cool=strong?.45:.28;const range=strong?62:48,damage=strong?(c.heavy||13):(c.light||7);if(Math.abs(from.x-to.x)<range&&Math.abs(from.y-to.y)<42){to.hp-=damage;to.vx+=Math.sign(to.x-from.x)*(strong?105:65);if(from===a){combo++;api.addScore(damage*combo)}api.beep(strong?160:260,.03)}else if(from===a)combo=0}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const d=b.x-a.x;if(Math.abs(d)>52)press(e,d>0?'ArrowRight':'ArrowLeft');else{if(Math.random()<.03+cfg.skill*.06)press(e,'KeyX');else press(e,'Space')}if(b.cool<.1&&Math.abs(d)<58&&Math.random()<.02){if(e.autoTap)e.autoTap('ArrowUp',.22);else press(e,'ArrowUp')}},
  keyDown(e,k){if(k==='Space')attack(a,b,false);if(k==='KeyX')attack(a,b,true);if(k==='ArrowUp'&&a.on){a.vy=-300;a.on=false}},
  update(e,dt){if(over)return;time-=dt;a.cool=Math.max(0,a.cool-dt);b.cool=Math.max(0,b.cool-dt);const sp=c.speed||170;if(e.keys.has('ArrowLeft'))a.x-=sp*dt;if(e.keys.has('ArrowRight'))a.x+=sp*dt;a.vy+=650*dt;a.y+=a.vy*dt;if(a.y>=350){a.y=350;a.vy=0;a.on=true}a.x=R.clamp(a.x,30,610);
   const d=a.x-b.x;if(Math.abs(d)>58)b.x+=Math.sign(d)*(c.aiSpeed||120)*dt;else if(b.cool<=0&&Math.random()<dt*(c.aiAggro||2.2))attack(b,a,Math.random()<.3);b.vx*=.9;a.vx*=.9;b.x+=b.vx*dt;a.x+=a.vx*dt;
   if(a.hp<=0||b.hp<=0||time<=0){over=true;api.setStatus(a.hp>b.hp?'勝利！':'敗北');if(a.hp>b.hp)api.addScore(1000)}
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#1d1b2a');rect(g,0,390,640,90,p.ground||'#4b3b38');rect(g,30,22,250,15,'#411');rect(g,30,22,250*Math.max(0,a.hp)/100,15,'#5f7');rect(g,360,22,250,15,'#411');rect(g,610-250*Math.max(0,b.hp)/100,22,250*Math.max(0,b.hp)/100,15,'#f65');rect(g,a.x-14,a.y-42,28,42,p.player||'#7df');rect(g,b.x-14,b.y-42,28,42,p.enemy||'#f76');txt(g,Math.max(0,Math.ceil(time)),320,38,18,'#fff','center');if(api.mode==='modern')txt(g,'コンボ '+combo,320,465,12,'#ffd','center')}
 })
}

function puzzle(p,api){
 const c=p.cfg||{},W=c.cols||8,H=c.rows||16,S=24,OX=(640-(c.cols||8)*24)/2,OY=35,colors=p.colors||['#f45','#4df','#fd5','#7d6'];let board,pair,fall,over,chain;
 function reset(){board=Array.from({length:H},()=>Array(W).fill(null));pair=null;fall=0;over=false;chain=0;spawn();api.setStatus(c.objective||'同じ色を4つつなげる')} 
 function spawn(){pair={x:Math.floor(W/2)-1,y:0,r:0,a:Math.floor(R.rand(0,colors.length)),b:Math.floor(R.rand(0,colors.length))};if(!valid(pair.x,pair.y,pair.r)){over=true;api.finish('積み上がった')}}
 function cells(x=pair.x,y=pair.y,r=pair.r){const d=[[0,-1],[1,0],[0,1],[-1,0]][r%4];return[[x,y,pair.a],[x+d[0],y+d[1],pair.b]]}
 function valid(x,y,r){return cells(x,y,r).every(([cx,cy])=>cx>=0&&cx<W&&cy<H&&(cy<0||!board[cy][cx]))}
 function groups(){const seen=new Set(),del=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(board[y][x]==null||seen.has(x+','+y))continue;const col=board[y][x],q=[[x,y]],grp=[];seen.add(x+','+y);while(q.length){const[a,b]=q.pop();grp.push([a,b]);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+dx,ny=b+dy,k=nx+','+ny;if(nx>=0&&nx<W&&ny>=0&&ny<H&&!seen.has(k)&&board[ny][nx]===col){seen.add(k);q.push([nx,ny])}}}if(grp.length>=4)del.push(...grp)}return del}
 function gravity(){for(let x=0;x<W;x++){const v=[];for(let y=H-1;y>=0;y--)if(board[y][x]!=null)v.push(board[y][x]);for(let y=H-1,i=0;y>=0;y--)board[y][x]=i<v.length?v[i++]:null}}
 function lock(){for(const[x,y,col]of cells())if(y>=0)board[y][x]=col;let total=0,n=0;while(true){const d=groups();if(!d.length)break;n++;for(const[x,y]of d)board[y][x]=null;total+=d.length;gravity()}chain=n;if(total)api.addScore(total*20*Math.max(1,n));spawn()}
 function plan(){let best=null;for(let r=0;r<4;r++)for(let x=0;x<W;x++){if(!valid(x,0,r))continue;let y=0;while(valid(x,y+1,r))y++;let score=y*2;const cc=cells(x,y,r);for(const[cx,cy,col]of cc){for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(board[cy+dy]?.[cx+dx]===col)score+=5}if(!best||score>best.s)best={x,r,s:score}}return best}
 reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const b=plan();if(!b)return;if(pair.r!==b.r){press(e,'ArrowUp');return}if(pair.x<b.x)press(e,'ArrowRight');else if(pair.x>b.x)press(e,'ArrowLeft');else press(e,'ArrowDown')},
  update(e,dt){if(over)return;if(e.keys.has('ArrowLeft')&&valid(pair.x-1,pair.y,pair.r))pair.x--;if(e.keys.has('ArrowRight')&&valid(pair.x+1,pair.y,pair.r))pair.x++;if(e.keys.has('ArrowUp')&&valid(pair.x,pair.y,(pair.r+1)%4))pair.r=(pair.r+1)%4;fall+=dt*(e.keys.has('ArrowDown')?8:1);if(fall>.55){fall=0;if(valid(pair.x,pair.y+1,pair.r))pair.y++;else lock()}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#09101f');rect(g,OX-4,OY-4,W*S+8,H*S+8,'#26344c');for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(board[y][x]!=null){g.fillStyle=colors[board[y][x]];g.beginPath();g.arc(OX+x*S+S/2,OY+y*S+S/2,S*.4,0,6.28);g.fill()}if(!over)for(const[x,y,col]of cells())if(y>=0){g.fillStyle=colors[col];g.beginPath();g.arc(OX+x*S+S/2,OY+y*S+S/2,S*.4,0,6.28);g.fill()}if(api.mode==='modern'&&chain>1)txt(g,chain+'連鎖',530,80,18,'#ffd','center')}
 })
}

function raycast(p,api){
 const c=p.cfg||{},MW=12,MH=12;let map,pl,en,lives,ammo,over,cool;
 function reset(){map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>x===0||y===0||x===MW-1||y===MH-1||Math.random()<.12));pl={x:1.5,y:1.5,a:0};en=Array.from({length:c.enemies||7},()=>({x:R.rand(2,MW-2),y:R.rand(2,MH-2),hp:c.tough?2:1})).filter(q=>!map[Math.floor(q.y)][Math.floor(q.x)]);lives=3;ammo=c.ammo||60;over=false;cool=0;api.setStatus(c.objective||'出口まで敵を排除')}reset();
 const open=(x,y)=>!map[Math.floor(y)]?.[Math.floor(x)];
 function nearest(){return [...en].sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.y)-Math.hypot(b.x-pl.x,b.y-pl.y))[0]}
 function fire(){if(cool>0||ammo<=0)return;cool=.22;ammo--;let best=null;for(const q of en){const ang=Math.atan2(q.y-pl.y,q.x-pl.x),d=Math.atan2(Math.sin(ang-pl.a),Math.cos(ang-pl.a)),dist=Math.hypot(q.x-pl.x,q.y-pl.y);if(Math.abs(d)<.18&&(!best||dist<best.dist))best={q,dist}}if(best){best.q.hp--;if(best.q.hp<=0){best.q.dead=true;api.addScore(100)}}api.beep(130,.035)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const t=nearest();if(!t)return;const ta=Math.atan2(t.y-pl.y,t.x-pl.x),d=Math.atan2(Math.sin(ta-pl.a),Math.cos(ta-pl.a));if(d>.06)press(e,'ArrowRight');if(d<-.06)press(e,'ArrowLeft');if(Math.abs(d)<.2)press(e,'Space');if(Math.abs(d)<.65&&Math.hypot(t.x-pl.x,t.y-pl.y)>2.2)press(e,'ArrowUp')},
  keyDown(e,k){if(k==='Space')fire()},
  update(e,dt){if(over)return;cool=Math.max(0,cool-dt);if(e.keys.has('ArrowLeft'))pl.a-=2.2*dt;if(e.keys.has('ArrowRight'))pl.a+=2.2*dt;let mv=0;if(e.keys.has('ArrowUp'))mv=2.2*dt;if(e.keys.has('ArrowDown'))mv=-1.5*dt;const nx=pl.x+Math.cos(pl.a)*mv,ny=pl.y+Math.sin(pl.a)*mv;if(open(nx,pl.y))pl.x=nx;if(open(pl.x,ny))pl.y=ny;for(const q of en){if(q.dead)continue;const d=Math.hypot(q.x-pl.x,q.y-pl.y);if(d<.7){lives--;q.x=R.rand(2,MW-2);q.y=R.rand(2,MH-2);if(lives<=0){over=true;api.finish('倒された')}}}en=en.filter(q=>!q.dead);if(!en.length){over=true;api.addScore(1000);api.setStatus('エリア制圧')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,240,p.ceiling||'#1b2230');rect(g,0,240,640,240,p.floor||'#3d3028');const fov=Math.PI/3,rays=160;for(let i=0;i<rays;i++){const ra=pl.a-fov/2+fov*i/(rays-1);let d=.02;while(d<14&&open(pl.x+Math.cos(ra)*d,pl.y+Math.sin(ra)*d))d+=.035;const hh=Math.min(460,350/(d*Math.cos(ra-pl.a)+.01)),shade=Math.max(35,210-d*14)|0;rect(g,i*4,240-hh/2,5,hh,'rgb('+shade+','+shade+','+shade+')')}for(const q of en){const dx=q.x-pl.x,dy=q.y-pl.y,dist=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),d=Math.atan2(Math.sin(ang-pl.a),Math.cos(ang-pl.a));if(Math.abs(d)<fov/2&&dist>.2){const x=320+d/(fov/2)*320,size=R.clamp(130/dist,12,150);rect(g,x-size/2,240-size/2,size,size,p.enemy||'#b33')}}line(g,305,240,335,240,'#6f6');line(g,320,225,320,255,'#6f6');txt(g,'残機 '+lives,10,24,12,'#fff');txt(g,'弾 '+ammo,630,24,12,'#fff','right')}
 })
}


function runGun(p,api){
 const c=p.cfg||{};let pl,cam,en,shots,enemyShots,spawn,cool,lives,over,combo;
 const world=c.levelW||3000;
 function reset(){pl={x:70,y:360,vx:0,vy:0,on:true};cam=0;en=[];shots=[];enemyShots=[];spawn=.4;cool=0;lives=3;over=false;combo=0;api.setStatus(c.objective||'前進しながら敵を倒せ')}reset();
 function shoot(){if(cool>0)return;cool=c.fireDelay||.16;shots.push({x:pl.x+14,y:pl.y-20,vx:430});api.beep(600,.02)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const t=en.filter(q=>q.x>pl.x-40).sort((a,b)=>a.x-b.x)[0];press(e,'ArrowRight');if(t&&t.x-pl.x<360)press(e,'Space',.09);if((t&&t.x-pl.x<80)||Math.sin(pl.x*.025)>.88){e.autoTap?.('ArrowUp',.22)}},
  keyDown(e,k){if(k==='ArrowUp'&&pl.on){pl.vy=-(c.jump||350);pl.on=false}if(k==='Space')shoot()},
  update(e,dt){if(over)return;cool=Math.max(0,cool-dt);const accel=420;if(e.keys.has('ArrowLeft'))pl.vx-=accel*dt;if(e.keys.has('ArrowRight'))pl.vx+=accel*dt;pl.vx*=Math.pow(.90,dt*60);pl.vy+=(c.gravity||780)*dt;pl.x+=pl.vx*dt;pl.y+=pl.vy*dt;const ground=390+Math.sin(pl.x*.008)*10;if(pl.y>=ground){pl.y=ground;pl.vy=0;pl.on=true}pl.x=R.clamp(pl.x,0,world);
   spawn-=dt;if(spawn<=0&&pl.x<world-400){en.push({x:pl.x+R.rand(360,620),y:390,hp:c.tough?2:1,cool:R.rand(.4,1.2)});spawn=R.rand(.55,1.1)}
   for(const q of en){q.cool-=dt;if(q.x-pl.x<420&&q.cool<=0){enemyShots.push({x:q.x-8,y:q.y-22,vx:-230});q.cool=R.rand(.7,1.4)}}
   for(const b of shots)b.x+=b.vx*dt;for(const b of enemyShots)b.x+=b.vx*dt;
   for(const b of shots)for(const q of en)if(!b.dead&&!q.dead&&Math.abs(b.x-q.x)<18&&Math.abs(b.y-(q.y-18))<22){b.dead=true;q.hp--;if(q.hp<=0){q.dead=true;combo++;api.addScore(50+combo*5)}}
   for(const b of enemyShots)if(!b.dead&&Math.abs(b.x-pl.x)<16&&Math.abs(b.y-(pl.y-18))<24){b.dead=true;lives--;combo=0;if(lives<=0){over=true;api.finish('ゲームオーバー')}}
   shots=shots.filter(b=>!b.dead&&b.x<pl.x+700);enemyShots=enemyShots.filter(b=>!b.dead&&b.x>pl.x-500);en=en.filter(q=>!q.dead&&q.x>pl.x-200);
   if(pl.x>=world-80){over=true;api.addScore(1000);api.setStatus('ステージクリア')}cam=R.clamp(pl.x-170,0,world-640)
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#17253b');for(let x=Math.floor(cam/80)*80;x<cam+720;x+=80){rect(g,x-cam,402,78,78,(Math.floor(x/80)%2)?'#31432c':'#394b31')}for(const q of en)if(q.x-cam>-30&&q.x-cam<670){rect(g,q.x-cam-10,q.y-38,20,38,p.enemy||'#e85f55')}rect(g,pl.x-cam-10,pl.y-40,20,40,p.player||'#72d9ff');for(const b of shots)rect(g,b.x-cam,b.y,8,3,'#fff');for(const b of enemyShots)rect(g,b.x-cam,b.y,7,3,'#ff6b70');txt(g,'残機 '+lives,10,24,12,'#fff');txt(g,'コンボ '+combo,630,24,12,'#fff','right')}
 })
}

function beatEmUp(p,api){
 const c=p.cfg||{};let pl,en,spawn,lives,over,combo,attackCd,stageX;
 function reset(){pl={x:120,y:315,hp:100};en=[];spawn=.3;lives=3;over=false;combo=0;attackCd=0;stageX=0;api.setStatus(c.objective||'敵を倒して進め')}reset();
 function attack(strong=false){if(attackCd>0)return;attackCd=strong?.42:.24;let hitAny=false;for(const q of en)if(!q.dead&&Math.abs(q.x-pl.x)<(strong?72:55)&&Math.abs(q.y-pl.y)<38){q.hp-=strong?2:1;q.x+=Math.sign(q.x-pl.x)*(strong?28:16);hitAny=true;if(q.hp<=0){q.dead=true;combo++;api.addScore(80+combo*8)}}if(!hitAny)combo=0;api.beep(strong?150:240,.025)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const t=[...en].filter(q=>!q.dead).sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.y)-Math.hypot(b.x-pl.x,b.y-pl.y))[0];if(!t){press(e,'ArrowRight');return}const dx=t.x-pl.x,dy=t.y-pl.y;if(Math.abs(dx)>42)press(e,dx>0?'ArrowRight':'ArrowLeft');if(Math.abs(dy)>18)press(e,dy>0?'ArrowDown':'ArrowUp');if(Math.abs(dx)<60&&Math.abs(dy)<30)press(e,Math.random()<.25?'KeyX':'Space',.11)},
  keyDown(e,k){if(k==='Space')attack(false);if(k==='KeyX')attack(true)},
  update(e,dt){if(over)return;attackCd=Math.max(0,attackCd-dt);const sp=c.speed||180;if(e.keys.has('ArrowLeft'))pl.x-=sp*dt;if(e.keys.has('ArrowRight'))pl.x+=sp*dt;if(e.keys.has('ArrowUp'))pl.y-=sp*.7*dt;if(e.keys.has('ArrowDown'))pl.y+=sp*.7*dt;pl.x=R.clamp(pl.x,25,615);pl.y=R.clamp(pl.y,235,385);
   spawn-=dt;if(spawn<=0&&stageX<6){en.push({x:R.rand(390,610),y:R.rand(245,375),hp:c.tough?4:3,cool:R.rand(.2,.8)});stageX++;spawn=R.rand(.7,1.3)}
   for(const q of en){q.cool-=dt;const d=Math.hypot(q.x-pl.x,q.y-pl.y);if(d>45){const n=norm(pl.x-q.x,pl.y-q.y);q.x+=n.x*(c.enemySpeed||75)*dt;q.y+=n.y*(c.enemySpeed||75)*dt}else if(q.cool<=0){pl.hp-=c.enemyDamage||8;q.cool=R.rand(.7,1.2);combo=0;if(pl.hp<=0){lives--;pl.hp=100;if(lives<=0){over=true;api.finish('ゲームオーバー')}}}}
   en=en.filter(q=>!q.dead);if(stageX>=6&&!en.length){stageX=0;api.addScore(500);api.setStatus('次の区画')}
  },
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#202736');rect(g,0,220,640,200,p.ground||'#4a403d');for(let x=0;x<640;x+=80)line(g,x,220,x+35,420,'#ffffff0d');for(const q of en)rect(g,q.x-12,q.y-34,24,34,p.enemy||'#e66');rect(g,pl.x-12,pl.y-38,24,38,p.player||'#7df');rect(g,20,18,220,12,'#411');rect(g,20,18,220*pl.hp/100,12,'#5e8');txt(g,'残機 '+lives,10,455,12,'#fff');txt(g,'コンボ '+combo,630,455,12,'#fff','right')}
 })
}

function fixedPlatform(p,api){
 const c=p.cfg||{};let pl,en,items,lives,over,vy,moveCd;
 const plats=[{x:40,y:410,w:560},{x:70,y:320,w:190},{x:365,y:320,w:205},{x:155,y:230,w:330},{x:75,y:140,w:180},{x:390,y:140,w:175}];
 function reset(){pl={x:100,y:390,on:true};en=Array.from({length:c.enemies||6},(_,i)=>({x:R.rand(70,570),y:plats[1+i%(plats.length-1)].y-18,dir:Math.random()<.5?-1:1}));items=Array.from({length:c.items||8},(_,i)=>({x:R.rand(80,560),y:plats[i%plats.length].y-28,taken:false}));lives=3;over=false;vy=0;moveCd=0;api.setStatus(c.objective||'画面内の目標を集めろ')}reset();
 function floorY(x,y){let best=430;for(const q of plats)if(x>=q.x&&x<=q.x+q.w&&q.y>=y-6)best=Math.min(best,q.y);return best}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const target=items.filter(i=>!i.taken).sort((a,b)=>Math.abs(a.x-pl.x)+Math.abs(a.y-pl.y)-Math.abs(b.x-pl.x)-Math.abs(b.y-pl.y))[0];if(!target)return;if(Math.abs(target.x-pl.x)>15)press(e,target.x>pl.x?'ArrowRight':'ArrowLeft');if(target.y<pl.y-35)e.autoTap?.('ArrowUp',.18)},
  keyDown(e,k){if(k==='ArrowUp'&&pl.on){vy=-(c.jump||330);pl.on=false}},
  update(e,dt){if(over)return;const sp=190;if(e.keys.has('ArrowLeft'))pl.x-=sp*dt;if(e.keys.has('ArrowRight'))pl.x+=sp*dt;pl.x=R.clamp(pl.x,30,610);vy+=680*dt;pl.y+=vy*dt;const fy=floorY(pl.x,pl.y);if(pl.y>=fy-18&&vy>=0){pl.y=fy-18;vy=0;pl.on=true}for(const q of en){q.x+=q.dir*(c.enemySpeed||70)*dt;if(q.x<45||q.x>595)q.dir*=-1;if(Math.hypot(q.x-pl.x,q.y-pl.y)<22){lives--;pl.x=100;pl.y=390;vy=0;if(lives<=0){over=true;api.finish('ゲームオーバー')}}}for(const it of items)if(!it.taken&&Math.hypot(it.x-pl.x,it.y-pl.y)<24){it.taken=true;api.addScore(100)}if(items.every(i=>i.taken)){over=true;api.addScore(700);api.setStatus('クリア！')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#11172a');for(const q of plats)rect(g,q.x,q.y,q.w,8,p.platform||'#d55d75');for(const it of items)if(!it.taken)txt(g,'◆',it.x,it.y,16,'#ffd65f','center');for(const q of en)rect(g,q.x-9,q.y-18,18,18,p.enemy||'#f66');rect(g,pl.x-9,pl.y-20,18,20,p.player||'#7df');txt(g,'残機 '+lives,10,465,12,'#fff')}
 })
}

function galleryShooter(p,api){
 const c=p.cfg||{};let aim,targets,spawn,time,shots,hits,over,cool;
 function reset(){aim={x:320,y:240};targets=[];spawn=.1;time=c.time||60;shots=c.shots||40;hits=0;over=false;cool=0;api.setStatus(c.objective||'標的を狙え')}reset();
 function fire(){if(over||cool>0||shots<=0)return;cool=.12;shots--;let best=null;for(const t of targets){const d=Math.hypot(t.x-aim.x,t.y-aim.y);if(!best||d<best.d)best={t,d}}if(best&&best.d<best.t.r+12){best.t.dead=true;hits++;api.addScore(50+Math.max(0,30-Math.floor(best.d)));api.beep(560,.025)}else api.beep(130,.03)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const t=targets[0];if(!t)return;aim.x+=((t.x+human(cfg,18))-aim.x)*Math.min(1,dt*(5+cfg.skill*10));aim.y+=((t.y+human(cfg,18))-aim.y)*Math.min(1,dt*(5+cfg.skill*10));if(Math.hypot(t.x-aim.x,t.y-aim.y)<20+cfg.skill*18)press(e,'Space',.12)},
  keyDown(e,k){if(k==='Space')fire()},
  pointerMove(e,pnt){aim.x=pnt.x;aim.y=pnt.y},pointerDown(e,pnt){aim.x=pnt.x;aim.y=pnt.y;fire()},
  update(e,dt){if(over)return;time-=dt;cool=Math.max(0,cool-dt);spawn-=dt;if(spawn<=0){targets.push({x:R.rand(60,580),y:R.rand(65,360),vx:R.rand(-55,55),vy:R.rand(-20,20),r:R.rand(12,20),life:R.rand(2.2,4)});spawn=R.rand(.35,.8)}for(const t of targets){t.x+=t.vx*dt;t.y+=t.vy*dt;t.life-=dt;if(t.x<30||t.x>610)t.vx*=-1;if(t.y<40||t.y>390)t.vy*=-1}targets=targets.filter(t=>!t.dead&&t.life>0);if(time<=0||shots<=0){over=true;api.setStatus('終了 命中 '+hits)}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#081018');for(const t of targets){g.strokeStyle=p.target||'#ffda64';g.lineWidth=3;g.beginPath();g.arc(t.x,t.y,t.r,0,6.28);g.stroke();g.beginPath();g.arc(t.x,t.y,t.r*.45,0,6.28);g.stroke()}line(g,aim.x-12,aim.y,aim.x+12,aim.y,'#fff');line(g,aim.x,aim.y-12,aim.x,aim.y+12,'#fff');txt(g,'残弾 '+shots,10,25,12,'#fff');txt(g,'命中 '+hits,630,25,12,'#fff','right');txt(g,Math.max(0,Math.ceil(time))+'秒',320,25,12,'#fff','center')}
 })
}

function railShooter(p,api){
 const c=p.cfg||{};let pl,en,shots,spawn,lives,dist,over,cool;
 function reset(){pl={x:320,y:300};en=[];shots=[];spawn=.2;lives=3;dist=0;over=false;cool=0;api.setStatus(c.objective||'前方の敵を撃破')}reset();
 function fire(){if(cool>0)return;cool=.14;shots.push({x:pl.x,y:pl.y,t:1});api.beep(620,.02)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const danger=en.filter(q=>q.z<.45).sort((a,b)=>a.z-b.z)[0];if(danger){if(pl.x<danger.x)press(e,'ArrowLeft');else press(e,'ArrowRight')}const t=en[0];if(t){if(Math.abs(pl.x-t.x)>10)press(e,pl.x<t.x?'ArrowRight':'ArrowLeft');if(Math.abs(pl.y-t.y)>10)press(e,pl.y<t.y?'ArrowDown':'ArrowUp');press(e,'Space',.1)}},
  keyDown(e,k){if(k==='Space')fire()},
  update(e,dt){if(over)return;const sp=230;if(e.keys.has('ArrowLeft'))pl.x-=sp*dt;if(e.keys.has('ArrowRight'))pl.x+=sp*dt;if(e.keys.has('ArrowUp'))pl.y-=sp*dt;if(e.keys.has('ArrowDown'))pl.y+=sp*dt;pl.x=R.clamp(pl.x,80,560);pl.y=R.clamp(pl.y,80,390);cool=Math.max(0,cool-dt);dist+=dt*120;spawn-=dt;if(spawn<=0){en.push({x:R.rand(100,540),y:R.rand(90,340),z:1,hp:c.tough?2:1});spawn=R.rand(.3,.65)}for(const q of en)q.z-=dt*(c.enemySpeed||.28);for(const b of shots){b.t-=dt;let best=en.filter(q=>q.z>.1).sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.y)-Math.hypot(b.x-pl.x,b.y-pl.y))[0];if(best&&Math.hypot(best.x-pl.x,best.y-pl.y)<80){best.hp--;b.t=0;if(best.hp<=0){best.dead=true;api.addScore(60)}}}for(const q of en)if(q.z<=.05&&!q.dead){q.dead=true;lives--;if(lives<=0){over=true;api.finish('撃墜')}}en=en.filter(q=>!q.dead);shots=shots.filter(b=>b.t>0)},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#030716');for(let i=0;i<70;i++){const z=((i*37+dist)%500)/500,sz=1+z*3,x=320+(Math.sin(i*8.17)*290)*(1-z*.25),y=240+(Math.cos(i*3.31)*210)*(1-z*.25);rect(g,x,y,sz,sz,'#ffffff99')}for(const q of en){const size=12+(1-q.z)*55;rect(g,q.x-size/2,q.y-size/2,size,size,p.enemy||'#f66')}rect(g,pl.x-13,pl.y-8,26,16,p.player||'#7df');line(g,pl.x-15,pl.y,pl.x+15,pl.y,'#fff6');line(g,pl.x,pl.y-15,pl.x,pl.y+15,'#fff6');txt(g,'残機 '+lives,10,25,12,'#fff')}
 })
}

function trackField(p,api){
 const c=p.cfg||{};let speed,dist,time,event,over,lastTap,stamina;
 function reset(){speed=0;dist=0;time=c.time||35;event=0;over=false;lastTap='';stamina=100;api.setStatus(c.objective||'記録を伸ばせ')}reset();
 function stride(k){if(over||k===lastTap)return;lastTap=k;speed=Math.min(100,speed+8);stamina=Math.max(0,stamina-1.8);api.addScore(Math.max(1,Math.floor(speed*.2)))}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const k=Math.floor((time*14))%2?'ArrowLeft':'ArrowRight';e.autoTap?.(k,.045);if(dist>220&&dist<245)e.autoTap?.('Space',.18)},
  keyDown(e,k){if(k==='ArrowLeft'||k==='ArrowRight')stride(k);if(k==='Space'&&dist>200){speed=Math.min(100,speed+18);api.addScore(100)}},
  keyUp(e,k){if(k===lastTap)lastTap=''},
  update(e,dt){if(over)return;time-=dt;speed=Math.max(0,speed-dt*(stamina>0?13:25));stamina=Math.min(100,stamina+dt*4);dist+=speed*dt;if(time<=0){over=true;api.setStatus('記録 '+Math.floor(dist)+'m')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#447dc0');rect(g,0,320,640,160,'#b65a46');for(let y=340;y<470;y+=32)line(g,0,y,640,y,'#fff8');const x=100+((dist*3)%470);rect(g,x-8,285,16,35,p.player||'#fff');txt(g,'速度 '+Math.floor(speed),20,40,14,'#fff');txt(g,'距離 '+Math.floor(dist)+'m',320,40,14,'#fff','center');txt(g,'残り '+Math.max(0,Math.ceil(time))+'秒',620,40,14,'#fff','right')}
 })
}

function serviceGame(p,api){
 const c=p.cfg||{};let rows,score,time,over,autoT;
 function reset(){rows=Array.from({length:4},(_,i)=>({need:R.rand(10,60),served:0}));score=0;time=c.time||60;over=false;autoT=0;api.setStatus(c.objective||'要求が溜まる前に処理')}reset();
 function serve(i){const r=rows[i];if(!r)return;r.need=Math.max(0,r.need-35);r.served++;score++;api.addScore(25+(r.need<20?10:0));api.beep(420+i*60,.02)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){autoT-=dt;if(autoT<=0){autoT=.12+(1-cfg.skill)*.35;let i=0;for(let k=1;k<rows.length;k++)if(rows[k].need>rows[i].need)i=k;e.autoTap?.(['ArrowUp','ArrowLeft','ArrowRight','ArrowDown'][i],.08)}},
  keyDown(e,k){const map={ArrowUp:0,ArrowLeft:1,ArrowRight:2,ArrowDown:3};if(k in map)serve(map[k])},
  update(e,dt){if(over)return;time-=dt;for(const r of rows)r.need+=dt*R.rand(4,9);if(rows.some(r=>r.need>=100)){over=true;api.finish('対応が間に合わなかった')}if(time<=0){over=true;api.setStatus('営業終了 '+score+'件')}},
  draw(e){const g=e.ctx;rect(g,0,0,640,480,p.bg||'#39251c');const labels=['↑','←','→','↓'];for(let i=0;i<4;i++){const y=80+i*82;txt(g,'レーン '+(i+1),60,y+18,13,'#fff');rect(g,145,y,390,28,'#1b1512');rect(g,145,y,390*R.clamp(rows[i].need/100,0,1),28,rows[i].need>75?'#e65':'#e2b35f');txt(g,labels[i],560,y+21,18,'#fff','center')}txt(g,'処理 '+score,15,30,13,'#fff');txt(g,Math.max(0,Math.ceil(time))+'秒',625,30,13,'#fff','right')}
 })
}

const engines={fixedShooter,scrollShooter,arena,platform,racer,maze,tank,sports,adventure,strategy,stealth,rhythm,physics,management,fighter,puzzle,raycast,runGun,beatEmUp,fixedPlatform,galleryShooter,railShooter,trackField,serviceGame};
K.resolve=(p)=>{const q=window.RetroQuality?.[p.id]||{};return {...p,...q,cfg:{...(p.cfg||{}),...(q.cfg||{})}}};
K.make=(p)=>{const spec=K.resolve(p);const fn=engines[spec.kind]||arena;return (host,api)=>fn(spec,api)};
K.registerMany=(profiles)=>{for(const p of profiles){const spec=K.resolve(p);R.register(commonMeta(spec),K.make(spec))}};
K.engines=engines;
window.RetroGameKit=K;
})();