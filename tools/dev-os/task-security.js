function renderTaskManager(root){
  let tab='processes';
  const secs=[['processes','Processes'],['performance','Performance'],['startup','Startup apps'],['services','Services']];
  function render(){
    let body='';
    if(tab==='processes'){
      const ps=processes();
      const rows=ps.map(p=>{
        const endBtn=p.pid>1800?`<button class="btn danger" data-kill="${p.pid}">End task</button>`:'';
        return `<tr><td>${esc(p.name)}</td><td>${p.pid}</td><td>${p.user}</td><td>${p.cpu.toFixed(1)}%</td><td>${p.mem} MB</td><td>${endBtn}</td></tr>`;
      }).join('');
      body=`<div class="hero-row"><div><h2>Processes</h2><p class="muted">${ps.length} running processes</p></div><button class="btn" data-refresh>Refresh</button></div><div class="metrics"><div class="metric"><span>CPU</span><strong>${rnd(4,28)}%</strong></div><div class="metric"><span>Memory</span><strong>${rnd(31,56)}%</strong></div><div class="metric"><span>Disk</span><strong>${rnd(0,12)}%</strong></div><div class="metric"><span>GPU</span><strong>${rnd(1,22)}%</strong></div></div><table class="table"><thead><tr><th>Name</th><th>PID</th><th>User</th><th>CPU</th><th>Memory</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    }else if(tab==='performance'){
      const cards=['CPU','Memory','Disk 0 (C:)','GPU 0'].map((n,idx)=>{
        const sub=idx===0?'DevCore 8C':idx===1?'16.0 GB':idx===2?'DevSSD NVMe':'DevRender 780';
        const bars=Array.from({length:34},()=>`<i style="height:${rnd(8,90)}%"></i>`).join('');
        return `<div class="status-card"><div style="width:130px"><strong>${n}</strong><div class="muted">${sub}</div></div><div style="flex:1"><div class="chart">${bars}</div></div></div>`;
      }).join('');
      body=`<h2>Performance</h2>${cards}<div class="code">Uptime: ${formatDuration(now()-state.uptimeStart)}\nProcesses: ${processes().length}\nThreads: ${rnd(820,1150)}\nHandles: ${rnd(22000,38000)}</div>`;
    }else if(tab==='startup'){
      const rows=Object.entries(state.startup).map(([n,on])=>`<tr><td>${esc(n)}</td><td class="${on?'good':'muted'}">${on?'Enabled':'Disabled'}</td><td>${['Low','Medium','High'][n.length%3]}</td><td><button class="btn" data-startup="${esc(n)}">${on?'Disable':'Enable'}</button></td></tr>`).join('');
      body=`<h2>Startup apps</h2><table class="table"><thead><tr><th>Name</th><th>Status</th><th>Impact</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    }else body=servicesTable(true);
    root.innerHTML=shell('Task Manager',secs,tab,body);
    root.querySelector('.sidebar').onclick=e=>{const b=e.target.closest('[data-section]');if(b){tab=b.dataset.section;render();}};
    root.querySelector('[data-refresh]')?.addEventListener('click',render);
    root.querySelectorAll('[data-kill]').forEach(b=>b.onclick=()=>{const pid=+b.dataset.kill;const idx=extraProc.findIndex(p=>p[1]===pid);if(idx>=0){const name=extraProc[idx][0];extraProc.splice(idx,1);logEvent('Information','TaskManager',1002,`Process ${name} (${pid}) was terminated by the user.`,'Application');render();}});
    root.querySelectorAll('[data-startup]').forEach(b=>b.onclick=()=>{state.startup[b.dataset.startup]=!state.startup[b.dataset.startup];save();render();});
    bindServiceButtons(root,render);
  }
  render();
}
function renderSecurity(root){
  const render=()=>{const score=securityScore();root.innerHTML=`<div class="content"><div class="hero-row"><div><h2>Dev Security</h2><p class="muted">Virtual security health dashboard</p></div><span class="badge ${score<70?'bad':''}">Health ${score}%</span></div>${securityCard('🛡️','Virus & threat protection',state.security.realtime?'Real-time protection is on':'Real-time protection is off',state.security.realtime,'realtime')}${securityCard('🌐','Firewall & network protection',state.security.firewall?'Virtual firewall is on':'Virtual firewall is off',state.security.firewall,'firewall')}${securityCard('🔐','Device security',`Secure Boot ${state.bios.secureBoot?'ON':'OFF'} / TPM ${state.bios.tpm?'ON':'OFF'}`,state.bios.secureBoot&&state.bios.tpm,'firmware')}<div class="status-card"><div class="status-icon">🔎</div><div style="flex:1"><strong>Scan</strong><div class="muted">Last scan: ${state.security.lastScan?new Date(state.security.lastScan).toLocaleString('ja-JP'):'Never'}</div></div><button class="btn" data-scan="quick">Quick scan</button><button class="btn" data-scan="full">Full scan</button></div><h3>Protection history</h3><div class="log-list">${state.security.quarantine.length?state.security.quarantine.map(x=>`<div class="log"><span>⚠</span><span class="time">${esc(x.time)}</span><div>${esc(x.name)}<div class="muted">${esc(x.action)}</div></div><span>${esc(x.severity)}</span></div>`).join(''):'<p class="muted">No detections.</p>'}</div></div>`;
  root.querySelectorAll('[data-toggle-sec]').forEach(b=>b.onclick=()=>{const k=b.dataset.toggleSec;state.security[k]=!state.security[k];logEvent(state.security[k]?'Information':'Warning','SecurityCenter',1001,`${k} was ${state.security[k]?'enabled':'disabled'} by user.`,'Security');save();render();renderQuick()});
  root.querySelectorAll('[data-scan]').forEach(b=>b.onclick=()=>runScan(b.dataset.scan,root,render));};render();
}
function securityCard(icon,title,text,ok,key){return `<div class="status-card"><div class="status-icon">${icon}</div><div style="flex:1"><strong>${esc(title)}</strong><div class="${ok?'good':'warn'}">${esc(text)}</div></div>${key==='firmware'?'<button class="btn" data-open-bios>UEFI settings</button>':`<button class="btn" data-toggle-sec="${key}">${ok?'Turn off':'Turn on'}</button>`}</div>`}
function runScan(type,root,rerender){let pct=0;const box=document.createElement('div');box.className='status-card';box.innerHTML='<div style="flex:1"><strong>Scanning...</strong><div class="bar"><span style="width:0"></span></div><div class="muted" data-spct>0%</div></div>';root.querySelector('.content').prepend(box);const t=setInterval(()=>{pct+=rnd(5,15);if(pct>=100){pct=100;clearInterval(t);state.security.lastScan=now();const hit=Math.random()<.18;if(hit){const th={time:new Date().toLocaleString('ja-JP'),name:'EICAR-SIM-Test-Pattern',action:'Quarantined (simulation)',severity:'Low'};state.security.quarantine.unshift(th);state.security.threats=0;logEvent('Warning','DevDefender',1116,'A simulated test threat was detected and quarantined.','Security')}else logEvent('Information','DevDefender',1000,`${type} scan completed. No threats found.`,'Security');save();setTimeout(rerender,400)}box.querySelector('.bar span').style.width=pct+'%';box.querySelector('[data-spct]').textContent=pct+'%'},120)}
