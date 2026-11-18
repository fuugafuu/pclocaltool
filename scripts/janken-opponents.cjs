'use strict';
const opponentModel = require('../tools/janken-ai/opponent-model.js');
const mod = value => (value + 3) % 3;

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const trainingFamilies = [
  'constant', 'cycle', 'biased', 'copy', 'counter-last', 'counter-frequency',
  'counter-transition', 'win-stay', 'rotation', 'switch', 'noisy-pattern', 'meta'
];
const testFamilies = [...trainingFamilies, 'conditional-mix', 'loss-switch', 'meta-fast', 'random'];

function createOpponent(family, seed) {
  if (!testFamilies.includes(family)) throw new Error('Unknown opponent family: ' + family);
  const random = randomGenerator(seed);
  const rotation = 1 + Math.floor(random() * 2);
  const favorite = Math.floor(random() * 3);
  const noise = 0.08 + 0.24 * random();
  const span = 4 + Math.floor(random() * 28);
  const period = 3 + Math.floor(random() * 13);
  const pattern = Array.from({ length: period }, () => Math.floor(random() * 3));
  const transition = Array.from({ length: 9 }, () => {
    const raw = [random() ** 3, random() ** 3, random() ** 3];
    const total = raw.reduce((sum, value) => sum + value, 0);
    return raw.map(value => value / total);
  });
  const own = [], other = [];
  const learner = family.startsWith('meta') ? opponentModel.createSession({
    settings: { scoreDecay: family === 'meta-fast' ? 0.8 : 0.97,
      exploration: 0.1, evidenceScale: 1.5, temperature: 0.09 }
  }) : null;
  let lossStreak = 0, switched = favorite, round = 0;

  function frequencies(values) {
    const counts = [0.25, 0.25, 0.25];
    for (const move of values.slice(-span)) counts[move]++;
    return counts;
  }

  function next() {
    if (family === 'random') return Math.floor(random() * 3);
    if (family === 'constant') return favorite;
    if (family === 'cycle') return mod(favorite + rotation * round);
    if (family === 'biased') return random() < 0.65 ? favorite : Math.floor(random() * 3);
    if (learner) return opponentModel.sample(learner.prepare().action, random);
    if (!own.length) return favorite;
    if (random() < noise) return Math.floor(random() * 3);
    if (family === 'copy') return other.at(-1);
    if (family === 'counter-last') return mod(other.at(-1) + rotation);
    if (family === 'rotation') return mod(own.at(-1) + rotation);
    if (family === 'counter-frequency') {
      const counts = frequencies(other);
      return mod(counts.indexOf(Math.max(...counts)) + 1);
    }
    if (family === 'counter-transition') {
      const counts = [0.3, 0.3, 0.3];
      for (let index = Math.max(1, other.length - span * 3); index < other.length; index++) {
        if (other[index - 1] === other.at(-1)) counts[other[index]]++;
      }
      return mod(counts.indexOf(Math.max(...counts)) + rotation);
    }
    if (family === 'win-stay') {
      return mod(own.at(-1) - other.at(-1)) === 1 ? own.at(-1) : mod(own.at(-1) + rotation);
    }
    if (family === 'noisy-pattern') return pattern[round % period];
    if (family === 'switch') {
      const stage = Math.floor(round / (16 + span)) % 3;
      return stage === 0 ? mod(other.at(-1) + 1) :
        stage === 1 ? mod(own.at(-1) + rotation) : pattern[round % period];
    }
    if (family === 'conditional-mix') {
      return opponentModel.sample(transition[3 * own.at(-1) + other.at(-1)], random);
    }
    if (family === 'loss-switch') {
      if (lossStreak >= 2) { switched = mod(switched + rotation); lossStreak = 0; }
      return random() < 0.6 ? switched : mod(other.at(-1) + 1);
    }
    throw new Error('Missing opponent behavior');
  }

  function observe(theirMove, ourMove) {
    learner?.observe(theirMove, ourMove);
    lossStreak = mod(theirMove - ourMove) === 1 ? lossStreak + 1 : 0;
    own.push(ourMove);
    other.push(theirMove);
    round++;
    if (own.length > 1024) { own.shift(); other.shift(); }
  }

  return { next, observe };
}

module.exports = { randomGenerator, createOpponent, trainingFamilies, testFamilies };
