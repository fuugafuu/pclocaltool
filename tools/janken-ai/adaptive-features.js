'use strict';
(function(root) {
  // Rounds are encoded as 3 * observed move + other move, in rock/paper/scissors order.
  const MAX_HISTORY = 64;
  const scopes = [4, 12, 32, MAX_HISTORY];
  const mod = value => (value + 3) % 3;

  function expertFeatures(own, other) {
    const experts = [
      (a,b,i) => 0,
      (a,b,i) => a[i-1],
      (a,b,i) => b[i-1],
      (a,b,i) => 3*a[i-1]+b[i-1],
      (a,b,i) => mod(a[i-1]-b[i-1]),
      (a,b,i) => 3*a[i-1]+a[i-2],
      (a,b,i) => 3*b[i-1]+b[i-2],
      (a,b,i) => 9*a[i-1]+3*a[i-2]+a[i-3],
      (a,b,i) => 27*a[i-1]+9*b[i-1]+3*a[i-2]+b[i-2],
      (a,b,i) => mod(a[i-1]-a[i-2]),
      (a,b,i) => 3*mod(a[i-1]-b[i-1])+mod(a[i-2]-b[i-2])
    ];
    const output = [];
    for (const [a,b] of [[own,other],[other,own]]) {
      for (const [index, context] of experts.entries()) {
        const first = index === 0 ? 0 : index < 5 ? 1 : index === 7 ? 3 : 2;
        const rotations = index === 4 || index >= 9 ? [true,false] : [false];
        for (const relative of rotations) {
          const table = new Map();
          let quality = 1/3;
          for (let i = first; i < a.length; i++) {
            const key = context(a,b,i);
            let counts = table.get(key);
            if (!counts) {
              counts = [0.55,0.55,0.55];
              table.set(key,counts);
            }
            const actual = relative ? mod(a[i]-a[i-1]) : a[i];
            const total = counts[0]+counts[1]+counts[2];
            quality = 0.9*quality+0.1*counts[actual]/total;
            counts[actual]++;
          }
          const counts = a.length >= first && table.get(context(a,b,a.length));
          if (!counts) { output.push([[1/3,1/3,1/3],quality,0]); continue; }
          const total = counts[0]+counts[1]+counts[2];
          const probabilities = [0,1,2].map(move => counts[relative ? mod(move-a.at(-1)) : move]/total);
          output.push([probabilities,quality,total-1.65]);
        }
      }
    }
    return output;
  }

  function adaptiveFeatures(rounds, version = 1) {
    const start = Math.max(0, rounds.length - MAX_HISTORY);
    const history = rounds.slice(start);
    const own = history.map(pair => Math.floor(pair / 3));
    const other = history.map(pair => pair % 3);
    const outcome = own.map((move, index) => mod(move - other[index]));
    const n = own.length;
    const anchor = own[n - 1];
    const current = history[n - 1];
    const second = history[n - 2];
    const previousOutcome = outcome[n - 1];
    const predictions = version === 2 ? expertFeatures(own, other) : [];
    const rows = [];
    for (let candidate = 0; candidate < 3; candidate++) {
      const row = [n];
      for (let lag = 1; lag <= 8; lag++) {
        const i = n - lag;
        row.push(i < 0 ? -1 : mod(own[i] - candidate), i < 0 ? -1 : mod(other[i] - candidate));
      }
      let streak = 0;
      for (let i = n - 1; i >= 0 && own[i] === anchor; i--) streak++;
      row.push(streak);
      for (const span of scopes) {
        const counters = Array.from({length: 13}, () => [0, 0]);
        function count(key, eligible, hit) {
          if (!eligible) return;
          counters[key][0]++;
          if (hit) counters[key][1]++;
        }
        for (let i = Math.max(0, n - span); i < n; i++) {
          const hit = own[i] === candidate;
          count(0, true, hit);
          count(1, true, other[i] === candidate);
          if (i < 1) continue;
          count(2, own[i - 1] === anchor, hit);
          count(3, other[i - 1] === other[n - 1], hit);
          count(4, outcome[i - 1] === previousOutcome, hit);
          count(5, history[i - 1] === current, hit);
          count(6, true, mod(own[i] - own[i - 1]) === mod(candidate - anchor));
          count(7, outcome[i - 1] === previousOutcome, mod(own[i] - own[i - 1]) === mod(candidate - anchor));
          count(8, outcome[i - 1] === previousOutcome, mod(own[i] - other[i - 1]) === mod(candidate - other[n - 1]));
          if (i < 2) continue;
          count(9, history[i - 1] === current && history[i - 2] === second, hit);
          count(10, own[i - 1] === anchor && own[i - 2] === own[n - 2], hit);
          count(11, mod(own[i - 1] - own[i - 2]) === mod(anchor - own[n - 2]), mod(own[i] - own[i - 1]) === mod(candidate - anchor));
          count(12, outcome[i - 1] === previousOutcome && outcome[i - 2] === outcome[n - 2], hit);
        }
        for (const [seen, hits] of counters) row.push(seen, (hits + 0.5) / (seen + 1.5));
      }
      for (const [probabilities, quality, samples] of predictions) {
        row.push(probabilities[candidate], probabilityCounter(probabilities, candidate), quality, samples);
      }
      rows.push(row);
    }
    return rows;
  }

  function probabilityCounter(probabilities, candidate) {
    return probabilities[(candidate + 2) % 3];
  }

  if (typeof module === 'object' && module.exports) module.exports = adaptiveFeatures;
  else root.JankenAdaptiveFeatures = adaptiveFeatures;
})(globalThis);
