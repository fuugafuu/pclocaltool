'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const features = require('../tools/janken-ai/adaptive-features.js');

const [, , newData, oldData, studentFile, output] = process.argv;
if (!newData || !oldData || !studentFile || !output) throw new Error('Expected new corpus, original corpus, student JSON and output path');
const toolDir = path.join(__dirname, '../tools/janken-ai');
const code = fs.readFileSync(path.join(toolDir, 'model-runtime.js'), 'utf8');
const modelFile = fs.readFileSync(path.join(toolDir,'model.js'),'utf8').trim();
const base = JSON.parse(modelFile.slice('globalThis.JankenModelArtifact='.length,-1));
delete base.routed;
const initialize = new Function('globalThis', code);
function predictor(artifact) {
  const env = {JankenModelArtifact:artifact,JankenAdaptiveFeatures:features};
  initialize(env);
  return env.JankenLearnedModel;
}
const previous = predictor(base);
function forecasts(games, predict) {
  const probabilities = [], labels = [];
  for (const encoded of games) {
    const history = [];
    for (const code of Buffer.from(encoded,'base64')) {
      if (code === 255) {
        history.length = 0;
        continue;
      }
      probabilities.push(predict(history));
      labels.push(Math.floor(code / 3));
      history.push(code);
      if (history.length > 64) history.shift();
    }
  }
  return { probabilities, labels };
}

function evaluate(baseline, candidate, weights) {
  const results = weights.map(() => ({hits:0,loss:0}));
  const rounds = baseline.labels.length;
  if (!rounds) throw new Error('Empty evaluation split');
  for (let sample=0;sample<rounds;sample++) {
    const expected = baseline.labels[sample];
    weights.forEach((weight,index) => {
      const mixed = baseline.probabilities[sample].map((probability,move) =>
        (1-weight)*probability + weight*candidate.probabilities[sample][move]);
      results[index].hits += Number(mixed.indexOf(Math.max(...mixed)) === expected);
      results[index].loss -= Math.log(mixed[expected]);
    });
  }
  return results.map(({hits,loss}) => ({rounds,accuracy:hits/rounds,logLoss:loss/rounds}));
}

const fresh = JSON.parse(fs.readFileSync(newData,'utf8'));
const original = JSON.parse(fs.readFileSync(oldData,'utf8'));
const groups = {freshValidation:fresh.validation, originalValidation:original.validation,
  newTest:fresh.test, originalTest:original.test, external:fresh.external};
const digest = createHash('sha256').update(code)
  .update(fs.readFileSync(path.join(toolDir,'adaptive-features.js')))
  .update(JSON.stringify({base,groups})).digest('hex');
const cachedBaseline = output + '.baseline.json';
function baseline() {
  if (fs.existsSync(cachedBaseline)) {
    const saved = JSON.parse(fs.readFileSync(cachedBaseline,'utf8'));
    if (saved.digest === digest) return saved.splits;
  }
  const splits = {};
  for (const [name,games] of Object.entries(groups)) {
    splits[name] = forecasts(games, previous.predict);
    console.log('baseline',name,splits[name].labels.length);
  }
  fs.writeFileSync(cachedBaseline,JSON.stringify({digest,splits}));
  return splits;
}
const current = baseline();
if (studentFile === '--baseline') process.exit(0);
const student = JSON.parse(fs.readFileSync(studentFile, 'utf8'));
const routed = predictor({...base, routed:{student,weight:1}});
if (routed.kind !== 'routed-distilled') throw new Error('The browser runtime rejected the student');
const evaluateSplit = (name, weights) => evaluate(current[name], forecasts(groups[name],routed.predict),weights);
const weights = [0,0.10,0.20,0.35,0.50,0.75,1];
const freshValidation = evaluateSplit('freshValidation', weights);
console.log('new validation',freshValidation);
const originalValidation = evaluateSplit('originalValidation', weights);
console.log('original validation',originalValidation);
let best = 0;
const accuracy = index => (freshValidation[index].accuracy + originalValidation[index].accuracy) / 2;
const loss = index => (freshValidation[index].logLoss + originalValidation[index].logLoss) / 2;
for (const index of weights.keys()) {
  if (accuracy(index) >= accuracy(0) && loss(index) < loss(best)) best = index;
}
const selectedWeight = weights[best];
const report = {selectedWeight, freshValidation, originalValidation};
console.log('selected weight', selectedWeight);
for (const name of ['newTest','originalTest','external']) {
  const [before,after] = evaluateSplit(name,[0,selectedWeight]);
  report[name] = {before,after};
  console.log(name,report[name]);
}
fs.writeFileSync(output + '.json', JSON.stringify(report,null,2));
const artifact = selectedWeight > 0 ? {...base,routed:{student,weight:selectedWeight},routedEvaluation:report} : base;
fs.writeFileSync(output,'globalThis.JankenModelArtifact='+JSON.stringify(artifact)+';\n');
