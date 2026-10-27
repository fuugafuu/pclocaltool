'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const T=require('../tools/typing-arena/engine.js');
function type(reading,actual,language='ja'){
 const ts=T.tokens(reading,language);let s=T.initialStates(ts);
 for(const c of actual){s=T.step(ts,s,c);if(!s.length)return false}
 return T.complete(ts,s);
}
test('alternate Japanese romanizations and English',()=>{
 assert.equal(type('しちつしゃじ','shititsushaji'),true);
 assert.equal(type('しちつしゃじ','sichitusyazi'),true);
 assert.equal(type('っか','kka'),true);
 assert.equal(type('っか','xtuka'),true);
 assert.equal(type('かんじ','kanji'),true);
 assert.equal(type('ふぁ','fuxa'),true);
 assert.equal(type('hello world','hello world','en'),true);
 assert.equal(type('hello world','hello xorld','en'),false);
});
test('generated prompts always have a playable romanization',()=>{
 for(const language of ['ja','en'])for(const category of ['daily','tech','creative','science','mixed'])for(let level=1;level<=5;level++)for(let n=0;n<50;n++){
  const p=T.makePrompt({language,category,level});
  const canonical=T.canonical(T.tokens(p.reading||p.display,language));
  assert.match(canonical,/^[a-z0-9 !?.,-]+$/);
  assert.equal(type(p.reading||p.display,canonical,language),true);
  assert.equal(p.level,level);
 }
});
test('adaptive AI prioritizes weak keys while respecting selected level',()=>{
 const model=T.freshModel();
 for(let i=0;i<100;i++)T.observe(model,'s',false,250,'a');
 for(let i=0;i<60;i++)T.observe(model,'a',true,110,'s');
 const ranking=T.rankSummary(model);
 assert.equal(ranking[0].key,'s');
 for(let level=1;level<=5;level++){
  const p=T.adaptivePrompt(model,{language:'ja',category:'tech',level});
  assert.ok(p.level>=1&&p.level<=5);
  assert.equal(p.language,'ja');
 }
});
test('grade ranking and model normalization',()=>{
 assert.equal(T.grade(500,99),'S+');
 assert.equal(T.grade(0,0),'D');
 assert.equal(T.normalizeModel({version:99}).runs,0);
 assert.equal(T.normalizeModel({version:1,keys:{a:{hits:10,errors:2,ms:170}},pairs:{},sessions:[],runs:3}).runs,3);
});
