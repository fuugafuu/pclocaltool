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
  const width = features([], version)[0].length;
  const capacity = 512;
  const values = new Float32Array(capacity * 3 * width);
  const labels = new Uint8Array(capacity);
  const outputValues = fs.openSync(output + '/' + split + '.f32', 'w');
  const outputLabels = fs.openSync(output + '/' + split + '.labels', 'w');
  let buffered = 0;
  let total = 0;
  function flush() {
    fs.writeSync(outputValues, Buffer.from(values.buffer, 0, buffered * 3 * width * 4));
    fs.writeSync(outputLabels, labels.subarray(0, buffered));
    total += buffered;
    buffered = 0;
  }
  try {
    for (const game of games) {
      const history = [];
      for (const pair of Buffer.from(game, 'base64')) {
        if (pair === 255) { history.length = 0; continue; }
        if (pair > 8) throw new Error('Invalid round');
        const rows = features(history, version);
        rows.forEach((row, index) => values.set(row, (buffered * 3 + index) * width));
        labels[buffered++] = Math.floor(pair / 3);
        if (buffered === capacity) flush();
        history.push(pair);
      }
    }
    if (buffered) flush();
  } finally {
    fs.closeSync(outputValues);
    fs.closeSync(outputLabels);
  }
  console.log(split, total, width);
}
