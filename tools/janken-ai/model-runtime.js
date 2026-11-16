'use strict';
(() => {
  const artifact = globalThis.JankenModelArtifact;
  if (artifact?.schema !== 1) return;
  globalThis.JankenModelArtifact = undefined;

  const uniform = [1 / 3, 1 / 3, 1 / 3];
  const decode = data => Uint8Array.from(atob(data), character => character.charCodeAt(0));
  function densePredictor(model) {
    if (!Number.isInteger(model.history) || model.history < 1 || model.history > 32 ||
        !Array.isArray(model.layers) || model.layers.length < 2 || model.layers.length > 8) return;
    let expected = model.history * 10;
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
    if (expected !== 3) return;
    return history => {
      let input;
      for (const [index, { rows, cols, bias, weights }] of layers.entries()) {
        const output = new Float32Array(rows);
        for (let row = 0; row < rows; row++) {
          let value = bias[row];
          const offset = row * cols;
          if (index === 0) {
            for (let lag = 0; lag < model.history; lag++) {
              value += weights[offset + lag * 10 + (history[history.length - 1 - lag] ?? 9)];
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

  let logits;
  try {
    if (artifact.kind === 'dense-int4') logits = densePredictor(artifact);
    if (artifact.kind === 'sparse-int8') logits = sparsePredictor(artifact);
    if (artifact.kind === 'ensemble' && Number.isFinite(artifact.studentWeight) &&
        artifact.studentWeight > 0 && artifact.studentWeight < 1) {
      const sparse = sparsePredictor(artifact.sparse);
      const dense = densePredictor(artifact.student);
      const mix = artifact.studentWeight;
      if (sparse && dense) logits = (history, keys) => {
        const first = sparse(history, keys);
        const second = dense(history);
        return first.map((value, move) => (1 - mix) * value + mix * second[move]);
      };
    }
  } catch {
    return;
  }
  if (!logits) return;

  function distribution(history, keys, residual) {
    const scores = logits(history, keys);
    for (const key of keys) {
      for (let move = 0; move < 3; move++) scores[move] += residual[key * 3 + move];
    }
    const max = Math.max(...scores);
    const values = Array.from(scores, value => Math.exp(value - max));
    const sum = values.reduce((a, b) => a + b, 0);
    return sum > 0 && Number.isFinite(sum) ? values.map(value => value / sum) : uniform;
  }

  function createSession() {
    const history = [];
    const residual = new Float32Array(4096 * 3);
    function predict() {
      return distribution(history, sparseKeys(history), residual);
    }
    function observe(pair) {
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

  globalThis.JankenLearnedModel = Object.freeze({ predict, createSession, kind: artifact.kind });
})();
