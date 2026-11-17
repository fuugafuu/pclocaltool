'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { isMainThread, parentPort, Worker, workerData } = require('node:worker_threads');
const features = require('../tools/janken-ai/adaptive-features.js');
const { calibrate, trainCalibration } = require('../tools/janken-ai/play-policy.js');

const args = process.argv.slice(2);
const [treeFile, networkFile, output, ...files] = args;
if (![4, 5].includes(files.length)) {
  throw new Error('Expected tree, network, output (each may be -), original, v3, OpenNeuro, transfer and optional external holdout');
}
const tools = path.resolve(__dirname, '../tools/janken-ai');
const prefix = 'globalThis.JankenModelArtifact=';
function artifact(file) {
  const source = fs.readFileSync(file, 'utf8').trim();
  if (!source.startsWith(prefix) || !source.endsWith(';')) throw new Error('Invalid model: ' + file);
  return JSON.parse(source.slice(prefix.length, -1));
}
const base = artifact(path.join(tools, 'model.js'));
delete base.followup;
delete base.followupEvaluation;
const tree = treeFile === '-' ? null : artifact(treeFile);
const network = networkFile === '-' ? null : JSON.parse(fs.readFileSync(networkFile, 'utf8'));
const initialize = new Function('globalThis', fs.readFileSync(path.join(tools, 'model-runtime.js'), 'utf8'));
function load(model) {
  const env = { JankenModelArtifact: model, JankenAdaptiveFeatures: features };
  initialize(env);
  return env.JankenLearnedModel;
}

function score(games, options) {
  const baseline = load(base);
  const alternatives = Object.fromEntries(Object.entries({ tree, network })
    .filter(([kind, model]) => model && options.some(option => option.kind === kind))
    .map(([kind, model]) => [kind, load({ ...base, followup: { model, kind, weight: 1 } })]));
  const needsExperts = options.some(option => option.kind === 'online-experts');
  const settings = base.playPolicy.calibration;
  const totals = options.map(() => ({ hits: 0, loss: 0 }));
  let rounds = 0;
  for (const game of games) {
    const history = [];
    const biases = options.map(() => Array(6).fill(0));
    for (const pair of Buffer.from(game, 'base64')) {
      if (pair === 255) {
        history.length = 0;
        biases.forEach(values => values.fill(0));
        continue;
      }
      if (pair > 8) throw new Error('Invalid round');
      const prior = baseline.predict(history);
      const expert = needsExperts ? features.opponentExperts(history) : null;
      const revised = Object.fromEntries(Object.entries(alternatives).map(([kind, model]) => [kind, model.predict(history)]));
      const adjusted = {};
      const actual = Math.floor(pair / 3);
      for (const [index, option] of options.entries()) {
        let forecast = prior;
        if (option.kind === 'online-experts') {
          forecast = features.blendOpponent(prior, expert[option.scale], option);
        } else if (revised[option.kind]) {
          const key = option.kind + option.temperature;
          if (!adjusted[key]) {
            const scaled = revised[option.kind].map(value => value ** (1 / option.temperature));
            const total = scaled[0] + scaled[1] + scaled[2];
            adjusted[key] = scaled.map(value => value / total);
          }
          forecast = features.blendLearned(prior, adjusted[key], option);
        }
        const prediction = calibrate(forecast, history, biases[index], settings);
        totals[index].hits += Number(prediction.indexOf(Math.max(...prediction)) === actual);
        totals[index].loss -= Math.log(prediction[actual]);
        trainCalibration(biases[index], prediction, history, actual, settings);
      }
      rounds++;
      history.push(pair);
      if (history.length > 64) history.shift();
    }
  }
  if (!rounds) throw new Error('Empty evaluation');
  return totals.map(({ hits, loss }) => ({ rounds, hits, accuracy: hits / rounds, logLoss: loss / rounds }));
}

function measure(games, options) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { argv: args, workerData: { games, options } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => {
      if (code) reject(new Error('Evaluation worker exited with code ' + code));
    });
  });
}

async function main() {
  const [original, v3, neuro, transfer, external] = files.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
  const options = [{ kind: 'baseline' }];
  for (const scale of [0, 1, 2]) {
    for (const weight of [0.15, 0.35, 0.6, 0.9]) {
      for (const threshold of [0, 1.5, 3, 5]) options.push({ kind: 'online-experts', scale, weight, threshold });
    }
  }
  for (const [kind, model] of Object.entries({ tree, network })) {
    if (!model) continue;
    for (const weight of [0.15, 0.3, 0.45, 0.6, 0.8, 1]) {
      for (const temperature of [0.85, 1, 1.2]) {
        options.push({ kind, weight, temperature });
        if (weight < 1) options.push({ kind, weight, temperature, confidenceGain: 1.25 });
      }
    }
  }
  const validation = await Promise.all([original.validation, v3.validation, neuro.validation,
    transfer.validation].map(games => measure(games, options)));
  const mean = (index, field) => validation.reduce((sum, group, i) =>
    sum + group[index][field] * (i === 3 ? 1/7 : 2/7), 0);
  let selected = 0;
  for (const [index] of options.entries()) {
    if (mean(index, 'logLoss') > mean(0, 'logLoss') + 0.0005) continue;
    if (mean(index, 'accuracy') > mean(selected, 'accuracy') ||
        (mean(index, 'accuracy') === mean(selected, 'accuracy') && mean(index, 'logLoss') < mean(selected, 'logLoss'))) selected = index;
  }
  const pick = options[selected];
  const report = { selected: pick, validation: {
    before: { accuracy: mean(0, 'accuracy'), logLoss: mean(0, 'logLoss') },
    after: { accuracy: mean(selected, 'accuracy'), logLoss: mean(selected, 'logLoss') }
  } };
  console.log('Selected:', report);
  if (output === '-') return;
  const test = { original: original.test, v3: v3.test, neuro: neuro.test, wxz: v3.external, transfer: transfer.test };
  if (external) test.humanExternal = external;
  report.tests = Object.fromEntries(await Promise.all(Object.entries(test).map(async ([name, games]) => {
    const [before, after] = await measure(games, [options[0], pick]);
    console.log(name, { before, after });
    return [name, { before, after }];
  })));
  if (selected) {
    const model = { tree, network }[pick.kind];
    base.followup = model ? { ...pick, model } : pick;
  }
  base.followupEvaluation = report;
  fs.writeFileSync(output, prefix + JSON.stringify(base) + ';\n');
}

if (isMainThread) main().catch(error => { console.error(error); process.exitCode = 1; });
else parentPort.postMessage(score(workerData.games, workerData.options));
