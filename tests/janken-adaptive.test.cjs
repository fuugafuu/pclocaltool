'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const features = require('../tools/janken-ai/adaptive-features.js');
const { combine, observe, periodicMove, applyPeriod, calibrate, trainCalibration } = require('../tools/janken-ai/play-policy.js');

test('the next round gives more influence to the model that assigned the observed move more probability', () => {
  const policy = {prior:0.2, gain:0.6, decay:0.9};
  const predictions = [[0.2,0.5,0.3],[0.7,0.2,0.1]];
  const initial = combine(predictions,0,policy);
  const evidence = observe(predictions,0,0,policy);
  assert.ok(combine(predictions,evidence,policy)[0] > initial[0]);
  const missed = observe(predictions,1,0,policy);
  assert.ok(combine(predictions,missed,policy)[0] < initial[0]);
});

test('a periodic forecast requires a confirmed sequence and cannot use the current hand', () => {
  const cycle = [0,3,6];
  const rounds = Array.from({length:15},(_,index)=>cycle[index%3]);
  assert.equal(periodicMove(rounds.slice(0,7),8),-1);
  const result = periodicMove(rounds,8);
  assert.equal(result,0);
  assert.ok(applyPeriod([0.2,0.5,0.3],result,0.65)[0]>0.5);
});

test('online calibration updates probabilities only after an observed hand', () => {
  const settings = {strength:0.8,decay:0.75};
  const prior = [0.2,0.5,0.3];
  const history = [0,4,6];
  const biases = Array(6).fill(0);
  assert.deepEqual(calibrate(prior,history,biases,settings),prior);
  trainCalibration(biases,prior,history,0,settings);
  assert.ok(calibrate(prior,history,biases,settings)[0]>prior[0]);
});

test('adaptive features use the last 64 rounds and rotate with the candidate hand', () => {
  const rounds = Array.from({length:80}, (_, i) => (i*i+2*i) % 9);
  const rotate = round => ((Math.floor(round/3)+1)%3)*3+(round%3+1)%3;
  for (const version of [1,2,3,4,5]) {
    const expected = features(rounds,version);
    assert.deepEqual(expected,features(rounds.slice(-64),version));
    const asFloat32 = rows => rows.map(row => row.map(Math.fround));
    assert.deepEqual(asFloat32(features(rounds.map(rotate),version)),asFloat32([expected[2],expected[0],expected[1]]));
    assert.ok(expected.flat().every(Number.isFinite));
    if (version > 1) {
      features(rounds, version - 1).forEach((row, index) => {
        assert.deepEqual(expected[index].slice(0, row.length), row);
      });
    }
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
  assert.equal(adaptive.kind,'sequence-refined');
  assert.equal(fallback.kind,'ensemble');
  const result = adaptive.predict(rounds);
  assert.ok(result.every(value=>value>0&&value<1));
  assert.ok(Math.abs(result.reduce((sum,value)=>sum+value,0)-1)<1e-10);
  assert.notDeepEqual(Array.from(result),Array.from(fallback.predict(rounds)));
});
