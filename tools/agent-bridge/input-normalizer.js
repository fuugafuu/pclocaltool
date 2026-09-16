'use strict';
(() => {
  const command=document.querySelector('#command');
  const run=document.querySelector('#run');
  const format=document.querySelector('#format-json');
  if(!command||!run)return;
  function normalizeJsonLines(){
    const raw=command.value.trim();
    if(!raw)return false;
    try{JSON.parse(raw);return false}catch{}
    const rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(rows.length<2)return false;
    try{
      const values=rows.map(x=>JSON.parse(x));
      if(!values.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&(v.tool||v.name||v.toolId)))return false;
      command.value=JSON.stringify({version:1,actions:values},null,2);
      return true;
    }catch{return false}
  }
  const oldRun=run.onclick;
  run.onclick=function(e){normalizeJsonLines();return oldRun?.call(this,e)};
  if(format){
    const oldFormat=format.onclick;
    format.onclick=function(e){normalizeJsonLines();return oldFormat?.call(this,e)};
  }
})();
