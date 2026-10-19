const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=(process.env.GAME_BASE_URL||'http://127.0.0.1:8080').replace(/\/$/,'');
fs.mkdirSync('output/game',{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1500,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
 async function step(ms,wait=0){await page.evaluate(ms=>advanceTime(ms),ms);if(wait)await page.waitForTimeout(wait);}
 await page.goto(base+'/tools/game/');await page.waitForTimeout(400);await page.screenshot({path:'output/game/ready.png',fullPage:true});
 await page.click('#start-btn');await step(2200,150);assert.equal((await state()).phase,'playing');
 await page.keyboard.press('KeyC');assert.ok((await state()).players[0].hold);const held=(await state()).players[0].hold;await page.keyboard.press('KeyC');assert.equal((await state()).players[0].hold,held);
 const x=(await state()).players[0].active.x;await page.keyboard.press('ArrowLeft');assert.equal((await state()).players[0].active.x,x-1);await page.keyboard.press('ArrowRight');assert.equal((await state()).players[0].active.x,x);await page.keyboard.press('ArrowUp');await page.keyboard.press('KeyZ');await page.keyboard.press('Space');assert.equal((await state()).players[0].pieces,1);
 await page.keyboard.press('KeyP');const before=await state();await step(2000,100);assert.equal((await state()).elapsedMs,before.elapsedMs);assert.equal((await state()).phase,'paused');await page.click('#overlay-action');assert.equal((await state()).phase,'playing');
 // Deterministic test fixture: clear four lines via the real keyboard/lock path.
 await page.evaluate(()=>{const original=StackEngine.Player.prototype.lock;StackEngine.Player.prototype.lock=function(now){StackEngine.Player.prototype.lock=original;this.board=StackEngine.empty();for(let y=18;y<22;y++)this.board[y]=Array.from({length:10},(_,x)=>x===5?'':'G');this.active={type:'I',r:1,x:3,y:18,lastRotate:false,kick:0};return original.call(this,now);};});
 await page.keyboard.press('Space');let s=await state();assert.equal(s.players[0].lines,4);assert.equal(s.players[0].sent,8);assert.equal(s.players[1].pending.reduce((a,p)=>a+p.lines,0),8);await step(100,50);await page.screenshot({path:'output/game/attack.png',fullPage:true});
 // End-to-end round loss and next round, retaining correct score and badges.
 await page.evaluate(()=>{const original=StackEngine.Player.prototype.lock;StackEngine.Player.prototype.lock=function(now){StackEngine.Player.prototype.lock=original;const r=original.call(this,now);this.dead=true;return r;};});await page.keyboard.press('Space');assert.equal((await state()).phase,'round-over');assert.equal((await state()).scores[1],1);await page.click('#overlay-action');assert.equal((await state()).round,2);assert.equal((await state()).badges[1],1);
 // AI vs AI at independent maximum/high levels, enough moves to attack.
 await page.check('input[value=watch]');await page.selectOption('#left-level','5');await page.selectOption('#right-level','4');await page.click('#start-btn');await step(2200,180);
 for(let i=0;i<100;i++){await step(250,85);if((await state()).phase!=='playing')break;}
 s=await state();assert.ok(s.players[0].pieces>=20,JSON.stringify(s));assert.ok(s.players[1].pieces>=20);assert.ok(s.players.some(p=>p.lines>0));await page.screenshot({path:'output/game/watch.png',fullPage:true});fs.writeFileSync('output/game/watch-state.json',JSON.stringify(s,null,2));
 // Solo start-level selection, touch buttons and small screen layout.
 await page.check('input[value=solo]');await page.selectOption('#gravity','5');await page.click('#start-btn');await step(2200);assert.equal((await state()).mode,'solo');await page.setViewportSize({width:390,height:844});await page.locator('[data-action=left]').click();await page.locator('[data-action=drop]').click();assert.ok((await state()).players[0].pieces>=1);await page.screenshot({path:'output/game/mobile.png',fullPage:true});
 // Keyboard controls still work after restart.
 await page.click('#restart-btn');await step(2200);await page.keyboard.press('Space');assert.equal((await state()).players[0].pieces,1);
 // Audio and visual preferences persist; the real game can finish a marathon.
 await page.click('#sound-btn');await page.uncheck('#effects');await page.uncheck('#ghost');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pclocaltool_game_v1')).sound),true);
 await page.locator('#arena').focus();
 await page.evaluate(()=>{const original=StackEngine.Player.prototype.lock;StackEngine.Player.prototype.lock=function(now){StackEngine.Player.prototype.lock=original;this.lines=149;this.board=StackEngine.empty();this.board[21]=Array.from({length:10},(_,x)=>x===5?'':'G');this.active={type:'I',r:1,x:3,y:18,lastRotate:false,kick:0};return original.call(this,now);};});
 await page.keyboard.press('Space');assert.equal((await state()).phase,'finished');assert.equal((await state()).players[0].lines,150);
 const best=await page.locator('#best-score').innerText();assert.notEqual(best,'0000000');
 await page.reload();assert.equal(await page.locator('#best-score').innerText(),best);assert.equal(await page.locator('#effects').isChecked(),false);assert.equal(await page.locator('#ghost').isChecked(),false);
 await page.check('input[value=versus]');await page.selectOption('#rounds','1');await page.click('#start-btn');await step(2200,100);
 await page.evaluate(()=>{const original=StackEngine.Player.prototype.lock;StackEngine.Player.prototype.lock=function(now){StackEngine.Player.prototype.lock=original;const result=original.call(this,now);this.dead=true;return result;};});await page.keyboard.press('Space');assert.equal((await state()).phase,'finished');
 // Offline startup includes the game engine and the worker's imports.
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await page.context().setOffline(true);await page.reload();await page.click('#start-btn');await step(2200,120);for(let i=0;i<8;i++)await step(500,100);assert.ok((await state()).players[1].pieces>0);await page.context().setOffline(false);
 assert.deepEqual(errors,[]);console.log('Browser checks passed: controls, hold, pause, attack, round flow, independent AI levels, solo, touch, restart; audio/preferences, high score persistence, marathon finish, match finish, offline AI; no console errors.');console.log('AI watch:',s.players.map(p=>({ai:p.controller,pieces:p.pieces,lines:p.lines,sent:p.sent,dead:p.dead})));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
