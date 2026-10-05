'use strict';
(() => {
const R=window.RetroArcade;
const txt=(c,t,x,y,s=18,col='#fff',a='left')=>{c.fillStyle=col;c.font=s+'px monospace';c.textAlign=a;c.fillText(t,x,y)};
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
const press=(e,k,interval=.10)=>{if(e.autoTap&&['Space','KeyX','KeyZ'].includes(k))e.autoTap(k,interval);else e.autoKeys.add(k)};

R.register({id:'tetris',title:'Tetris',year:1984,system:'COMPUTER / GB',genre:'Puzzle',color:'#66b8ff',description:'7種の4ブロック片を積み、横一列を完成させて消す落ち物パズル。',classic:'回転・左右移動・落下でラインを消去。積み上がりが上端を越えると終了。',modern:'ゴースト、ハードドロップ、ホールドを自然に追加。',controls:'←→ / ↑ 回転 / ↓ 落下 / スペース ハードドロップ / X ホールド',auto:'盤面の穴・高さ・凸凹・ライン消去を評価して最善配置へ移動'},(host,api)=>{
 const W=10,H=20,S=22,OX=210,OY=18;
 const SH={I:[[0,1],[1,1],[2,1],[3,1]],O:[[0,0],[1,0],[0,1],[1,1]],T:[[0,0],[1,0],[2,0],[1,1]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]]};
 const COL={I:'#4de4ff',O:'#ffe45a',T:'#b773ff',S:'#63df78',Z:'#ff5f70',J:'#5794ff',L:'#ff9e47'};let board,p,next,hold,canHold,fall,level,lines,over,inputCd,autoPlan;
 const rotPts=(pts,r)=>{let out=pts.map(([x,y])=>[x,y]);for(let n=0;n<r;n++)out=out.map(([x,y])=>[y,-x]);let minx=Math.min(...out.map(q=>q[0])),miny=Math.min(...out.map(q=>q[1]));return out.map(([x,y])=>[x-minx,y-miny])};
 const randPiece=()=>Object.keys(SH)[Math.floor(Math.random()*7)];
 function cells(piece,x=piece.x,y=piece.y,r=piece.r){return rotPts(SH[piece.t],r).map(([a,b])=>[x+a,y+b])}
 function valid(piece,x=piece.x,y=piece.y,r=piece.r,b=board){return cells(piece,x,y,r).every(([a,c])=>a>=0&&a<W&&c<H&&(c<0||!b[c][a]))}
 function spawn(type=next){p={t:type||randPiece(),x:3,y:-1,r:0};next=randPiece();canHold=true;autoPlan=null;if(!valid(p)){over=true;api.finish('積み上がり終了')}}
 function reset(){board=Array.from({length:H},()=>Array(W).fill(null));next=randPiece();hold=null;level=1;lines=0;fall=0;over=false;inputCd=0;spawn(randPiece());api.setStatus('ラインを消せ')};reset();
 function clearLines(b=board){let n=0;for(let y=H-1;y>=0;y--)if(b[y].every(Boolean)){b.splice(y,1);b.unshift(Array(W).fill(null));n++;y++}return n}
 function lock(){for(const [x,y] of cells(p))if(y>=0)board[y][x]=p.t;const n=clearLines();if(n){lines+=n;api.addScore([0,100,300,500,800][n]*level);level=1+Math.floor(lines/10);api.beep(550+n*90,.06)}spawn()}
 function ghostY(piece=p){let y=piece.y;while(valid(piece,piece.x,y+1,piece.r))y++;return y}
 function evalBoard(test){let heights=[],holes=0,bump=0,maxH=0;for(let x=0;x<W;x++){let top=H;for(let y=0;y<H;y++)if(test[y][x]){top=y;break}let h=H-top;heights.push(h);maxH=Math.max(maxH,h);let seen=false;for(let y=0;y<H;y++){if(test[y][x])seen=true;else if(seen)holes++}}for(let x=0;x<W-1;x++)bump+=Math.abs(heights[x]-heights[x+1]);const full=test.filter(r=>r.every(Boolean)).length;return full*12-holes*7-bump*.8-maxH*.55-heights.reduce((a,b)=>a+b,0)*.12}
 function plan(){let best=null;for(let r=0;r<4;r++)for(let x=-2;x<W;x++){if(!valid(p,x,p.y,r))continue;let y=p.y;while(valid(p,x,y+1,r))y++;const b=board.map(q=>q.slice());let ok=true;for(const [cx,cy] of cells(p,x,y,r)){if(cy<0){ok=false;break}b[cy][cx]=p.t}if(!ok)continue;const s=evalBoard(b)+R.rand(-.6,.6)*(api.humanize*3);if(!best||s>best.s)best={x,r,s}}return best}
 function holdPiece(){if(!canHold||over)return;const old=p.t;if(hold){const h=hold;hold=old;p={t:h,x:3,y:-1,r:0};autoPlan=null}else{hold=old;spawn()}canHold=false}
 return api.canvas({
  reset,
  auto(e,dt,cfg){if(over)return;if(!autoPlan)autoPlan=plan();if(!autoPlan)return;if(p.r!==autoPlan.r){press(e,'ArrowUp');return}if(p.x<autoPlan.x){press(e,'ArrowRight');return}if(p.x>autoPlan.x){press(e,'ArrowLeft');return}press(e,'Space')},
  keyDown(e,k){if(k==='KeyX')holdPiece()},
  update(e,dt){if(over)return;inputCd=Math.max(0,inputCd-dt);if(inputCd<=0){if(e.keys.has('ArrowLeft')&&valid(p,p.x-1)){p.x--;inputCd=.075}if(e.keys.has('ArrowRight')&&valid(p,p.x+1)){p.x++;inputCd=.075}if(e.keys.has('ArrowUp')&&valid(p,p.x,p.y,(p.r+1)%4)){p.r=(p.r+1)%4;inputCd=.12}if(e.keys.has('Space')){p.y=ghostY();api.addScore(Math.max(0,p.y)*2);lock();inputCd=.16;return}}fall+=dt*(e.keys.has('ArrowDown')?12:1);const interval=Math.max(.08,.72-(level-1)*.055);if(fall>=interval){fall=0;if(valid(p,p.x,p.y+1))p.y++;else lock()}},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#080b16');rect(c,OX-4,OY-4,W*S+8,H*S+8,'#25334b');rect(c,OX,OY,W*S,H*S,'#050812');for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(board[y][x]){rect(c,OX+x*S+1,OY+y*S+1,S-2,S-2,COL[board[y][x]]);rect(c,OX+x*S+4,OY+y*S+4,S-8,3,'#ffffff55')}if(api.mode==='modern'&&!over){const gy=ghostY();for(const [x,y] of cells(p,p.x,gy,p.r))if(y>=0){c.strokeStyle=COL[p.t]+'99';c.strokeRect(OX+x*S+3,OY+y*S+3,S-6,S-6)}}if(!over)for(const [x,y] of cells(p))if(y>=0)rect(c,OX+x*S+1,OY+y*S+1,S-2,S-2,COL[p.t]);txt(c,'ライン '+lines,30,70,16,'#9cf');txt(c,'レベル '+level,30,98,16,'#9cf');txt(c,'次',475,70,14,'#9cf');txt(c,next,475,98,28,COL[next]);if(api.mode==='modern'){txt(c,'保留',475,150,14,'#9cf');txt(c,hold||'-',475,180,28,hold?COL[hold]:'#666')}if(over)txt(c,'ゲームオーバー',320,240,28,'#f66','center')}
 })
});

R.register({id:'snake',title:'Snake',year:1976,system:'ARCADE / MOBILE',genre:'Arcade',color:'#8ee56b',description:'伸び続ける蛇を操作して餌を取り、自分の体へぶつからないよう進む。',classic:'直角移動、餌で成長、壁または自分の体でゲームオーバー。',modern:'ボーナス餌、コンボ、進行予告とオート経路探索を追加。',controls:'矢印キー',auto:'経路探索で餌への安全ルートを探し、詰まりそうなら広い方向へ退避'},(host,api)=>{
 const GW=24,GH=18,S=24,OX=32,OY=24;let snake,dir,next,food,bonus,step,over,combo;
 const key={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
 function emptyCell(){for(let n=0;n<500;n++){const p={x:Math.floor(R.rand(0,GW)),y:Math.floor(R.rand(0,GH))};if(!snake.some(s=>s.x===p.x&&s.y===p.y))return p}return{x:1,y:1}}
 function reset(){snake=[{x:8,y:9},{x:7,y:9},{x:6,y:9}];dir={x:1,y:0};next=dir;food=emptyCell();bonus=null;step=0;over=false;combo=0;api.setStatus('食べて伸びろ')};reset();
 function safe(nx,ny){return nx>=0&&nx<GW&&ny>=0&&ny<GH&&!snake.some((s,i)=>i<snake.length-1&&s.x===nx&&s.y===ny)}
 function bfs(target){const start=snake[0],q=[[start.x,start.y,[]]],seen=new Set([start.x+','+start.y]);while(q.length){const[x,y,path]=q.shift();if(x===target.x&&y===target.y)return path[0];for(const [k,[dx,dy]] of Object.entries(key)){const nx=x+dx,ny=y+dy,id=nx+','+ny;if(seen.has(id)||!safe(nx,ny))continue;seen.add(id);q.push([nx,ny,path.concat(k)])}}return null}
 return api.canvas({
  reset,
  auto(e,dt,cfg){const target=bonus||food;let k=bfs(target);if(!k){const opts=Object.entries(key).filter(([k,[dx,dy]])=>safe(snake[0].x+dx,snake[0].y+dy));k=opts.sort((a,b)=>{const na=a[1],nb=b[1];const ca=Object.values(key).filter(([dx,dy])=>safe(snake[0].x+na[0]+dx,snake[0].y+na[1]+dy)).length,cb=Object.values(key).filter(([dx,dy])=>safe(snake[0].x+nb[0]+dx,snake[0].y+nb[1]+dy)).length;return cb-ca})[0]?.[0]}if(k)press(e,k)},
  update(e,dt){if(over)return;for(const [k,d] of Object.entries(key))if(e.keys.has(k)&&!(d[0]===-dir.x&&d[1]===-dir.y))next={x:d[0],y:d[1]};step+=dt;const interval=Math.max(.055,.16-snake.length*.0025);if(step<interval)return;step=0;dir=next;const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(!safe(h.x,h.y)){over=true;api.finish('衝突');return}snake.unshift(h);let ate=false;if(h.x===food.x&&h.y===food.y){api.addScore(10+combo*2);combo++;food=emptyCell();ate=true;if(api.mode==='modern'&&Math.random()<.25)bonus={...emptyCell(),life:35}}if(bonus){bonus.life--;if(h.x===bonus.x&&h.y===bonus.y){api.addScore(50);bonus=null;ate=true}if(bonus&&bonus.life<=0)bonus=null}if(!ate)snake.pop()},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#061006');for(let x=0;x<=GW;x++)rect(c,OX+x*S,OY,1,GH*S,'#173117');for(let y=0;y<=GH;y++)rect(c,OX,OY+y*S,GW*S,1,'#173117');snake.forEach((s,i)=>rect(c,OX+s.x*S+2,OY+s.y*S+2,S-4,S-4,i===0?'#b6ff7a':'#58b850'));rect(c,OX+food.x*S+5,OY+food.y*S+5,S-10,S-10,'#ff5d64');if(bonus)rect(c,OX+bonus.x*S+4,OY+bonus.y*S+4,S-8,S-8,'#ffe75f');txt(c,'長さ '+snake.length,10,470,12,'#9f8');if(api.mode==='modern')txt(c,'コンボ '+combo,630,470,12,'#ffb','right')}
 })
});

R.register({id:'minesweeper',title:'Minesweeper',year:1990,system:'WINDOWS',genre:'Puzzle',color:'#c8c8c8',description:'数字を手掛かりに地雷の位置を推理して安全マスを開くロジックパズル。',classic:'左クリックで開く、右クリックで旗。数字は周囲8マスの地雷数。',modern:'最初の一手を安全化、連鎖オープン、オート論理解法とヒントを追加。',controls:'左クリック 開く / 右クリック 旗 / スペース 選択マス',auto:'確定安全・確定地雷を論理判定し、無ければ低リスクマスを選択'},(host,api)=>{
 const W=16,H=16,M=40,S=26,OX=112,OY=28;let cells,first,over,won,elapsed,autoT;
 const id=(x,y)=>y*W+x;const nb=(x,y)=>{const a=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<W&&ny>=0&&ny<H)a.push([nx,ny])}return a};
 function seed(sx,sy){let n=0;while(n<M){const x=Math.floor(R.rand(0,W)),y=Math.floor(R.rand(0,H));if(Math.abs(x-sx)<=1&&Math.abs(y-sy)<=1)continue;const c=cells[id(x,y)];if(!c.mine){c.mine=true;n++}}for(let y=0;y<H;y++)for(let x=0;x<W;x++)cells[id(x,y)].num=nb(x,y).filter(([a,b])=>cells[id(a,b)].mine).length}
 function reset(){cells=Array.from({length:W*H},()=>({mine:false,num:0,open:false,flag:false}));first=true;over=won=false;elapsed=0;autoT=0;api.setStatus('地雷40個')};reset();
 function reveal(x,y){if(over)return;const c=cells[id(x,y)];if(c.flag||c.open)return;if(first){seed(x,y);first=false}c.open=true;if(c.mine){over=true;api.finish('爆発');return}if(c.num===0)for(const[a,b]of nb(x,y))reveal(a,b);const open=cells.filter(c=>c.open&&!c.mine).length;api.setScore(open*5);if(open===W*H-M){won=over=true;api.addScore(Math.max(0,1000-Math.floor(elapsed)*5));api.setStatus('地雷原クリア')}}
 function flag(x,y){if(over)return;const c=cells[id(x,y)];if(!c.open)c.flag=!c.flag}
 function autoMove(){if(first){reveal(8,8);return}for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=cells[id(x,y)];if(!c.open||!c.num)continue;const ns=nb(x,y),flags=ns.filter(([a,b])=>cells[id(a,b)].flag).length,closed=ns.filter(([a,b])=>!cells[id(a,b)].open&&!cells[id(a,b)].flag);if(closed.length&&flags===c.num){reveal(...closed[0]);return}if(closed.length&&flags+closed.length===c.num){flag(...closed[0]);return}}let best=null;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=cells[id(x,y)];if(c.open||c.flag)continue;let risk=.5;const around=nb(x,y).filter(([a,b])=>cells[id(a,b)].open&&cells[id(a,b)].num>0);if(around.length)risk=Math.min(...around.map(([a,b])=>{const q=cells[id(a,b)],nbs=nb(a,b),f=nbs.filter(([u,v])=>cells[id(u,v)].flag).length,cl=nbs.filter(([u,v])=>!cells[id(u,v)].open&&!cells[id(u,v)].flag).length;return Math.max(0,(q.num-f)/Math.max(1,cl))}));if(!best||risk<best.r)best={x,y,r:risk}}if(best)reveal(best.x,best.y)}
 function drawCell(c,x,y,s,mark){rect(c,x+2,y+2,s-5,s-5,'#c9c9c9');rect(c,x+2,y+2,s-5,2,'#fff');rect(c,x+2,y+2,2,s-5,'#fff');if(mark)txt(c,mark,x+s/2,y+19,16,'#c00','center')}
 return api.canvas({
  reset,
  auto(e,dt,cfg){autoT-=dt;if(autoT<=0&&!over){autoT=.06+(1-cfg.skill)*.35;autoMove()}},
  pointerDown(e,p,ev){const x=Math.floor((p.x-OX)/S),y=Math.floor((p.y-OY)/S);if(x<0||x>=W||y<0||y>=H)return;if(ev.button===2)flag(x,y);else reveal(x,y)},
  init(e){e.canvas.oncontextmenu=ev=>ev.preventDefault()},
  update(e,dt){if(!over&&!first)elapsed+=dt},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#bdbdbd');for(let y=0;y<H;y++)for(let x=0;x<W;x++){const q=cells[id(x,y)],px=OX+x*S,py=OY+y*S;if(q.open){rect(c,px,py,S-1,S-1,'#d8d8d8');if(q.mine)txt(c,'*',px+13,py+19,18,'#000','center');else if(q.num)txt(c,String(q.num),px+13,py+19,16,['#000','#06c','#080','#c00','#008','#800','#088','#000','#666'][q.num],'center')}else drawCell(c,px,py,S,q.flag?'⚑':'')}txt(c,'MINES '+(M-cells.filter(q=>q.flag).length),12,24,14,'#111');txt(c,'時間 '+Math.floor(elapsed),628,24,14,'#111','right');if(over)txt(c,won?'クリア！':'爆発!',320,470,20,won?'#080':'#c00','center')}
 })
});

R.register({id:'solitaire',title:'Solitaire',year:1990,system:'WINDOWS',genre:'Card',color:'#2a9a55',description:'7列の場札を整理し、4つの組札へAからKまで積み上げるKlondike。',classic:'赤黒交互の降順で場札を移動し、Aから同スートで組札へ送る。',modern:'ヒント表示、オート組札送り、ワンクリック操作を追加。',controls:'クリックで選択 / 山札クリックでめくる',auto:'有効な組札移動を優先し、裏札を開けられる手を探索'},(host,api)=>{
 const suits=['♠','♥','♦','♣'],red=s=>s==='♥'||s==='♦';let stock,waste,piles,found,sel,moves,autoT,won;
 const card=(s,r)=>({s,r,up:false});const name=c=>(c.r===1?'A':c.r===11?'J':c.r===12?'Q':c.r===13?'K':c.r)+c.s;
 function reset(){let d=[];for(const s of suits)for(let r=1;r<=13;r++)d.push(card(s,r));for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}piles=Array.from({length:7},()=>[]);for(let x=0;x<7;x++)for(let y=0;y<=x;y++){const c=d.pop();c.up=y===x;piles[x].push(c)}stock=d;waste=[];found=Object.fromEntries(suits.map(s=>[s,[]]));sel=null;moves=0;autoT=0;won=false;api.setStatus('AからKまで積め')};reset();
 function canFoundation(c){const f=found[c.s];return c.r===f.length+1}
 function sendFoundation(c,from){if(!canFoundation(c))return false;found[c.s].push(c);if(from.type==='waste')waste.pop();else{from.arr.pop();if(from.arr.at(-1))from.arr.at(-1).up=true}moves++;api.addScore(10);return true}
 function canStack(c,on){return on&&on.up&&red(c.s)!==red(on.s)&&c.r===on.r-1}
 function autoMove(){if(waste.length&&canFoundation(waste.at(-1))){sendFoundation(waste.at(-1),{type:'waste'});return true}for(const arr of piles){const c=arr.at(-1);if(c?.up&&canFoundation(c)){sendFoundation(c,{type:'pile',arr});return true}}for(let i=0;i<piles.length;i++){const arr=piles[i],idx=arr.findIndex(c=>c.up);if(idx<0)continue;const c=arr[idx];for(let j=0;j<piles.length;j++)if(i!==j){const on=piles[j].at(-1);if((c.r===13&&!on)||canStack(c,on)){piles[j].push(...arr.splice(idx));if(arr.at(-1))arr.at(-1).up=true;moves++;api.addScore(5);return true}}}if(stock.length){const c=stock.pop();c.up=true;waste.push(c);return true}if(waste.length){stock=waste.reverse();waste=[];stock.forEach(c=>c.up=false);return true}return false}
 return api.canvas({
  reset,
  auto(e,dt,cfg){autoT-=dt;if(autoT<=0&&!won){autoT=.08+(1-cfg.skill)*.4;autoMove()}},
  pointerDown(e,p){if(p.y<100&&p.x<100){if(stock.length){const c=stock.pop();c.up=true;waste.push(c)}else if(waste.length){stock=waste.reverse();waste=[];stock.forEach(c=>c.up=false)}return}if(p.y<100&&p.x>120&&p.x<205&&waste.length){const c=waste.at(-1);if(!sendFoundation(c,{type:'waste'}))sel={type:'waste',cards:[c]};return}const col=Math.floor((p.x-40)/82);if(col<0||col>6)return;const arr=piles[col],idx=Math.min(arr.length-1,Math.max(0,Math.floor((p.y-130)/24)));if(sel){const c=sel.cards[0],on=arr.at(-1);if((c.r===13&&!on)||canStack(c,on)){if(sel.type==='waste')waste.pop();else sel.from.splice(sel.index);arr.push(...sel.cards);if(sel.from?.at(-1))sel.from.at(-1).up=true;moves++;api.addScore(5)}sel=null;return}const c=arr[idx];if(!c?.up)return;if(idx===arr.length-1&&canFoundation(c)){sendFoundation(c,{type:'pile',arr});return}sel={type:'pile',from:arr,index:idx,cards:arr.slice(idx)}},
  update(e,dt){if(!won&&suits.every(s=>found[s].length===13)){won=true;api.addScore(1000);api.setStatus('完成！')}},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#087a38');drawSlot(c,40,25,'山札');drawSlot(c,130,25,'捨て札');for(let i=0;i<4;i++)drawSlot(c,310+i*75,25,suits[i]);if(stock.length)drawBack(c,45,30);if(waste.length)drawCard(c,waste.at(-1),135,30);for(let i=0;i<4;i++){const f=found[suits[i]];if(f.length)drawCard(c,f.at(-1),315+i*75,30)}for(let x=0;x<7;x++){const arr=piles[x];arr.forEach((q,i)=>q.up?drawCard(c,q,42+x*82,130+i*24):drawBack(c,42+x*82,130+i*24))}txt(c,'手数 '+moves,10,470,12,'#fff');if(sel)txt(c,'選択 '+name(sel.cards[0]),630,470,12,'#fff','right')}
 })
 function drawSlot(c,x,y,label){c.strokeStyle='#ffffff77';c.strokeRect(x,y,62,84);txt(c,label,x+31,y+47,10,'#ffffff77','center')}
 function drawBack(c,x,y){rect(c,x,y,58,80,'#214b9a');c.strokeStyle='#fff';c.strokeRect(x,y,58,80)}
 function drawCard(c,q,x,y){rect(c,x,y,58,80,'#f6f2df');c.strokeStyle='#222';c.strokeRect(x,y,58,80);txt(c,name(q),x+5,y+18,13,red(q.s)?'#c22':'#111')}
});

R.register({id:'bomber-grid',title:'Bomberman',year:1983,system:'COMPUTER / CONSOLE',genre:'Action',color:'#ffcf59',description:'格子状の迷路へ爆弾を置き、壁を壊しながら敵を爆風で倒す。',classic:'爆弾は数秒後に十字爆発。壊せる壁と壊せない壁を見分けて進む。',modern:'爆風範囲・移動速度パワーアップ、危険タイル予告を追加。',controls:'矢印 / スペース 爆弾',auto:'壊せる壁や敵へ近づき、爆弾設置後は爆風外へ退避'},(host,api)=>{
 const W=15,H=11,S=36,OX=50,OY=42;let grid,p,enemies,bombs,range,maxBombs,over,moveCd;
 function build(){grid=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x===0||y===0||x===W-1||y===H-1||(x%2===0&&y%2===0)?2:Math.random()<.42?1:0));grid[1][1]=grid[1][2]=grid[2][1]=0}
 function reset(){build();p={x:1,y:1};enemies=[{x:13,y:9},{x:13,y:1},{x:1,y:9}];bombs=[];range=2;maxBombs=1;over=false;moveCd=0;api.setStatus('敵を全滅させろ')};reset();
 const dirs=[{dx:1,dy:0,k:'ArrowRight'},{dx:-1,dy:0,k:'ArrowLeft'},{dx:0,dy:1,k:'ArrowDown'},{dx:0,dy:-1,k:'ArrowUp'}];const open=(x,y)=>grid[y]?.[x]===0&&!bombs.some(b=>b.x===x&&b.y===y);
 function blastCells(b){const a=[[b.x,b.y]];for(const d of dirs)for(let n=1;n<=b.range;n++){const x=b.x+d.dx*n,y=b.y+d.dy*n;if(grid[y]?.[x]===2)break;a.push([x,y]);if(grid[y]?.[x]===1)break}return a}
 function danger(x,y){return bombs.some(b=>b.t<1.25&&blastCells(b).some(([a,c])=>a===x&&c===y))}
 function safeDirs(){return dirs.filter(d=>open(p.x+d.dx,p.y+d.dy)&&!danger(p.x+d.dx,p.y+d.dy))}
 return api.canvas({
  reset,
  auto(e,dt,cfg){if(over||moveCd>0)return;if(danger(p.x,p.y)){const d=safeDirs()[0];if(d)press(e,d.k);return}const near=[...enemies].sort((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.y-p.y)-Math.abs(b.x-p.x)-Math.abs(b.y-p.y))[0];const breakable=dirs.some(d=>grid[p.y+d.dy]?.[p.x+d.dx]===1);if((near&&Math.abs(near.x-p.x)+Math.abs(near.y-p.y)<=2)||breakable){if(bombs.length<maxBombs)press(e,'Space');const d=safeDirs()[0];if(d)press(e,d.k);return}if(near){const opts=safeDirs().sort((a,b)=>Math.abs((p.x+a.dx)-near.x)+Math.abs((p.y+a.dy)-near.y)-Math.abs((p.x+b.dx)-near.x)-Math.abs((p.y+b.dy)-near.y));if(opts[0])press(e,opts[0].k)}},
  keyDown(e,k){if(k==='Space'&&bombs.filter(b=>b.owner).length<maxBombs&&!bombs.some(b=>b.x===p.x&&b.y===p.y)){bombs.push({x:p.x,y:p.y,t:2.2,range,owner:true,boom:0});api.beep(280,.03)}},
  update(e,dt){if(over)return;moveCd=Math.max(0,moveCd-dt);if(moveCd<=0){for(const d of dirs)if(e.keys.has(d.k)&&open(p.x+d.dx,p.y+d.dy)){p.x+=d.dx;p.y+=d.dy;moveCd=.11;break}}for(const b of bombs){b.t-=dt;if(b.t<=0&&b.boom<=0){b.boom=.45;api.beep(90,.08);for(const[x,y]of blastCells(b)){if(grid[y]?.[x]===1){grid[y][x]=0;api.addScore(10);if(api.mode==='modern'&&Math.random()<.12){range=Math.min(5,range+1);api.setStatus('火力アップ')}}for(const en of enemies)if(en.x===x&&en.y===y)en.dead=true;if(p.x===x&&p.y===y){over=true;api.finish('爆風に巻き込まれた')}}}if(b.boom>0)b.boom-=dt}bombs=bombs.filter(b=>b.boom>0||b.t>0);enemies=enemies.filter(e=>!e.dead);for(const en of enemies){if(Math.random()<dt*3){const o=dirs.filter(d=>open(en.x+d.dx,en.y+d.dy));if(o.length){const d=o[Math.floor(Math.random()*o.length)];en.x+=d.dx;en.y+=d.dy}}if(en.x===p.x&&en.y===p.y){over=true;api.finish('捕まった')}}if(!enemies.length&&!over){api.addScore(500);api.setStatus('ステージクリア');reset()}},
  draw(e){const c=e.ctx;rect(c,0,0,640,480,'#162b18');for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=grid[y][x],px=OX+x*S,py=OY+y*S;if(v===2)rect(c,px,py,S-2,S-2,'#78808a');else if(v===1)rect(c,px,py,S-2,S-2,'#a96b36');else rect(c,px,py,S-2,S-2,'#214b24')}for(const b of bombs){const px=OX+b.x*S+S/2,py=OY+b.y*S+S/2;if(b.boom>0){for(const[x,y]of blastCells(b))rect(c,OX+x*S+5,OY+y*S+5,S-12,S-12,'#ffb347')}else{c.fillStyle='#111';c.beginPath();c.arc(px,py,11,0,6.28);c.fill();txt(c,'*',px,py+5,13,'#fff','center')}}for(const en of enemies)rect(c,OX+en.x*S+8,OY+en.y*S+8,S-18,S-18,'#e75');rect(c,OX+p.x*S+8,OY+p.y*S+8,S-18,S-18,'#fff');txt(c,'爆風 '+range,10,470,12,'#fff')}
 })
});
})();