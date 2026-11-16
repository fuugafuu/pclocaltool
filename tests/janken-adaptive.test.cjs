'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const features = require('../tools/janken-ai/adaptive-features.js');

test('adaptive features use the last 64 rounds and rotate with the candidate hand', () => {
  const rounds = Array.from({length:80}, (_, i) => (i*i+2*i) % 9);
  const rotate = round => ((Math.floor(round/3)+1)%3)*3+(round%3+1)%3;
  for (const version of [1,2]) {
    const expected = features(rounds,version);
    assert.deepEqual(expected,features(rounds.slice(-64),version));
    const asFloat32 = rows => rows.map(row => row.map(Math.fround));
    assert.deepEqual(asFloat32(features(rounds.map(rotate),version)),asFloat32([expected[2],expected[0],expected[1]]));
    assert.ok(expected.flat().every(Number.isFinite));
  }
});
test('packaged model loads with adaptive features and also runs the base when they are unavailable', () => {
  const rounds = [0,1,3,4,6,8,1,3,0,4,7,8];
  const load = features => {
    const ctx = vm.createContext({ atob, JankenAdaptiveFeatures:features });
    for (const file of ['model.js','model-runtime.js']) {
      vm.runInContext(fs.readFileSync('tools/janken-ai/'+file,'utf8'),ctx);
    }
    return ctx.JankenLearnedModel;
  };
  const adaptive = load(features);
  const fallback = load(undefined);
  assert.equal(adaptive.kind,'adaptive-hybrid');
  assert.equal(fallback.kind,'ensemble');
  const result = adaptive.predict(rounds);
  assert.ok(result.every(value=>value>0&&value<1));
  assert.ok(Math.abs(result.reduce((sum,value)=>sum+value,0)-1)<1e-10);
  assert.notDeepEqual(Array.from(result),Array.from(fallback.predict(rounds)));
});
