'use strict';
const fs = require('node:fs');
const path = require('node:path');

const [baseFile, headFile, output, nextWeight = '4', previousWeight = '0', influence = '0.92', searchFile] = process.argv.slice(2);
if (!baseFile || !headFile || !output) throw new Error('Expected base model.js, trained human head JSON, and output');
require(path.resolve(baseFile));
const artifact = globalThis.JankenModelArtifact;
const head = JSON.parse(fs.readFileSync(headFile, 'utf8'));
if (artifact?.battleModel?.featureVersion !== 3 || artifact.battleModel.models?.length !== 3 ||
    head.kind !== 'battle-int4' || !Array.isArray(head.layers) || ![4, 5].includes(head.featureVersion)) {
  throw new Error('Expected a v3 base ensemble and a v4 or v5 human head');
}
const weights = [nextWeight, previousWeight, influence].map(Number);
if (!weights.every(Number.isFinite) || weights[0] <= 0 || weights[1] < 0 || weights[2] < 0 || weights[2] > 1) {
  throw new Error('Expected positive new weight, nonnegative old weight and influence between zero and one');
}

const sequence = head.featureVersion === 5;
const deep = sequence && artifact.sequenceBattleHead && head.layers.length > 3;
const search = searchFile ? JSON.parse(fs.readFileSync(searchFile, 'utf8')) : {};
const weight = weights[0];
let addition;
if (deep) {
  addition = { deepBattleHead: { name: '深層予測', weight, opening: 0, head } };
} else if (sequence) {
  addition = { sequenceBattleHead: { name: '手の並び', weight, previousWeight: weights[1],
    opening: head.training?.opening ? 2 : 0, head } };
} else {
  addition = { humanBattleHead: { name: '人間の傾向', weight, opening: 0, head } };
}
const battlePolicy = { ...artifact.battlePolicy, ...search,
  id: deep ? 'response-lookahead-v7' : sequence ? 'human-sequence-v6' : 'human-adaptive-v5',
  networkWeight: weights[2] };
fs.writeFileSync(output, 'globalThis.JankenModelArtifact=' +
  JSON.stringify({ ...artifact, ...addition, battlePolicy }) + ';\n');
