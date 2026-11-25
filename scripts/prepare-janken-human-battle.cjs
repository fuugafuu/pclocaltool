'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { humanFeatures, humanInputWidth } = require('../tools/janken-ai/opponent-model.js');

const [output, ...corpora] = process.argv.slice(2);
if (!output || !corpora.length) throw new Error('Expected an output directory and one or more split corpora');
const sources = corpora.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
fs.mkdirSync(output, { recursive: true });
const manifest = { featureVersion: 4, width: humanInputWidth, rounds: {}, sourceRounds: {} };

for (const split of ['train', 'validation']) {
  const fd = fs.openSync(path.join(output, split + '.f32'), 'w');
  const labelsFd = fs.openSync(path.join(output, split + '.labels'), 'w');
  const values = new Float32Array(512 * 3 * humanInputWidth);
  const labels = new Uint8Array(512);
  const seen = new Set();
  let size = 0;
  function flush() {
    fs.writeFileSync(fd, Buffer.from(values.buffer, 0, size * 3 * humanInputWidth * 4));
    fs.writeFileSync(labelsFd, labels.subarray(0, size));
    size = 0;
  }
  try {
    manifest.sourceRounds[split] = sources.map(source => {
      let rounds = 0;
      for (const encoded of source[split]) {
        if (seen.has(encoded)) continue;
        seen.add(encoded);
        const history = [];
        for (const pair of Buffer.from(encoded, 'base64')) {
          if (pair === 255) { history.length = 0; continue; }
          if (pair > 8) throw new Error('Invalid recorded hand pair');
          humanFeatures(history).forEach((row, move) => values.set(row, (size * 3 + move) * humanInputWidth));
          labels[size++] = Math.floor(pair / 3);
          if (size === labels.length) flush();
          history.push(pair);
          if (history.length > 96) history.shift();
          rounds++;
        }
      }
      console.log(split, rounds);
      return rounds;
    });
    if (size) flush();
  } finally {
    fs.closeSync(fd);
    fs.closeSync(labelsFd);
  }
  manifest.rounds[split] = manifest.sourceRounds[split].reduce((sum, count) => sum + count, 0);
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
