'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {forecast,combine,observe,periodicMove,applyPeriod,calibrate,trainCalibration} = require('../tools/janken-ai/play-policy.js');
const adaptiveFeatures = require('../tools/janken-ai/adaptive-features.js');

const [, , neuroFile, newFile, originalFile, treeFile, output] = process.argv;
if (!output) throw new Error('Expected OpenNeuro, v3 and original corpora, tree and output paths');
const runtime = fs.readFileSync(path.join(__dirname,'../tools/janken-ai/model-runtime.js'),'utf8');
function readModel(file) {
  const input = fs.readFileSync(file,'utf8').trim();
  const prefix = 'globalThis.JankenModelArtifact=';
  if (!input.startsWith(prefix) || !input.endsWith(';')) throw new Error('Unexpected model format '+file);
  return JSON.parse(input.slice(prefix.length,-1));
}
const artifact = readModel(path.join(__dirname,'../tools/janken-ai/model.js'));
const tree = readModel(treeFile);
artifact.challenger = {tree,temperature:1};
const env = {JankenModelArtifact:artifact,JankenAdaptiveFeatures:adaptiveFeatures};
new Function('globalThis',runtime)(env);
const model = env.JankenLearnedModel;
if (!model.predictAlternative) throw new Error('The browser runtime rejected the candidate');
const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const neuro = read(neuroFile), fresh = read(newFile), previous = read(originalFile);
const policies = [{id:'baseline',prior:0,gain:0,decay:0.9,temperature:1}];
for (const prior of [0.01,0.03,0.08,0.15,0.30,0.50]) {
  for (const gain of [0,0.3,0.6,1.2,2]) {
    for (const temperature of [0.9,1.2,1.5]) {
      const id = 'ds006761-'+[prior,gain,temperature].join('-');
      policies.push({id,prior,gain,temperature,decay:0.90});
    }
  }
}
for (const confirmations of [6,8,10,12,16]) {
  for (const strength of [0.2,0.4,0.65,0.85]) {
    policies.push({id:'period-'+confirmations+'-'+strength,prior:0,gain:0,temperature:1,decay:0.9,
      periodic:{confirmations,strength}});
  }
}
for (const strength of [-0.8,-0.4,0.2,0.4,0.8,1.2,2]) {
  for (const decay of [0.55,0.75,0.9,0.97]) {
    policies.push({id:'calibration-'+[strength,decay].join('-'),prior:0,gain:0,temperature:1,decay:0.9,
      calibration:{strength,decay}});
  }
}
function temperatureScale(dist, temperature) {
  const adjusted = dist.map(probability=>probability**(1/temperature));
  const total = adjusted.reduce((sum,p)=>sum+p,0);
  return adjusted.map(p=>p/total);
}
function evaluate(games, candidates) {
  const totals = candidates.map(()=>({hits:0,loss:0}));
  const temperatures = [...new Set(candidates.map(policy=>policy.temperature))];
  const confirmations = [...new Set(candidates.flatMap(policy=>policy.periodic ? [policy.periodic.confirmations] : []))];
  let rounds = 0;
  for (const game of games) {
    const history = [];
    const evidence = candidates.map(()=>0);
    const biases = candidates.map(()=>Array(6).fill(0));
    for (const turn of Buffer.from(game,'base64')) {
      if (turn === 255) {
        history.length=0;
        evidence.fill(0);
        for (const bias of biases) bias.fill(0);
        continue;
      }
      const [base,alternative] = forecast(model,history);
      const adjusted = new Map(temperatures.map(value=>[value,temperatureScale(alternative,value)]));
      const periodic = new Map(confirmations.map(value=>[value,periodicMove(history,value)]));
      const actual = Math.floor(turn/3);
      candidates.forEach((policy,index)=>{
        const predictions = [base,adjusted.get(policy.temperature)];
        const blended = combine(predictions,evidence[index],policy);
        const move = periodic.get(policy.periodic?.confirmations) ?? -1;
        const predicted = calibrate(applyPeriod(blended,move,policy.periodic?.strength),history,biases[index],policy.calibration);
        totals[index].hits += Number(predicted.indexOf(Math.max(...predicted))===actual);
        totals[index].loss -= Math.log(predicted[actual]);
        evidence[index] = observe(predictions,actual,evidence[index],policy);
        trainCalibration(biases[index],predicted,history,actual,policy.calibration);
      });
      rounds++;
      history.push(turn);
      if(history.length>64)history.shift();
    }
  }
  if (!rounds) throw new Error('Empty evaluation split');
  return totals.map(result=>({rounds,accuracy:result.hits/rounds,logLoss:result.loss/rounds}));
}

const validation = [];
for (const [name,games] of Object.entries({neuro:neuro.validation,v3:fresh.validation,original:previous.validation})) {
  validation.push(evaluate(games,policies));
  console.log('validation complete',name);
}
const mean = (index,key) => validation.reduce((sum,scores)=>sum+scores[index][key],0)/validation.length;
let best = 0;
for (const index of policies.keys()) {
  const accuracy = mean(index,'accuracy'), loss = mean(index,'logLoss');
  if (loss <= mean(0,'logLoss') + 0.002 &&
      (accuracy > mean(best,'accuracy') || (accuracy === mean(best,'accuracy') && loss < mean(best,'logLoss')))) best = index;
}
const policy = policies[best];
const report = {
  policy,
  validation: {before:{accuracy:mean(0,'accuracy'),logLoss:mean(0,'logLoss')},
               after:{accuracy:mean(best,'accuracy'),logLoss:mean(best,'logLoss')}},
  tests:{}
};
console.log('selected',policy,'validation',report.validation);
for (const [name,games] of Object.entries({neuro:neuro.test,v3:fresh.test,original:previous.test,wxz:fresh.external})) {
  const [before,after] = evaluate(games,[policies[0],policy]);
  report.tests[name]={before,after};
  console.log(name,report.tests[name]);
}
artifact.playPolicy = policy;
if (policy.prior) artifact.challenger = {tree,temperature:policy.temperature};
else delete artifact.challenger;
artifact.playEvaluation = report;
fs.writeFileSync(output+'.json',JSON.stringify(report,null,2));
fs.writeFileSync(output,'globalThis.JankenModelArtifact='+JSON.stringify(artifact)+';\n');
