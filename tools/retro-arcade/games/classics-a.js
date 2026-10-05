'use strict';
(() => {
const R=window.RetroArcade;
const txt=(c,t,x,y,s=18,col='#fff',a='left')=>{c.fillStyle=col;c.font=s+'px monospace';c.textAlign=a;c.fillText(t,x,y)};
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
const line=(c,x1,y1,x2,y2,col='#fff',w=2)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
const wrap=(o,w,h)=>{if(o.x<0)o.x+=w;if(o.x>w)o.x-=w;if(o.y<0)o.y+=h;if(o.y>h)o.y-=h};
const angDiff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const press=(e,k,interval=.10)=>{if(e.autoTap&&['Space','KeyX','KeyZ'].includes(k))e.autoTap(k,interval);else e.autoKeys.add(k)};
const humanError=(cfg,scale=1)=>R.rand(-1,1)*(cfg.humanize||0)*scale*(1-(cfg.skill||.75)*.5);

R.register({id:'pong',title:'PONG',year:1972,system:'ARCADE',genre:'Sports',color:'#f5f5ef',description:'白いパドルとボールだけで競う初期アーケードの象徴。',classic:'左右のパドルでボールを返す。11点先取、長いラリーほど球速が上がる。',modern:'ラリーボーナス、より滑らかな入力、オート対戦と速度変更を追加。',controls:'↑↓ または W/S',auto:'ボールの到達位置を予測してパドルを追従'},(host,api)=>{
 let py=200,ay=200,ball,ps=0,as=0,rally=0,over=false,aiTarget=240,aiThink=0;
 const serve=(dir=Math.random()<.5?-1:1)=>ball={x:320,y:240,vx:260*dir,vy:R.rand(-140,140)};
 const reset=()=>{py=ay=200;ps=as=rally=0;over=false;aiTarget=240;aiThink=0;serve();api.setStatus('11点先取')};reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const predict=ball.y+(ball.vy*Math.max(0,(ball.x-40)/Math.max(1,Math.abs(ball.vx))));const target=R.clamp(predict+humanError(cfg,90),40,440);if(py+40<target-8)press(e,'ArrowDown');else if(py+40>target+8)press(e,'ArrowUp')},
  update(e,dt){if(over)return;const sp=330;if(e.keys.has('ArrowUp')||e.keys.has('KeyW'))py-=sp*dt;if(e.keys.has('ArrowDown')||e.keys.has('KeyS'))py+=sp*dt;py=R.clamp(py,15,385);aiThink-=dt;if(aiThink<=0){aiThink=api.mode==='modern'?.08:.13;aiTarget=R.clamp(ball.y+R.rand(-24,24)+(rally>8?R.rand(-18,18):0),40,440)}ay+=Math.sign(aiTarget-(ay+40))*(api.mode==='modern'?235:198)*dt;ay=R.clamp(ay,15,385);ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.y<7||ball.y>473){ball.vy*=-1;ball.y=R.clamp(ball.y,7,473);api.beep(180,.02)}const p={x:28,y:py,w:12,h:80},a={x:600,y:ay,w:12,h:80},bb={x:ball.x-5,y:ball.y-5,w:10,h:10};if(R.hit(bb,p)&&ball.vx<0){ball.vx=Math.abs(ball.vx)*1.035;ball.vy+=(ball.y-(py+40))*3.2;rally++;api.beep(460,.025)}if(R.hit(bb,a)&&ball.vx>0){ball.vx=-Math.abs(ball.vx)*1.035;ball.vy+=(ball.y-(ay+40))*3.2;rally++;api.beep(360,.025)}if(ball.x<0){as++;rally=0;serve(1)}if(ball.x>640){ps++;api.setScore(ps*100+(api.mode==='modern'?rally*5:0));rally=0;serve(-1)}if(ps>=11||as>=11){over=true;api.finish(ps>as?'あなたの勝ち':'コンピューターの勝ち')}},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#000');for(let y=8;y<480;y+=24)rect(c,318,y,4,14,'#777');rect(c,28,py,12,80,'#eee');rect(c,600,ay,12,80,'#eee');rect(c,ball.x-5,ball.y-5,10,10,'#fff');txt(c,String(ps),252,55,28);txt(c,String(as),388,55,28);if(api.mode==='modern')txt(c,'ラリー '+rally,320,460,12,'#8ef','center')}
 })
});

R.register({id:'breakout',title:'Breakout',year:1976,system:'ARCADE',genre:'Action',color:'#ff8a55',description:'パドルでボールを返し、色付きの壁を削っていくブロック崩し。',classic:'色ごとに得点が違う壁、5ボール制、ラリー中心のシンプル構成。',modern:'ワイドパドルやマルチボール系ボーナス、コンボを自然に追加。',controls:'←→ / マウス・タッチ',auto:'ボール落下位置を予測してパドルを移動'},(host,api)=>{
 let paddle=270,balls=[],bricks=[],lives=5,combo=0,power=0,stage=1;
 function build(){bricks=[];const cols=['#f44','#f80','#fd4','#5d5','#4ad','#95f'];for(let r=0;r<6;r++)for(let x=0;x<14;x++)bricks.push({x:25+x*42,y:45+r*22,w:39,h:18,col:cols[r],alive:true,power:api.mode==='modern'&&Math.random()<.07})}
 function serve(){balls=[{x:320,y:390,vx:R.rand(-190,190)||170,vy:-225}]}
 function reset(){paddle=270;lives=5;combo=0;power=0;stage=1;build();serve();api.setStatus('残り5ボール')};reset();
 return api.canvas({
  reset,pointerMove(e,p){paddle=R.clamp(p.x-55,8,522)},
  auto(e,dt,cfg){const b=[...balls].sort((a,b)=>b.y-a.y)[0];if(!b)return;const target=b.x+humanError(cfg,100);if(paddle+55<target-8)press(e,'ArrowRight');else if(paddle+55>target+8)press(e,'ArrowLeft')},
  update(e,dt){const sp=360;if(e.keys.has('ArrowLeft'))paddle-=sp*dt;if(e.keys.has('ArrowRight'))paddle+=sp*dt;paddle=R.clamp(paddle,8,522);if(power>0)power-=dt;const pw=power>0?150:110;for(const b of balls){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<7||b.x>633){b.vx*=-1;b.x=R.clamp(b.x,7,633)}if(b.y<8){b.vy=Math.abs(b.vy);api.beep(230,.02)}const pad={x:paddle,y:430,w:pw,h:12},bb={x:b.x-5,y:b.y-5,w:10,h:10};if(R.hit(bb,pad)&&b.vy>0){b.vy=-Math.abs(b.vy);b.vx+=(b.x-(paddle+pw/2))*2.8;combo=0;api.beep(520,.025)}for(const q of bricks)if(q.alive&&R.hit(bb,q)){q.alive=false;b.vy*=-1;combo++;api.addScore((7-Math.floor((q.y-45)/22))*10+(api.mode==='modern'?combo:0));if(q.power){power=8;api.setStatus('ワイドパドル');api.beep(760,.1)}break}}balls=balls.filter(b=>b.y<490);if(!balls.length){lives--;combo=0;if(lives<=0){api.finish('ゲームオーバー');return}serve();api.setStatus(lives+' ボール')}if(bricks.every(q=>!q.alive)){stage++;api.addScore(250);build();serve()}},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#050505');for(const q of bricks)if(q.alive){rect(c,q.x,q.y,q.w,q.h,q.power?'#fff':q.col);if(q.power)txt(c,'+',q.x+19,q.y+14,12,'#111','center')}rect(c,paddle,430,power>0?150:110,12,'#eee');for(const b of balls)rect(c,b.x-5,b.y-5,10,10,'#fff');txt(c,'残り '+lives,18,470,12,'#aaa');txt(c,'壁 '+stage,622,470,12,'#aaa','right');if(api.mode==='modern')txt(c,'コンボ x'+combo,320,470,12,'#7ef','center')}
 })
});

R.register({id:'space-invaders',title:'Space Invaders',year:1978,system:'ARCADE',genre:'Shooter',color:'#7dff72',description:'隊列で迫る侵略者を地上砲台から迎え撃つ固定画面シューティング。',classic:'敵隊列は左右へ移動し、端で下降。数が減るほどテンポが上がる。',modern:'コンボ、短時間の強化弾、視認しやすい敵弾を追加。',controls:'←→ / スペース',auto:'敵弾を避けながら最寄りの列へ照準し連射'},(host,api)=>{
 let px=305,shot=null,enemies=[],eb=[],dir=1,tick=0,lives=3,combo=0,power=0,over=false;
 function build(){enemies=[];for(let r=0;r<5;r++)for(let x=0;x<11;x++)enemies.push({x:72+x*43,y:55+r*34,w:24,h:18,alive:true,row:r})}
 function reset(){px=305;shot=null;eb=[];dir=1;tick=0;lives=3;combo=0;power=0;over=false;build();api.setStatus('地球を守れ')};reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){const danger=eb.filter(b=>b.y>300&&Math.abs((b.x+3)-(px+15))<50).sort((a,b)=>b.y-a.y)[0];if(danger){press(e,danger.x<px?'ArrowRight':'ArrowLeft')}else{const target=enemies.filter(x=>x.alive).sort((a,b)=>b.y-a.y||Math.abs(a.x-px)-Math.abs(b.x-px))[0];if(target){const aim=target.x+12+humanError(cfg,55);if(px+15<aim-8)press(e,'ArrowRight');else if(px+15>aim+8)press(e,'ArrowLeft')}}press(e,'Space')},
  update(e,dt){if(over)return;const sp=300;if(e.keys.has('ArrowLeft'))px-=sp*dt;if(e.keys.has('ArrowRight'))px+=sp*dt;px=R.clamp(px,8,602);if(power>0)power-=dt;if(e.keys.has('Space')&&!shot)shot={x:px+13,y:420,vy:-(power>0?520:410)};if(shot){shot.y+=shot.vy*dt;if(shot.y<0)shot=null}for(const b of eb)b.y+=b.vy*dt;eb=eb.filter(b=>b.y<470);tick+=dt*(1+enemies.filter(x=>x.alive).length<15?.7:0);const living=enemies.filter(x=>x.alive);const min=Math.min(...living.map(x=>x.x)),max=Math.max(...living.map(x=>x.x+24));if((dir>0&&max>610)||(dir<0&&min<30)){dir*=-1;for(const x of living)x.y+=15}for(const x of living)x.x+=dir*(24+Math.max(0,45-living.length))*dt;if(Math.random()<dt*(.7+(55-living.length)*.015)&&living.length){const s=living[Math.floor(Math.random()*living.length)];eb.push({x:s.x+10,y:s.y+18,vy:150+Math.random()*70})}if(shot){for(const x of living)if(R.hit({x:shot.x-2,y:shot.y-6,w:4,h:10},x)){x.alive=false;shot=null;combo++;api.addScore((5-x.row)*10+(api.mode==='modern'?combo*2:0));api.beep(650,.03);if(api.mode==='modern'&&Math.random()<.08){power=5;api.setStatus('高速ショット')}break}}for(const b of eb)if(R.hit({x:b.x,y:b.y,w:6,h:10},{x:px,y:425,w:30,h:12})){b.y=999;lives--;combo=0;api.beep(110,.12);if(lives<=0){over=true;api.finish('地球防衛失敗')}}if(living.some(x=>x.y>390)){over=true;api.finish('侵略完了')}if(living.length===0){api.addScore(500);build();dir=1;eb=[]}},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#000');for(const x of enemies)if(x.alive){rect(c,x.x,x.y,x.w,x.h,x.row<2?'#fff':'#7f7');rect(c,x.x+5,x.y+5,4,4,'#000');rect(c,x.x+15,x.y+5,4,4,'#000')}rect(c,px,425,30,12,'#8f8');rect(c,px+12,418,6,8,'#8f8');if(shot)rect(c,shot.x-2,shot.y-6,4,10,'#fff');for(const b of eb)rect(c,b.x,b.y,5,10,'#f66');txt(c,'残機 '+lives,12,470,12,'#8f8');if(api.mode==='modern')txt(c,'コンボ '+combo,628,470,12,'#8ef','right')}
 })
});

R.register({id:'asteroids',title:'Asteroids',year:1979,system:'ARCADE',genre:'Shooter',color:'#d9e7ff',description:'慣性で漂う宇宙船から小惑星を砕くベクター風シューティング。',classic:'回転・推進・射撃。画面端で反対側へワープし、大岩は分裂する。',modern:'シールド/拡散弾系の短時間パワーアップと精密操作を追加。',controls:'←→ 回転 / ↑ 推進 / スペース 射撃',auto:'最寄り小惑星へ船首を合わせ、衝突を避けて射撃'},(host,api)=>{
 let ship,rocks,shots,cool,lives,shield,over;
 const rock=(size=3,x=R.rand(0,640),y=R.rand(0,480))=>({x,y,vx:R.rand(-65,65),vy:R.rand(-65,65),r:size*11+8,size,a:R.rand(0,6.28),spin:R.rand(-1.2,1.2)});
 function reset(){ship={x:320,y:240,vx:0,vy:0,a:-Math.PI/2};rocks=Array.from({length:6},()=>rock(3));shots=[];cool=0;lives=3;shield=0;over=false;api.setStatus('小惑星帯')};reset();
 return api.canvas({
  reset,
  auto(e,dt,cfg){if(!rocks.length)return;const near=[...rocks].sort((a,b)=>Math.hypot(a.x-ship.x,a.y-ship.y)-Math.hypot(b.x-ship.x,b.y-ship.y))[0];const target=Math.atan2(near.y-ship.y,near.x-ship.x),d=angDiff(ship.a,target+humanError(cfg,.35));if(d>.08)press(e,'ArrowRight');if(d<-.08)press(e,'ArrowLeft');if(Math.abs(d)<.35)press(e,'Space');if(Math.hypot(near.x-ship.x,near.y-ship.y)<120)press(e,'ArrowUp')},
  update(e,dt){if(over)return;const rot=3.1;if(e.keys.has('ArrowLeft'))ship.a-=rot*dt;if(e.keys.has('ArrowRight'))ship.a+=rot*dt;if(e.keys.has('ArrowUp')){ship.vx+=Math.cos(ship.a)*145*dt;ship.vy+=Math.sin(ship.a)*145*dt}ship.vx*=Math.pow(.994,dt*60);ship.vy*=Math.pow(.994,dt*60);ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;wrap(ship,640,480);cool-=dt;shield=Math.max(0,shield-dt);if(e.keys.has('Space')&&cool<=0){shots.push({x:ship.x,y:ship.y,vx:Math.cos(ship.a)*360+ship.vx,vy:Math.sin(ship.a)*360+ship.vy,t:1.3});cool=.18;api.beep(520,.025)}for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.t-=dt;wrap(s,640,480)}shots=shots.filter(s=>s.t>0);for(const r of rocks){r.x+=r.vx*dt;r.y+=r.vy*dt;r.a+=r.spin*dt;wrap(r,640,480)}for(let si=shots.length-1;si>=0;si--){let gone=false;for(let ri=rocks.length-1;ri>=0;ri--){const r=rocks[ri],s=shots[si];if(Math.hypot(r.x-s.x,r.y-s.y)<r.r){shots.splice(si,1);rocks.splice(ri,1);api.addScore((4-r.size)*20+10);api.beep(760-r.size*100,.04);if(r.size>1)for(let k=0;k<2;k++)rocks.push(rock(r.size-1,r.x,r.y));else if(api.mode==='modern'&&Math.random()<.09)shield=5;gone=true;break}}if(gone)continue}for(const r of rocks)if(Math.hypot(r.x-ship.x,r.y-ship.y)<r.r+9){if(shield>0){r.vx*=-1;r.vy*=-1;shield=.5;continue}lives--;ship={x:320,y:240,vx:0,vy:0,a:-Math.PI/2};api.beep(90,.14);if(lives<=0){over=true;api.finish('機体喪失')}break}if(!rocks.length){api.addScore(500);rocks=Array.from({length:7},()=>rock(3))}},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#000');c.strokeStyle='#dfe8ff';c.lineWidth=2;for(const r of rocks){c.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2+r.a,rad=r.r*(.8+((i*37)%5)/20),x=r.x+Math.cos(a)*rad,y=r.y+Math.sin(a)*rad;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.stroke()}for(const s of shots)rect(c,s.x-2,s.y-2,4,4,'#fff');c.save();c.translate(ship.x,ship.y);c.rotate(ship.a);c.beginPath();c.moveTo(12,0);c.lineTo(-9,-8);c.lineTo(-5,0);c.lineTo(-9,8);c.closePath();c.stroke();if(shield>0){c.strokeStyle='#5ff';c.beginPath();c.arc(0,0,16,0,6.28);c.stroke()}c.restore();txt(c,'残機 '+lives,10,470,12,'#aaa')}
 })
});

R.register({id:'missile-command',title:'Missile Command',year:1980,system:'ARCADE',genre:'Defense',color:'#ff6677',description:'降り注ぐ弾道を迎撃爆発で連鎖破壊し、都市を守る。',classic:'クロスヘアで迎撃地点を指定。爆発範囲へ敵ミサイルを巻き込む。',modern:'シールドや画面クリア系ボーナス、見やすい照準表示を追加。',controls:'矢印で照準 / スペース 迎撃',auto:'最も危険な敵弾の未来位置へ迎撃弾を送る'},(host,api)=>{
 let cross={x:320,y:220},missiles=[],booms=[],ammo=30,cities,spawn=0,wave=1,over=false,shield=0;
 function reset(){cross={x:320,y:220};missiles=[];booms=[];ammo=30;cities=Array.from({length:6},(_,i)=>({x:45+i*105,alive:true}));spawn=0;wave=1;over=false;shield=0;api.setStatus('都市を守れ')};reset();
 function fire(){if(ammo<=0)return;ammo--;booms.push({x:cross.x,y:cross.y,r:2,max:api.mode==='modern'?46:40,grow:true});api.beep(500,.03)}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const m=[...missiles].sort((a,b)=>b.y-a.y)[0];if(!m)return;cross.x=R.clamp(m.x+m.vx*.25+humanError(cfg,45),10,630);cross.y=R.clamp(m.y+55+humanError(cfg,35),30,400);if(ammo>0&&Math.random()<dt*(5+cfg.skill*8))press(e,'Space')},
  keyDown(e,k){if(k==='Space')fire()},
  pointerDown(e,p){cross.x=p.x;cross.y=p.y;fire()},
  update(e,dt){if(over)return;const sp=300;if(e.keys.has('ArrowLeft'))cross.x-=sp*dt;if(e.keys.has('ArrowRight'))cross.x+=sp*dt;if(e.keys.has('ArrowUp'))cross.y-=sp*dt;if(e.keys.has('ArrowDown'))cross.y+=sp*dt;cross.x=R.clamp(cross.x,5,635);cross.y=R.clamp(cross.y,20,420);spawn-=dt;if(spawn<=0){const target=cities.filter(c=>c.alive);if(target.length){const t=target[Math.floor(Math.random()*target.length)];const sx=R.rand(0,640),sy=0,d=Math.hypot(t.x-sx,440-sy),spm=55+wave*6;missiles.push({x:sx,y:sy,vx:(t.x-sx)/d*spm,vy:(440-sy)/d*spm,target:t})}spawn=R.rand(.25,.75)/Math.min(2,wave*.22+1)}for(const m of missiles){m.x+=m.vx*dt;m.y+=m.vy*dt}for(const b of booms){b.r+=dt*(b.grow?75:-55);if(b.r>=b.max)b.grow=false}for(const b of booms)for(const m of missiles)if(!m.dead&&Math.hypot(m.x-b.x,m.y-b.y)<b.r){m.dead=true;api.addScore(25);if(api.mode==='modern'&&Math.random()<.035)shield=7}booms=booms.filter(b=>b.r>0);for(const m of missiles)if(!m.dead&&m.y>=430){m.dead=true;if(shield>0){shield=0;continue}m.target.alive=false;api.beep(80,.12)}missiles=missiles.filter(m=>!m.dead);if(!cities.some(c=>c.alive)){over=true;api.finish('全都市壊滅')}if(ammo===0&&!missiles.length){wave++;ammo=30;api.addScore(cities.filter(c=>c.alive).length*100);api.setStatus('ウェーブ '+wave)}if(shield>0)shield-=dt},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#03030a');for(const m of missiles){line(c,m.x-m.vx*.2,m.y-m.vy*.2,m.x,m.y,'#f66',1);rect(c,m.x-1,m.y-1,3,3,'#fff')}for(const b of booms){c.strokeStyle='#ffb14a';c.beginPath();c.arc(b.x,b.y,b.r,0,6.28);c.stroke()}for(const city of cities){if(city.alive){rect(c,city.x-14,434,28,13,shield>0?'#7ff':'#8af');rect(c,city.x-7,426,14,8,'#8af')}}rect(c,0,448,640,32,'#35284e');line(c,cross.x-8,cross.y,cross.x+8,cross.y,'#fff');line(c,cross.x,cross.y-8,cross.x,cross.y+8,'#fff');txt(c,'弾薬 '+ammo,12,470,12,'#eee');txt(c,'ウェーブ '+wave,628,470,12,'#eee','right')}
 })
});

})();