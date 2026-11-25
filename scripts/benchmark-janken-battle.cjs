'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { execFileSync } = require('node:child_process');
const brain = require('../tools/janken-ai/opponent-model.js');
const { createOpponent, randomGenerator, testFamilies } = require('./janken-opponents.cjs');
const directory = path.resolve(__dirname, '../tools/janken-ai');
const reference = '4539005';
const [output, seedStart = '1000', seedCount = '6', rounds = '400', mode = 'fast', settingsFile] = process.argv.slice(2);
if (!output) throw new Error('Expected report path, seed start, count, rounds, fast/model mode');

function loadModel(revision) {
  const environment = { JankenAdaptiveFeatures: require('../tools/janken-ai/adaptive-features.js'),
    JankenOpponent: brain };
  for (const file of ['model.js', 'model-runtime.js']) {
    const source = revision ? execFileSync('git', ['show', revision + ':tools/janken-ai/' + file],
      { encoding: 'utf8', maxBuffer: 4e6 }) : fs.readFileSync(path.join(directory, file), 'utf8');
    new Function('globalThis', source)(environment);
    if (file === 'model.js' && !revision && process.env.JANKEN_BATTLE_CHALLENGER) {
      environment.JankenModelArtifact.battleModel = JSON.parse(
        fs.readFileSync(process.env.JANKEN_BATTLE_CHALLENGER, 'utf8'));
    }
  }
  return environment.JankenLearnedModel;
}

const previousModule = { exports: {} };
new Function('module', execFileSync('git', ['show', 'd12908e:tools/janken-ai/play-policy.js'],
  { encoding: 'utf8' }))(previousModule);
const previous = previousModule.exports;
const incumbentModule = { exports: {} };
new Function('module', execFileSync('git', ['show', reference + ':tools/janken-ai/opponent-model.js'],
  { encoding: 'utf8' }))(incumbentModule);
const incumbent = incumbentModule.exports;

function match(family, seed, name, settings, model, forecastModel = model) {
  const enemy = createOpponent(family, seed);
  const random = randomGenerator(seed ^ 0x5a13d911);
  const implementation = name === 'incumbent' ? incumbent : brain;
  const learner = settings !== null ? implementation.createSession({
    settings, network: forecastModel?.predictBattleFeatures, featureVersion: forecastModel?.battleFeatureVersion
  }) : null;
  const history = [], biases = Array(6).fill(0);
  let wins = 0, losses = 0, hits = 0;
  for (let turn = 0; turn < Number(rounds); turn++) {
    const prior = previous.calibrate(model?.predict(history) || [1 / 3, 1 / 3, 1 / 3],
      history, biases, model?.playPolicy?.calibration);
    let forecast, move;
    if (learner) {
      const prepared = learner.prepare(prior);
      forecast = prepared.forecast;
      move = brain.sample(prepared.action, random);
    } else {
      forecast = prior;
      move = previous.counter(forecast, random);
    }
    // Both hands are committed before either player receives the opponent's current hand.
    const actual = enemy.next();
    const reward = move === actual ? 0 : (move - actual + 3) % 3 === 1 ? 1 : -1;
    wins += Number(reward === 1);
    losses += Number(reward === -1);
    hits += Number(forecast.indexOf(Math.max(...forecast)) === actual);
    if (learner) learner.observe(actual, move);
    previous.trainCalibration(biases, prior, history, actual, model?.playPolicy?.calibration);
    enemy.observe(move, actual);
    history.push(actual * 3 + move);
    if (history.length > 64) history.shift();
  }
  return { wins, losses, draws: Number(rounds) - wins - losses, hits, rounds: Number(rounds) };
}

async function main() {
  const supplied = settingsFile ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : null;
  const configurations = supplied?.configurations || [
    { name: 'incumbent', settings: loadModel(reference).battlePolicy },
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
    mode, configurations, reference,
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
  const oldModel = mode === 'model' && workerData.configurations.some(config =>
    config.name === 'incumbent' || config.network === 'incumbent')
    ? loadModel(reference) : null;
  const scores = {};
  for (const { name, settings, network } of workerData.configurations) {
    const total = { wins: 0, losses: 0, draws: 0, hits: 0, rounds: 0 };
    for (let seed = Number(seedStart); seed < Number(seedStart) + Number(seedCount); seed++) {
      const prior = name === 'incumbent' ? oldModel : model;
      const forecastModel = network === 'incumbent' ? oldModel : prior;
      const result = match(workerData.family, seed, name, settings, prior, forecastModel);
      for (const key of Object.keys(total)) total[key] += result[key];
    }
    scores[name] = total;
  }
  parentPort.postMessage([workerData.family, scores]);
}
