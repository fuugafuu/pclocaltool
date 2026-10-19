const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {predictBounce}=require('../tools/retro-arcade/runtime-utils.js');
test('paddle prediction accounts for reflected walls in either direction',()=>{assert.equal(predictBounce(90,20,1,0,100),90);assert.equal(predictBounce(10,-30,1,0,100),20);assert.equal(predictBounce(10,100,5,0,100),90);assert.equal(predictBounce(25,10,-1,0,100),25);});
test('all arcade and agent browser scripts parse, including the diagnostics bundle',()=>{for(const dir of ['tools/agent-bridge','tools/retro-arcade'])for(const file of fs.readdirSync(dir,{recursive:true}).filter(f=>f.endsWith('.js')))assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(dir+'/'+file,'utf8'),{filename:dir+'/'+file}));});
