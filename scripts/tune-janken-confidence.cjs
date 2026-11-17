'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const features = require('../tools/janken-ai/adaptive-features.js');
const { calibrate, trainCalibration } = require('../tools/janken-ai/play-policy.js');

const args = process.argv.slice(2);
const [outputDirectory, ...corpusFiles] = args;
if (!outputDirectory || ![5, 6].includes(corpusFiles.length)) {
  throw new Error('Expected output directory, original, v3, OpenNeuro, transfer, external holdout and optional Roshambo corpus');
}
const toolDirectory = path.resolve(__dirname, '../tools/janken-ai');
const source = fs.readFileSync(path.join(toolDirectory, 'model.js'), 'utf8').trim();
const prefix = 'globalThis.JankenModelArtifact=';
if (!source.startsWith(prefix) || !source.endsWith(';')) throw new Error('Invalid model artifact');
const artifact = JSON.parse(source.slice(prefix.length, -1));
if (artifact.followup?.kind !== 'network') throw new Error('Expected deployed neural followup');
const challengerSource = process.env.JANKEN_CHALLENGER
  ? fs.readFileSync(process.env.JANKEN_CHALLENGER, 'utf8') : '';
const challenger = challengerSource ? JSON.parse(challengerSource) : null;
const runtime = fs.readFileSync(path.join(toolDirectory, 'model-runtime.js'), 'utf8');
const corpora = corpusFiles.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
const [original, v3, neuro, transfer, external, roshambo] = corpora;
const validation = { original: original.validation, v3: v3.validation, neuro: neuro.validation, transfer: transfer.validation };
const tests = { original: original.test, v3: v3.test, neuro: neuro.test, transfer: transfer.test, wxz: v3.external, humanExternal: external };
if (roshambo) {
  validation.roshambo = roshambo.validation;
  tests.roshambo = roshambo.test;
}

function load(model) {
  const environment = { JankenModelArtifact: model, JankenAdaptiveFeatures: features };
  new Function('globalThis', runtime)(environment);
  return environment.JankenLearnedModel;
}

function forecasts(games) {
  const priorArtifact = { ...artifact };
  delete priorArtifact.followup;
  const prior = load(priorArtifact);
  const network = load({ ...artifact, followup: { ...artifact.followup, weight: 1, temperature: 1 } });
  const alternative = challenger && load({
    ...artifact, followup: { kind: 'network', weight: 1, temperature: 1, model: challenger }
  });
  const cache = new Map();
  return games.map(game => {
    const history = [];
    return [...Buffer.from(game, 'base64')].map(pair => {
      if (pair === 255) { history.length = 0; return null; }
      if (pair > 8) throw new Error('Invalid pair');
      const key = history.join(',');
      let prediction = cache.get(key);
      if (!prediction) {
        prediction = { prior: prior.predict(history), network: network.predict(history) };
        if (alternative) prediction.challenger = alternative.predict(history);
        if (cache.size < 50000) cache.set(key, prediction);
      }
      const row = { ...prediction, pair };
      history.push(pair);
      if (history.length > 64) history.shift();
      return row;
    });
  });
}

function evaluate(games, candidates) {
  const totals = candidates.map(() => ({ hits: 0, loss: 0 }));
  let rounds = 0;
  for (const game of games) {
    const history = [];
    const biases = candidates.map(() => Array(6).fill(0));
    for (const row of game) {
      if (!row) {
        history.length = 0;
        biases.forEach(bias => bias.fill(0));
        continue;
      }
      const actual = Math.floor(row.pair / 3);
      const temperatures = new Map();
      for (const [index, candidate] of candidates.entries()) {
        const { temperature, calibration } = candidate;
        const usePooled = candidate.network === 'pooled' &&
          (!candidate.maxHistory || history.length < candidate.maxHistory);
        const key = (usePooled ? 'pooled' : candidate.network === 'challenger' ? 'challenger' : 'current') + '-' + temperature;
        if (!temperatures.has(key)) {
          const distribution = usePooled
            ? row.network.map((value, move) => Math.sqrt(value * row.challenger[move]))
            : candidate.network === 'challenger' ? row.challenger : row.network;
          const scaled = distribution.map(value => value ** (1 / temperature));
          const sum = scaled[0] + scaled[1] + scaled[2];
          temperatures.set(key, scaled.map(value => value / sum));
        }
        const mixed = features.blendLearned(row.prior, temperatures.get(key), candidate);
        const prediction = calibrate(mixed, history, biases[index], calibration);
        totals[index].hits += Number(prediction.indexOf(Math.max(...prediction)) === actual);
        totals[index].loss -= Math.log(prediction[actual]);
        trainCalibration(biases[index], prediction, history, actual, calibration);
      }
      rounds++;
      history.push(row.pair);
      if (history.length > 64) history.shift();
    }
  }
  return totals.map(({ hits, loss }) => ({ rounds, hits, accuracy: hits / rounds, logLoss: loss / rounds }));
}

function processSplit(name, games, candidates) {
  const digest = crypto.createHash('sha256').update(source).update(runtime)
    .update(challengerSource)
    .update(fs.readFileSync(path.join(toolDirectory, 'adaptive-features.js')))
    .update(JSON.stringify(games)).digest('hex');
  const file = path.join(outputDirectory, name + '.forecasts.json');
  let cached;
  if (fs.existsSync(file)) cached = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (cached?.digest !== digest) {
    cached = { digest, games: forecasts(games) };
    fs.writeFileSync(file, JSON.stringify(cached));
  }
  const scoreDigest = crypto.createHash('sha256').update(digest)
    .update(JSON.stringify(candidates))
    .update(evaluate.toString())
    .update(fs.readFileSync(path.join(toolDirectory, 'play-policy.js'))).digest('hex');
  const scoreFile = path.join(outputDirectory, name + '.scores.json');
  if (fs.existsSync(scoreFile)) {
    const previous = JSON.parse(fs.readFileSync(scoreFile, 'utf8'));
    if (previous.digest === scoreDigest && previous.scores?.length === candidates.length) return previous.scores;
  }
  const scores = evaluate(cached.games, candidates);
  fs.writeFileSync(scoreFile, JSON.stringify({ digest: scoreDigest, scores }));
  return scores;
}

function measure(name, games, candidates) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { argv: args, workerData: { name, games, candidates } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => { if (code) reject(new Error('Worker exited: ' + code)); });
  });
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const current = {
    weight: artifact.followup.weight, temperature: artifact.followup.temperature,
    confidenceGain: artifact.followup.confidenceGain, calibration: artifact.playPolicy.calibration
  };
  const candidates = [current];
  for (const weight of [0.35, 0.5, 0.6, 0.7, 0.85]) {
    for (const temperature of [0.8, 0.9, 1, 1.1, 1.25]) {
      for (const confidenceGain of [0, 1.25, 2.5, 4]) {
        for (const strength of [0, 0.2, 0.6, 1.2]) {
          for (const decay of [0.8, 0.97]) {
            candidates.push({ weight, temperature, confidenceGain, calibration: { strength, decay } });
          }
        }
      }
    }
  }
  if (challenger) {
    for (const weight of [0.15, 0.3, 0.45, 0.6, 0.8, 1]) {
      for (const temperature of [0.85, 1, 1.2]) {
        for (const confidenceGain of [0, 1.25, 2.5]) {
          candidates.push({ network: 'challenger', weight, temperature, confidenceGain,
            calibration: current.calibration });
          if (artifact.followup.model.kind === 'candidate-int4') {
            candidates.push({ network: 'pooled', weight, temperature, confidenceGain,
              calibration: current.calibration });
          }
        }
      }
    }
    if (artifact.followup.model.kind === 'candidate-int4') {
      for (const maxHistory of [8, 16, 32]) candidates.push({
        ...current, network: 'pooled', maxHistory
      });
    }
  }
  const scores = await Promise.all(Object.entries(validation).map(async ([name, games]) => {
    const result = await measure('validation-' + name, games, candidates);
    console.log('Validation complete', name);
    return result;
  }));
  const mean = (index, field) => scores.reduce((sum, split, group) =>
    sum + split[index][field] * (group === 3 ? 1 : 2) / (roshambo ? 9 : 7), 0);
  const previousDomains = index => scores.slice(0, 4).reduce((sum, split, group) =>
    sum + split[index].accuracy * (group === 3 ? 1 : 2) / 7, 0);
  let best = 0;
  for (const index of candidates.keys()) {
    if (mean(index, 'logLoss') > mean(0, 'logLoss')) continue;
    if (roshambo && previousDomains(index) < previousDomains(0)) continue;
    // Require accuracy to stay level or improve on at least three independent corpora.
    if (scores.filter(split => split[index].accuracy >= split[0].accuracy).length < 3) continue;
    if (mean(index, 'accuracy') > mean(best, 'accuracy') ||
        (mean(index, 'accuracy') === mean(best, 'accuracy') && mean(index, 'logLoss') < mean(best, 'logLoss'))) best = index;
  }
  const selected = candidates[best];
  const ranking = candidates.map((candidate, index) => ({
    candidate, accuracy: mean(index, 'accuracy'), logLoss: mean(index, 'logLoss'),
    corpusChanges: scores.map(split => split[index].accuracy - split[0].accuracy)
  })).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
  fs.writeFileSync(path.join(outputDirectory, 'ranking.json'), JSON.stringify(ranking, null, 2));
  const report = { selected, validation: {
    before: { accuracy: mean(0, 'accuracy'), logLoss: mean(0, 'logLoss') },
    after: { accuracy: mean(best, 'accuracy'), logLoss: mean(best, 'logLoss') }
  } };
  console.log('Selected', report);
  if (process.env.JANKEN_VALIDATION_ONLY === '1') {
    fs.writeFileSync(path.join(outputDirectory, 'validation.json'), JSON.stringify(report, null, 2));
    return;
  }
  report.tests = Object.fromEntries(await Promise.all(Object.entries(tests).map(async ([name, games]) => {
    const [before, after] = await measure('test-' + name, games, [current, selected]);
    console.log(name, { before, after });
    return [name, { before, after }];
  })));
  Object.assign(artifact.followup, {
    weight: selected.weight, temperature: selected.temperature, confidenceGain: selected.confidenceGain
  });
  if (selected.network === 'challenger') artifact.followup.model = challenger;
  if (selected.network === 'pooled') artifact.followup.model = {
    kind: 'candidate-mixture', featureVersion: challenger.featureVersion,
    models: [artifact.followup.model, challenger], maxHistory: selected.maxHistory
  };
  artifact.playPolicy = { ...artifact.playPolicy, calibration: selected.calibration };
  if (JSON.stringify(selected.calibration) !== JSON.stringify(current.calibration)) {
    artifact.playPolicy.id += '-calibration-v2';
  }
  artifact.confidenceEvaluation = report;
  fs.writeFileSync(path.join(outputDirectory, 'model.js'), prefix + JSON.stringify(artifact) + ';\n');
  fs.writeFileSync(path.join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2));
}

if (isMainThread) main().catch(error => { console.error(error); process.exitCode = 1; });
else parentPort.postMessage(processSplit(workerData.name, workerData.games, workerData.candidates));
