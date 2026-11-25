'use strict';
(function(root) {
  const uniform = [1 / 3, 1 / 3, 1 / 3];
  const mod = value => (value + 3) % 3;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const contexts = [
    { first: 0, key: () => 0 },
    { first: 1, key: (a, b) => a.at(-1) },
    { first: 1, key: (a, b) => b.at(-1) },
    { first: 1, key: (a, b) => 3 * a.at(-1) + b.at(-1) },
    { first: 1, key: (a, b) => mod(a.at(-1) - b.at(-1)) },
    { first: 2, key: (a, b) => 3 * a.at(-1) + a.at(-2) },
    { first: 2, key: (a, b) => 3 * b.at(-1) + b.at(-2) },
    { first: 2, key: (a, b) => 27 * a.at(-1) + 9 * b.at(-1) + 3 * a.at(-2) + b.at(-2) },
    { first: 3, key: (a, b) => 9 * a.at(-1) + 3 * a.at(-2) + a.at(-3) },
    { first: 2, key: (a, b) => mod(a.at(-1) - a.at(-2)) },
    { first: 2, key: (a, b) => mod(b.at(-1) - b.at(-2)) },
    { first: 2, key: (a, b) => 3 * mod(a.at(-1) - b.at(-1)) + mod(a.at(-2) - b.at(-2)) },
    { first: 0, key: (a, b, round) => round % 3 },
    { first: 0, key: (a, b, round) => round % 2 }
  ];
  const defaults = Object.freeze({
    scoreDecay: 0.94, scoreRate: 0.65, smoothing: 0.35,
    exploration: 0.06, evidenceScale: 3, temperature: 0.16, defense: 2.5,
    specialistWeight: 0, drawPenalty: 0, contextWeight: 0
  });
  const periods = Array.from({ length: 23 }, (_, i) => i + 2);
  const windows = [4, 6, 9, 13, 19, 27, 39, 56];
  const specialistCount = periods.length + windows.length * 3 + 1;
  const contextCount = 5;

  function contextForecasts(own, opponent) {
    const n = own.length;
    const counts = Array.from({ length: contextCount }, () => [0.38, 0.38, 0.38]);
    if (n < 2) return counts.map(normalize);
    const recentResult = mod(opponent[n - 1] - own[n - 1]);
    for (let end = n - 2; end >= Math.max(0, n - 96); end--) {
      const recency = 0.976 ** (n - 2 - end);
      const offset = mod(opponent[n - 1] - opponent[end]);
      let opponentLength = 0, ownLength = 0, jointLength = 0, relativeLength = 0;
      for (let lag = 0; lag < Math.min(6, end + 1); lag++) {
        const recent = n - 1 - lag, previous = end - lag;
        const opponentMatch = opponent[recent] === opponent[previous];
        const ownMatch = own[recent] === own[previous];
        if (opponentLength === lag && opponentMatch) opponentLength++;
        if (ownLength === lag && ownMatch) ownLength++;
        if (jointLength === lag && opponentMatch && ownMatch) jointLength++;
        if (relativeLength === lag && mod(opponent[recent] - opponent[previous]) === offset &&
            mod(own[recent] - own[previous]) === offset) relativeLength++;
      }
      const next = opponent[end + 1];
      if (opponentLength >= 2) counts[0][next] += recency * opponentLength;
      if (ownLength >= 2) counts[1][next] += recency * ownLength;
      if (jointLength >= 2) counts[2][next] += recency * jointLength * 2;
      if (relativeLength >= 2) counts[3][mod(next + offset)] += recency * relativeLength * 2;
      if (recentResult === mod(opponent[end] - own[end])) {
        counts[4][mod(next + offset)] += recency * (relativeLength >= 2 ? 2 : 0.5);
      }
    }
    return counts.map(normalize);
  }
  function specialists(own, opponent) {
    const predictions = [];
    for (const period of periods) {
      const counts = [0.22, 0.22, 0.22];
      let weight = 1;
      for (let i = opponent.length - period; i >= 0 && weight > 0.09; i -= period) {
        counts[opponent[i]] += weight;
        weight *= 0.82;
      }
      predictions.push(normalize(counts));
    }
    const counts = [0, 0, 0];
    let offset = 0;
    for (const window of windows) {
      const length = Math.min(own.length, window);
      while (offset < length) counts[own[own.length - 1 - offset++]]++;
      const favorite = counts.indexOf(Math.max(...counts));
      for (let rotation = 0; rotation < 3; rotation++) {
        const guess = mod(favorite + rotation);
        predictions.push(length >= 3 ? [0, 1, 2].map(move => move === guess ? 0.8 : 0.1) : uniform);
      }
    }
    const joint = [0.4, 0.4, 0.4];
    let weight = 1;
    for (let i = opponent.length - 2; i >= 0 && weight > 0.08; i--) {
      if (opponent[i] === opponent.at(-1) && own[i] === own.at(-1)) joint[opponent[i + 1]] += weight;
      weight *= 0.985;
    }
    predictions.push(normalize(joint));
    return predictions;
  }

  function normalize(values) {
    if (!Array.isArray(values) || values.length !== 3 ||
        !values.every(value => Number.isFinite(value) && value >= 0)) return uniform.slice();
    const sum = values[0] + values[1] + values[2];
    return sum > 0 ? values.map(value => value / sum) : uniform.slice();
  }

  function random() {
    if (root.crypto?.getRandomValues) {
      return root.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    }
    return Math.random();
  }

  function sample(probabilities, draw = random) {
    const value = draw();
    return value < probabilities[0] ? 0 : value < probabilities[0] + probabilities[1] ? 1 : 2;
  }

  function createSession(options = {}) {
    const settings = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const value = options.settings?.[key];
      if (Number.isFinite(value)) settings[key] = value;
    }
    settings.scoreDecay = clamp(settings.scoreDecay, 0.5, 0.995);
    settings.scoreRate = clamp(settings.scoreRate, 0.1, 2);
    settings.smoothing = clamp(settings.smoothing, 0.1, 2);
    settings.exploration = clamp(settings.exploration, 0.02, 0.9);
    settings.evidenceScale = clamp(settings.evidenceScale, 0.5, 20);
    settings.temperature = clamp(settings.temperature, 0.03, 1);
    settings.defense = clamp(settings.defense, 0, 8);
    settings.specialistWeight = clamp(settings.specialistWeight, 0, 1);
    settings.drawPenalty = clamp(settings.drawPenalty, 0, 0.5);
    settings.contextWeight = clamp(settings.contextWeight, 0, 1);
    const own = [], opponent = [], history = [];
    const tables = [];
    for (const perspective of [0, 1]) {
      for (const decay of [0.8, 0.97]) {
        for (const context of contexts) tables.push({ perspective, decay, context, counts: new Map() });
      }
    }
    const expertCount = tables.length * 3;
    const scores = new Float64Array(expertCount + 3);
    const accuracies = new Float64Array(expertCount + 3).fill(1 / 3);
    const useContexts = settings.contextWeight > 0 || options.featureVersion === 3;
    const specialistScores = new Float64Array(specialistCount + (useContexts ? contextCount : 0));
    let baseScore = 0;
    const useSpecialists = settings.specialistWeight > 0 || options.featureVersion >= 2 || useContexts;
    let round = 0, predictiveEdge = 0, payoff = 0, pending;

    function expertForecasts() {
      const predictions = [];
      const masses = [];
      for (const table of tables) {
        const a = table.perspective ? own : opponent;
        const b = table.perspective ? opponent : own;
        const entry = round >= table.context.first && table.counts.get(table.context.key(a, b, round));
        const factor = entry ? table.decay ** (round - entry[3]) : 0;
        const mass = entry ? factor * (entry[0] + entry[1] + entry[2]) : 0;
        const distribution = entry ? entry.slice(0, 3).map(value =>
          (factor * value + settings.smoothing) / (mass + 3 * settings.smoothing)) : uniform;
        for (let rotation = 0; rotation < 3; rotation++) {
          predictions.push([0, 1, 2].map(move => distribution[mod(move - rotation)]));
          masses.push(mass);
        }
      }
      return { predictions, masses };
    }

    function featureRows(forecasts) {
      return [0, 1, 2].map(move => {
        const row = [Math.min(round, 256) / 64, predictiveEdge / 8, payoff];
        forecasts.predictions.forEach((distribution, index) => {
          row.push(distribution[move], clamp(scores[index], -12, 12) / 12,
            accuracies[index], Math.min(forecasts.masses[index], 32) / 32);
        });
        return row;
      });
    }

    function prepare(prior) {
      if (pending) return pending.public;
      const forecasts = expertForecasts();
      const extra = useSpecialists ? specialists(own, opponent) : [];
      const extraWeights = extra.map((_, index) => Math.exp(clamp(specialistScores[index], -12, 12)));
      const extraTotal = extraWeights.reduce((sum, weight) => sum + weight, 0);
      const specialist = extra.length ? [0, 1, 2].map(move =>
        extra.reduce((sum, distribution, index) => sum + extraWeights[index] * distribution[move], 0) / extraTotal) : uniform;
      const relativeEvidence = extra.length ? Math.log(extraTotal / extra.length) - baseScore : 0;
      const contexts = useContexts ? contextForecasts(own, opponent) : [];
      const contextScores = specialistScores.subarray(specialistCount);
      const contextWeights = contexts.map((_, index) => Math.exp(clamp(contextScores[index], -12, 12)));
      const contextTotal = contextWeights.reduce((sum, weight) => sum + weight, 0);
      const contextEvidence = contexts.length ? Math.log(contextTotal / contexts.length) - baseScore : 0;
      const contextForecast = contexts.length ? [0, 1, 2].map(move =>
        contexts.reduce((sum, distribution, index) => sum + contextWeights[index] * distribution[move], 0) / contextTotal) : uniform;
      const rows = featureRows(forecasts);
      if (options.featureVersion >= 2) {
        rows.forEach((row, move) => row.push(specialist[move], clamp(relativeEvidence, -12, 12) / 12));
      }
      if (options.featureVersion === 3) {
        rows.forEach((row, move) => {
          for (const probabilities of contexts) row.push(probabilities[move]);
          row.push(contextForecast[move], clamp(contextEvidence, -12, 12) / 12);
        });
      }
      const learned = typeof options.network === 'function' ? normalize(options.network(rows)) : uniform;
      const predictions = forecasts.predictions.concat([uniform, normalize(prior), learned]);
      const weights = predictions.map((_, index) =>
        Math.exp(settings.scoreRate * clamp(scores[index], -14, 14)));
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      const base = [0, 1, 2].map(move =>
        predictions.reduce((sum, distribution, index) => sum + weights[index] * distribution[move], 0) / total);
      const trust = extra.length ? settings.specialistWeight / (1 + Math.exp(2 - relativeEvidence)) : 0;
      const contextTrust = contexts.length ? settings.contextWeight /
        (1 + Math.exp(2 + Math.max(0, relativeEvidence) - contextEvidence)) : 0;
      const forecast = base.map((value, move) => (1 - contextTrust) *
        ((1 - trust) * value + trust * specialist[move]) + contextTrust * contextForecast[move]);
      const utility = [0, 1, 2].map(move =>
        forecast[mod(move - 1)] - forecast[mod(move + 1)] - settings.drawPenalty * forecast[move]);
      const maximum = Math.max(...utility);
      const sharpened = utility.map(value => Math.exp((value - maximum) / settings.temperature));
      const sum = sharpened[0] + sharpened[1] + sharpened[2];
      const confidence = clamp(predictiveEdge / settings.evidenceScale, 0, 1);
      const safety = clamp(-payoff * settings.defense, 0, 1);
      const exploitation = (1 - settings.exploration) * confidence * (1 - safety);
      const action = sharpened.map(value => exploitation * value / sum + (1 - exploitation) / 3);
      const visible = Object.freeze({ forecast: Object.freeze(forecast), action: Object.freeze(action) });
      pending = { predictions, public: visible, rows, base, extra: extra.concat(contexts) };
      return visible;
    }

    function observe(enemyMove, ourMove) {
      if (!Number.isInteger(enemyMove) || enemyMove < 0 || enemyMove > 2 ||
          !Number.isInteger(ourMove) || ourMove < 0 || ourMove > 2) throw new Error('Invalid committed Janken hand');
      if (!pending) prepare();
      const { predictions, public: result } = pending;
      if (pending.extra.length) {
        baseScore = 0.96 * baseScore + Math.log(3 * pending.base[enemyMove]);
        pending.extra.forEach((distribution, index) => {
          specialistScores[index] = 0.96 * specialistScores[index] + Math.log(3 * distribution[enemyMove]);
        });
      }
      for (let index = 0; index < predictions.length; index++) {
        const distribution = predictions[index];
        scores[index] = settings.scoreDecay * scores[index] +
          Math.log(3 * Math.max(distribution[enemyMove], 1e-6));
        const maximum = Math.max(...distribution);
        const ties = distribution.filter(value => value === maximum).length;
        accuracies[index] = settings.scoreDecay * accuracies[index] +
          (1 - settings.scoreDecay) * Number(distribution[enemyMove] === maximum) / ties;
      }
      predictiveEdge = settings.scoreDecay * predictiveEdge +
        Math.log(3 * Math.max(result.forecast[enemyMove], 1e-6));
      const reward = ourMove === enemyMove ? 0 : mod(ourMove - enemyMove) === 1 ? 1 : -1;
      payoff = 0.95 * payoff + 0.05 * reward;
      for (const table of tables) {
        if (round < table.context.first) continue;
        const a = table.perspective ? own : opponent;
        const b = table.perspective ? opponent : own;
        const key = table.context.key(a, b, round);
        let entry = table.counts.get(key);
        if (!entry) { entry = [0, 0, 0, round]; table.counts.set(key, entry); }
        const factor = table.decay ** (round - entry[3]);
        for (let move = 0; move < 3; move++) entry[move] *= factor;
        entry[table.perspective ? ourMove : enemyMove]++;
        entry[3] = round;
      }
      own.push(ourMove);
      opponent.push(enemyMove);
      if (own.length > 256) { own.shift(); opponent.shift(); }
      history.push(enemyMove * 3 + ourMove);
      if (history.length > 512) history.shift();
      round++;
      pending = undefined;
    }

    function trainingFeatures() {
      if (!pending) prepare();
      return pending.rows;
    }

    function exportState() {
      return {
        version: 1, round, history: history.slice(), predictiveEdge, payoff,
        specialists: useSpecialists ? { scores: Array.from(specialistScores), base: baseScore } : undefined,
        scores: Array.from(scores), accuracies: Array.from(accuracies),
        tables: tables.map(table => [...table.counts].map(([key, entry]) => [key, ...entry]))
      };
    }

    function restore(state) {
      const finite = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
      const valid = state?.version === 1 && Number.isInteger(state.round) && finite(state.round, 0, 1e9) &&
        Array.isArray(state.history) && state.history.length === Math.min(state.round, 512) &&
        state.history.every(pair => Number.isInteger(pair) && pair >= 0 && pair <= 8) &&
        finite(state.predictiveEdge, -10000, 10000) && finite(state.payoff, -1, 1) &&
        Array.isArray(state.scores) && state.scores.length === scores.length &&
        state.scores.every(value => finite(value, -10000, 10000)) &&
        Array.isArray(state.accuracies) && state.accuracies.length === accuracies.length &&
        state.accuracies.every(value => finite(value, 0, 1)) &&
        Array.isArray(state.tables) && state.tables.length === tables.length &&
        state.tables.every(entries => Array.isArray(entries) && entries.length <= 81 &&
          new Set(entries.map(entry => entry?.[0])).size === entries.length &&
          entries.every(entry => Array.isArray(entry) && entry.length === 5 &&
            Number.isInteger(entry[0]) && finite(entry[0], 0, 80) &&
            entry.slice(1, 4).every(value => finite(value, 0, 1e6)) &&
            Number.isInteger(entry[4]) && finite(entry[4], 0, state.round)));
      if (!valid) return false;
      round = state.round;
      history.push(...state.history);
      for (const pair of history.slice(-256)) { opponent.push(Math.floor(pair / 3)); own.push(pair % 3); }
      scores.set(state.scores);
      accuracies.set(state.accuracies);
      predictiveEdge = state.predictiveEdge;
      payoff = state.payoff;
      const auxiliary = state.specialists;
      if (Array.isArray(auxiliary?.scores) &&
          (auxiliary.scores.length === specialistScores.length || auxiliary.scores.length === specialistCount) &&
          auxiliary.scores.every(value => finite(value, -10000, 10000)) &&
          finite(auxiliary.base, -10000, 10000)) {
        specialistScores.set(auxiliary.scores);
        baseScore = auxiliary.base;
      }
      state.tables.forEach((entries, index) => {
        for (const [key, ...entry] of entries) tables[index].counts.set(key, entry);
      });
      return true;
    }

    if (!restore(options.state) && Array.isArray(options.history)) {
      for (const pair of options.history.slice(-128)) {
        if (Number.isInteger(pair) && pair >= 0 && pair <= 8) observe(Math.floor(pair / 3), pair % 3);
      }
    }

    return {
      prepare, observe, trainingFeatures, exportState,
      exportHistory: () => history.slice(),
      diagnostics: () => ({ rounds: round, predictiveEdge, payoff, experts: expertCount + 3 })
    };
  }

  const api = { createSession, sample, normalize, defaults };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JankenOpponent = api;
})(globalThis);
