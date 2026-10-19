/* Local online TD(0) residual learner; the fixed search remains the baseline. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ArenaLearning=api;})(typeof self!=='undefined'?self:globalThis,function(){
 'use strict';
 const VERSION=1,DIM=6;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function fresh(){return {version:VERSION,weights:Array(DIM).fill(0),samples:0,games:0};}
 function normalize(raw){const m=fresh();if(!raw||raw.version!==VERSION)return m;if(Array.isArray(raw.weights)&&raw.weights.length===DIM)m.weights=raw.weights.map(v=>Number.isFinite(v)?clamp(v,-3,3):0);for(const k of ['samples','games'])if(Number.isSafeInteger(raw[k])&&raw[k]>=0)m[k]=raw[k];return m;}
 function value(weights,features){return features.reduce((v,x,i)=>v+x*(weights?.[i]||0),0);}
 function observe(model,before,after,reward,terminal=false){if(!before||before.length!==DIM)return 0;const prediction=value(model.weights,before),target=clamp(reward,-2,2)+(terminal?0:.92*value(model.weights,after));const delta=clamp(target-prediction,-2,2),rate=.055/Math.sqrt(1+model.samples/3000);for(let i=0;i<DIM;i++)model.weights[i]=clamp(model.weights[i]*.99998+rate*delta*before[i],-3,3);model.samples++;return delta;}
 function load(game,storage){try{return normalize(JSON.parse((storage||localStorage).getItem('pclocaltool_game_learning_'+game+'_v1')||'null'));}catch{return fresh();}}
 function save(game,model,storage){try{(storage||localStorage).setItem('pclocaltool_game_learning_'+game+'_v1',JSON.stringify(model));return true;}catch{return false;}}
 function tetrisFeatures(board,attack=0,lines=0){let sum=0,holes=0,max=0,bump=0,last=0;for(let x=0;x<10;x++){let top=22;for(let y=0;y<22;y++){if(board[y][x]&&top===22)top=y;else if(!board[y][x]&&top!==22)holes++;}const h=22-top;sum+=h;max=Math.max(max,h);if(x)bump+=Math.abs(h-last);last=h;}return [-sum/220,-Math.min(1,holes/30),-bump/100,-max/22,Math.min(1,attack/20),lines/4];}
 return {fresh,normalize,value,observe,load,save,tetrisFeatures};
});
