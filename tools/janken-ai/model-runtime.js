'use strict';
(() => {
  const artifact = globalThis.JankenModelArtifact;
  if (artifact?.schema !== 1) return;
  globalThis.JankenModelArtifact = undefined;

  const uniform = [1 / 3, 1 / 3, 1 / 3];
  const decode = data => Uint8Array.from(atob(data), character => character.charCodeAt(0));
  function densePredictor(model) {
    if (!Number.isInteger(model.history) || model.history < 1 || model.history > 32) return;
    return quantizedPredictor(model, model.history * 10, 3, model.history);
  }

  function quantizedPredictor(model, inputWidth, outputWidth, oneHotHistory = 0) {
    if (!Array.isArray(model.layers) || model.layers.length < 2 || model.layers.length > 8) return;
    let expected = inputWidth;
    const layers = model.layers.map(layer => {
      if (layer.cols !== expected || !Number.isInteger(layer.rows) || layer.rows < 1 || layer.rows > 512 ||
          layer.scales?.length !== layer.rows || !layer.scales.every(value => Number.isFinite(value) && value > 0) ||
          layer.bias?.length !== layer.rows || !layer.bias.every(Number.isFinite)) throw new Error('Invalid Janken layer');
      expected = layer.rows;
      const packed = decode(layer.packed);
      if (packed.length !== Math.ceil(layer.rows * layer.cols / 2)) throw new Error('Invalid Janken weights');
      const weights = new Float32Array(layer.rows * layer.cols);
      for (let index = 0; index < weights.length; index++) {
        const code = (packed[index >> 1] >> ((index & 1) * 4)) & 15;
        weights[index] = (code - 8) * layer.scales[Math.floor(index / layer.cols)];
      }
      return { rows: layer.rows, cols: layer.cols, bias: layer.bias, weights };
    });
    if (expected !== outputWidth) return;
    return data => {
      let input = data;
      for (const [index, { rows, cols, bias, weights }] of layers.entries()) {
        const output = new Float32Array(rows);
        for (let row = 0; row < rows; row++) {
          let value = bias[row];
          const offset = row * cols;
          if (index === 0 && oneHotHistory) {
            for (let lag = 0; lag < oneHotHistory; lag++) {
              value += weights[offset + lag * 10 + (data[data.length - 1 - lag] ?? 9)];
            }
          } else {
            for (let col = 0; col < cols; col++) value += weights[offset + col] * input[col];
          }
          output[row] = index === layers.length - 1 ? value : Math.max(0, value);
        }
        input = output;
      }
      return input;
    };
  }

  function candidatePredictor(model) {
    const features = globalThis.JankenAdaptiveFeatures;
    const version = model?.featureVersion;
    if (model?.kind !== 'candidate-int4' || ![2,5].includes(version) || typeof features !== 'function' ||
        (version === 5 && !features.opponentExperts)) return;
    const width = features([], version)[0].length;
    if (model.mean?.length !== width || model.scale?.length !== width ||
        !model.mean.every(Number.isFinite) || !model.scale.every(value => Number.isFinite(value) && value > 0)) return;
    const infer = quantizedPredictor(model, width, 1);
    if (!infer) return;
    return (history, rows = features(history, version)) => rows.map(row => {
      const input = new Float32Array(width);
      for (let index = 0; index < width; index++) {
        input[index] = Math.max(-12, Math.min(12, (Math.fround(row[index]) - model.mean[index]) / model.scale[index]));
      }
      return infer(input)[0];
    });
  }

  function sparseKeys(pairs) {
    const end = pairs.length;
    const keys = [0, 1 + Math.min(4, Math.floor(Math.log2(end + 1)))];
    if (!end) return keys;
    let moves = 0, combined = 0, outcomes = 0, streak = 0;
    const last = Math.floor(pairs[end - 1] / 3);
    for (let lag = 1; lag <= Math.min(6, end); lag++) {
      const pair = pairs[end - lag];
      const human = Math.floor(pair / 3);
      if (human === last && streak === lag - 1) streak++;
      moves = moves * 3 + human;
      combined = combined * 9 + pair;
      outcomes = outcomes * 3 + (human - pair % 3 + 3) % 3;
      keys.push(16 + ((Math.imul(moves + 13, 19349663) ^ Math.imul(lag, 83492791)) >>> 0) % 1008);
      if (lag <= 4) keys.push(1024 + ((Math.imul(combined + 19, 73856093) ^ Math.imul(lag, 19349663)) & 2047));
      if (lag <= 3) keys.push(3072 + ((Math.imul(outcomes + 11, 83492791) ^ Math.imul(lag, 73856093)) & 511));
    }
    keys.push(3584 + last * 6 + streak);
    return keys;
  }

  function sparsePredictor(model) {
    const packed = decode(model.packed);
    if (packed.length !== 4096 * 3 || !Number.isFinite(model.scale) || model.scale <= 0) return;
    const weights = new Int8Array(packed.buffer);
    return (_history, keys) => {
      const result = [0, 0, 0];
      for (const key of keys) {
        for (let move = 0; move < 3; move++) result[move] += weights[key * 3 + move] * model.scale;
      }
      return result;
    };
  }

  function basePredictor(model) {
    if (model?.kind === 'dense-int4') return densePredictor(model);
    if (model?.kind === 'sparse-int8') return sparsePredictor(model);
    if (model?.kind === 'ensemble' && Number.isFinite(model.studentWeight) &&
        model.studentWeight > 0 && model.studentWeight < 1) {
      const sparse = sparsePredictor(model.sparse);
      const dense = densePredictor(model.student);
      const mix = model.studentWeight;
      if (sparse && dense) return (history, keys) => {
        const first = sparse(history, keys);
        const second = dense(history);
        return first.map((value, move) => (1 - mix) * value + mix * second[move]);
      };
    }
  }

  function adaptivePredictor(tree) {
    const featureRows = globalThis.JankenAdaptiveFeatures;
    if (typeof featureRows !== 'function' || tree?.kind !== 'adaptive-tree' ||
        !Array.isArray(tree.depths) || !Array.isArray(tree.features) ||
        !Array.isArray(tree.thresholds) || !Number.isFinite(tree.scale) ||
        !Number.isFinite(tree.bias)) return;
    const version = tree.featureVersion ?? 1;
    if (![1,2,3,4,5].includes(version) || (version >= 4 && !featureRows.supportsSequenceEvidence) ||
        (version === 5 && !featureRows.opponentExperts)) return;
    const width = featureRows([],version)[0].length;
    let splitCount = 0, leafCount = 0;
    for (const depth of tree.depths) {
      if (!Number.isInteger(depth) || depth < 0 || depth > 12) return;
      splitCount += depth;
      leafCount += 1 << depth;
    }
    if (tree.features.length !== splitCount || tree.thresholds.length !== splitCount ||
        tree.features.some(id => !Number.isInteger(id) || id < 0 || id >= width) ||
        tree.thresholds.some(value => !Number.isFinite(value))) return;
    const bytes = decode(tree.weights);
    if (bytes.length !== leafCount * 2) return;
    const weights = new DataView(bytes.buffer);
    const thresholds = Float32Array.from(tree.thresholds);
    return (history, rows = featureRows(history, version)) => rows.map(row => {
      let split = 0, offset = 0, sum = 0;
      for (const depth of tree.depths) {
        let leaf = 0;
        for (let bit = 0; bit < depth; bit++, split++) {
          if (Math.fround(row[tree.features[split]]) > thresholds[split]) leaf |= 1 << bit;
        }
        sum += weights.getInt16((offset + leaf) * 2, true);
        offset += 1 << depth;
      }
      return sum * tree.scale + tree.bias;
    });
  }

  let logits, treeLogits, candidateLogits;
  const adaptive = artifact.adaptive;
  const { treeWeight = 0, temperature = 1 } = adaptive || {};
  try {
    logits = basePredictor(artifact);
  } catch {
    return;
  }
  if (!logits) return;
  if (treeWeight > 0 && treeWeight <= 1 && Number.isFinite(temperature) && temperature > 0) {
    try { treeLogits = adaptivePredictor(adaptive.tree); } catch {}
  }
  const { student, weight: studentWeight = 0 } = artifact.routed || {};
  if (studentWeight > 0 && studentWeight <= 1) {
    try { candidateLogits = candidatePredictor(student); } catch {}
  }
  const { tree: challengerTree, temperature: challengerTemperature } = artifact.challenger || {};
  let challengerLogits;
  if (Number.isFinite(challengerTemperature) && challengerTemperature > 0) {
    try { challengerLogits = adaptivePredictor(challengerTree); } catch {}
  }
  const predictAlternative = challengerLogits && (history =>
    softmax(challengerLogits(history).map(value => value / challengerTemperature)));
  const refinement = artifact.refinement;
  const refinementWeight = refinement?.weight;
  let refinementLogits;
  if (refinementWeight > 0 && refinementWeight <= 1) {
    try { refinementLogits = adaptivePredictor(refinement.tree); } catch {}
  }
  // Each feature version appends columns, so inference can share the largest row.
  const buildFeatures = globalThis.JankenAdaptiveFeatures;
  const followup = artifact.followup;
  const followupWeight = followup?.weight;
  const followupTemperature = Number.isFinite(followup?.temperature) && followup.temperature > 0
    ? followup.temperature : 1;
  let followupLogits;
  const useExperts = followup?.kind === 'online-experts' && followupWeight > 0 && followupWeight <= 1 &&
    Number.isInteger(followup.scale) && followup.scale >= 0 && followup.scale < 3 &&
    Number.isFinite(followup.threshold) && buildFeatures?.opponentExperts && buildFeatures.blendOpponent;
  if (followupWeight > 0 && followupWeight <= 1) {
    try {
      if (followup.kind === 'tree') followupLogits = adaptivePredictor(followup.model);
      if (followup.kind === 'network') followupLogits = candidatePredictor(followup.model);
    } catch {}
  }
  const featureVersion = Math.max(followupLogits ? followup.model.featureVersion ?? 1 : 0,
    refinementLogits ? refinement.tree.featureVersion ?? 1 : 0,
    treeLogits ? adaptive.tree.featureVersion ?? 1 : 0, candidateLogits ? student.featureVersion : 0);
  const period = refinement?.period;
  const usePeriod = Number.isInteger(period?.confirmations) && period.confirmations >= 6 &&
    period.strength > 0 && period.strength <= 0.95;

  function periodicPrediction(history, confirmations) {
    const end = history.length;
    for (let lag = 1; lag <= 16 && lag + confirmations <= end; lag++) {
      let index = end - confirmations;
      while (index < end && Math.floor(history[index] / 3) === Math.floor(history[index - lag] / 3)) index++;
      if (index === end) return Math.floor(history[end - lag] / 3);
    }
    return -1;
  }

  function distribution(history, keys, residual) {
    const scores = logits(history, keys);
    for (const key of keys) {
      for (let move = 0; move < 3; move++) scores[move] += residual[key * 3 + move];
    }
    return softmax(scores);
  }

  function softmax(scores) {
    const max = Math.max(...scores);
    const values = Array.from(scores, value => Math.exp(value - max));
    const sum = values.reduce((a, b) => a + b, 0);
    return sum > 0 && Number.isFinite(sum) ? values.map(value => value / sum) : uniform;
  }

  function createSession() {
    const history = [];
    const residual = new Float32Array(4096 * 3);
    function currentDistribution(rows) {
      const weight = treeLogits ? treeWeight : 0;
      if (weight === 1) return softmax(treeLogits(history, rows).map(score => score / temperature));
      const base = distribution(history, sparseKeys(history), residual);
      if (!weight) return base;
      const tree = softmax(treeLogits(history, rows).map(score => score / temperature));
      return base.map((value, move) => (1 - weight) * value + weight * tree[move]);
    }
    function priorPrediction(rows) {
      if (!candidateLogits) return currentDistribution(rows);
      const candidate = softmax(candidateLogits(history, rows));
      if (studentWeight === 1) return candidate;
      return currentDistribution(rows).map((value, move) => (1 - studentWeight) * value + studentWeight * candidate[move]);
    }
    function predict() {
      const rows = featureVersion ? buildFeatures(history, featureVersion) : undefined;
      const updated = followupLogits && softmax(
        followupLogits(history, rows).map(score => score / followupTemperature));
      if (updated && followupWeight === 1) return updated;
      const refined = refinementLogits && softmax(refinementLogits(history, rows));
      let prediction = refined && refinementWeight === 1 ? refined : priorPrediction(rows);
      if (refined && refinementWeight < 1) {
        prediction = prediction.map((value, move) =>
          (1 - refinementWeight) * value + refinementWeight * refined[move]);
      }
      if (usePeriod) {
        const expected = periodicPrediction(history, period.confirmations);
        if (expected >= 0) prediction = prediction.map((value, move) =>
          (1 - period.strength) * value + period.strength * Number(move === expected));
      }
      if (updated) return buildFeatures.blendLearned(prediction, updated, followup);
      return useExperts ? buildFeatures.blendOpponent(prediction,
        buildFeatures.opponentExperts(history, [followup.scale])[0], followup) : prediction;
    }
    function observe(pair) {
      if ((followupLogits && followupWeight === 1) || (refinementLogits && refinementWeight === 1) || (candidateLogits && studentWeight === 1) ||
          (treeLogits && treeWeight === 1)) {
        history.push(pair);
        return;
      }
      const keys = sparseKeys(history);
      const probabilities = distribution(history, keys, residual);
      const actual = Math.floor(pair / 3);
      const step = 0.36 / Math.sqrt(keys.length);
      for (const key of keys) {
        for (let move = 0; move < 3; move++) {
          const offset = key * 3 + move;
          residual[offset] += step * (Number(move === actual) - probabilities[move] - 0.30 * residual[offset]);
        }
      }
      history.push(pair);
    }
    return { predict, observe, clearHistory: () => { history.length = 0; } };
  }

  function predict(pairs) {
    const session = createSession();
    for (const pair of pairs) session.observe(pair);
    return session.predict();
  }

  globalThis.JankenLearnedModel = Object.freeze({
    predict, predictAlternative, playPolicy: artifact.playPolicy,
    createSession, kind: refinementLogits ? 'sequence-refined' :
      candidateLogits ? 'routed-distilled' : treeLogits ? 'adaptive-hybrid' : artifact.kind
  });
})();
