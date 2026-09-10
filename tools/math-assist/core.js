'use strict';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const EPS = 1e-10;

function normalizeText(s='') {
  return String(s)
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0))
    .replace(/[＋]/g,'+').replace(/[－−–—]/g,'-').replace(/[×✕＊]/g,'*').replace(/[÷／]/g,'/')
    .replace(/[＾]/g,'^').replace(/[％]/g,'%').replace(/[＝]/g,'=').replace(/[（]/g,'(').replace(/[）]/g,')')
    .replace(/π/g,'pi').replace(/√\s*\(/g,'sqrt(').replace(/√\s*([\d.]+)/g,'sqrt($1)')
    .replace(/，/g,',').trim();
}
function fmt(n, digits=12){
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < EPS) n = 0;
  const a = Math.abs(n);
  if (a !== 0 && (a >= 1e12 || a < 1e-8)) return n.toExponential(8).replace(/\.?0+e/,'e');
  return Number(n.toFixed(digits)).toLocaleString('ja-JP',{maximumFractionDigits:digits});
}
function esc(s=''){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function nearly(a,b){ return Math.abs(a-b) <= EPS*Math.max(1,Math.abs(a),Math.abs(b)); }

// ---------- Expression engine (offline, no eval) ----------
const FUNCS = {
  sqrt:x=>Math.sqrt(x), abs:x=>Math.abs(x), floor:x=>Math.floor(x), ceil:x=>Math.ceil(x), round:x=>Math.round(x),
  sin:x=>Math.sin(x*Math.PI/180), cos:x=>Math.cos(x*Math.PI/180), tan:x=>Math.tan(x*Math.PI/180),
  asin:x=>Math.asin(x)*180/Math.PI, acos:x=>Math.acos(x)*180/Math.PI, atan:x=>Math.atan(x)*180/Math.PI,
  log:x=>Math.log10(x), ln:x=>Math.log(x), exp:x=>Math.exp(x)
};
const CONSTS = {pi:Math.PI, e:Math.E};
const OPS = {
  '+':{p:1,a:'L',n:2,f:(a,b)=>a+b}, '-':{p:1,a:'L',n:2,f:(a,b)=>a-b},
  '*':{p:2,a:'L',n:2,f:(a,b)=>a*b}, '/':{p:2,a:'L',n:2,f:(a,b)=>a/b},
  '^':{p:4,a:'R',n:2,f:(a,b)=>a**b}, 'u-':{p:3,a:'R',n:1,f:a=>-a},
  '%':{p:5,a:'L',n:1,f:a=>a/100}
};
function rawTokens(expr){
  expr = normalizeText(expr).replace(/\s+/g,'');
  const out=[]; let i=0;
  while(i<expr.length){
    const c=expr[i];
    if(/[0-9.]/.test(c)){
      let j=i+1; while(j<expr.length && /[0-9.eE]/.test(expr[j])) j++;
      if(j<expr.length && /[+-]/.test(expr[j]) && /[eE]/.test(expr[j-1])){j++;while(j<expr.length&&/[0-9]/.test(expr[j]))j++;}
      const v=expr.slice(i,j); if(!/^((\d+\.?\d*)|(\.\d+))([eE][+-]?\d+)?$/.test(v)) throw Error('数値の書き方を確認してください。');
      out.push({t:'num',v:Number(v)}); i=j; continue;
    }
    if(/[A-Za-z_]/.test(c)){
      let j=i+1; while(j<expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++;
      out.push({t:'id',v:expr.slice(i,j).toLowerCase()}); i=j; continue;
    }
    if('+-*/^%(),'.includes(c)){ out.push({t:c==='('? 'lp':c===')'?'rp':c===','?'comma':'op',v:c}); i++; continue; }
    throw Error(`「${c}」は数式として解釈できません。`);
  }
  return out;
}
function tokensWithImplicit(expr){
  const t=rawTokens(expr), out=[];
  const leftCan = x => x && (x.t==='num'||x.t==='id'||x.t==='rp'||(x.t==='op'&&x.v==='%'));
  const rightCan = x => x && (x.t==='num'||x.t==='id'||x.t==='lp');
  for(let i=0;i<t.length;i++){
    const cur=t[i], prev=out[out.length-1];
    const functionCall = prev?.t==='id' && FUNCS[prev.v] && cur.t==='lp';
    if(leftCan(prev)&&rightCan(cur)&&!functionCall) out.push({t:'op',v:'*'});
    out.push(cur);
  }
  return out;
}
function toRPN(expr){
  const ts=tokensWithImplicit(expr), out=[], stack=[]; let prev=null;
  for(let i=0;i<ts.length;i++){
    const tok=ts[i];
    if(tok.t==='num') out.push(tok);
    else if(tok.t==='id'){
      if(FUNCS[tok.v]) stack.push({t:'func',v:tok.v}); else out.push({t:'var',v:tok.v});
    } else if(tok.t==='comma'){
      while(stack.length && stack.at(-1).t!=='lp') out.push(stack.pop());
      if(!stack.length) throw Error('カンマの位置が不正です。');
    } else if(tok.t==='op'){
      let op=tok.v;
      if((op==='+'||op==='-') && (!prev || prev.t==='op'||prev.t==='lp'||prev.t==='comma')){
        if(op==='+'){ prev=tok; continue; } op='u-';
      }
      const o1=OPS[op]; if(!o1) throw Error('未対応の演算子です。');
      if(op==='u-'){ stack.push({t:'op',v:op}); prev=tok; continue; }
      while(stack.length && stack.at(-1).t==='op'){
        const o2=OPS[stack.at(-1).v];
        if((o1.a==='L'&&o1.p<=o2.p)||(o1.a==='R'&&o1.p<o2.p)) out.push(stack.pop()); else break;
      }
      stack.push({t:'op',v:op});
    } else if(tok.t==='lp') stack.push(tok);
    else if(tok.t==='rp'){
      while(stack.length && stack.at(-1).t!=='lp') out.push(stack.pop());
      if(!stack.length) throw Error('括弧の対応を確認してください。');
      stack.pop(); if(stack.at(-1)?.t==='func') out.push(stack.pop());
    }
    prev=tok;
  }
  while(stack.length){ const s=stack.pop(); if(s.t==='lp') throw Error('括弧の対応を確認してください。'); out.push(s); }
  return out;
}
function evalExpression(expr, vars={}){
  const rpn=toRPN(expr), st=[];
  for(const t of rpn){
    if(t.t==='num') st.push(t.v);
    else if(t.t==='var'){
      if(t.v in vars) st.push(Number(vars[t.v])); else if(t.v in CONSTS) st.push(CONSTS[t.v]); else throw Error(`変数「${t.v}」の値がありません。`);
    } else if(t.t==='func'){
      if(st.length<1) throw Error('関数の引数が不足しています。'); const a=st.pop(); const v=FUNCS[t.v](a); if(!Number.isFinite(v)) throw Error('この関数では計算できない値です。'); st.push(v);
    } else if(t.t==='op'){
      const o=OPS[t.v]; if(st.length<o.n) throw Error('数式の形を確認してください。');
      let v; if(o.n===1) v=o.f(st.pop()); else {const b=st.pop(),a=st.pop(); if(t.v==='/'&&nearly(b,0)) throw Error('0では割れません。'); v=o.f(a,b);} if(!Number.isFinite(v)) throw Error('計算結果が扱える範囲を超えました。'); st.push(v);
    }
  }
  if(st.length!==1) throw Error('数式を最後まで解釈できませんでした。'); return st[0];
}
function isLikelyExpression(s){
  s=normalizeText(s); return /^[\d\s.+\-*/^%()A-Za-zπ√]+$/.test(s) && /\d/.test(s);
}
