'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { isMainThread, parentPort, Worker, workerData } = require('node:worker_threads');
const features = require('../tools/janken-ai/adaptive-features.js');
const { applyPeriod, periodicMove, calibrate, trainCalibration } = require('../tools/janken-ai/play-policy.js');

const argumentsList = process.argv.slice(2);
const validationOnly = argumentsList.at(-1) === '--validation-only';
if (validationOnly) argumentsList.pop();
const [treeFile, output, ...corpora] = argumentsList;
if (!output || corpora.length !== 3) {
  throw new Error('Expected trained tree, output, and original, v3 and OpenNeuro corpora');
}
const directory = path.resolve(__dirname, '../tools/janken-ai');
const prefix = 'globalThis.JankenModelArtifact=';
function readArtifact(file) {
  const source = fs.readFileSync(file, 'utf8').trim();
  if (!source.startsWith(prefix) || !source.endsWith(';')) throw new Error('Invalid artifact: ' + file);
  return JSON.parse(source.slice(prefix.length, -1));
}
const base = readArtifact(path.join(directory, 'model.js'));
delete base.refinement;
delete base.refinementEvaluation;
const tree = readArtifact(treeFile);
const initialize = new Function('globalThis', fs.readFileSync(path.join(directory, 'model-runtime.js'), 'utf8'));
function load(artifact) {
  const env = { JankenModelArtifact: artifact, JankenAdaptiveFeatures: features };
  initialize(env);
  return env.JankenLearnedModel;
}
const baseline = load(base);
const trained = load({ ...base, refinement: { tree, weight: 1 } });
if (trained?.kind !== 'sequence-refined') throw new Error('Browser runtime rejected the candidate tree');
const calibration = base.playPolicy.calibration;
const [original, v3, neuro] = corpora.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
const groups = { original, v3, neuro };

function evaluate(games, options) {
  const totals = options.map(() => ({ hits: 0, loss: 0 }));
  const confirmations = [...new Set(options.flatMap(option => option.period?.confirmations ?? []))];
  const useTrained = options.some(option => option.weight > 0);
  let rounds = 0;
  for (const game of games) {
    const history = [];
    const biases = options.map(() => Array(6).fill(0));
    for (const pair of Buffer.from(game, 'base64')) {
      if (pair === 255) {
        history.length = 0;
        biases.forEach(bias => bias.fill(0));
        continue;
      }
      if (pair > 8) throw new Error('Invalid round');
      const prior = baseline.predict(history);
      const next = useTrained ? trained.predict(history) : prior;
      const periods = new Map(confirmations.map(length => [length, periodicMove(history, length)]));
      const actual = Math.floor(pair / 3);
      for (const [index, { weight, period }] of options.entries()) {
        const mix = prior.map((p, move) => (1 - weight) * p + weight * next[move]);
        const probabilities = calibrate(applyPeriod(mix, periods.get(period?.confirmations) ?? -1,
          period?.strength), history, biases[index], calibration);
        totals[index].hits += Number(probabilities.indexOf(Math.max(...probabilities)) === actual);
        totals[index].loss -= Math.log(probabilities[actual]);
        trainCalibration(biases[index], probabilities, history, actual, calibration);
      }
      rounds++;
      history.push(pair);
      if (history.length > 64) history.shift();
    }
  }
  if (!rounds) throw new Error('Empty evaluation split');
  return totals.map(({ hits, loss }) => ({ rounds, hits, accuracy: hits / rounds, logLoss: loss / rounds }));
}

function measure(games, candidates) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { argv: argumentsList, workerData: { games, candidates } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => {
      if (code) reject(new Error('Evaluation worker exited with code ' + code));
    });
  });
}

async function main() {
  const options = [];
  for (const weight of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    options.push({ weight });
    for (const confirmations of [8, 12, 16]) {
      for (const strength of [0.35, 0.65, 0.9]) options.push({ weight, period: { confirmations, strength } });
    }
  }
  const validation = await Promise.all(Object.entries(groups).map(async ([name, data]) => {
    const result = await measure(data.validation, options);
    console.log('Validation completed:', name, result[0].rounds);
    return result;
  }));
  function mean(index, field) {
    return validation.reduce((sum, split) => sum + split[index][field], 0) / validation.length;
  }
  let best = 0;
  for (const index of options.keys()) {
    if (mean(index, 'logLoss') > mean(0, 'logLoss') + 0.001) continue;
    if (mean(index, 'accuracy') > mean(best, 'accuracy') ||
        (mean(index, 'accuracy') === mean(best, 'accuracy') && mean(index, 'logLoss') < mean(best, 'logLoss'))) best = index;
  }
  const selected = options[best];
  const report = { selected, validation: {
    before: { accuracy: mean(0, 'accuracy'), logLoss: mean(0, 'logLoss') },
    after: { accuracy: mean(best, 'accuracy'), logLoss: mean(best, 'logLoss') }
  }, tests: {} };
  console.log('Selected:', selected, report.validation);
  if (validationOnly) return;
  const testSplits = { original: original.test, v3: v3.test, neuro: neuro.test, wxz: v3.external };
  report.tests = Object.fromEntries(await Promise.all(Object.entries(testSplits).map(async ([name, games]) => {
    const [before, after] = await measure(games, [options[0], selected]);
    console.log(name, { before, after });
    return [name, { before, after }];
  })));
  const refinement = selected.weight ? { ...selected, tree } : selected;
  const artifact = { ...base, refinement, refinementEvaluation: report };
  const deployed = load(artifact);
  const history = [...Buffer.from(v3.test[0], 'base64')].filter(pair => pair < 9).slice(-64);
  function latency(model) {
    for (let i = 0; i < 50; i++) model.predict(history);
    const timings = Array.from({ length: 200 }, () => {
      const start = performance.now();
      model.predict(history);
      return performance.now() - start;
    }).sort((a, b) => a - b);
    return { medianMs: timings[100], p95Ms: timings[190] };
  }
  console.log('Node inference:', { before: latency(baseline), after: latency(deployed) });
  fs.writeFileSync(output, prefix + JSON.stringify(artifact) + ';\n');
}

if (isMainThread) main().catch(error => { console.error(error); process.exitCode = 1; });
else parentPort.postMessage(evaluate(workerData.games, workerData.candidates));
