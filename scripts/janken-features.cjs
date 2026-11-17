'use strict';
const fs = require('node:fs');
const features = require('../tools/janken-ai/adaptive-features.js');

const [, , dataset, output, featureVersion = '1'] = process.argv;
if (!dataset || !output) throw new Error('Expected dataset and output directory');
const version = Number(featureVersion);
if (![1, 2, 3, 4, 5].includes(version)) throw new Error('Unsupported feature version');
fs.mkdirSync(output, {recursive:true});
const groups = JSON.parse(fs.readFileSync(dataset, 'utf8'));
for (const [split, games] of Object.entries(groups)) {
  const rows = [];
  const labels = [];
  for (const game of games) {
    const history = [];
    for (const pair of Buffer.from(game, 'base64')) {
      if (pair === 255) { history.length = 0; continue; }
      if (pair > 8) throw new Error('Invalid round');
      rows.push(...features(history, version));
      labels.push(Math.floor(pair / 3));
      history.push(pair);
    }
  }
  const width = features([], version)[0].length;
  const values = new Float32Array(rows.length * width);
  rows.forEach((row, index) => values.set(row, index * width));
  fs.writeFileSync(output + '/' + split + '.f32', Buffer.from(values.buffer));
  fs.writeFileSync(output + '/' + split + '.labels', Buffer.from(labels));
  console.log(split, labels.length, width);
}
