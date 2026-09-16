'use strict';
(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const catalog=()=>window.AGENT_TOOL_CATALOG||[];
const state={theme:localStorage.getItem('agentbridge-theme')||'dark',drawer:false};
function setTheme(theme){state.theme=theme;document.documentElement.dataset.theme=theme;localStorage.setItem('agentbridge-theme',theme);const b=$('#theme-toggle');if(b)b.textContent=theme==='dark'?'☀️':'🌙'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function parseStatus(){const ta=$('#command'),badge=$('#json-health'),meta=$('#command-meta');if(!ta||!badge||!meta)return;const text=ta.value;let status='空',cls='idle',actions=0; if(text.trim()){try{const p=window.AgentBridge?.api?.parseAgentRequest?.(text);actions=p?.request?.actions?.length||0;status='実行可能';cls='ok'}catch(e){status='要確認';cls='warn'}} badge.textContent=status;badge.className='health '+cls;meta.textContent=`${text.length.toLocaleString()} 文字 · ${actions} actions`}
function syncRunStatus(){const s=$('#run-status'),live=$('#live-status');if(!s||!live)return;const t=s.textContent||'待機中';live.textContent=t;live.dataset.kind=/完了|コピー済み/.test(t)?'ok':/エラー|失敗/.test(t)?'error':/実行中/.test(t)?'busy':'idle'}
function updateWorkspaceSummary(){const src=$('#workspace-info'),dst=$('#workspace-summary');if(!src||!dst)return;dst.innerHTML=src.innerHTML}
function renderToolResults(q=''){const box=$('#tool-results');if(!box)return;const words=q.trim().toLowerCase().split(/\s+/).filter(Boolean);let items=catalog().map(t=>{const hay=`${t.id} ${t.description||''} ${t.args||''} ${t.usage||''}`.toLowerCase();let score=words.length?words.reduce((s,w)=>s+(t.id.toLowerCase().includes(w)?5:0)+(hay.includes(w)?2:0),0):1;return{t,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.t.id.localeCompare(b.t.id)).slice(0,80);box.innerHTML=items.length?items.map(({t})=>`<button class="tool-item" data-tool="${esc(t.id)}"><span class="tool-name">${esc(t.id)}</span><span class="tool-desc">${esc(t.description||'')}</span><span class="tool-args">${esc(typeof t.args==='string'?t.args:Object.keys(t.args||{}).join(', '))}</span></button>`).join(''):'<div class="empty-state">該当ツールなし</div>';$$('.tool-item').forEach(b=>b.onclick=()=>{const id=b.dataset.tool;const t=catalog().find(x=>x.id===id);$('#tool-detail').innerHTML=t?`<div class="detail-title">${esc(t.id)}</div><p>${esc(t.description||'')}</p>${t.usage?`<div class="detail-label">使い方</div><p>${esc(t.usage)}</p>`:''}${t.example?`<div class="detail-label">例</div><pre>${esc(t.example)}</pre>`:''}${t.notes?`<div class="detail-label">注意</div><p>${esc(t.notes)}</p>`:''}`:''})}
function openTools(open=true){state.drawer=open;$('#tool-drawer')?.classList.toggle('open',open);$('#drawer-backdrop')?.classList.toggle('open',open);if(open){$('#tool-search')?.focus();renderToolResults($('#tool-search')?.value||'')}}
function setMainTab(tab){$$('[data-main-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mainTab===tab));$$('[data-main-panel]').forEach(p=>p.classList.toggle('active',p.dataset.mainPanel===tab));localStorage.setItem('agentbridge-main-tab',tab)}
function copyMini(text,button){navigator.clipboard?.writeText(text).catch(()=>{});const old=button.textContent;button.textContent='✓';setTimeout(()=>button.textContent=old,700)}
function init(){setTheme(state.theme);
  $('#theme-toggle')?.addEventListener('click',()=>setTheme(state.theme==='dark'?'light':'dark'));
  $('#open-tools')?.addEventListener('click',()=>openTools(true));$('#close-tools')?.addEventListener('click',()=>openTools(false));$('#drawer-backdrop')?.addEventListener('click',()=>openTools(false));
  $('#tool-search')?.addEventListener('input',e=>renderToolResults(e.target.value));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')openTools(false);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openTools(true)}});
  const command=$('#command');command?.addEventListener('input',parseStatus);parseStatus();
  const mo=new MutationObserver(()=>{syncRunStatus();updateWorkspaceSummary()});const rs=$('#run-status');if(rs)mo.observe(rs,{childList:true,subtree:true,characterData:true});const wi=$('#workspace-info');if(wi)mo.observe(wi,{childList:true,subtree:true,characterData:true});syncRunStatus();updateWorkspaceSummary();
  const saved=localStorage.getItem('agentbridge-main-tab')||'result';setMainTab(saved);$$('[data-main-tab]').forEach(b=>b.onclick=()=>setMainTab(b.dataset.mainTab));
  $('#copy-protocol-mini')?.addEventListener('click',e=>copyMini('{"version":1,"actions":[{"tool":"file.list","args":{"path":"."}}]}',e.currentTarget));
  $('#command')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('#run')?.click()}});
  renderToolResults('');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
