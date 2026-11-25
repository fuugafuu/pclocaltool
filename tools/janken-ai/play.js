'use strict';
(() => {
  const storageKey = 'pclocaltool_janken_play_v1';
  const order = ['rock','paper','scissors'];
  const labels = {win:'勝ち',draw:'あいこ',loss:'負け'};
  const engine = window.JankenEngine;
  const learner = window.JankenPlayPolicy;
  const model = window.JankenLearnedModel;
  const policy = model?.playPolicy || { id:'baseline', prior:0, gain:0, decay:0.9 };
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  const memory = Array.isArray(saved?.history)
    ? saved.history.filter(pair=>Number.isInteger(pair)&&pair>=0&&pair<=8).slice(-64) : [];
  let evidence = saved?.policy===policy.id && Number.isFinite(saved?.evidence)
    ? Math.max(-5,Math.min(5,saved.evidence)) : 0;
  const biases = saved?.policy===policy.id && Array.isArray(saved.biases) && saved.biases.length===6 &&
    saved.biases.every(value=>Number.isFinite(value)&&Math.abs(value)<=1) ? saved.biases : Array(6).fill(0);
  const battle = window.JankenOpponent.createSession({
    settings: model?.battlePolicy, network: model?.predictBattleFeatures,
    featureVersion: model?.battleFeatureVersion,
    state: saved?.battle, history: memory
  });
  let lastResult;

  function prepare() {
    const predictions = learner.forecast(model,memory,policy);
    const base = learner.combine(predictions,evidence,policy);
    const periodic = policy.periodic && learner.periodicMove(memory,policy.periodic.confirmations);
    const distribution = learner.calibrate(
      learner.applyPeriod(base,periodic ?? -1,policy.periodic?.strength),memory,biases,policy.calibration);
    const prepared = battle.prepare(distribution);
    return {predictions, distribution, move:window.JankenOpponent.sample(prepared.action)};
  }

  let pending = prepare();
  for (const button of document.querySelectorAll('[data-move]')) {
    button.addEventListener('click', () => {
      const human = order.indexOf(button.dataset.move);
      const ai = order[pending.move];
      const result = engine.moveResult(order[human],ai);
      evidence = learner.observe(pending.predictions,human,evidence,policy);
      learner.trainCalibration(biases,pending.distribution,memory,human,policy.calibration);
      battle.observe(human, pending.move);
      memory.push(human*3+pending.move);
      if (memory.length>64) memory.shift();
      try {
        localStorage.setItem(storageKey,JSON.stringify({
          history:memory,evidence,biases,policy:policy.id,battle:battle.exportState()
        }));
      } catch {}
      lastResult = { ai, result };
      document.getElementById('opponent-move').textContent = engine.ICONS[ai]+' '+engine.LABELS[ai];
      const outcome = document.getElementById('outcome');
      outcome.textContent = labels[result];
      outcome.dataset.result = result;
      pending = prepare();
    });
  }
  window.render_game_to_text = () => JSON.stringify(lastResult || {});
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register(new URL('../../home-sw.js?v=11',location.href),{updateViaCache:'none'}).catch(()=>{});
  }
})();
