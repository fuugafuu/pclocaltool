'use strict';

// ---------- exact arithmetic / number theory ----------
function bigAbs(n){return n<0n?-n:n}
function bigGcd(a,b){a=bigAbs(a);b=bigAbs(b);while(b){const t=a%b;a=b;b=t}return a}
function bigLcm(a,b){return a===0n||b===0n?0n:bigAbs(a/bigGcd(a,b)*b)}
class Fraction{
  constructor(n,d=1n){if(typeof n==='number')n=BigInt(n);if(typeof d==='number')d=BigInt(d);if(d===0n)throw Error('0では割れません。');if(d<0n){n=-n;d=-d}const g=bigGcd(n,d)||1n;this.n=n/g;this.d=d/g}
  add(o){o=Fraction.of(o);return new Fraction(this.n*o.d+o.n*this.d,this.d*o.d)}
  sub(o){o=Fraction.of(o);return new Fraction(this.n*o.d-o.n*this.d,this.d*o.d)}
  mul(o){o=Fraction.of(o);return new Fraction(this.n*o.n,this.d*o.d)}
  div(o){o=Fraction.of(o);return new Fraction(this.n*o.d,this.d*o.n)}
  pow(k){k=BigInt(k);if(k<0n)return new Fraction(this.d,this.n).pow(-k);return new Fraction(this.n**k,this.d**k)}
  neg(){return new Fraction(-this.n,this.d)}
  toNumber(){return Number(this.n)/Number(this.d)}
  toString(){return this.d===1n?String(this.n):`${this.n}/${this.d}`}
  mixed(){const s=this.n<0n?'-':'';const a=bigAbs(this.n),q=a/this.d,r=a%this.d;if(r===0n)return s+q;return q===0n?`${s}${r}/${this.d}`:`${s}${q} ${r}/${this.d}`}
  static of(v){return v instanceof Fraction?v:new Fraction(BigInt(v),1n)}
}
function decimalToFraction(s){s=String(s).trim();if(/^[-+]?\d+$/.test(s))return new Fraction(BigInt(s));const m=s.match(/^([-+]?)(\d*)\.(\d+)$/);if(!m)throw Error('厳密計算では整数・小数・分数を使ってください。');const sign=m[1]==='-'?-1n:1n,int=m[2]||'0',dec=m[3];return new Fraction(sign*BigInt(int+dec),10n**BigInt(dec.length))}
function exactTokens(expr){
  expr=normalizeText(expr).replace(/\s+/g,'');const out=[];let i=0;
  while(i<expr.length){const c=expr[i];if(/[0-9.]/.test(c)){let j=i+1;while(j<expr.length&&/[0-9.]/.test(expr[j]))j++;out.push({t:'num',v:decimalToFraction(expr.slice(i,j))});i=j;continue}if('+-*/^()'.includes(c)){out.push({t:c==='('? 'lp':c===')'?'rp':'op',v:c});i++;continue}throw Error(`厳密計算では「${c}」は使えません。`)}
  return out;
}
function evalExact(expr){
  const ts=exactTokens(expr),out=[],stack=[];let prev=null;const prec={'+':1,'-':1,'*':2,'/':2,'u-':3,'^':4},right=new Set(['u-','^']);
  for(const tok of ts){if(tok.t==='num')out.push(tok);else if(tok.t==='lp')stack.push(tok);else if(tok.t==='rp'){while(stack.length&&stack.at(-1).t!=='lp')out.push(stack.pop());if(!stack.length)throw Error('括弧の対応を確認してください。');stack.pop()}else{let op=tok.v;if((op==='+'||op==='-')&&(!prev||prev.t==='op'||prev.t==='lp')){if(op==='+'){prev=tok;continue}op='u-'}if(op==='u-'){stack.push({t:'op',v:op});prev=tok;continue}while(stack.length&&stack.at(-1).t==='op'){const top=stack.at(-1).v;if((!right.has(op)&&prec[op]<=prec[top])||(right.has(op)&&prec[op]<prec[top]))out.push(stack.pop());else break}stack.push({t:'op',v:op})}prev=tok}
  while(stack.length){if(stack.at(-1).t==='lp')throw Error('括弧の対応を確認してください。');out.push(stack.pop())}
  const st=[];for(const t of out){if(t.t==='num')st.push(t.v);else if(t.v==='u-'){if(!st.length)throw Error('数式の形を確認してください。');st.push(st.pop().neg())}else{if(st.length<2)throw Error('数式の形を確認してください。');const b=st.pop(),a=st.pop();if(t.v==='+')st.push(a.add(b));if(t.v==='-')st.push(a.sub(b));if(t.v==='*')st.push(a.mul(b));if(t.v==='/')st.push(a.div(b));if(t.v==='^'){if(b.d!==1n)throw Error('厳密計算の指数は整数にしてください。');if(bigAbs(b.n)>10000n)throw Error('指数が大きすぎます。');st.push(a.pow(b.n))}}}
  if(st.length!==1)throw Error('数式を解釈できませんでした。');return st[0]
}
function factorialBig(n){n=BigInt(n);if(n<0n)throw Error('階乗は0以上です。');if(n>5000n)throw Error('階乗は5000までにしてください。');let r=1n;for(let i=2n;i<=n;i++)r*=i;return r}
function nPrBig(n,r){n=BigInt(n);r=BigInt(r);if(n<0n||r<0n||r>n)throw Error('0 ≤ r ≤ n にしてください。');let x=1n;for(let i=0n;i<r;i++)x*=n-i;return x}
function nCrBig(n,r){n=BigInt(n);r=BigInt(r);if(n<0n||r<0n||r>n)throw Error('0 ≤ r ≤ n にしてください。');r=r>n-r?n-r:r;let x=1n;for(let i=1n;i<=r;i++)x=x*(n-r+i)/i;return x}
function primeFactorsBig(n){n=BigInt(n);if(n===0n)throw Error('0は素因数分解できません。');const sign=n<0n?-1n:1n;n=bigAbs(n);if(n===1n)return sign<0n?[-1n]:[1n];const a=[];if(sign<0n)a.push(-1n);while(n%2n===0n){a.push(2n);n/=2n}let p=3n;while(p*p<=n){while(n%p===0n){a.push(p);n/=p}p+=2n}if(n>1n)a.push(n);return a}
function compressedFactors(a){const m=new Map();for(const p of a)m.set(String(p),(m.get(String(p))||0)+1);return [...m].map(([p,k])=>k===1?p:`${p}^${k}`).join(' × ')}
function integerSqrt(n){if(n<0n)return null;if(n<2n)return n;let x=n,y=(x+1n)/2n;while(y<x){x=y;y=(x+n/x)/2n}return x}
function simplifySqrtInt(n){n=BigInt(n);if(n<0n)return null;let outside=1n,inside=n;for(let p=2n;p*p<=inside;p++){const sq=p*p;while(inside%sq===0n){outside*=p;inside/=sq}}return {outside,inside,text:inside===1n?String(outside):outside===1n?`√${inside}`:`${outside}√${inside}`}}

function initExactUI(){
  const run=$('#exactRun');if(!run)return;
  run.addEventListener('click',()=>{const box=$('#exactResult'),expr=$('#exactInput').value;try{const f=evalExact(expr);box.className='result success';box.innerHTML=`<div class="big-answer">${esc(f.toString())}</div><div class="steps">小数：約 ${fmt(f.toNumber())}${f.d!==1n?`<br>帯分数：${esc(f.mixed())}`:''}</div>`;addHistory('厳密分数',expr,f.toString())}catch(e){box.className='result error';box.textContent=e.message}});
  $('#numberRun')?.addEventListener('click',()=>{const box=$('#numberResult');try{const a=BigInt($('#numA').value||'0'),b=BigInt($('#numB').value||'0'),mode=$('#numberMode').value;let ans,label;if(mode==='gcd'){ans=bigGcd(a,b);label='最大公約数'}if(mode==='lcm'){ans=bigLcm(a,b);label='最小公倍数'}if(mode==='factor'){const f=primeFactorsBig(a);ans=compressedFactors(f);label='素因数分解'}if(mode==='sqrt'){if(a<0n)throw Error('0以上の整数を入れてください。');ans=simplifySqrtInt(a).text;label='√の簡単化'}box.className='result success';box.innerHTML=`<div class="big-answer">${label}：${esc(ans)}</div>`}catch(e){box.className='result error';box.textContent=e.message}})
}
document.addEventListener('DOMContentLoaded',initExactUI);
