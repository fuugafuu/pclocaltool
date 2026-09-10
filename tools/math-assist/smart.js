// ---------- history ----------
const HISTORY_KEY='pclocaltool_math_history_v1';
function getHistory(){ try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return[]} }
function addHistory(type,input,result){
  const h=getHistory(); h.unshift({type,input:String(input).slice(0,120),result:String(result).slice(0,120),time:new Date().toLocaleString('ja-JP')});
  localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,30))); renderHistory();
}
function renderHistory(){
  const box=$('#history'), h=getHistory(); box.innerHTML=h.length?'':'<div class="muted">まだありません。</div>';
  h.forEach(item=>{const d=document.createElement('div');d.className='hist';d.innerHTML=`<strong>${esc(item.result)}</strong><br><small>${esc(item.type)}・${esc(item.input)}</small>`;d.title=item.time;box.appendChild(d);});
}

function openTab(id){ $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id)); $$('.section').forEach(s=>s.classList.toggle('active',s.id===id)); }
$$('.tab').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));

function runCalc(expr=$('#expr').value){
  const out=$('#calcResult'); try{const v=evalExpression(expr);out.className='result success';out.innerHTML=`<div class="big-answer">${fmt(v)}</div><div class="steps">${esc(normalizeText(expr))} = ${fmt(v)}<br><span class="muted">三角関数は度数法（°）です。</span></div>`;addHistory('数式',expr,fmt(v));return v;}catch(e){out.className='result error';out.textContent=e.message;return null;}
}
$('#expr').addEventListener('keydown',e=>{if(e.key==='Enter')runCalc()});
$('#keypad').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.key){$('#expr').value+=b.dataset.key;$('#expr').focus()}else if(b.dataset.action==='clear')$('#expr').value='';else if(b.dataset.action==='equals')runCalc()});
$$('[data-fn]').forEach(b=>b.addEventListener('click',()=>{$('#expr').value+=b.dataset.fn;$('#expr').focus()}));

let smartActions={};
function setSmartResult(html,kind='success'){const r=$('#smartResult');r.className='result '+kind;r.innerHTML=html;}
function setSuggestions(items){
  const box=$('#smartSuggestions');box.innerHTML='';smartActions={};items.forEach((it,i)=>{const id='a'+i;smartActions[id]=it.run;const b=document.createElement('button');b.className='suggestion';b.dataset.action=id;b.innerHTML=`<strong>${esc(it.title)}</strong><span>${esc(it.desc||'')}</span>`;box.appendChild(b)});
}
$('#smartSuggestions').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&smartActions[b.dataset.action]) smartActions[b.dataset.action]()});
function numbersFrom(s){return (normalizeText(s).match(/-?\d+(?:\.\d+)?/g)||[]).map(Number)}
function parseLabeledData(text){
  const lines=text.trim().split(/\n+/).map(x=>x.trim()).filter(Boolean), rows=[];
  for(const line of lines){const m=line.match(/^(.+?)[\s,:：\t]+(-?\d+(?:\.\d+)?)\s*$/);if(!m)return null;rows.push({label:m[1].trim(),value:Number(m[2])});}
  return rows.length>=2?rows:null;
}
function smartAnalyze(){
  const raw=$('#smartInput').value.trim();setSuggestions([]);if(!raw){setSmartResult('数式・文章・データを入力してください。','');return}
  const s=normalizeText(raw), nums=numbersFrom(s), labeled=parseLabeledData(raw);
  if(labeled){
    setSmartResult(`<strong>${labeled.length}件の項目付きデータを検出しました。</strong><br>${labeled.map(x=>`${esc(x.label)} → ${fmt(x.value)}`).join('<br>')}`,'success');
    setSuggestions([{title:'統計を出す',desc:'平均・中央値・最大・最小など',run:()=>{openTab('data');$('#dataInput').value=raw;runData()}},{title:'棒グラフにする',desc:'項目ごとの大きさを比較',run:()=>{openTab('data');$('#dataInput').value=raw;$('#chartType').value='bar';runData()}}]);return;
  }
  if(/[xX]/.test(s)&&s.includes('=')){
    setSmartResult('<strong>xを含む方程式を検出しました。</strong> 一次・二次方程式として解析できます。','success');
    setSuggestions([{title:'方程式を解く',desc:'途中の係数も確認',run:()=>{openTab('equation');$('#equationInput').value=s;runEquation()}}]);return;
  }
  const radius=s.match(/半径\s*(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km)?/i);
  if(radius){
    const r=Number(radius[1]),u=radius[2]||'';setSmartResult(`<strong>円の半径 ${fmt(r)}${esc(u)} を検出しました。</strong>`,'success');
    setSuggestions([{title:'面積',desc:'π × 半径²',run:()=>smartCircle(r,u,'area')},{title:'円周',desc:'2 × π × 半径',run:()=>smartCircle(r,u,'circ')},{title:'直径',desc:'半径 × 2',run:()=>smartCircle(r,u,'diam')}]);return;
  }
  const count=s.match(/(-?\d+(?:\.\d+)?)\s*(?:人|個|本|枚)?\s*中\s*(-?\d+(?:\.\d+)?)\s*(?:人|個|本|枚)?/);
  if(count){
    const total=Number(count[1]),part=Number(count[2]);setSmartResult(`<strong>全体 ${fmt(total)}、部分 ${fmt(part)} を検出しました。</strong>`,'success');
    setSuggestions([{title:'百分率を求める',desc:'部分 ÷ 全体 × 100',run:()=>smartPercent(part,total)},{title:'残りを求める',desc:'全体 − 部分',run:()=>smartSimple(`${total}-${part}`,'残り')}]);return;
  }
  const money=s.match(/(-?\d+(?:\.\d+)?)\s*円[^\d]{0,20}(-?\d+(?:\.\d+)?)\s*個/);
  if(money){const price=+money[1],qty=+money[2];setSmartResult(`<strong>${fmt(price)}円 × ${fmt(qty)}個</strong> と解釈できます。`,'success');setSuggestions([{title:'合計金額',desc:`${fmt(price)} × ${fmt(qty)}`,run:()=>smartSimple(`${price}*${qty}`,'合計金額','円')}]);return}
  const conv=s.match(/(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km|mg|g|kg|秒|分|時間)\s*(?:を|→|から)\s*(mm|cm|m|km|mg|g|kg|秒|分|時間)/i);
  if(conv){const [_,v,from,to]=conv;setSmartResult(`<strong>${fmt(+v)}${esc(from)} → ${esc(to)}</strong> の単位換算を検出しました。`,'success');setSuggestions([{title:'換算する',desc:'単位をそろえて計算',run:()=>smartConvert(+v,from,to)}]);return}
  if(/比べ|大き|小さ|等し/.test(s)&&nums.length>=2){const [a,b]=nums;setSmartResult(`<strong>${fmt(a)} と ${fmt(b)}</strong> を比較できます。`,'success');setSuggestions([{title:'大小を比較',desc:'大きい・小さい・等しい',run:()=>smartCompare(a,b)},{title:'差を求める',desc:'2つの差の絶対値',run:()=>smartDifference(a,b)},{title:'何倍か',desc:`${fmt(a)} ÷ ${fmt(b)}`,run:()=>smartTimes(a,b)}]);return}
  if(isLikelyExpression(s)){
    try{const v=evalExpression(s);setSmartResult(`<div class="big-answer">${fmt(v)}</div><div class="steps">${esc(s)} = ${fmt(v)}</div>`,'success');addHistory('かんたん入力',raw,fmt(v));return}catch(e){setSmartResult(e.message,'error');return}
  }
  if(nums.length>=2){
    setSmartResult(`<strong>${nums.length}個の数値を検出しました。</strong><br>${nums.map(fmt).join('、')}`,'success');
    setSuggestions([{title:'合計',desc:'すべて足す',run:()=>smartAggregate(nums,'sum')},{title:'平均',desc:'合計 ÷ 個数',run:()=>smartAggregate(nums,'mean')},{title:'最大・最小',desc:'範囲も表示',run:()=>smartAggregate(nums,'range')},{title:'データとして分析',desc:'中央値・標準偏差など',run:()=>{openTab('data');$('#dataInput').value=nums.join(', ');runData()}}]);return;
  }
  setSmartResult('入力は読めましたが、計算の目的を1つに決められませんでした。数字・単位・「何を求めたいか」を少し足してください。','error');
}
function smartSimple(expr,label='答え',unit=''){const v=evalExpression(expr);setSmartResult(`<div class="big-answer">${esc(label)}：${fmt(v)}${esc(unit)}</div><div class="steps">${esc(expr)} = ${fmt(v)}</div>`,'success');addHistory('アシスト',expr,`${fmt(v)}${unit}`)}
function smartCircle(r,u,type){let v,label,unit=u;if(type==='area'){v=Math.PI*r*r;label='面積';unit=u?u+'²':''}if(type==='circ'){v=2*Math.PI*r;label='円周'}if(type==='diam'){v=2*r;label='直径'}setSmartResult(`<div class="big-answer">${label}：${fmt(v)}${esc(unit)}</div><div class="steps">半径 ${fmt(r)}${esc(u)} から計算</div>`,'success');addHistory('円',`半径${r}${u}`,`${label} ${fmt(v)}${unit}`)}
function smartPercent(part,total){if(nearly(total,0)){setSmartResult('全体が0なので割合は求められません。','error');return}const v=part/total*100;setSmartResult(`<div class="big-answer">${fmt(v)}%</div><div class="steps">${fmt(part)} ÷ ${fmt(total)} × 100 = ${fmt(v)}%</div>`,'success');addHistory('割合',`${part}/${total}`,`${fmt(v)}%`)}
function smartCompare(a,b){const rel=nearly(a,b)?'等しい':a>b?'大きい':'小さい';const sym=nearly(a,b)?'=':a>b?'>':'<';setSmartResult(`<div class="big-answer">${fmt(a)} は ${fmt(b)} より${rel==='等しい'?'等しい':rel}。</div><div class="steps">${fmt(a)} ${sym} ${fmt(b)}</div>`,'success');addHistory('比較',`${a}, ${b}`,`${a}${sym}${b}`)}
function smartDifference(a,b){const v=Math.abs(a-b);setSmartResult(`<div class="big-answer">差：${fmt(v)}</div><div class="steps">|${fmt(a)} − ${fmt(b)}| = ${fmt(v)}</div>`,'success');addHistory('差',`${a}, ${b}`,fmt(v))}
function smartTimes(a,b){if(nearly(b,0)){setSmartResult('0を基準に「何倍」は求められません。','error');return}const v=a/b;setSmartResult(`<div class="big-answer">${fmt(a)} は ${fmt(b)} の ${fmt(v)}倍</div>`,'success');addHistory('倍率',`${a}/${b}`,`${fmt(v)}倍`)}
function smartAggregate(a,type){const sum=a.reduce((x,y)=>x+y,0),mean=sum/a.length,min=Math.min(...a),max=Math.max(...a);if(type==='sum')smartSimple(a.join('+'),'合計');if(type==='mean')setSmartResult(`<div class="big-answer">平均：${fmt(mean)}</div><div class="steps">合計 ${fmt(sum)} ÷ ${a.length}</div>`,'success');if(type==='range')setSmartResult(`<div class="big-answer">最大 ${fmt(max)} / 最小 ${fmt(min)}</div><div class="steps">範囲：${fmt(max-min)}</div>`,'success')}
const UNIT_GROUPS={length:{mm:.001,cm:.01,m:1,km:1000},mass:{mg:.001,g:1,kg:1000},time:{'秒':1,'分':60,'時間':3600}};
function smartConvert(v,from,to){let g=Object.values(UNIT_GROUPS).find(x=>from in x&&to in x);if(!g){setSmartResult('この単位どうしは直接換算できません。','error');return}const ans=v*g[from]/g[to];setSmartResult(`<div class="big-answer">${fmt(ans)}${esc(to)}</div><div class="steps">${fmt(v)}${esc(from)} = ${fmt(ans)}${esc(to)}</div>`,'success');addHistory('単位換算',`${v}${from}`,`${fmt(ans)}${to}`)}
$('#smartAnalyze').addEventListener('click',smartAnalyze);$('#smartClear').addEventListener('click',()=>{$('#smartInput').value='';setSuggestions([]);setSmartResult('ここに結果が表示されます。','')});$$('[data-example]').forEach(b=>b.addEventListener('click',()=>{$('#smartInput').value=b.dataset.example;smartAnalyze()}));
