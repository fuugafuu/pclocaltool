/* Typing Arena: dependency-free text generator, romanization and adaptive coach. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypingEngine=api;})(typeof self!=='undefined'?self:globalThis,function(){
'use strict';
const KEYS='abcdefghijklmnopqrstuvwxyz';
const KANA={
あ:['a'],い:['i'],う:['u'],え:['e'],お:['o'],
か:['ka'],き:['ki'],く:['ku'],け:['ke'],こ:['ko'],さ:['sa'],し:['shi','si'],す:['su'],せ:['se'],そ:['so'],た:['ta'],ち:['chi','ti'],つ:['tsu','tu'],て:['te'],と:['to'],
な:['na'],に:['ni'],ぬ:['nu'],ね:['ne'],の:['no'],は:['ha'],ひ:['hi'],ふ:['fu','hu'],へ:['he'],ほ:['ho'],ま:['ma'],み:['mi'],む:['mu'],め:['me'],も:['mo'],
や:['ya'],ゆ:['yu'],よ:['yo'],ら:['ra'],り:['ri'],る:['ru'],れ:['re'],ろ:['ro'],わ:['wa'],を:['wo'],ん:['nn','n'],が:['ga'],ぎ:['gi'],ぐ:['gu'],げ:['ge'],ご:['go'],ざ:['za'],じ:['ji','zi'],ず:['zu'],ぜ:['ze'],ぞ:['zo'],だ:['da'],ぢ:['di','ji'],づ:['du','zu'],で:['de'],ど:['do'],ば:['ba'],び:['bi'],ぶ:['bu'],べ:['be'],ぼ:['bo'],ぱ:['pa'],ぴ:['pi'],ぷ:['pu'],ぺ:['pe'],ぽ:['po'],
きゃ:['kya'],きゅ:['kyu'],きょ:['kyo'],しゃ:['sha','sya'],しゅ:['shu','syu'],しょ:['sho','syo'],ちゃ:['cha','tya','cya'],ちゅ:['chu','tyu','cyu'],ちょ:['cho','tyo','cyo'],
にゃ:['nya'],にゅ:['nyu'],にょ:['nyo'],ひゃ:['hya'],ひゅ:['hyu'],ひょ:['hyo'],みゃ:['mya'],みゅ:['myu'],みょ:['myo'],りゃ:['rya'],りゅ:['ryu'],りょ:['ryo'],ぎゃ:['gya'],ぎゅ:['gyu'],ぎょ:['gyo'],じゃ:['ja','jya','zya'],じゅ:['ju','jyu','zyu'],じょ:['jo','jyo','zyo'],びゃ:['bya'],びゅ:['byu'],びょ:['byo'],ぴゃ:['pya'],ぴゅ:['pyu'],ぴょ:['pyo'],
ぁ:['xa','la'],ぃ:['xi','li'],ぅ:['xu','lu'],ぇ:['xe','le'],ぉ:['xo','lo'],ゃ:['xya','lya'],ゅ:['xyu','lyu'],ょ:['xyo','lyo'],っ:['xtu','ltu','ltsu'],ー:['-'],
' ':[' '],'.':['.'],',':[','],'!':['!'],'?':['?'],'・':['/'], '-':['-']
};
function katakanaToHiragana(v){return [...v].map(c=>{const n=c.charCodeAt(0);return n>=0x30a1&&n<=0x30f6?String.fromCharCode(n-0x60):c}).join('')}
function tokens(reading,language='ja'){
 if(language==='en')return [...reading.toLowerCase()].map(c=>({display:c,options:[c]}));
 const chars=[...katakanaToHiragana(reading)],out=[];
 for(let i=0;i<chars.length;i++){
  const a=chars[i],b=chars[i+1]||'',pair=a+b;
  if(a==='っ'&&b&&KANA[pair]===undefined&&KANA[b]&&!['あ','い','う','え','お','ん'].includes(b)){
    // Small tsu: consonant doubling, plus explicit xtu/ltu spellings.
    const next=KANA[b][0][0];
    out.push({display:a,options:[next,'xtu','ltu','ltsu']});continue;
  }
  if(a==='ん'){
    // Before vowels/y/n, n needs double-n to avoid ambiguous segmentation.
    const next=b===''?'':(KANA[b]?.[0]||b);
    out.push({display:a,options:/^[aiueoyn]/.test(next)?['nn']:['n','nn']});continue;
  }
  if(KANA[pair]){out.push({display:pair,options:KANA[pair]});i++;continue}
  out.push({display:a,options:KANA[a]||[a.toLowerCase()]});
 }
 return out;
}
function makeStates(tok,index){if(index>=tok.length)return [{idx:index,word:'',at:0}];return tok[index].options.map(word=>({idx:index,word,at:0}))}
function initialStates(tok){return makeStates(tok,0)}
function step(tok,states,key){
 const next=[],seen=new Set();
 for(const state of states){
  if(state.idx>=tok.length)continue;
  if(state.word[state.at]!==key)continue;
  const at=state.at+1;
  const produced=at>=state.word.length?makeStates(tok,state.idx+1):[{...state,at}];
  for(const value of produced){const k=value.idx+'|'+value.word+'|'+value.at;if(!seen.has(k)){seen.add(k);next.push(value)}}
 }
 return next;
}
function complete(tok,states){return states.some(s=>s.idx===tok.length)}
function progress(tok,states){let best=0;for(const s of states)best=Math.max(best,s.idx+(s.word.length?s.at/s.word.length:0));return tok.length?best/tok.length:1}
function canonical(tok){return tok.map(t=>t.options[0]).join('')}
function currentTarget(tok,states){const first=states.slice().sort((a,b)=>b.idx-a.idx||b.at-a.at)[0];if(!first)return '';return first.idx<tok.length?first.word.slice(first.at)+tok.slice(first.idx+1).map(x=>x.options[0]).join(''):''}
const JP_BANK={
daily:[
 ['あさのひかり','あさのひかり'],['まどをあける','まどをあける'],['みずをのむ','みずをのむ'],['とけいをみる','とけいをみる'],['きょうもいいてんき','きょうもいいてんき'],['すこしずつすすもう','すこしずつすすもう'],
 ['つぎのえきまであるく','つぎのえきまであるく'],['やさしいことばをえらぶ','やさしいことばをえらぶ'],['おいしいごはんをつくる','おいしいごはんをつくる'],['あたらしいほんをよむ','あたらしいほんをよむ'],
 ['青い空を見上げる','あおいそらをみあげる'],['静かな夜を過ごす','しずかなよるをすごす'],['今日の予定を確認する','きょうのよていをかくにんする'],['毎日の練習が力になる','まいにちのれんしゅうがちからになる'],['友達にメッセージを送る','ともだちにめっせーじをおくる'],
 ['あたたかいコーヒーを入れる','あたたかいこーひーをいれる'],['雨上がりの道を歩く','あめあがりのみちをあるく'],['窓辺で音楽を聴く','まどべでおんがくをきく'],['大切な時間を守る','たいせつなじかんをまもる'],['新しい発見に出会う','あたらしいはっけんにであう']
],
tech:[
 ['キーボードをたたく','きーぼーどをたたく'],['コードを保存する','こーどをほぞんする'],['プログラムを直す','ぷろぐらむをなおす'],['画面を最適化する','がめんをさいてきかする'],['新しい機能を試す','あたらしいきのうをためす'],['小さなバグを修正する','ちいさなばぐをしゅうせいする'],
 ['人工知能の仕組みを学ぶ','じんこうちのうのしくみをまなぶ'],['高速な処理を目指す','こうそくなしょりをめざす'],['データを安全に保存する','でーたをあんぜんにほぞんする'],['次のアップデートを考える','つぎのあっぷでーとをかんがえる'],
 ['サーバーの状態を調べる','さーばーのじょうたいをしらべる'],['暗号化した通信を使う','あんごうかしたつうしんをつかう'],['複雑な処理を分割する','ふくざつなしょりをぶんかつする'],['軽量なアプリを開発する','けいりょうなあぷりをかいはつする']
],
creative:[
 ['星空の向こうに旅立つ','ほしぞらのむこうにたびだつ'],['虹色のドラゴンが目覚める','にじいろのどらごんがめざめる'],['小さなロボットが走る','ちいさなろぼっとがはしる'],['森の奥で宝物を見つける','もりのおくでたからものをみつける'],['空飛ぶ図書館を探す','そらとぶとしょかんをさがす'],
 ['時を超える冒険を始める','ときをこえるぼうけんをはじめる'],['輝く未来を想像する','かがやくみらいをそうぞうする'],['海底の秘密を解き明かす','かいていのひみつをときあかす'],['小さな勇気が世界を変える','ちいさなゆうきがせかいをかえる']
],
science:[
 ['光の速さを計算する','ひかりのはやさをけいさんする'],['深い海の生き物を調べる','ふかいうみのいきものをしらべる'],['宇宙の広さを想像する','うちゅうのひろさをそうぞうする'],['電子の動きを観察する','でんしのうごきをかんさつする'],['不思議な現象を記録する','ふしぎなげんしょうをきろくする'],
 ['新しい仮説を検証する','あたらしいかせつをけんしょうする'],['温度と時間を測定する','おんどとじかんをそくていする'],['実験の結果をまとめる','じっけんのけっかをまとめる']
]};
const EN_BANK={
daily:['bright','morning','gentle','evening','the','quiet','garden','music','fresh','window','small','dream','practice','every','day','with','focus','and','energy'],
tech:['adaptive','keyboard','network','vector','render','engine','browser','syntax','logic','data','compile','memory','system','pixel','future','project','signal','code','update'],
creative:['galaxy','whisper','luminous','journey','ancient','castle','silver','phoenix','glimmer','mysterious','rhythm','spark','dragon','dream','wonder','story'],
science:['gravity','quantum','molecule','orbit','planet','research','energy','photon','theory','measure','entropy','calculate','complex','experiment','particle','electric']};
const EN_SENTENCES=[
 ['the','bright','future','starts','today'],['we','learn','from','every','mistake'],['create','something','amazing','today'],['every','small','step','is','progress'],
 ['build','a','better','world','together'],['focus','on','the','next','step'],['your','practice','makes','a','difference'],['a','clever','idea','changes','everything'],
 ['the','quick','fox','jumps','again'],['typing','is','a','skill','you','can','train'],['computers','process','data','quickly'],['practice','with','patience','and','care']];
const JP_START=[['ゆっくり','ゆっくり'],['もういちど','もういちど'],['今日も','きょうも'],['ときどき','ときどき'],['じっくり','じっくり'],['すこしずつ','すこしずつ'],['まっすぐ','まっすぐ'],['これから','これから']];
const JP_END=[['そして明日につなげる','そしてあしたにつなげる'],['きっと上手くいく','きっとうまくいく'],['一歩ずつ前に進む','いっぽずつまえにすすむ'],['自分のペースで進める','じぶんのぺーすですすめる'],['集中して最後まで続ける','しゅうちゅうしてさいごまでつづける']];
function pick(arr,rand=Math.random){return arr[Math.floor(rand()*arr.length)]}
function makePrompt({language='ja',category='mixed',level=2,rand=Math.random}={}){
 const cats=language==='ja'?JP_BANK:EN_BANK,keys=Object.keys(cats),cat=category in cats?category:pick(keys,rand);
 level=Math.max(1,Math.min(5,Number(level)||2));
 if(language==='ja'){
  const bank=cats[cat],chosen=pick(bank,rand),starter=pick(JP_START,rand),tail=pick(JP_END,rand);
  let display=chosen[0],reading=chosen[1];
  if(level>=2&&rand()<.55){display=starter[0]+' '+display;reading=starter[1]+' '+reading}
  if(level>=3){const choices=bank.filter(x=>x[1]!==chosen[1]);const two=pick(choices.length?choices:bank,rand);display+=' '+two[0];reading+=' '+two[1]}
  if(level>=4){display+=' '+tail[0];reading+=' '+tail[1]}
  if(level===5){const choices=bank.filter(x=>!display.includes(x[0]));const three=pick(choices.length?choices:bank,rand);display+=' '+three[0];reading+=' '+three[1]}
  return {display,reading,language,level,category:cat,kind:'generated'};
 }
 const words=cats[cat],phrase=pick(EN_SENTENCES,rand).join(' ');
 if(level===1)return {display:pick(words,rand),reading:null,language,level,category:cat,kind:'generated'};
 const parts=[];
 for(let i=0;i<level+1;i++){
  let sentence;
  if(level===2&&rand()<.65)sentence=[pick(words,rand),pick(words,rand),pick(words,rand)].join(' ');
  else sentence=(i===0?phrase:pick(EN_SENTENCES,rand).join(' '));
  parts.push(sentence);
 }
 const display=parts.slice(0,level===2?1:level===3?2:level===4?3:4).join(' ');
 return {display,reading:null,language,level,category:cat,kind:'generated'};
}
function freshModel(){return {version:1,keys:{},pairs:{},sessions:[],runs:0,createdAt:Date.now()}}
function normalizeModel(v){
 const p=freshModel();if(!v||v.version!==1)return p;
 p.keys=v.keys&&typeof v.keys==='object'?v.keys:{};
 p.pairs=v.pairs&&typeof v.pairs==='object'?v.pairs:{};
 p.sessions=Array.isArray(v.sessions)?v.sessions.slice(-80):[];p.runs=Number.isFinite(v.runs)?v.runs:0;p.createdAt=Number.isFinite(v.createdAt)?v.createdAt:p.createdAt;return p;
}
function observe(model,key,correct,interval,previous){
 if(!/^[a-z 0-9.,!?\-]$/.test(key))return;
 const touch=(table,id)=>{const x=table[id]||{hits:0,errors:0,ms:0};if(correct)x.hits++;else x.errors++;if(correct&&Number.isFinite(interval)&&interval>=20&&interval<3000)x.ms=x.ms?x.ms*.82+interval*.18:interval;table[id]=x};
 touch(model.keys,key);
 if(previous&&/^[a-z 0-9.,!?\-]$/.test(previous))touch(model.pairs,previous+key);
}
function weakness(model,letter){
 const x=model.keys[letter];if(!x)return .12;
 const n=x.hits+x.errors;const miss=(x.errors+1)/(n+6),slow=Math.max(0,Math.min(.65,((x.ms||220)-170)/450));return miss*1.9+slow+.12/Math.sqrt(n+1);
}
function candidateScore(model,prompt,previousSet){
 const roman=prompt.language==='ja'?canonical(tokens(prompt.reading)):prompt.display.toLowerCase();
 const letters=[...roman].filter(c=>/[a-z]/.test(c)),avg=letters.reduce((a,c)=>a+weakness(model,c),0)/(letters.length||1);
 const duplicates=previousSet.has(prompt.display)?-2:0;
 return avg+duplicates;
}
function adaptivePrompt(model,{language='ja',category='mixed',level=2,rand=Math.random,recent=[]}={}){
 const current=model.sessions.slice(-6),avg=current.length?current.reduce((s,x)=>s+(x.accuracy||0),0)/current.length:95;
 const speed=current.length?current.reduce((s,x)=>s+(x.cpm||0),0)/current.length:240;
 const bias=current.length>=3?(avg>=97&&speed>=240?1:avg<83?-1:0):0;
 const targetLevel=Math.max(1,Math.min(5,level+bias));
 const seen=new Set(recent),candidates=Array.from({length:22},()=>makePrompt({language,category,level:targetLevel,rand}));
 const scored=candidates.map(p=>({...p,score:candidateScore(model,p,seen)+(rand()-.5)*.16})).sort((a,b)=>b.score-a.score);
 const chosen=scored[0];return {...chosen,reason:current.length?'苦手キーの練習と最近の正確率を反映':'初回診断：打鍵データを収集中',aiLevel:targetLevel};
}
function rankSummary(model){
 return Object.entries(model.keys).filter(([,x])=>x.hits+x.errors>=2)
  .map(([key,x])=>({key,attempts:x.hits+x.errors,accuracy:Math.round(100*x.hits/(x.hits+x.errors)),avgMs:Math.round(x.ms||0),weakness:weakness(model,key)}))
  .sort((a,b)=>b.weakness-a.weakness);
}
function grade(cpm,accuracy){
 const raw=cpm*(accuracy/100)**2;
 return raw>=470&&accuracy>=97?'S+':raw>=380&&accuracy>=96?'S':raw>=290&&accuracy>=94?'A':raw>=210&&accuracy>=90?'B':raw>=140&&accuracy>=85?'C':'D';
}
return {KEYS,KANA,tokens,initialStates,step,complete,progress,canonical,currentTarget,makePrompt,adaptivePrompt,freshModel,normalizeModel,observe,weakness,rankSummary,grade};
});