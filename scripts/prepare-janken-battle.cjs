'use strict';
const fs = require('node:fs');
const path = require('node:path');
const brain = require('../tools/janken-ai/opponent-model.js');
const { createOpponent, randomGenerator, trainingFamilies } = require('./janken-opponents.cjs');

const [output, humanCorpus] = process.argv.slice(2);
if (!humanCorpus) throw new Error('Expected output directory and player-disjoint human corpus');
fs.mkdirSync(output, { recursive: true });
const source = JSON.parse(fs.readFileSync(humanCorpus, 'utf8'));
const featureVersion = Number(process.argv[4] || 1);
if (![1, 2].includes(featureVersion)) throw new Error('Unsupported battle feature version');
const createLearner = () => brain.createSession({ featureVersion });
const width = createLearner().trainingFeatures()[0].length;
const report = { featureVersion, width, rounds: {}, generatedGames: {} };

for (const split of ['train', 'validation']) {
  const valuesFile = fs.openSync(path.join(output, split + '.f32'), 'w');
  const labelsFile = fs.openSync(path.join(output, split + '.labels'), 'w');
  const capacity = 256;
  const values = new Float32Array(capacity * 3 * width);
  const labels = new Uint8Array(capacity);
  let buffered = 0, rounds = 0;
  const generated = [];
  function flush() {
    fs.writeFileSync(valuesFile, Buffer.from(values.buffer, 0, buffered * 3 * width * 4));
    fs.writeFileSync(labelsFile, labels.subarray(0, buffered));
    rounds += buffered;
    buffered = 0;
  }
  function record(learner, enemy, ours) {
    const rows = learner.trainingFeatures();
    rows.forEach((row, index) => values.set(row, (buffered * 3 + index) * width));
    labels[buffered++] = enemy;
    if (buffered === capacity) flush();
    learner.observe(enemy, ours);
  }
  try {
    for (const encoded of source[split]) {
      let learner = createLearner();
      for (const pair of Buffer.from(encoded, 'base64')) {
        if (pair === 255) { learner = createLearner(); continue; }
        if (pair > 8) throw new Error('Invalid human corpus hand');
        learner.prepare();
        record(learner, Math.floor(pair / 3), pair % 3);
      }
    }
    const gamesPerFamily = split === 'train' ? 32 : 6;
    const start = split === 'train' ? 31000 : 51000;
    for (const [familyIndex, family] of trainingFamilies.entries()) {
      for (let game = 0; game < gamesPerFamily; game++) {
        const seed = start + familyIndex * 500 + game;
        const enemy = createOpponent(family, seed);
        const random = randomGenerator(seed ^ 0x1337fa29);
        const learner = createLearner();
        const style = game % 4;
        const favorite = Math.floor(random() * 3);
        const sequence = [];
        let previous = favorite;
        for (let turn = 0; turn < 240; turn++) {
          const prepared = learner.prepare();
          const ours = style === 0 ? Math.floor(random() * 3) :
            style === 1 ? (random() < 0.12 ? Math.floor(random() * 3) : favorite) :
              style === 2 ? (previous + 1) % 3 : brain.sample(prepared.action, random);
          const actual = enemy.next();
          record(learner, actual, ours);
          enemy.observe(ours, actual);
          previous = actual;
          sequence.push(actual * 3 + ours);
        }
        generated.push(Buffer.from(sequence).toString('base64'));
      }
      console.log(split, family, 'complete');
    }
    if (buffered) flush();
    fs.writeFileSync(path.join(output, split + '.games.json'), JSON.stringify(generated));
    report.rounds[split] = rounds;
    report.generatedGames[split] = generated.length;
  } finally {
    fs.closeSync(valuesFile);
    fs.closeSync(labelsFile);
  }
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(report, null, 2));
console.log(report);
