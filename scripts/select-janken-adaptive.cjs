'use strict';
const fs = require('node:fs');
const path = require('node:path');
const features = require('../tools/janken-ai/adaptive-features.js');
const runtime = fs.readFileSync(path.join(__dirname, '../tools/janken-ai/model-runtime.js'), 'utf8');
const initialize = new Function('globalThis', runtime);

function readArtifact(file) {
  const content = fs.readFileSync(file, 'utf8').trim();
  const prefix = 'globalThis.JankenModelArtifact=';
  if (!content.startsWith(prefix) || !content.endsWith(';')) throw new Error('Invalid model file: '+file);
  return JSON.parse(content.slice(prefix.length,-1));
}

function predictor(artifact) {
  const environment = { JankenModelArtifact: artifact, JankenAdaptiveFeatures: features };
  initialize(environment);
  return environment.JankenLearnedModel.predict;
}

function samples(games, predict) {
  const probabilities = [];
  const labels = [];
  for (const game of games) {
    const history = [];
    for (const pair of Buffer.from(game, 'base64')) {
      if (pair === 255) { history.length = 0; continue; }
      probabilities.push(predict(history));
      labels.push(Math.floor(pair / 3));
      history.push(pair);
      if (history.length > 64) history.shift();
    }
  }
  return { probabilities, labels };
}

function evaluate(labels, base, tree, weight, temperature) {
  let correct = 0, totalLoss = 0;
  for (let index = 0; index < labels.length; index++) {
    const scores = tree[index].map(value => value ** (1 / temperature));
    const sum = scores[0] + scores[1] + scores[2];
    const overall = scores.map((value, move) => (1-weight)*base[index][move] + weight*value/sum);
    const answer = labels[index];
    correct += Number(overall.indexOf(Math.max(...overall)) === answer);
    totalLoss -= Math.log(overall[answer]);
  }
  return { accuracy: correct / labels.length, logLoss: totalLoss / labels.length, rounds: labels.length };
}

const [, , dataset, baseFile, output, ...candidates] = process.argv;
if (!dataset || !baseFile || !output || !candidates.length) throw new Error('Expected dataset, base, output, and one or more candidates');
const corpus = JSON.parse(fs.readFileSync(dataset,'utf8'));
const base = readArtifact(baseFile);
delete base.adaptive;
delete base.evaluation;
const basePredict = predictor(base);
function baseline(split) {
  const saved = process.env.JANKEN_BASELINE_DIR && path.join(process.env.JANKEN_BASELINE_DIR, split + '.baseline');
  if (!saved || !fs.existsSync(saved)) return samples(corpus[split], basePredict);
  const probabilities = [];
  const bytes = fs.readFileSync(saved);
  for(let offset=0;offset<bytes.length;offset+=12){
    probabilities.push([0,4,8].map(index=>bytes.readFloatLE(offset+index)));
  }
  const labels = corpus[split].flatMap(game => [...Buffer.from(game,'base64')].filter(pair=>pair!==255).map(pair=>Math.floor(pair/3)));
  if(labels.length!==probabilities.length) throw new Error('Baseline length mismatch');
  return { probabilities, labels };
}
const valid = baseline('validation');
const baseValidation = evaluate(valid.labels,valid.probabilities,valid.probabilities,0,1);
console.log('baseline validation',baseValidation);
let best;
for (const file of candidates) {
  const tree = readArtifact(file);
  const artifact = {...base, adaptive:{tree,treeWeight:1,temperature:1}};
  const candidate = samples(corpus.validation, predictor(artifact)).probabilities;
  let winner;
  for (const treeWeight of [0.4,0.6,0.75,0.9,1]) {
    for (const temperature of [0.55,0.7,0.85,1,1.2,1.4,1.6,1.8]) {
      const score = evaluate(valid.labels,valid.probabilities,candidate,treeWeight,temperature);
      if (score.logLoss > baseValidation.logLoss) continue;
      if (!winner || score.accuracy > winner.score.accuracy ||
          (score.accuracy === winner.score.accuracy && score.logLoss < winner.score.logLoss)) {
        winner = {score, model:{...base,adaptive:{tree,treeWeight,temperature}}};
      }
    }
  }
  if (!winner) continue;
  console.log(file, 'validation', winner.score, 'weight',winner.model.adaptive.treeWeight,'temperature',winner.model.adaptive.temperature);
  if (!best || winner.score.accuracy > best.score.accuracy ||
      (winner.score.accuracy === best.score.accuracy && winner.score.logLoss < best.score.logLoss)) best = winner;
}
if (!best) throw new Error('No candidate matched baseline calibration on validation');
const test = baseline('test');
const model = best.model;
const proposed = samples(corpus.test, predictor(model));
const baselineTest = evaluate(test.labels,test.probabilities,test.probabilities,0,1);
const testScore = evaluate(test.labels,proposed.probabilities,proposed.probabilities,0,1);
console.log('baseline test', baselineTest, 'selected test', testScore);
if (testScore.accuracy <= baselineTest.accuracy) throw new Error('Selected candidate did not improve test accuracy');
model.evaluation = {validation:best.score, baselineTest, test:testScore};
fs.writeFileSync(output,'globalThis.JankenModelArtifact='+JSON.stringify(model)+';\n');
if (process.env.JANKEN_EXTERNAL_GAMES) {
  const external = JSON.parse(fs.readFileSync(process.env.JANKEN_EXTERNAL_GAMES,'utf8'));
  for (const [name, predict] of [['baseline',basePredict],['selected',predictor(model)]]) {
    const result = samples(external, predict);
    console.log('external '+name, evaluate(result.labels,result.probabilities,result.probabilities,0,1));
  }
}
