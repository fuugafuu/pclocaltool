'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const features = require('../tools/janken-ai/adaptive-features.js');
const play = require('../tools/janken-ai/play-policy.js');
const brain = require('../tools/janken-ai/opponent-model.js');

const [reference, output, ...files] = process.argv.slice(2);
if (!reference || !output || !files.length) throw new Error('Expected reference commit, output, and test corpora');
const dir = 'tools/janken-ai/';
const split = process.env.JANKEN_REPLAY_SPLIT || 'test';

function load(revision) {
  const read = file => revision
    ? execFileSync('git', ['show', revision + ':' + dir + file], { encoding: 'utf8', maxBuffer: 4e6 })
    : fs.readFileSync(file === 'model.js' && process.env.JANKEN_REPLAY_ARTIFACT
      ? process.env.JANKEN_REPLAY_ARTIFACT : dir + file, 'utf8');
  const module = { exports: {} };
  let engine = brain;
  if (revision) {
    new Function('module', read('opponent-model.js'))(module);
    engine = module.exports;
  }
  const environment = { JankenAdaptiveFeatures: features };
  for (const name of ['model.js', 'model-runtime.js']) new Function('globalThis', read(name))(environment);
  const model = environment.JankenLearnedModel;
  return { model, start: () => engine.createSession({
    settings: model.battlePolicy, network: model.predictBattleFeatures, featureVersion: model.battleFeatureVersion
  }) };
}

function score({ model, start }, games) {
  let hits = 0, loss = 0, rounds = 0;
  let openingHits = 0, openingRounds = 0;
  const policy = model.playPolicy;
  for (const game of games) {
    let session = start();
    let evidence = 0;
    const history = [], biases = Array(6).fill(0);
    for (const pair of Buffer.from(game, 'base64')) {
      if (pair === 255) {
        session = start();
        evidence = 0;
        history.length = 0;
        biases.fill(0);
        continue;
      }
      if (pair > 8) throw new Error('Invalid encoded round');
      const predictions = play.forecast(model, history, policy);
      const prior = play.combine(predictions, evidence, policy);
      const periodic = policy.periodic && play.periodicMove(history, policy.periodic.confirmations);
      const calibrated = play.calibrate(play.applyPeriod(prior, periodic ?? -1, policy.periodic?.strength),
        history, biases, policy.calibration);
      const forecast = session.prepare(calibrated).forecast;
      const hand = Math.floor(pair / 3);
      const correct = Number(forecast.indexOf(Math.max(...forecast)) === hand);
      hits += correct;
      if (session.round < 12) {
        openingHits += correct;
        openingRounds++;
      }
      loss -= Math.log(forecast[hand]);
      rounds++;
      session.observe(hand, pair % 3);
      evidence = play.observe(predictions, hand, evidence, policy);
      play.trainCalibration(biases, calibrated, history, hand, policy.calibration);
      history.push(pair);
      if (history.length > 64) history.shift();
    }
  }
  if (!rounds) throw new Error('Empty test corpus');
  return { rounds, hits, accuracy: hits / rounds, logLoss: loss / rounds, openingHits, openingRounds };
}

function compare(partitions) {
  const previous = load(reference), updated = load();
  return partitions.map(games => ({ previous: score(previous, games), updated: score(updated, games) }));
}

function combine(parts) {
  const total = { rounds: 0, hits: 0, openingRounds: 0, openingHits: 0 };
  let loss = 0;
  for (const part of parts) {
    for (const key of Object.keys(total)) total[key] += part[key];
    loss += part.logLoss * part.rounds;
  }
  return { ...total, accuracy: total.hits / total.rounds, logLoss: loss / total.rounds };
}

async function main() {
  const corpora = files.map(file => {
    const games = JSON.parse(fs.readFileSync(file, 'utf8'))[split];
    if (!Array.isArray(games) || !games.length) throw new Error('Missing ' + split + ' split: ' + file);
    return games;
  });
  const requested = Number(process.env.JANKEN_REPLAY_WORKERS ?? 1);
  if (!Number.isInteger(requested) || requested < 1 || requested > 16) throw new Error('Expected 1 to 16 replay workers');
  const count = Math.min(requested, ...corpora.map(games => games.length));
  const reports = count === 1 ? [compare(corpora)] :
    await Promise.all(Array.from({ length: count }, (_, part) => new Promise((resolve, reject) => {
      const partitions = corpora.map(games => games.filter((_, index) => index % count === part));
      const worker = new Worker(__filename, { argv: process.argv.slice(2), workerData: partitions });
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', code => { if (code) reject(new Error('Replay worker failed: ' + code)); });
    })));
  const report = files.map((file, index) => {
    const result = { file, split, previous: combine(reports.map(part => part[index].previous)),
      updated: combine(reports.map(part => part[index].updated)) };
    console.log(result);
    return result;
  });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
}

if (isMainThread) main().catch(error => { console.error(error); process.exitCode = 1; });
else parentPort.postMessage(compare(workerData));
