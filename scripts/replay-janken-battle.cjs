'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const features = require('../tools/janken-ai/adaptive-features.js');
const { calibrate, trainCalibration } = require('../tools/janken-ai/play-policy.js');
const brain = require('../tools/janken-ai/opponent-model.js');

const [reference, output, ...files] = process.argv.slice(2);
if (!reference || !output || !files.length) throw new Error('Expected reference commit, output, and test corpora');
const dir = 'tools/janken-ai/';

function load(revision) {
  const read = file => revision
    ? execFileSync('git', ['show', revision + ':' + dir + file], { encoding: 'utf8', maxBuffer: 4e6 })
    : fs.readFileSync(dir + file, 'utf8');
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
  for (const game of games) {
    let session = start();
    const history = [], biases = Array(6).fill(0);
    for (const pair of Buffer.from(game, 'base64')) {
      if (pair === 255) {
        session = start();
        history.length = 0;
        biases.fill(0);
        continue;
      }
      if (pair > 8) throw new Error('Invalid encoded round');
      const calibrated = calibrate(model.predict(history), history, biases, model.playPolicy.calibration);
      const forecast = session.prepare(calibrated).forecast;
      const hand = Math.floor(pair / 3);
      hits += Number(forecast.indexOf(Math.max(...forecast)) === hand);
      loss -= Math.log(forecast[hand]);
      rounds++;
      session.observe(hand, pair % 3);
      trainCalibration(biases, calibrated, history, hand, model.playPolicy.calibration);
      history.push(pair);
      if (history.length > 64) history.shift();
    }
  }
  if (!rounds) throw new Error('Empty test corpus');
  return { rounds, hits, accuracy: hits / rounds, logLoss: loss / rounds };
}

const previous = load(reference), updated = load();
const report = files.map(file => {
  const { test } = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(test)) throw new Error('Missing test split: ' + file);
  const result = { file, previous: score(previous, test), updated: score(updated, test) };
  console.log(result);
  return result;
});
fs.writeFileSync(output, JSON.stringify(report, null, 2));
