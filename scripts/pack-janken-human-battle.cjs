'use strict';
const fs = require('node:fs');
const path = require('node:path');

const [baseFile, headFile, output] = process.argv.slice(2);
if (!baseFile || !headFile || !output) throw new Error('Expected base model.js, trained human head JSON, and output');
require(path.resolve(baseFile));
const artifact = globalThis.JankenModelArtifact;
const head = JSON.parse(fs.readFileSync(headFile, 'utf8'));
if (artifact?.battleModel?.featureVersion !== 3 || artifact.battleModel.models?.length !== 3 ||
    head.kind !== 'battle-int4' || head.featureVersion !== 4) throw new Error('Expected v3 ensemble and v4 human head');

const humanBattleHead = { name: '人間の傾向', weight: 4, opening: 0, head };
const battlePolicy = { ...artifact.battlePolicy, id: 'human-adaptive-v5', networkWeight: 0.92 };
fs.writeFileSync(output, 'globalThis.JankenModelArtifact=' +
  JSON.stringify({ ...artifact, humanBattleHead, battlePolicy }) + ';\n');
