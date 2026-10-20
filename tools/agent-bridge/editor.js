'use strict';
(() => {
 const B=window.AgentBridge,$=s=>document.querySelector(s);let loaded='',dirty=false,loading=0,working=false,openedText=null;
 const panel=document.createElement('section');panel.className='panel file-editor-panel';
 panel.innerHTML=`<div class="panel-head"><div><h2>ファイルエディター</h2><div class="subhead">編集 → 差分を確認 → ワークベンチで反映。Ctrl / ⌘ + S で変更を保持。</div></div></div>
 <div class="actions"><input id="editor-path" aria-label="編集する相対パス" placeholder="src/example.js"><button id="editor-open" class="secondary">開く</button><button id="editor-new" class="secondary">新規作成</button><button id="editor-save" class="primary">変更を保持</button></div>
 <p id="editor-status" role="status">ファイル一覧から選択するか、相対パスを入力してください。</p><textarea id="file-editor" aria-label="ファイルの内容" spellcheck="false" disabled></textarea>
 <div class="actions"><button id="import-bundle" class="secondary">変更セット v2 を読み込む</button><input id="bundle-file" type="file" accept=".json,application/json" hidden></div><p class="muted small">元ファイルが書き出し時と一致するときだけ復元します。読み込みだけでは元ファイルを書き換えません。</p><div id="pending-files" aria-label="保持中の変更"></div>`;
 $('.workbench-panel').after(panel);
 const status=t=>$('#editor-status').textContent=t;
 function guard(){if(B.state().running||B.session.busy||working)throw Error('処理の完了を待ってください');if(B.state().mode==='none')throw Error('先に作業フォルダを選択してください');}
 function abandon(){return !dirty||confirm('まだ保持していない編集があります。編集内容を破棄しますか？');}
 async function open(path,isNew=false){try{guard();path=BridgeWorkspace.norm(path);if(!path)throw Error('相対ファイルパスを指定してください');if(!abandon())return;const id=++loading;working=true;let text='';if(isNew){if((await B.api.walk('',99)).some(f=>f.path===path))throw Error('そのパスは既に存在します。「開く」を使用してください');}else text=await B.api.readText(path);if(id!==loading)return;loaded=path;openedText=isNew?null:text;$('#editor-path').value=path;$('#file-editor').value=text;$('#file-editor').disabled=false;dirty=isNew;status(path+(isNew?' · 新規ファイル':' · 読み込み済み'));$('#file-editor').focus();}catch(e){status(e.message);}finally{working=false;}}
 async function save(){try{guard();if(!loaded)throw Error('ファイルを開くか新規作成してください');if(BridgeWorkspace.norm($('#editor-path').value)!==loaded)throw Error('パスを変更した場合は「開く」か「新規作成」を押してください');working=true;let current=null;try{current=await B.api.readText(loaded);}catch{if((await B.api.walk('',99)).some(f=>f.path===loaded))throw Error('ファイルを読み取れません。再度開いてください');}if(current!==openedText)throw Error('読み込み後に内容が変わりました。編集内容をコピーして退避し、ファイルを開き直してください。');$('#stage-edits').checked=true;await B.api.writeText(loaded,$('#file-editor').value);openedText=$('#file-editor').value;dirty=false;status(loaded+' · 変更を保持しました。ワークベンチで差分を確認できます。');}catch(e){status(e.message);}finally{working=false;}}
 $('#editor-open').onclick=()=>open($('#editor-path').value);$('#editor-new').onclick=()=>open($('#editor-path').value,true);$('#editor-save').onclick=save;
 $('#file-tree').addEventListener('click',e=>{const button=e.target.closest('[data-file]');if(button)open(button.dataset.file);});
 $('#file-editor').oninput=()=>{dirty=true;status(loaded+' · 未保持');};
 $('#file-editor').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopPropagation();save();}if(e.key==='Tab'){e.preventDefault();const t=e.target;t.setRangeText('  ',t.selectionStart,t.selectionEnd,'end');t.dispatchEvent(new Event('input'));}};
 $('#import-bundle').onclick=()=>{try{guard();$('#bundle-file').click();}catch(e){status(e.message);}};
 $('#bundle-file').onchange=async e=>{try{guard();const file=e.target.files[0];if(!file)return;if(file.size>12*1024*1024)throw Error('変更セットは12 MBまでです');working=true;const data=JSON.parse(await file.text());const result=await B.session.importBundle(data);$('#stage-edits').checked=true;document.dispatchEvent(new Event('bridge-workspace-changed'));status(result.imported+'操作を復元しました。差分を確認して反映してください。');}catch(error){status(error.message);}finally{working=false;e.target.value='';}};
 function pending(){const host=$('#pending-files');host.replaceChildren();for(const op of B.session.summary()){const row=document.createElement('button');row.className='secondary pending-entry';row.type='button';row.textContent=({write:'編集',delete:'削除',mkdir:'フォルダ'}[op.type])+' · '+op.path;row.onclick=()=>{const target=$('#file-preview');target.textContent='';$('#preview-path').textContent=op.path;const before=B.session.baselines.get(op.path);if(op.type==='delete'){target.textContent=before?.type==='file'?before.text:'フォルダと配下のファイルを削除します。';}else if(op.type==='write')open(op.path);target.scrollIntoView({block:'center',behavior:'smooth'});};host.append(row);}}
 document.addEventListener('bridge-workspace-changed',pending);
 document.addEventListener('bridge-before-workspace-change',e=>{if(working||!abandon())e.preventDefault();});
 document.addEventListener('bridge-workspace-reset',()=>{loading++;loaded='';openedText=null;dirty=false;$('#file-editor').value='';$('#file-editor').disabled=true;$('#editor-path').value='';status('作業フォルダが切り替わりました。ファイルを開いてください。');});
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 pending();
})();
