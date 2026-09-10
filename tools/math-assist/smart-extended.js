'use strict';

// Extra routing for advanced calculations. Falls back to smart.js for common cases.
function openAndFill(tab, id, value, run){openTab(tab);const el=$(id);if(el)el.value=value;if(typeof run==='function')run()}
function parseMatrixCandidate(raw){const lines=raw.trim().split(/\n+/).map(x=>x.trim()).filter(Boolean);if(lines.length<2)return null;const rows=lines.map(l=>l.split(/[\s,，]+/).filter(Boolean));if(rows.some(r=>r.length<2||r.some(v=>!Number.isFinite(Number(v))))||!rows.every(r=>r.length===rows[0].length))return null;return rows}
function findUnit(raw){
  const all=[];for(const [group,def] of Object.entries(UNIT_DB))for(const unit of Object.keys(def.units))all.push({group,unit});
  all.sort((a,b)=>b.unit.length-a.unit.length);const escaped=u=>u.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(const from of all){const m=raw.match(new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*${escaped(from.unit)}\\s*(?:を|から|→|->|to)\\s*(${all.filter(x=>x.group===from.group).map(x=>escaped(x.unit)).join('|')})`,'i'));if(m)return {value:Number(m[1]),from:from.unit,to:m[2],group:from.group}}
  return null
}
function setUnitUI(c){openTab('advanced');$('#unitGroup').value=c.group;renderUnitOptions();$('#unitValue').value=c.value;$('#unitFrom').value=c.from;$('#unitTo').value=c.to;runUnit()}
function advancedSmartAnalyze(){
  const raw=$('#smartInput')?.value.trim();if(!raw)return false;const s=normalizeText(raw);
  const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean),vars=parseVariablesFromEquations(raw);
  if(lines.length>=2&&lines.every(x=>x.includes('='))&&vars.length>=2&&vars.length<=4){setSmartResult(`<strong>${lines.length}本の一次連立方程式候補を検出しました。</strong><br>変数：${vars.map(esc).join('、')}`,'success');setSuggestions([{title:'連立方程式として解く',desc:'2〜4変数をガウス消去法で解く',run:()=>openAndFill('equation','#systemInput',raw,runSystem)}]);return true}
  let fm=s.match(/^\s*y\s*=\s*(.+)$/i)||s.match(/^\s*f\s*\(\s*x\s*\)\s*=\s*(.+)$/i);
  if(fm){const expr=fm[1];setSmartResult(`<strong>関数 f(x) = ${esc(expr)} を検出しました。</strong>`,'success');setSuggestions([{title:'グラフと性質を調べる',desc:'値・傾き・零点・定積分を解析',run:()=>openAndFill('equation','#functionInput',expr,runFunctionAnalysis)}]);return true}
  if(/\//.test(s)&&/^[\d\s.+\-*/^()]+$/.test(s)){
    try{const f=evalExact(s);setSmartResult(`<div class="big-answer">${esc(f.toString())}</div><div class="steps">厳密値 / 小数：約 ${fmt(f.toNumber())}</div>`,'success');setSuggestions([{title:'厳密計算を開く',desc:'分子・分母を整数のまま確認',run:()=>openAndFill('calc','#exactInput',s,()=>$('#exactRun').click())}]);addHistory('厳密入力',raw,f.toString());return true}catch{}
  }
  let m=s.match(/^\s*(\d+)\s*[cC]\s*(\d+)\s*$/);if(m){const n=m[1],r=m[2],ans=nCrBig(BigInt(n),BigInt(r));setSmartResult(`<div class="big-answer">${n}C${r} = ${ans}</div>`,'success');setSuggestions([{title:'組合せツールを開く',desc:'nCr・nPr・階乗',run:()=>{openTab('advanced');$('#comboMode').value='comb';$('#comboN').value=n;$('#comboR').value=r;runCombinatorics()}}]);return true}
  m=s.match(/^\s*(\d+)\s*[pP]\s*(\d+)\s*$/);if(m){const n=m[1],r=m[2],ans=nPrBig(BigInt(n),BigInt(r));setSmartResult(`<div class="big-answer">${n}P${r} = ${ans}</div>`,'success');setSuggestions([{title:'順列ツールを開く',desc:'nPrを確認',run:()=>{openTab('advanced');$('#comboMode').value='perm';$('#comboN').value=n;$('#comboR').value=r;runCombinatorics()}}]);return true}
  m=s.match(/^\s*(\d+)\s*!\s*$/);if(m){const n=m[1],ans=factorialBig(BigInt(n));setSmartResult(`<div class="big-answer">${n}! = ${ans}</div>`,'success');setSuggestions([{title:'階乗ツールを開く',desc:'大きな整数も正確に計算',run:()=>{openTab('advanced');$('#comboMode').value='fact';$('#comboN').value=n;runCombinatorics()}}]);return true}
  if(/最大公約数/.test(raw)){const a=numbersFrom(raw);if(a.length>=2){const ans=bigGcd(BigInt(Math.trunc(a[0])),BigInt(Math.trunc(a[1])));setSmartResult(`<div class="big-answer">最大公約数：${ans}</div>`,'success');setSuggestions([]);return true}}
  if(/最小公倍数/.test(raw)){const a=numbersFrom(raw);if(a.length>=2){const ans=bigLcm(BigInt(Math.trunc(a[0])),BigInt(Math.trunc(a[1])));setSmartResult(`<div class="big-answer">最小公倍数：${ans}</div>`,'success');setSuggestions([]);return true}}
  if(/素因数分解/.test(raw)){const a=numbersFrom(raw);if(a.length){const f=compressedFactors(primeFactorsBig(BigInt(Math.trunc(a[0]))));setSmartResult(`<div class="big-answer">${esc(f)}</div>`,'success');setSuggestions([]);return true}}
  const conv=findUnit(raw);if(conv){setSmartResult(`<strong>${fmt(conv.value)} ${esc(conv.from)} → ${esc(conv.to)}</strong> を検出しました。`,'success');setSuggestions([{title:'単位換算する',desc:UNIT_DB[conv.group].label,run:()=>setUnitUI(conv)}]);return true}
  if(/三角形/.test(raw)){const a=numbersFrom(raw);if(a.length>=3){try{const t=triangleSSS(a[0],a[1],a[2]);setSmartResult(`<div class="big-answer">三角形の面積：${fmt(t.area)}</div><div class="steps">周長 ${fmt(t.perimeter)} / 角 ${fmt(t.A,4)}°・${fmt(t.B,4)}°・${fmt(t.C,4)}°</div>`,'success');setSuggestions([{title:'三角形ツールを開く',desc:'辺と角を詳しく表示',run:()=>{openTab('geometry');$('#triangleMode').value='sss';$('#triA').value=a[0];$('#triB').value=a[1];$('#triC').value=a[2];runTriangle()}}]);return true}catch{}}
  }
  const matrix=parseMatrixCandidate(raw);if(matrix){setSmartResult(`<strong>${matrix.length}×${matrix[0].length} の数表を検出しました。</strong><br>行列として扱うことも、データとして扱うこともできます。`,'success');setSuggestions([{title:'行列Aとして使う',desc:'行列式・逆行列・転置・積など',run:()=>{openTab('advanced');$('#matrixA').value=raw}},{title:'データとして分析',desc:'平均・中央値・グラフ',run:()=>{openTab('data');$('#dataInput').value=raw;runData()}}]);return true}
  return false
}

function installAdvancedSmart(){
  const b=$('#smartAnalyze');if(b)b.addEventListener('click',e=>{if(advancedSmartAnalyze()){e.preventDefault();e.stopImmediatePropagation()}},true);
  $('#smartInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();if(!advancedSmartAnalyze())smartAnalyze()}});
  $$('[data-example]').forEach(btn=>btn.addEventListener('click',e=>{const v=btn.dataset.example;$('#smartInput').value=v;if(advancedSmartAnalyze()){e.preventDefault();e.stopImmediatePropagation()}},true));
}
installAdvancedSmart();
