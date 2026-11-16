'use strict';
(function(root) {
  const uniform = [1/3,1/3,1/3];
  const limits = Object.freeze({min:-5,max:5});
  const clamp = (value, low, high) => Math.max(low,Math.min(high,value));

  function forecast(model, history, policy) {
    return [model?.predict(history) || uniform, policy?.prior !== 0 ? model?.predictAlternative?.(history) : undefined];
  }

  // A period only qualifies when its past predictions all match a recent run.
  function periodicMove(history, confirmations) {
    for (let period = 1; period <= 16 && period + confirmations <= history.length; period++) {
      let offset = history.length - confirmations;
      while (offset < history.length &&
             Math.floor(history[offset] / 3) === Math.floor(history[offset-period] / 3)) offset++;
      if (offset === history.length) return Math.floor(history[offset-period] / 3);
    }
    return -1;
  }

  function applyPeriod(distribution, move, strength) {
    if (move < 0 || !strength) return distribution;
    return distribution.map((probability,index)=>(1-strength)*probability + strength*Number(index===move));
  }

  function calibrate(distribution, history, biases, settings) {
    if (!settings) return distribution;
    const anchor = history.length ? Math.floor(history.at(-1)/3) : 0;
    const weighted = distribution.map((probability,move) =>
      probability*Math.exp(settings.strength*(biases[move]+0.5*biases[3+(move-anchor+3)%3])));
    const total = weighted[0]+weighted[1]+weighted[2];
    return weighted.map(value=>value/total);
  }

  function trainCalibration(biases, predictions, history, actual, settings) {
    if (!settings) return;
    const anchor = history.length ? Math.floor(history.at(-1)/3) : 0;
    for (let move=0;move<3;move++) {
      const error = Number(move===actual)-predictions[move];
      const relative = 3+(move-anchor+3)%3;
      biases[move] = settings.decay*biases[move]+(1-settings.decay)*error;
      biases[relative] = settings.decay*biases[relative]+(1-settings.decay)*error;
    }
  }

  function combine([baseline, alternative], evidence, policy) {
    if (!alternative || !policy.prior) return baseline;
    if (policy.prior === 1) return alternative;
    const logOdds = Math.log(policy.prior/(1-policy.prior)) + policy.gain*evidence;
    const weight = 1/(1+Math.exp(-logOdds));
    return baseline.map((probability, move) => (1-weight)*probability+weight*alternative[move]);
  }

  function observe([baseline, alternative], actual, evidence, policy) {
    if (!alternative) return 0;
    const advantage = Math.log(Math.max(alternative[actual],1e-6)/Math.max(baseline[actual],1e-6));
    return clamp(policy.decay*evidence+advantage,limits.min,limits.max);
  }

  function counter(distribution, random = Math.random) {
    const utility = distribution.map((_, move) => distribution[(move+2)%3]-distribution[(move+1)%3]);
    const best = Math.max(...utility);
    if (best-Math.min(...utility)<0.025 || random()<0.06) return Math.floor(random()*3);
    return utility.indexOf(best);
  }

  const api = {forecast,combine,observe,counter,periodicMove,applyPeriod,calibrate,trainCalibration};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JankenPlayPolicy = api;
})(globalThis);
