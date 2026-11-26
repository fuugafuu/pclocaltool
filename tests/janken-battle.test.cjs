'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const brain = require('../tools/janken-ai/opponent-model.js');
const { randomGenerator } = require('../scripts/janken-opponents.cjs');
const settings = { temperature: 0.04, evidenceScale: 0.8, exploration: 0.03, defense: 2 };

test('a committed forecast stays fixed until a legal observed hand arrives', () => {
  const learner = brain.createSession({ settings });
  const pending = learner.prepare([0.8, 0.1, 0.1]);
  assert.equal(learner.prepare([0.1, 0.8, 0.1]), pending);
  assert.throws(() => learner.observe(3, 0), /Invalid committed/);
  assert.equal(learner.prepare(), pending);
  assert.throws(() => { pending.action[0] = 1; });
  learner.observe(0, 1);
  assert.notEqual(learner.prepare(), pending);
  assert.equal(learner.trainingFeatures()[0].length, 675);
});

test('saved battle learning restores exact forecasts and excludes pending private choices', () => {
  const original = brain.createSession({ settings });
  for (let turn = 0; turn < 700; turn++) {
    original.prepare([0.2, 0.3, 0.5]);
    original.observe(turn % 3, (turn * 7 + 2) % 3);
  }
  const saved = JSON.parse(JSON.stringify(original.exportState()));
  assert.equal(saved.round, 700);
  assert.equal(saved.history.length, 512);
  assert.equal('pending' in saved, false);
  assert.equal('move' in saved, false);
  const restored = brain.createSession({ settings, state: saved });
  assert.deepEqual(restored.prepare([0.2, 0.3, 0.5]), original.prepare([0.2, 0.3, 0.5]));
  const broken = { ...saved, predictiveEdge: Infinity };
  const recovered = brain.createSession({ settings, state: broken, history: [0, 4, 8] });
  assert.equal(recovered.diagnostics().rounds, 3);
  assert.ok(recovered.prepare().forecast.every(Number.isFinite));
});

test('the learner follows a counter strategy through random distractions and a strategy reversal', () => {
  const random = randomGenerator(88019);
  const learner = brain.createSession({ settings });
  let previous = 0, wins = 0, lateWins = 0;
  for (let turn = 0; turn < 800; turn++) {
    const prepared = learner.prepare();
    const ours = brain.sample(prepared.action, random);
    const opponent = random() < 0.18 ? Math.floor(random() * 3) :
      (previous + (turn < 400 ? 1 : 2)) % 3;
    const won = (ours - opponent + 3) % 3 === 1;
    wins += Number(won);
    if (turn >= 600) lateWins += Number(won);
    learner.observe(opponent, ours);
    previous = ours;
  }
  assert.ok(wins / 800 > 0.65, String(wins / 800));
  assert.ok(lateWins / 200 > 0.65, String(lateWins / 200));
  assert.ok(JSON.stringify(learner.exportState()).length < 150000);
});

test('unpredictable opponents do not cause a persistent deterministic hand bias', () => {
  const random = randomGenerator(71028);
  const learner = brain.createSession({ settings });
  let cautious = 0;
  for (let turn = 0; turn < 1200; turn++) {
    const prepared = learner.prepare();
    const ours = brain.sample(prepared.action, random);
    const opponent = Math.floor(random() * 3);
    if (turn >= 800 && Math.max(...prepared.action) < 0.5) cautious++;
    learner.observe(opponent, ours);
  }
  assert.ok(cautious > 300, String(cautious));
});

test('the trained battle network accepts causal features and returns a normalized prediction', () => {
  const environment = {
    JankenAdaptiveFeatures: require('../tools/janken-ai/adaptive-features.js')
  };
  for (const file of ['model.js', 'model-runtime.js']) {
    new Function('globalThis', fs.readFileSync('tools/janken-ai/' + file, 'utf8'))(environment);
  }
  const model = environment.JankenLearnedModel;
  assert.equal(typeof model.predictBattleFeatures, 'function');
  const learner = brain.createSession({ network: model.predictBattleFeatures, settings: model.battlePolicy,
    featureVersion: model.battleFeatureVersion });
  const prediction = learner.prepare().forecast;
  assert.ok(prediction.every(value => value > 0 && value < 1));
  assert.ok(Math.abs(prediction.reduce((sum, value) => sum + value, 0) - 1) < 1e-10);
  const rows = learner.trainingFeatures();
  const graph = model.describeBattleNetwork();
  assert.equal(graph.length, 5);
  assert.equal(graph[3].sizes[0], brain.humanInputWidth);
  assert.equal(graph[4].sizes[0], brain.sequenceInputWidth);
  assert.deepEqual(rows.map(row => row.slice(684)), brain.humanFeatures([], 5));
  const trace = model.inspectBattleFeatures(rows, 0, 2);
  for (const [index, { sizes, connections }] of graph.entries()) {
    assert.deepEqual(trace[index].activations.map(layer => layer.length), sizes);
    for (const [layer, edges] of connections.entries()) {
      assert.ok(edges.every(edge => edge.source < sizes[layer] &&
        edge.target < sizes[layer + 1] && Number.isFinite(edge.weight) && edge.weight !== 0));
    }
  }
  const blended = model.predictBattleFeatures(rows, 0);
  for (let move = 0; move < 3; move++) {
    assert.ok(Math.abs(blended[move] - trace.reduce((sum, head) =>
      sum + head.share * head.probabilities[move], 0)) < 1e-10);
  }
  assert.ok(trace[2].share > model.inspectBattleFeatures(rows, 96, 2)[2].share);
});

test('human behavior features are candidate-specific and depend only on observed pairs', () => {
  const settings = { contextWeight: 1, specialistWeight: 1, metaWeight: 1 };
  const history = [0, 3, 6, 1, 4, 7, 2, 5, 8];
  const old = brain.createSession({ settings, featureVersion: 3, history });
  const learner = brain.createSession({ settings, featureVersion: 4, state: old.exportState() });
  const oldRows = old.trainingFeatures();
  const firstRows = learner.trainingFeatures();
  assert.deepEqual(firstRows.map(row => row.slice(684)), brain.humanFeatures(history));
  assert.deepEqual(firstRows.map(row => row.slice(0, 684)), oldRows);
  assert.deepEqual(firstRows.map(row => row.slice(685, 688)), [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.ok(firstRows.every(row => row.every(Number.isFinite)));
  assert.equal(learner.trainingFeatures(), firstRows);
  learner.observe(0, 2);
  assert.deepEqual(learner.trainingFeatures().map(row => row.slice(684)), brain.humanFeatures([...history, 2]));
});

test('sequence features retain the older inputs and find continuations of recurring hands', () => {
  const history = Array.from({ length: 36 }, (_, turn) => 4 * (turn % 3));
  const original = brain.humanFeatures(history, 4);
  const enhanced = brain.humanFeatures(history, 5);
  assert.ok(enhanced.every(row => row.length === brain.sequenceInputWidth && row.every(Number.isFinite)));
  assert.deepEqual(enhanced.map(row => row.slice(0, brain.humanInputWidth)), original);
  assert.ok(enhanced[0][brain.humanInputWidth] > enhanced[1][brain.humanInputWidth]);
  const session = brain.createSession({ featureVersion: 5, history });
  assert.deepEqual(session.trainingFeatures().map(row => row.slice(684)), enhanced);
});

test('the periodic learner keeps its evidence through random hands and a saved-state reload', () => {
  const settings = { specialistWeight: 1, temperature: 0.04, evidenceScale: 0.8, exploration: 0.03 };
  const random = randomGenerator(44271);
  const pattern = [0, 2, 2, 0, 1, 0, 0, 2, 1, 2, 1];
  let learner = brain.createSession({ settings, featureVersion: 2 });
  let correct = 0;
  for (let round = 0; round < 600; round++) {
    const prepared = learner.prepare();
    assert.equal(learner.trainingFeatures()[0].length, 677);
    const hand = random() < 0.12 ? Math.floor(random() * 3) : pattern[round % pattern.length];
    if (round >= 300) correct += Number(prepared.forecast.indexOf(Math.max(...prepared.forecast)) === hand);
    learner.observe(hand, brain.sample(prepared.action, random));
    if (round === 299) {
      const restored = brain.createSession({ settings, featureVersion: 2, state: learner.exportState() });
      assert.deepEqual(restored.prepare(), learner.prepare());
      learner = restored;
    }
  }
  assert.ok(correct >= 245, 'Correct predictions in last 300 rounds: ' + correct);
});

test('context evidence extends v2 saved learning and resumes identically after a reload', () => {
  const old = brain.createSession({ featureVersion: 2, settings: { specialistWeight: 1 } });
  for (let turn = 0; turn < 90; turn++) old.observe((turn * 7 + Math.floor(turn / 5)) % 3, turn % 3);
  const state = old.exportState();
  const settings = { contextWeight: 1, specialistWeight: 1 };
  const updated = brain.createSession({ featureVersion: 3, settings, state });
  assert.equal(updated.diagnostics().rounds, 90);
  assert.equal(updated.trainingFeatures()[0].length, 684);
  assert.deepEqual(updated.exportState().specialists.scores.slice(0, state.specialists.scores.length),
    state.specialists.scores);
  for (let turn = 0; turn < 60; turn++) updated.observe((turn * 2 + Math.floor(turn / 7)) % 3, turn % 3);
  const restored = brain.createSession({ featureVersion: 3, settings, state: updated.exportState() });
  assert.deepEqual(restored.prepare(), updated.prepare());
});

test('counter-read evidence extends v3 saved learning and resumes identically after a reload', () => {
  const settings = { contextWeight: 1, specialistWeight: 1 };
  const old = brain.createSession({ featureVersion: 3, settings });
  for (let turn = 0; turn < 20; turn++) old.observe((turn + 1) % 3, turn % 3);
  const state = old.exportState();
  const config = { featureVersion: 3, settings: { ...settings, metaWeight: 1 } };
  const updated = brain.createSession({ ...config, state });
  assert.equal(updated.round, 20);
  assert.deepEqual(updated.exportState().specialists.scores, state.specialists.scores.concat(Array(8).fill(0)));
  for (let turn = 0; turn < 20; turn++) updated.observe((turn + 2) % 3, turn % 3);
  const restored = brain.createSession({ ...config, state: updated.exportState() });
  assert.deepEqual(restored.prepare(), updated.prepare());
});
