(function(root){
 'use strict';
 if(typeof importScripts==='function')importScripts('engine.js','../learning.js');
 const E=typeof module==='object'&&module.exports?require('./engine.js'):root.ReversiEngine;
 const L=typeof module==='object'&&module.exports?require('../learning.js'):root.ArenaLearning;
 const CONFIG=[null,{depth:1,ms:50},{depth:2,ms:100},{depth:4,ms:250},{depth:6,ms:600},{depth:8,ms:1100}];
 const TABLE=[120,-28,18,8,8,18,-28,120,-28,-55,-4,-3,-3,-4,-55,-28,18,-4,12,3,3,12,-4,18,8,-3,3,2,2,3,-3,8,8,-3,3,2,2,3,-3,8,18,-4,12,3,3,12,-4,18,-28,-55,-4,-3,-3,-4,-55,-28,120,-28,18,8,8,18,-28,120];
 function evaluate(board,color,weights){const f=E.features(board,color),empty=E.count(board).empty;let positional=0;for(let i=0;i<64;i++)positional+=board[i]*color*TABLE[i]; // Corner-adjacent penalties disappear once their corner is owned.
 for(const [corner,adj] of [[0,[1,8,9]],[7,[6,14,15]],[56,[48,49,57]],[63,[54,55,62]]])if(board[corner])for(const i of adj)positional-=board[i]*color*TABLE[i]*.7;
 return positional+f[1]*360+f[2]*520+f[3]*140+f[4]*60+f[0]*(empty<14?550:30)+(weights?L.value(weights,f)*100:0);}
 function choose(board,color,level=3,weights=null){const config=CONFIG[level]||CONFIG[3],available=E.moves(board,color);if(!available.length)return {move:null,depth:0,nodes:0};let bestMove=available[0],bestScore=-Infinity,completed=0,nodes=0;const deadline=performance.now()+config.ms,cache=new Map();const TIMEOUT={};
 function order(b,moves,c){return moves.map(index=>({index,res:E.play(b,index,c)})).sort((a,b)=>TABLE[b.index]-TABLE[a.index]);}
 function search(b,c,depth,alpha,beta,passed=false){nodes++;if(nodes%128===0&&performance.now()>deadline)throw TIMEOUT;const options=E.moves(b,c);if(!options.length){if(passed){const n=E.count(b),diff=(n.black-n.white)*c;return diff===0?0:Math.sign(diff)*100000+diff*100;}return -search(b,-c,depth,-beta,-alpha,true);}if(depth<=0)return evaluate(b,c,weights);const originalAlpha=alpha;const key=b.join(',')+':'+c+':'+depth;const hit=cache.get(key);if(hit!==undefined)return hit;let best=-Infinity,cut=false;for(const node of order(b,options,c)){const score=-search(node.res.board,-c,depth-1,-beta,-alpha);best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta){cut=true;break;}}if(!cut&&best>originalAlpha)cache.set(key,best);return best;}
 const empty=E.count(board).empty,target=level===5&&empty<=10?empty:config.depth;
 for(let depth=1;depth<=target;depth++){let move=bestMove,value=-Infinity;try{const ordered=order(board,available,color).sort((a,b)=>Number(b.index===bestMove)-Number(a.index===bestMove));for(const node of ordered){const score=-search(node.res.board,-color,depth-1,-Infinity,Infinity);if(score>value){value=score;move=node.index;}}bestMove=move;bestScore=value;completed=depth;}catch(e){if(e!==TIMEOUT)throw e;break;}if(performance.now()>deadline)break;}
 return {move:bestMove,score:bestScore,depth:completed,nodes};}
 const api={choose,evaluate,CONFIG};if(typeof module==='object'&&module.exports)module.exports=api;else{root.ReversiAI=api;if(typeof importScripts==='function')root.onmessage=e=>{const {id,board,color,level,weights}=e.data;try{root.postMessage({id,result:choose(board,color,level,weights)});}catch(error){root.postMessage({id,error:String(error.message||error)});}};}
})(typeof self!=='undefined'?self:globalThis);
