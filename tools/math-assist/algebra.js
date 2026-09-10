'use strict';

// ---------- algebra / systems / functions ----------
function equationFunction(eq, vars){
  const parts=normalizeText(eq).split('=');if(parts.length!==2)throw Error('各式を「左辺 = 右辺」で入力してください。');
  return values=>evalExpression(parts[0],values)-evalExpression(parts[1],values)
}
function linearCoefficients(eq,vars){
  const f=equationFunction(eq,vars),zero=Object.fromEntries(vars.map(v=>[v,0])),c=f(zero),coefs=[];
  for(const v of vars){const p={...zero,[v]:1};coefs.push(f(p)-c)}
  const tests=[Object.fromEntries(vars.map((v,i)=>[v,i+1])),Object.fromEntries(vars.map((v,i)=>[v,-i-2]))];
  for(const t of tests){const expected=c+vars.reduce((s,v,i)=>s+coefs[i]*t[v],0);if(!nearly(f(t),expected))throw Error('連立方程式は一次式だけに対応しています。x²、xy、分母の変数などは使えません。')}
  return [...coefs,-c]
}
function gaussianSolve(matrix){
  const a=matrix.map(r=>r.map(Number)),n=a.length,m=a[0].length-1;let row=0,pivots=[];
  for(let col=0;col<m&&row<n;col++){
    let best=row;for(let r=row+1;r<n;r++)if(Math.abs(a[r][col])>Math.abs(a[best][col]))best=r;
    if(Math.abs(a[best][col])<EPS)continue;[a[row],a[best]]=[a[best],a[row]];const p=a[row][col];for(let j=col;j<=m;j++)a[row][j]/=p;
    for(let r=0;r<n;r++){if(r===row)continue;const k=a[r][col];if(Math.abs(k)<EPS)continue;for(let j=col;j<=m;j++)a[r][j]-=k*a[row][j]}
    pivots.push(col);row++
  }
  for(const r of a){if(r.slice(0,m).every(x=>Math.abs(x)<EPS)&&Math.abs(r[m])>=EPS)return {kind:'none',rref:a}}
  if(pivots.length<m)return {kind:'many',rref:a,pivots};
  const x=Array(m).fill(0);for(let i=0;i<pivots.length;i++)x[pivots[i]]=a[i][m];return {kind:'one',solution:x,rref:a}
}
function formatRref(r){return r.map(row=>'[ '+row.map(x=>fmt(x,8)).join(' , ')+' ]').join('<br>')}
function parseVariablesFromEquations(text){const ids=[...new Set((normalizeText(text).match(/[A-Za-z]+/g)||[]).map(x=>x.toLowerCase()).filter(x=>!FUNCS[x]&&!(x in CONSTS)))];const preferred=['x','y','z'];ids.sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b)});return ids}
function runSystem(){const box=$('#systemResult');try{const lines=$('#systemInput').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);if(lines.length<2||lines.length>4)throw Error('2〜4本の方程式を1行ずつ入力してください。');const vars=parseVariablesFromEquations(lines.join('\n'));if(vars.length<2||vars.length>4)throw Error('変数は2〜4個にしてください（例：x, y, z）。');if(lines.length!==vars.length)throw Error(`式が${lines.length}本、変数が${vars.length}個あります。式と変数の数をそろえてください。`);const mat=lines.map(l=>linearCoefficients(l,vars)),sol=gaussianSolve(mat);let html;if(sol.kind==='none')html='<div class="big-answer">解なし</div><div class="steps">式どうしが矛盾しています。</div>';else if(sol.kind==='many')html='<div class="big-answer">解が無数にあります</div><div class="steps">独立な式が不足しています。<br>'+formatRref(sol.rref)+'</div>';else html=`<div class="big-answer">${vars.map((v,i)=>`${v} = ${fmt(sol.solution[i])}`).join('　')}</div><div class="steps">行基本変形後：<br>${formatRref(sol.rref)}</div>`;box.className='result success';box.innerHTML=html;addHistory('連立方程式',lines.join(' / '),box.querySelector('.big-answer').textContent)}catch(e){box.className='result error';box.textContent=e.message}}

function integerQuadraticFactor(a,b,c){
  if(!Number.isInteger(a)||!Number.isInteger(b)||!Number.isInteger(c)||a===0)return null;
  const g=Number(bigGcd(bigGcd(BigInt(Math.abs(a)),BigInt(Math.abs(b))),BigInt(Math.abs(c))))||1;let aa=a/g,bb=b/g,cc=c/g;
  if(cc===0){const inner=termPX(aa,bb);return {g,text:`${g!==1?g:''}x(${inner})`}}
  for(let p=-Math.abs(aa);p<=Math.abs(aa);p++){if(p===0||aa%p)continue;const r=aa/p;for(let q=-Math.abs(cc||1);q<=Math.abs(cc||1);q++){if(q===0&&cc!==0)continue;if(q!==0&&cc%q)continue;const s=q===0?0:cc/q;if(p*s+q*r===bb){return {g,p,q,r,s,text:`${g!==1?g:''}(${termPX(p,q)})(${termPX(r,s)})`}}}if(cc===0&&p*0+bb===bb){} }
  return null
}
function termPX(p,q){const x=p===1?'x':p===-1?'-x':`${p}x`;return q===0?x:`${x} ${q>0?'+':'−'} ${Math.abs(q)}`}
function runFactor(){const box=$('#factorResult');try{const eq=$('#factorInput').value.trim();const expr=eq.includes('=')?eq.split('=')[0]:eq;const f=x=>evalExpression(expr,{x});const y0=f(0),y1=f(1),y2=f(2);let a=(y2-2*y1+y0)/2,b=y1-y0-a,c=y0;for(const x of [-2,-1,3])if(!nearly(f(x),a*x*x+b*x+c))throw Error('現在の因数分解はxの二次式までです。');a=Math.round(a);b=Math.round(b);c=Math.round(c);const fac=integerQuadraticFactor(a,b,c);if(!fac)throw Error('整数係数の一次式どうしにはきれいに因数分解できません。解の公式を使う方が適切です。');box.className='result success';box.innerHTML=`<div class="big-answer">${esc(fac.text)}</div><div class="steps">${a}x² ${b>=0?'+':'−'} ${Math.abs(b)}x ${c>=0?'+':'−'} ${Math.abs(c)}</div>`}catch(e){box.className='result error';box.textContent=e.message}}

function functionSamples(expr,min,max,count=401){const pts=[];for(let i=0;i<count;i++){const x=min+(max-min)*i/(count-1);let y;try{y=evalExpression(expr,{x})}catch{y=NaN}pts.push({x,y})}return pts}
function bisectRoot(expr,a,b){let fa,fb;try{fa=evalExpression(expr,{x:a});fb=evalExpression(expr,{x:b})}catch{return null}if(!Number.isFinite(fa)||!Number.isFinite(fb)||fa*fb>0)return null;for(let i=0;i<70;i++){const m=(a+b)/2;let fm;try{fm=evalExpression(expr,{x:m})}catch{return null}if(!Number.isFinite(fm))return null;if(Math.abs(fm)<1e-12)return m;if(fa*fm<=0){b=m;fb=fm}else{a=m;fa=fm}}return (a+b)/2}
function findRoots(expr,min,max){const pts=functionSamples(expr,min,max,800),roots=[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(!Number.isFinite(a.y)||!Number.isFinite(b.y))continue;if(Math.abs(a.y)<1e-8)roots.push(a.x);if(a.y*b.y<0){const r=bisectRoot(expr,a.x,b.x);if(r!==null)roots.push(r)}}return roots.filter((r,i,a)=>i===0||Math.abs(r-a[i-1])>1e-5).slice(0,20)}
function derivativeAt(expr,x){const h=Math.max(1e-6,Math.abs(x)*1e-6);return (evalExpression(expr,{x:x+h})-evalExpression(expr,{x:x-h}))/(2*h)}
function integrateSimpson(expr,a,b,n=1000){if(n%2)n++;const h=(b-a)/n;let s=evalExpression(expr,{x:a})+evalExpression(expr,{x:b});for(let i=1;i<n;i++){const y=evalExpression(expr,{x:a+i*h});if(!Number.isFinite(y))throw Error('区間内に計算できない点があります。');s+=(i%2?4:2)*y}return s*h/3}
function drawFunction(){const canvas=$('#functionCanvas');if(!canvas)return;const ctx=canvas.getContext('2d'),expr=$('#functionInput').value.trim(),xmin=Number($('#xMin').value),xmax=Number($('#xMax').value);if(!expr||!Number.isFinite(xmin)||!Number.isFinite(xmax)||xmin>=xmax)return;const pts=functionSamples(expr,xmin,xmax,700),ys=pts.map(p=>p.y).filter(Number.isFinite);if(!ys.length)return;ys.sort((a,b)=>a-b);let ymin=ys[Math.floor(ys.length*.02)],ymax=ys[Math.floor(ys.length*.98)];if(nearly(ymin,ymax)){ymin-=1;ymax+=1}const pad=(ymax-ymin)*.1;ymin-=pad;ymax+=pad;const W=canvas.width,H=canvas.height,px=x=>(x-xmin)/(xmax-xmin)*W,py=y=>H-(y-ymin)/(ymax-ymin)*H;ctx.clearRect(0,0,W,H);ctx.lineWidth=1;ctx.strokeStyle='#d7deea';ctx.beginPath();if(xmin<=0&&xmax>=0){ctx.moveTo(px(0),0);ctx.lineTo(px(0),H)}if(ymin<=0&&ymax>=0){ctx.moveTo(0,py(0));ctx.lineTo(W,py(0))}ctx.stroke();ctx.lineWidth=2.5;ctx.strokeStyle='#3567d6';ctx.beginPath();let started=false,prevY=null;for(const p of pts){if(!Number.isFinite(p.y)||p.y<ymin*10-Math.abs(ymax)||p.y>ymax*10+Math.abs(ymin)){started=false;prevY=null;continue}const X=px(p.x),Y=py(p.y);if(!started||prevY===null||Math.abs(Y-prevY)>H*.65){ctx.moveTo(X,Y);started=true}else ctx.lineTo(X,Y);prevY=Y}ctx.stroke();ctx.fillStyle='#62708a';ctx.font='16px system-ui';ctx.fillText(`x: ${fmt(xmin,4)} ～ ${fmt(xmax,4)}`,12,H-12)}
function runFunctionAnalysis(){const box=$('#functionResult');try{const expr=$('#functionInput').value.trim(),xmin=Number($('#xMin').value),xmax=Number($('#xMax').value),x0=Number($('#xPoint').value);if(!expr)throw Error('f(x)を入力してください。');if(!Number.isFinite(xmin)||!Number.isFinite(xmax)||xmin>=xmax)throw Error('xの範囲を確認してください。');const y0=Number.isFinite(x0)?evalExpression(expr,{x:x0}):null,d=Number.isFinite(x0)?derivativeAt(expr,x0):null,roots=findRoots(expr,xmin,xmax);let integ;try{integ=integrateSimpson(expr,xmin,xmax,600)}catch{integ=null}drawFunction();box.className='result success';box.innerHTML=`<div class="big-answer">f(x) = ${esc(expr)}</div><div class="steps">${y0!==null?`f(${fmt(x0)}) = ${fmt(y0)}<br>その点の傾き ≈ ${fmt(d)}<br>`:''}範囲内の零点：${roots.length?roots.map(x=>fmt(x,8)).join('、'):'見つかりません'}<br>${integ!==null?`定積分（数値近似） ≈ ${fmt(integ,8)}`:'定積分はこの区間では評価できません'}</div>`;addHistory('関数',expr,roots.length?`零点 ${roots.map(x=>fmt(x,5)).join(',')}`:'解析済み')}catch(e){box.className='result error';box.textContent=e.message}}

function initAlgebraUI(){
  $('#systemRun')?.addEventListener('click',runSystem);$('#factorRun')?.addEventListener('click',runFactor);$('#functionRun')?.addEventListener('click',runFunctionAnalysis);$('#functionDraw')?.addEventListener('click',()=>{try{drawFunction()}catch(e){const b=$('#functionResult');b.className='result error';b.textContent=e.message}});
}
document.addEventListener('DOMContentLoaded',initAlgebraUI);
