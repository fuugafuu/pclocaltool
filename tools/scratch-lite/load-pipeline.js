/* Small, bounded scheduler and transferable worker bridge. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ScratchLoad=api;})(typeof self!=='undefined'?self:globalThis,function(){
 'use strict';
 const nextTask=(()=>{if(typeof document==='undefined'||typeof MessageChannel==='undefined')return fn=>setTimeout(fn,0);const channel=new MessageChannel(),tasks=[];channel.port1.onmessage=()=>tasks.shift()?.();return fn=>{tasks.push(fn);channel.port2.postMessage(0);};})();
 class Queue{
  constructor(limit=4){this.limit=Math.max(1,Math.floor(Number(limit)||4));this.active=0;this.waiting=[];this.scheduled=false;}
  run(fn){if(this.closed)return Promise.reject(Error('素材キューを終了しました'));return new Promise((resolve,reject)=>{this.waiting.push({fn,resolve,reject});this.pump();});}
  close(){this.closed=true;for(const job of this.waiting.splice(0))job.reject(Error('素材キューを終了しました'));}
  pump(){while(this.active<this.limit&&this.waiting.length){const job=this.waiting.shift();this.active++;Promise.resolve().then(job.fn).then(job.resolve,job.reject).finally(()=>{this.active--;if(!this.scheduled&&this.waiting.length){this.scheduled=true;nextTask(()=>{this.scheduled=false;this.pump();});}});}}
 }
 class ArchiveClient{
  constructor(url){this.next=0;this.pending=new Map();this.url=null;const source=globalThis.__SL_WORKER_SOURCE__;if(source){this.url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));url=this.url;}try{this.worker=new Worker(url);}catch(e){if(this.url)URL.revokeObjectURL(this.url);throw e;}this.worker.onmessage=({data})=>{const pending=this.pending.get(data.id);if(!pending)return;this.pending.delete(data.id);if(data.error){const error=Error(data.error);error.code='ARCHIVE_DATA';pending.reject(error);}else pending.resolve(data.result);};this.worker.onerror=e=>{e.preventDefault();this.dispose(Error(e.message||'解析ワーカーを実行できません'));};}
  call(type,args={}){if(!this.worker)return Promise.reject(Error('解析ワーカーは終了しています'));return new Promise((resolve,reject)=>{const id=++this.next;this.pending.set(id,{resolve,reject});try{this.worker.postMessage({id,type,...args});}catch(e){this.pending.delete(id);reject(e);}});}
  asset(name){return this.call('asset',{name});}
  dispose(error=Error('読み込みを終了しました')){this.worker?.terminate();this.worker=null;for(const job of this.pending.values())job.reject(error);this.pending.clear();if(this.url)URL.revokeObjectURL(this.url);this.url=null;}
 }
 function concurrency(device){return device.mem<=2?2:device.mem<=4?4:Math.max(4,Math.min(12,device.cores||4));}
 return {Queue,ArchiveClient,concurrency};
});
