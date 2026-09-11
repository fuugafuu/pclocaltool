'use strict';
// ---------- v2 integration layer: patches the original Dev OS without host access ----------
(function upgradeDevOSV2(){
  function ensureV2State(){
    state.version=2;
    state.settings??={language:'ja',theme:'dark',wallpaper:'aurora',iconSize:'medium',accent:'#6aa8ff'};
    state.desktop??={positions:{},sort:'name'};
    state.packages??={installed:{},downloads:{}};
    state.malware??={active:{},infectionLevel:0,mutations:0};
    state.scheduledTasks??={};state.pendingLogs??=[];
    state.fs.files['C:/Users/Student/Downloads']??={type:'dir'};
    state.fs.files['C:/Users/Student/AppData']??={type:'dir'};
    save();
  }
  ensureV2State();

  const baseLogEvent=logEvent;
  logEvent=function(level,source,id,message,channel='System',detail=''){
    if(state.services?.EventLog?.status==='Stopped'&&source!=='Service Control Manager'){
      state.pendingLogs.unshift({time:now(),level,source,id,message,channel,detail});state.pendingLogs=state.pendingLogs.slice(0,100);save();return;
    }
    baseLogEvent(level,source,id,message,channel,detail);
  };
  window.flushPendingLogs=function(){if(!state.pendingLogs.length)return;state.logs.unshift(...state.pendingLogs.splice(0));state.logs=state.logs.slice(0,1000);save()};
  const oldBindServiceButtons=bindServiceButtons;
  bindServiceButtons=function(root,rerender){oldBindServiceButtons(root,()=>{if(state.services.EventLog?.status==='Running')flushPendingLogs();rerender()})};

  securityScore=function(){let s=100;if(!state.security.realtime)s-=30;if(!state.security.firewall)s-=25;if(!state.bios.secureBoot)s-=20;if(!state.bios.tpm)s-=15;if(state.security.threats)s-=10;s-=Math.min(45,Math.round((state.malware?.infectionLevel||0)*.45));return clamp(s,0,100)};

  showDesktop=function(){state.cleanShutdown=false;save();$('#lock').classList.add('hidden');$('#desktop').classList.remove('hidden');seedPackages();bootMalwarePersistence();renderDesktop();toast('Dev OS',locale()==='ja'?'仮想セッションを開始しました。':'Virtual session started.');};

  renderQuick=function(){const q=$('#quick-panel');q.innerHTML=`<h3>${locale()==='ja'?'クイック設定':'Quick settings'}</h3><div class="quick-grid"><button class="quick-toggle">📶 Virtual Net<br><span class="good">Connected</span></button><button class="quick-toggle">🔊 Sound<br><span>WebAudio</span></button><button class="quick-toggle" data-open="security">🛡 ${t('security')}<br><span class="${securityScore()<70?'warn':'good'}">${securityScore()}%</span></button><button class="quick-toggle" data-open="settings">⚙ ${t('settings')}</button></div><div class="quick-health"><span>${malwareActive()?'⚠ Virtual threat active':'✓ '+t('protected')}</span><span>${processes().length} proc</span></div>`};

  renderDesktop=function(){ensureSettings();registerInstalledApps();rebuildTitles();const icons=[['taskmgr',t('taskManager')],['security',t('security')],['event',t('eventViewer')],['explorer',t('fileExplorer')],['terminal',t('terminal')],['appdownloader',t('appDownloader')],['settings',t('settings')]];const pkgIcons=installedApps().slice(0,5).map(p=>['pkg:'+p.id,localizeName(p.name)]);$('#desktop-icons').innerHTML=icons.concat(pkgIcons).map(([id,n])=>`<button class="desktop-icon" data-open="${esc(id)}"><span>${apps[id]?.icon||'📦'}</span><label>${esc(n)}</label></button>`).join('');const entries=Object.entries(apps).filter(([id])=>!id.startsWith('file_'));$('#start-menu').innerHTML=`<div class="start-search">⌕ <input data-start-search placeholder="${locale()==='ja'?'アプリ、設定、ファイルを検索':'Search apps, settings, files'}"></div><h3>${t('osName')}</h3><div class="start-grid">${entries.map(([id,a])=>`<button data-open="${esc(id)}"><div class="start-icon">${a.icon}</div><span>${esc(a.title)}</span></button>`).join('')}</div><div class="start-footer"><span>👤 Student</span><div class="power-row"><button class="btn" data-power="lock">${t('lock')}</button><button class="btn" data-power="restart">${t('restart')}</button><button class="btn" data-power="shutdown">${t('shutdown')}</button></div></div>`;const search=$('#start-menu [data-start-search]');search.oninput=()=>{const q=search.value.toLowerCase();$$('#start-menu .start-grid button').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(q))};renderQuick();updateClock();applyAppearance();installDesktopInteractions()};

  updateClock=function(){const d=new Date(),lc=localeCode();$('#task-time').textContent=d.toLocaleTimeString(lc,{hour:'2-digit',minute:'2-digit'});$('#task-date').textContent=d.toLocaleDateString(lc,{month:'2-digit',day:'2-digit'});$('#bios-clock').textContent=d.toLocaleString(lc);$('#tray-status').textContent=securityScore()>=90?t('protected'):t('attention')};
  updateLock=function(){const d=new Date(),lc=localeCode();$('#lock-time').textContent=d.toLocaleTimeString(lc,{hour:'2-digit',minute:'2-digit'});$('#lock-date').textContent=d.toLocaleDateString(lc,{weekday:'long',year:'numeric',month:'long',day:'numeric'})};

  function rebuildTitles(){
    apps.taskmgr.title=t('taskManager');apps.security.title=t('security');apps.event.title=t('eventViewer');apps.services.title=t('services');apps.devices.title=t('devices');apps.explorer.title=t('fileExplorer');apps.terminal.title=t('terminal');apps.registry.title=t('registry');apps.settings.title=t('settings');apps.about.title=t('about');apps.appdownloader??={title:t('appDownloader'),icon:'⬇️',render:renderAppDownloader};apps.appdownloader.title=t('appDownloader');registerInstalledApps();
  }
  refreshShellLanguage=function(){rebuildTitles();document.title=`${t('osName')} | PC Local Tool`;$('#unlock').textContent=t('unlock');renderDesktop();windows.forEach((w,id)=>{const a=apps[id];if(a)w.querySelector('.title').textContent=`${a.icon} ${a.title}`})};

  function renderSettingsV2(root){ensureSettings();let tab='system';const draw=()=>{const side=[['system',t('system')],['personalize',t('personalize')],['language',t('language')],['security',t('security')],['advanced','Advanced']];let body='';if(tab==='system')body=`<h2>${t('system')}</h2><div class="status-card"><div><strong>Dev OS 26100.sim</strong><div class="muted">state v${state.version} · ${processes().length} processes</div></div><button class="btn" data-restart>${t('restart')}</button></div><div class="status-card"><div><strong>Firmware</strong><div class="muted">Secure Boot ${state.bios.secureBoot?'On':'Off'} / TPM ${state.bios.tpm?'On':'Off'}</div></div><button class="btn" data-bios>UEFI</button></div><div class="status-card"><div><strong>${t('packageManager')}</strong><div class="muted">${installedApps().length} ${t('installed')}</div></div><button class="btn" data-open-downloader>${t('appDownloader')}</button></div>`;if(tab==='personalize')body=`<h2>${t('personalize')}</h2><div class="setting-grid"><label>Theme<select data-theme><option value="dark" ${state.settings.theme==='dark'?'selected':''}>Dark</option><option value="light" ${state.settings.theme==='light'?'selected':''}>Light</option><option value="contrast" ${state.settings.theme==='contrast'?'selected':''}>High contrast</option></select></label><label>Wallpaper<select data-wall><option value="aurora" ${state.settings.wallpaper==='aurora'?'selected':''}>Aurora</option><option value="grid" ${state.settings.wallpaper==='grid'?'selected':''}>Grid</option><option value="plain" ${state.settings.wallpaper==='plain'?'selected':''}>Plain</option><option value="alert" ${state.settings.wallpaper==='alert'?'selected':''}>Diagnostic</option></select></label><label>Accent<input data-accent type="color" value="${esc(state.settings.accent)}"></label><label>Desktop icon size<select data-icons><option value="small" ${state.settings.iconSize==='small'?'selected':''}>Small</option><option value="medium" ${state.settings.iconSize==='medium'?'selected':''}>Medium</option><option value="large" ${state.settings.iconSize==='large'?'selected':''}>Large</option></select></label></div>`;if(tab==='language')body=`<h2>${t('language')}</h2><div class="status-card"><div><strong>Display language</strong><div class="muted">Shell labels switch immediately; low-level diagnostic names remain technical.</div></div><select class="select-box" data-language><option value="ja" ${locale()==='ja'?'selected':''}>日本語</option><option value="en" ${locale()==='en'?'selected':''}>English</option></select></div><div class="code">Locale: ${esc(localeCode())}\nLanguage pack: devos-ui-${esc(locale())}.pack</div>`;if(tab==='security')body=`<h2>${t('security')}</h2><div class="status-card"><div><strong>Virtual security health</strong><div class="${securityScore()<70?'bad':'good'}">${securityScore()}%</div></div><button class="btn" data-open-security>${t('security')}</button></div><div class="status-card"><div><strong>Contained malware lab</strong><div class="muted">${malwareActive()?'NightWorm simulation is active':'No active simulated malware'}</div></div>${malwareActive()?'<button class="btn danger" data-remediate>Remove simulation</button>':''}</div>`;if(tab==='advanced')body=`<h2>Advanced simulation</h2><div class="status-card"><div><strong>Trigger virtual bugcheck</strong><div class="muted">Creates BugCheck + Kernel-Power events and enters recovery.</div></div><button class="btn danger" data-crash>BSOD</button></div><div class="status-card"><div><strong>Factory reset</strong><div class="muted">Deletes this simulator's localStorage state only.</div></div><button class="btn danger" data-reset>Reset</button></div>`;root.innerHTML=`<div class="app-shell"><aside class="sidebar"><h3>${t('settings')}</h3>${side.map(([id,n])=>`<button data-settab="${id}" class="${tab===id?'active':''}">${esc(n)}</button>`).join('')}</aside><main class="content">${body}</main></div>`;root.querySelectorAll('[data-settab]').forEach(b=>b.onclick=()=>{tab=b.dataset.settab;draw()});root.querySelector('[data-restart]')?.addEventListener('click',restart);root.querySelector('[data-bios]')?.addEventListener('click',enterBIOS);root.querySelector('[data-open-downloader]')?.addEventListener('click',()=>openApp('appdownloader'));root.querySelector('[data-open-security]')?.addEventListener('click',()=>openApp('security'));root.querySelector('[data-crash]')?.addEventListener('click',()=>crash('MANUALLY_INITIATED_CRASH','devkernel.sim'));root.querySelector('[data-reset]')?.addEventListener('click',()=>{if(confirm('Reset all virtual OS data?')){localStorage.removeItem(STORE);location.reload()}});root.querySelector('[data-remediate]')?.addEventListener('click',()=>{quarantineThreats(scanForVirtualThreats('full'));draw()});root.querySelector('[data-language]')?.addEventListener('change',e=>{state.settings.language=e.target.value;logEvent('Information','International-Core',100,`Display language changed to ${e.target.value}.`,'Application');save();applyAppearance();refreshShellLanguage();draw()});root.querySelector('[data-theme]')?.addEventListener('change',e=>{state.settings.theme=e.target.value;save();applyAppearance()});root.querySelector('[data-wall]')?.addEventListener('change',e=>{state.settings.wallpaper=e.target.value;save();applyAppearance()});root.querySelector('[data-accent]')?.addEventListener('input',e=>{state.settings.accent=e.target.value;save();applyAppearance()});root.querySelector('[data-icons]')?.addEventListener('change',e=>{state.settings.iconSize=e.target.value;save();applyAppearance()})};draw()}

  function renderSecurityV2(root){const render=()=>{const score=securityScore(),found=scanForVirtualThreats('passive');root.innerHTML=`<div class="content"><div class="hero-row"><div><h2>${t('security')}</h2><p class="muted">Virtual protection state shared with packages, startup, services and event logs.</p></div><span class="badge ${score<70?'bad':''}">${score}%</span></div>${found.length?`<div class="status-card danger-zone"><div class="status-icon">🪱</div><div style="flex:1"><strong>${t('threatDetected')}</strong><div class="bad">${esc(found[0].name)} · infection ${state.malware.infectionLevel}%</div></div><button class="btn danger" data-remediate>${t('quarantine')}</button></div>`:''}<div class="status-card"><div class="status-icon">🛡️</div><div style="flex:1"><strong>Real-time protection</strong><div class="${state.security.realtime?'good':'bad'}">${state.security.realtime?'On':'Off'}</div></div><button class="btn" data-toggle-real>${state.security.realtime?'Turn off':'Turn on'}</button></div><div class="status-card"><div class="status-icon">🌐</div><div style="flex:1"><strong>Firewall</strong><div class="${state.security.firewall?'good':'bad'}">${state.security.firewall?'On':'Off'}</div></div><button class="btn" data-toggle-fw>${state.security.firewall?'Turn off':'Turn on'}</button></div><div class="toolbar"><button class="btn" data-scan="quick">Quick scan</button><button class="btn" data-scan="full">Full scan</button></div><h3>Protection history</h3><div class="log-list">${state.security.quarantine.slice(0,12).map(x=>`<div class="log"><span>⚠</span><span>${esc(x.time)}</span><div>${esc(x.name)}<div class="muted">${esc(x.action)}</div></div><span>${esc(x.severity)}</span></div>`).join('')||'<p class="muted">No detections.</p>'}</div></div>`;root.querySelector('[data-toggle-real]').onclick=()=>{state.security.realtime=!state.security.realtime;logEvent(state.security.realtime?'Information':'Warning','SecurityCenter',1001,`Realtime protection ${state.security.realtime?'enabled':'disabled'}.`,'Security');save();render()};root.querySelector('[data-toggle-fw]').onclick=()=>{state.security.firewall=!state.security.firewall;save();render()};root.querySelectorAll('[data-scan]').forEach(b=>b.onclick=()=>{const th=scanForVirtualThreats(b.dataset.scan);state.security.lastScan=now();if(th.length){state.security.threats=th.length;logEvent('Warning','DevDefender',1116,`${th.length} simulated threat(s) detected.`,'Security');if(confirm(`${th.length} simulated threat(s) found. Quarantine now?`)){quarantineThreats(th);state.security.threats=0}}else{state.security.threats=0;logEvent('Information','DevDefender',1000,'Scan completed. No threats found.','Security')}save();render()});root.querySelector('[data-remediate]')?.addEventListener('click',()=>{quarantineThreats(found);state.security.threats=0;render()})};render()}

  apps.appdownloader={title:t('appDownloader'),icon:'⬇️',render:renderAppDownloader};apps.settings.render=renderSettingsV2;apps.security.render=renderSecurityV2;rebuildTitles();seedPackages();applyAppearance();
  document.documentElement.lang=locale();

  const baseExplorer=apps.explorer.render;
  apps.explorer.render=function(root,w){
    baseExplorer(root,w);
    const hook=()=>{
      $$('[data-file]',root).forEach(el=>{
        if(el.dataset.v2hook)return;
        el.dataset.v2hook='1';
        el.addEventListener('contextmenu',e=>{
          e.preventDefault();
          const fp=el.dataset.file,f=state.fs.files[fp];
          contextMenu([{label:t('open'),icon:'↗',run:()=>el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))},{label:t('properties'),icon:'ⓘ',run:()=>toast(t('properties'),`${fp} · ${f?.type}`)}],e.clientX,e.clientY);
        });
        if(el.dataset.file?.endsWith('.devapp.html')){
          el.addEventListener('dblclick',e=>{
            e.stopImmediatePropagation();
            try{
              const pkg=parseDevPackage(state.fs.files[el.dataset.file].text);
              if(confirm(`Install ${localizeName(pkg.name)} ${pkg.version}?`)){
                let r=installPackage(pkg);
                if(r.blocked&&confirm('Dev Security blocked this package. Force install into virtual OS?'))installPackage(pkg,{force:true});
              }
            }catch(err){toast('App Installer',err.message)}
          });
        }
      });
    };
    hook();
    new MutationObserver(hook).observe(root,{childList:true,subtree:true});
  };

  const observer=new MutationObserver(()=>{if(!$('#desktop').classList.contains('hidden')){applyAppearance();installDesktopInteractions()}});observer.observe($('#desktop'),{attributes:true,attributeFilter:['class']});
})();
