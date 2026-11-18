'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { execFileSync } = require('node:child_process');
const brain = require('../tools/janken-ai/opponent-model.js');
const { createOpponent, randomGenerator, testFamilies } = require('./janken-opponents.cjs');
const directory = path.resolve(__dirname, '../tools/janken-ai');
const [output, seedStart = '1000', seedCount = '6', rounds = '400', mode = 'fast', settingsFile] = process.argv.slice(2);
if (!output) throw new Error('Expected report path, seed start, count, rounds, fast/model mode');

function loadModel() {
  const environment = { JankenAdaptiveFeatures: require('../tools/janken-ai/adaptive-features.js'),
    JankenOpponent: brain };
  for (const file of ['model.js', 'model-runtime.js']) {
    new Function('globalThis', fs.readFileSync(path.join(directory, file), 'utf8'))(environment);
  }
  return environment.JankenLearnedModel;
}

const previousModule = { exports: {} };
new Function('module', execFileSync('git', ['show', 'd12908e:tools/janken-ai/play-policy.js'],
  { encoding: 'utf8' }))(previousModule);
const previous = previousModule.exports;

function match(family, seed, updated, settings, model, network) {
  const enemy = createOpponent(family, seed);
  const random = randomGenerator(seed ^ 0x5a13d911);
  const learner = updated ? brain.createSession({ settings, network }) : null;
  const history = [], biases = Array(6).fill(0);
  let wins = 0, losses = 0, hits = 0;
  for (let turn = 0; turn < Number(rounds); turn++) {
    const prior = model ? model.predict(history) : [1 / 3, 1 / 3, 1 / 3];
    let forecast, move;
    if (updated) {
      const prepared = learner.prepare(prior);
      forecast = prepared.forecast;
      move = brain.sample(prepared.action, random);
    } else {
      forecast = previous.calibrate(prior, history, biases, model?.playPolicy?.calibration);
      move = previous.counter(forecast, random);
    }
    // Both hands are committed before either player receives the opponent's current hand.
    const actual = enemy.next();
    const reward = move === actual ? 0 : (move - actual + 3) % 3 === 1 ? 1 : -1;
    wins += Number(reward === 1);
    losses += Number(reward === -1);
    hits += Number(forecast.indexOf(Math.max(...forecast)) === actual);
    if (updated) learner.observe(actual, move);
    else previous.trainCalibration(biases, forecast, history, actual, model?.playPolicy?.calibration);
    enemy.observe(move, actual);
    history.push(actual * 3 + move);
    if (history.length > 64) history.shift();
  }
  return { wins, losses, draws: Number(rounds) - wins - losses, hits, rounds: Number(rounds) };
}

async function main() {
  const supplied = settingsFile ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : null;
  const configurations = supplied?.configurations || [
    { name: 'previous', settings: null },
    { name: 'adaptive', settings: mode === 'model' ? loadModel().battlePolicy || {} : {} }
  ];
  const families = supplied?.families || testFamilies;
  const results = await Promise.all(families.map(family => new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      argv: process.argv.slice(2), workerData: { family, configurations }
    });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => { if (code) reject(new Error('Benchmark worker failed: ' + code)); });
  })));
  const report = { seedStart: Number(seedStart), seeds: Number(seedCount), rounds: Number(rounds),
    mode, configurations,
    modelSha256: mode === 'model' ? createHash('sha256').update(fs.readFileSync(path.join(directory, 'model.js'))).digest('hex') : undefined,
    families: Object.fromEntries(results) };
  for (const [family, scores] of results) {
    console.log(family, Object.fromEntries(Object.entries(scores).map(([name, score]) => [name, {
      win: score.wins / score.rounds, loss: score.losses / score.rounds,
      net: (score.wins - score.losses) / score.rounds, hit: score.hits / score.rounds
    }])));
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
}

if (isMainThread) main().catch(error => { console.error(error); process.exitCode = 1; });
else {
  const model = mode === 'model' ? loadModel() : null;
  const scores = {};
  for (const { name, settings } of workerData.configurations) {
    const total = { wins: 0, losses: 0, draws: 0, hits: 0, rounds: 0 };
    for (let seed = Number(seedStart); seed < Number(seedStart) + Number(seedCount); seed++) {
      const result = match(workerData.family, seed, settings !== null, settings, model, model?.predictBattleFeatures);
      for (const key of Object.keys(total)) total[key] += result[key];
    }
    scores[name] = total;
  }
  parentPort.postMessage([workerData.family, scores]);
}
