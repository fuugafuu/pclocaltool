/* ZIP directory and asset inflation run outside the UI thread. No image re-encoding. */
(function(root,factory){if(typeof importScripts==='function'&&!root.fflate)importScripts('vendor/fflate.min.js');const api=factory(typeof module==='object'&&module.exports?require('./vendor/fflate.min.js'):root.fflate);if(typeof module==='object'&&module.exports)module.exports=api;else{root.ScratchArchive=api;if(typeof WorkerGlobalScope!=='undefined'&&root instanceof WorkerGlobalScope){let archive=null;root.onmessage=async({data})=>{try{if(data.type==='open'){archive=await api.open(data.blob);const result=await api.describe(archive);root.postMessage({id:data.id,result});}else if(data.type==='asset'){const bytes=await api.asset(archive,data.name);root.postMessage({id:data.id,result:bytes},bytes?[bytes.buffer]:[]);}}catch(e){root.postMessage({id:data.id,error:e.message});}};}}})(typeof self!=='undefined'?self:globalThis,function(fflate){
 'use strict';const decoder=new TextDecoder(),MAX_JSON=64*1024*1024,MAX_ASSET=256*1024*1024;
 function range(blob,start,length){if(!Number.isSafeInteger(start)||!Number.isSafeInteger(length)||start<0||length<0||start+length>blob.size)throw Error('ZIPの範囲情報が壊れています');return blob.slice(start,start+length);}
 async function open(blob){
  if(!(blob instanceof Blob)||!blob.size)throw Error('ファイルが空です');
  const head=new Uint8Array(await blob.slice(0,4).arrayBuffer());if(head[0]!==80||head[1]!==75)return {blob,entries:null};
  const offset=Math.max(0,blob.size-65557),tail=await blob.slice(offset).arrayBuffer(),view=new DataView(tail);let end=-1;
  for(let i=tail.byteLength-22;i>=0;i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===tail.byteLength){end=i;break;}
  if(end<0)throw Error('ZIPの終端が見つかりません');
  const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),start=view.getUint32(end+16,true);
  if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||count===65535||size===0xffffffff||start===0xffffffff)return {blob,entries:null,legacy:true};
  if(start+size>offset+end)throw Error('ZIPの索引が壊れています');
  const directory=new DataView(await range(blob,start,size).arrayBuffer()),entries=new Map(),basenames=new Map();let p=0;
  for(let i=0;i<count;i++){
   if(p+46>size||directory.getUint32(p,true)!==0x02014b50)throw Error('ZIPの素材索引が壊れています');
   const flags=directory.getUint16(p+8,true),method=directory.getUint16(p+10,true),compressed=directory.getUint32(p+20,true),uncompressed=directory.getUint32(p+24,true),names=directory.getUint16(p+28,true),extra=directory.getUint16(p+30,true),comment=directory.getUint16(p+32,true),local=directory.getUint32(p+42,true);
   if(p+46+names+extra+comment>size)throw Error('ZIPのファイル名情報が壊れています');
   const name=decoder.decode(new Uint8Array(directory.buffer,p+46,names));if(flags&1||![0,8].includes(method))return {blob,entries:null,legacy:true};
   const entry={name,method,compressed,uncompressed,local,crc:directory.getUint32(p+16,true)};entries.set(name,entry);if(!basenames.has(name.split('/').pop()))basenames.set(name.split('/').pop(),entry);p+=46+names+extra+comment;
  }
  if([...entries.values()].some(e=>e.method===8)&&!fflate&&typeof DecompressionStream==='undefined')return {blob,entries:null,legacy:true};
  // A single worker-owned compressed buffer avoids thousands of small disk reads.
  // Large archives remain range-read so the optimization has a bounded footprint.
  return {blob,entries,basenames,buffer:blob.size<=64*1024*1024?await blob.arrayBuffer():null};
 }
 const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 function crc32(bytes){let value=0xffffffff;for(const b of bytes)value=crcTable[(value^b)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
 async function readEntry(archive,entry,limit=MAX_ASSET){
  if(entry.uncompressed>limit)throw Error('素材が大きすぎます: '+entry.name);
  const local=archive.buffer?new DataView(archive.buffer,entry.local,30):new DataView(await range(archive.blob,entry.local,30).arrayBuffer());if(local.getUint32(0,true)!==0x04034b50)throw Error('ZIPの素材ヘッダーが壊れています');
  const start=entry.local+30+local.getUint16(26,true)+local.getUint16(28,true),source=range(archive.blob,start,entry.compressed);
  if(entry.method===0){const bytes=new Uint8Array(archive.buffer?archive.buffer.slice(start,start+entry.compressed):await source.arrayBuffer());if(bytes.length!==entry.uncompressed||crc32(bytes)!==entry.crc)throw Error('素材の検証に失敗: '+entry.name);return bytes;}
  if(fflate&&(entry.uncompressed<=1024*1024||typeof DecompressionStream==='undefined')){const compressed=archive.buffer?new Uint8Array(archive.buffer,start,entry.compressed):new Uint8Array(await source.arrayBuffer()),bytes=fflate.inflateSync(compressed,{out:new Uint8Array(entry.uncompressed)});if(bytes.length!==entry.uncompressed||crc32(bytes)!==entry.crc)throw Error('素材の検証に失敗: '+entry.name);return bytes;}
  const packed=archive.buffer?new Blob([new Uint8Array(archive.buffer,start,entry.compressed)]):source;
  const reader=packed.stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),parts=[];let length=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit||length>entry.uncompressed)throw Error('素材の展開サイズが一致しません: '+entry.name);parts.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
  if(length!==entry.uncompressed)throw Error('素材の展開が途中で終了: '+entry.name);const bytes=new Uint8Array(length);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.length;}if(crc32(bytes)!==entry.crc)throw Error('素材の検証に失敗: '+entry.name);return bytes;
 }
 function analyze(json,size){
  const a={size,targets:0,blocks:0,costumes:0,sounds:0,monitors:Array.isArray(json.monitors)?json.monitors.length:0,pen:false,threeD:false,cloneBlocks:0,warpProcedures:0,video:false,music:false,largeLists:0};const assets=new Set();
  for(const t of json.targets||[]){a.targets++;for(const c of t.costumes||[]){a.costumes++;if(c.assetId&&c.dataFormat)assets.add(c.assetId+'.'+c.dataFormat);}for(const sound of t.sounds||[]){a.sounds++;if(sound.assetId&&sound.dataFormat)assets.add(sound.assetId+'.'+sound.dataFormat);}for(const v of Object.values(t.lists||{}))if(Array.isArray(v?.[1])&&v[1].length>1000)a.largeLists++;
   for(const b of Object.values(t.blocks||{})){a.blocks++;const op=String(b?.opcode||'').toLowerCase();if(op.startsWith('pen_'))a.pen=true;if(op.includes('3d')||op.includes('raycast'))a.threeD=true;if(op==='control_create_clone_of')a.cloneBlocks++;if(op.startsWith('videosensing_'))a.video=true;if(op.startsWith('music_'))a.music=true;if(b?.mutation?.warp===true||b?.mutation?.warp==='true')a.warpProcedures++;}}
  a.fonts=0;for(const font of Array.isArray(json.customFonts)?json.customFonts:[])if(font&&!font.system&&typeof font.md5ext==='string'){a.fonts++;assets.add(font.md5ext);}
  a.complexity=size/1048576*2+a.blocks/900+a.targets*.35+a.costumes*.08+a.sounds*.12+a.largeLists*2+a.cloneBlocks*.45;a.level=a.complexity>22?'超重量':a.complexity>12?'重量':a.complexity>6?'中量':'軽量';a.uniqueAssets=assets.size;return {analysis:a,assets:[...assets]};
 }
 async function describe(archive){
  if(archive.legacy)return {legacy:true};let text;
  if(archive.entries){const entry=archive.entries.get('project.json');if(!entry)return {legacy:true};text=decoder.decode(await readEntry(archive,entry,MAX_JSON));}
  else{if(archive.blob.size>MAX_JSON)return {legacy:true};text=await archive.blob.text();}
  let json;try{json=JSON.parse(text);}catch{return {legacy:true};}if(!Array.isArray(json?.targets))return {legacy:true};
  const result=analyze(json,archive.blob.size);return {...result,text,packed:!!archive.entries,expandedBytes:archive.entries?[...archive.entries.values()].reduce((n,e)=>n+e.uncompressed,0):archive.blob.size};
 }
 async function asset(archive,name){const entry=archive?.entries?.get(name)||archive?.basenames?.get(name);return entry?readEntry(archive,entry):null;}
 return {open,describe,asset,readEntry,analyze,crc32};
});
