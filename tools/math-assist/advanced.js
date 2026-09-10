'use strict';

// ---------- probability / matrices / units / triangles ----------
function parseMatrix(text){
  const rows=text.trim().split(/\n+/).map(r=>r.trim()).filter(Boolean).map(r=>r.split(/[\s,，]+/).filter(Boolean).map(Number));
  if(!rows.length||rows.some(r=>!r.length||r.some(x=>!Number.isFinite(x))))throw Error('行ごとに数値を入力してください。');
  if(rows.some(r=>r.length!==rows[0].length))throw Error('各行の列数をそろえてください。');
  if(rows.length>6||rows[0].length>6)throw Error('ブラウザ版では6×6までにしてください。');return rows
}
function matrixToHtml(A){return `<div class="matrix-out">${A.map(r=>`<div>[ ${r.map(x=>fmt(x,8)).join('　')} ]</div>`).join('')}</div>`}
function matAdd(A,B,sign=1){if(A.length!==B.length||A[0].length!==B[0].length)throw Error('足し引きする行列の大きさをそろえてください。');return A.map((r,i)=>r.map((x,j)=>x+sign*B[i][j]))}
function matMul(A,B){if(A[0].length!==B.length)throw Error('Aの列数とBの行数を同じにしてください。');return A.map(r=>B[0].map((_,j)=>r.reduce((s,x,k)=>s+x*B[k][j],0)))}
function matTranspose(A){return A[0].map((_,j)=>A.map(r=>r[j]))}
function matDet(A){if(A.length!==A[0].length)throw Error('行列式は正方行列で求めます。');const M=A.map(r=>r.slice()),n=M.length;let det=1;for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;if(Math.abs(M[p][c])<EPS)return 0;if(p!==c){[M[p],M[c]]=[M[c],M[p]];det*=-1}const q=M[c][c];det*=q;for(let r=c+1;r<n;r++){const k=M[r][c]/q;for(let j=c+1;j<n;j++)M[r][j]-=k*M[c][j]}}return det}
function matInverse(A){if(A.length!==A[0].length)throw Error('逆行列は正方行列で求めます。');const n=A.length,M=A.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>i===j?1:0)]);for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;if(Math.abs(M[p][c])<EPS)throw Error('逆行列はありません（行列式が0です）。');[M[p],M[c]]=[M[c],M[p]];const q=M[c][c];for(let j=0;j<2*n;j++)M[c][j]/=q;for(let r=0;r<n;r++){if(r===c)continue;const k=M[r][c];for(let j=0;j<2*n;j++)M[r][j]-=k*M[c][j]}}return M.map(r=>r.slice(n))}
function runMatrix(){const box=$('#matrixResult');try{const A=parseMatrix($('#matrixA').value),mode=$('#matrixMode').value;let ans,label;if(mode==='det'){ans=matDet(A);label='行列式';box.innerHTML=`<div class="big-answer">det(A) = ${fmt(ans)}</div>`}else if(mode==='inv'){ans=matInverse(A);label='逆行列';box.innerHTML=`<div class="big-answer">A⁻¹</div>${matrixToHtml(ans)}`}else if(mode==='transpose'){ans=matTranspose(A);label='転置';box.innerHTML=`<div class="big-answer">転置行列</div>${matrixToHtml(ans)}`}else{const B=parseMatrix($('#matrixB').value);if(mode==='add')ans=matAdd(A,B);if(mode==='sub')ans=matAdd(A,B,-1);if(mode==='mul')ans=matMul(A,B);label=mode==='add'?'A+B':mode==='sub'?'A−B':'A×B';box.innerHTML=`<div class="big-answer">${label}</div>${matrixToHtml(ans)}`}box.className='result success';addHistory('行列',mode,label)}catch(e){box.className='result error';box.textContent=e.message}}

function runCombinatorics(){const box=$('#comboResult');try{const n=BigInt($('#comboN').value),r=BigInt($('#comboR').value),mode=$('#comboMode').value;let ans,label;if(mode==='comb'){ans=nCrBig(n,r);label=`${n}C${r}`}if(mode==='perm'){ans=nPrBig(n,r);label=`${n}P${r}`}if(mode==='fact'){ans=factorialBig(n);label=`${n}!`}box.className='result success';box.innerHTML=`<div class="big-answer">${label} = ${ans}</div><div class="steps">${String(ans).length>80?`桁数：${String(ans).length}`:'正確な整数で計算しています。'}</div>`}catch(e){box.className='result error';box.textContent=e.message}}
function runProbability(){const box=$('#probResult');try{const fav=Number($('#probFav').value),all=Number($('#probAll').value);if(!Number.isFinite(fav)||!Number.isFinite(all)||!Number.isInteger(fav)||!Number.isInteger(all)||all<=0||fav<0||fav>all)throw Error('場合の数は整数で、0 ≤ 当たり ≤ 全体 にしてください。');const f=new Fraction(BigInt(Math.round(fav)),BigInt(Math.round(all))),pct=f.toNumber()*100;box.className='result success';box.innerHTML=`<div class="big-answer">確率：${f.toString()} ≈ ${fmt(pct,8)}%</div><div class="steps">有利な場合 ${fmt(fav)} ÷ 全体 ${fmt(all)}</div>`}catch(e){box.className='result error';box.textContent=e.message}}

const UNIT_DB={
  length:{label:'長さ',units:{mm:.001,cm:.01,m:1,km:1000,in:0.0254,ft:0.3048,yd:0.9144}},
  area:{label:'面積',units:{'mm²':1e-6,'cm²':1e-4,'m²':1,'km²':1e6,ha:10000}},
  volume:{label:'体積',units:{mL:1e-6,L:.001,'cm³':1e-6,'m³':1}},
  mass:{label:'質量',units:{mg:1e-6,g:.001,kg:1,t:1000}},
  time:{label:'時間',units:{ms:.001,'秒':1,'分':60,'時間':3600,'日':86400}},
  speed:{label:'速さ',units:{'m/s':1,'km/h':1/3.6}},
  data:{label:'データ量',units:{B:1,KB:1000,MB:1e6,GB:1e9,TB:1e12,KiB:1024,MiB:1048576,GiB:1073741824}},
  angle:{label:'角度',units:{'°':Math.PI/180,rad:1}}
};
function unitOptions(group){return Object.keys(UNIT_DB[group].units).map(u=>`<option value="${esc(u)}">${esc(u)}</option>`).join('')}
function renderUnitOptions(){const g=$('#unitGroup')?.value;if(!g)return;$('#unitFrom').innerHTML=unitOptions(g);$('#unitTo').innerHTML=unitOptions(g);const keys=Object.keys(UNIT_DB[g].units);$('#unitTo').value=keys[1]||keys[0]}
function runUnit(){const box=$('#unitResult');try{const g=$('#unitGroup').value,v=Number($('#unitValue').value),from=$('#unitFrom').value,to=$('#unitTo').value;if(!Number.isFinite(v))throw Error('数値を入力してください。');const units=UNIT_DB[g].units,ans=v*units[from]/units[to];box.className='result success';box.innerHTML=`<div class="big-answer">${fmt(ans)} ${esc(to)}</div><div class="steps">${fmt(v)} ${esc(from)} = ${fmt(ans)} ${esc(to)}</div>`;addHistory('単位換算',`${v}${from}`,`${fmt(ans)}${to}`)}catch(e){box.className='result error';box.textContent=e.message}}

function deg(x){return x*180/Math.PI}function rad(x){return x*Math.PI/180}
function triangleSSS(a,b,c){if(a<=0||b<=0||c<=0||a+b<=c||a+c<=b||b+c<=a)throw Error('三角形になる辺の長さを入力してください。');const A=deg(Math.acos((b*b+c*c-a*a)/(2*b*c))),B=deg(Math.acos((a*a+c*c-b*b)/(2*a*c))),C=180-A-B,s=(a+b+c)/2,area=Math.sqrt(s*(s-a)*(s-b)*(s-c));return{a,b,c,A,B,C,area,perimeter:a+b+c}}
function triangleSAS(a,b,C){if(a<=0||b<=0||C<=0||C>=180)throw Error('辺は正、角度は0°より大きく180°未満です。');const c=Math.sqrt(a*a+b*b-2*a*b*Math.cos(rad(C)));return triangleSSS(a,b,c)}
function runTriangle(){const box=$('#triangleResult');try{const mode=$('#triangleMode').value,a=Number($('#triA').value),b=Number($('#triB').value),cOrAngle=Number($('#triC').value);let t;if(mode==='sss')t=triangleSSS(a,b,cOrAngle);else t=triangleSAS(a,b,cOrAngle);box.className='result success';box.innerHTML=`<div class="big-answer">面積 ${fmt(t.area)} / 周長 ${fmt(t.perimeter)}</div><div class="steps">辺：a=${fmt(t.a)}, b=${fmt(t.b)}, c=${fmt(t.c)}<br>角：A=${fmt(t.A,6)}°、B=${fmt(t.B,6)}°、C=${fmt(t.C,6)}°</div>`}catch(e){box.className='result error';box.textContent=e.message}}

function initAdvancedUI(){
  $('#matrixRun')?.addEventListener('click',runMatrix);$('#comboRun')?.addEventListener('click',runCombinatorics);$('#probRun')?.addEventListener('click',runProbability);$('#unitGroup')?.addEventListener('change',renderUnitOptions);$('#unitRun')?.addEventListener('click',runUnit);$('#triangleRun')?.addEventListener('click',runTriangle);renderUnitOptions();
}
document.addEventListener('DOMContentLoaded',initAdvancedUI);
