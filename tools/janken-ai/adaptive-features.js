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
    const predictions = version >= 2 ? expertFeatures(own, other) : [];
    const tracking = version >= 3 ? recencyExperts(own, other) : [];
    const echoes = version >= 4 ? sequenceEvidence(own, other, outcome) : [];
    const opponents = version >= 5 ? opponentExperts(history) : [];
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
      for (const [probabilities, accuracy, logScore, samples] of tracking) {
        row.push(probabilities[candidate], probabilityCounter(probabilities, candidate), accuracy, logScore, samples);
      }
      for (const counts of echoes) row.push(counts[candidate], counts[0] + counts[1] + counts[2]);
      for (const [probabilities, evidence] of opponents) row.push(probabilities[candidate], evidence);
      rows.push(row);
    }
    return rows;
  }

  // Find repeated suffixes in several representations of previous rounds.
  // Each match votes with the move that followed it, mapped back to today's anchor.
  function sequenceEvidence(own, other, outcome) {
    const n = own.length;
    const changes = own.map((move, i) => i ? mod(move - own[i - 1]) : -1);
    const pairs = own.map((move, i) => move * 3 + other[i]);
    const evidence = [];
    for (const [symbols, relative] of [[own, false], [changes, true], [pairs, false], [outcome, true]]) {
      const counts = Array.from({length: 4}, () => [0, 0, 0]);
      for (let next = n - 1; next > 0; next--) {
        let length = 0;
        while (length < Math.min(12, next) && symbols[next - length - 1] === symbols[n - length - 1]) length++;
        const predicted = relative ? mod(own[next] - own[next - 1] + own[n - 1]) : own[next];
        const ageWeight = 1 / (1 + (n - next) / 16);
        for (const [index, minimum] of [2, 3, 5, 8].entries()) {
          if (length >= minimum) counts[index][predicted] += ageWeight;
        }
      }
      evidence.push(...counts);
    }
    return evidence;
  }

  // Evaluate each strategy against successive known moves before updating its counts.
  function recencyExperts(own, other) {
    const outcome = own.map((move, i) => mod(move - other[i]));
    const output = [];
    for (const [a,b,invert] of [[own,other,false],[other,own,true]]) {
      const keys = [
        () => 0,
        i => a[i-1],
        i => b[i-1],
        i => 3*a[i-1]+b[i-1],
        i => invert ? mod(-outcome[i-1]) : outcome[i-1],
        i => 3*a[i-1]+a[i-2],
        i => 3*b[i-1]+b[i-2],
        i => 27*a[i-1]+9*b[i-1]+3*a[i-2]+b[i-2],
        i => mod(a[i-1]-a[i-2]),
        i => mod(b[i-1]-b[i-2]),
        i => mod(a[i-1]-a[i-3])
      ];
      for (const decay of [0.83,0.97]) {
        const ages = Array.from({length:a.length+1}, (_, age) => decay ** age);
        for (const [index, context] of keys.entries()) {
          const relative = index === 4 || index >= 8;
          const first = index === 0 ? 0 : index < 5 ? 1 : index === 10 ? 3 : 2;
          const table = new Map();
          let accuracy = 1/3, logScore = Math.log(1/3);
          for (let i = first; i < a.length; i++) {
            const key = context(i);
            let entry = table.get(key);
            if (!entry) { entry = [0,0,0,i]; table.set(key,entry); }
            const actual = relative ? mod(a[i]-a[i-1]) : a[i];
            const factor = ages[i-entry[3]];
            const total = (entry[0]+entry[1]+entry[2])*factor;
            const actualCount = entry[actual];
            const best = Math.max(entry[0],entry[1],entry[2]);
            const ties = Number(entry[0]===best)+Number(entry[1]===best)+Number(entry[2]===best);
            accuracy = 0.9*accuracy+0.1*(actualCount===best ? 1/ties : 0);
            logScore = 0.9*logScore+0.1*Math.log((actualCount*factor+0.5)/(total+1.5));
            for (let move=0;move<3;move++) entry[move] *= factor;
            entry[actual]++;
            entry[3] = i;
          }
          const entry = a.length >= first && table.get(context(a.length));
          const factor = entry ? ages[a.length-entry[3]] : 0;
          const samples = entry ? factor*(entry[0]+entry[1]+entry[2]) : 0;
          const probabilities = entry ? [0,1,2].map(move =>
            (entry[relative ? mod(move-a.at(-1)) : move]*factor+0.5)/(samples+1.5)) : [1/3,1/3,1/3];
          output.push([probabilities,accuracy,logScore,samples]);
        }
      }
    }
    return output;
  }

  function probabilityCounter(probabilities, candidate) {
    return probabilities[(candidate + 2) % 3];
  }

  // Each row rewards a different behavioral cue only after the next hand is observed.
  // Absolute moves and moves relative to the previous two players share the same tables.
  function opponentExperts(rounds, scales = [0, 1, 2]) {
    const history = rounds.slice(-MAX_HISTORY);
    const own = history.map(pair => Math.floor(pair / 3));
    const other = history.map(pair => pair % 3);
    const outcome = own.map((move, i) => mod(move - other[i]));
    const frequency = [0, 0, 0];
    const anchors = [];
    for (const move of other) {
      const maximum = Math.max(...frequency);
      anchors.push(frequency.indexOf(maximum));
      for (let i = 0; i < 3; i++) frequency[i] *= 0.85;
      frequency[move]++;
    }
    anchors.push(frequency.indexOf(Math.max(...frequency)));
    const definitions = [
      [0, () => 0, () => 0, 1],
      [1, () => 0, i => own[i - 1], 1],
      [1, () => 0, i => other[i - 1], 1],
      [1, i => own[i - 1], () => 0, 3],
      [1, i => other[i - 1], () => 0, 3],
      [1, i => outcome[i - 1], i => own[i - 1], 3],
      [1, i => outcome[i - 1], i => other[i - 1], 3],
      [1, i => outcome[i - 1], i => anchors[i], 3],
      [2, i => own[i - 1] * 3 + own[i - 2], () => 0, 9],
      [2, i => mod(own[i - 1] - own[i - 2]), i => own[i - 1], 3],
      [2, i => outcome[i - 1] * 3 + outcome[i - 2], i => own[i - 1], 9]
    ];
    return scales.map(scale => {
      const decay = [0.76, 0.95, 1][scale];
      const discounts = Array.from({length: own.length + 1}, (_, age) => decay ** age);
      const votes = [0, 0, 0];
      let totalWeight = 0;
      let scoreSum = 0;
      for (const [start, context, anchor, contexts] of definitions) {
        const counts = new Float64Array(contexts * 3);
        const timestamps = new Uint8Array(contexts);
        let evidence = 0;
        for (let i = start; i < own.length; i++) {
          const key = context(i);
          const offset = key * 3;
          const discount = discounts[i - timestamps[key]];
          for (let move = 0; move < 3; move++) counts[offset + move] *= discount;
          const actual = offset + mod(own[i] - anchor(i));
          const sum = counts[offset] + counts[offset + 1] + counts[offset + 2];
          evidence = (scale === 0 ? 0.84 : 0.95) * evidence +
            Math.log(3 * (counts[actual] + 0.5) / (sum + 1.5));
          counts[actual]++;
          timestamps[key] = i;
        }
        if (own.length < start) continue;
        const key = context(own.length);
        const offset = key * 3;
        const discount = discounts[own.length - timestamps[key]];
        const sum = discount * (counts[offset] + counts[offset + 1] + counts[offset + 2]);
        const strength = sum / (sum + 2);
        const weight = Math.exp(Math.max(-8, Math.min(8, evidence))) * strength;
        const base = anchor(own.length);
        for (let move = 0; move < 3; move++) {
          votes[move] += weight * (discount * counts[offset + mod(move - base)] + 0.5) / (sum + 1.5);
        }
        scoreSum += weight * evidence;
        totalWeight += weight;
      }
      return totalWeight ? [votes.map(vote => vote / totalWeight), scoreSum / totalWeight] : [[1/3,1/3,1/3], 0];
    });
  }

  function blendOpponent(prior, [forecast, evidence], settings) {
    const trust = settings.weight / (1 + Math.exp(settings.threshold - evidence));
    return prior.map((value, move) => (1 - trust) * value + trust * forecast[move]);
  }

  function blendLearned(prior, forecast, settings) {
    const difference = settings.confidenceGain ? Math.max(...forecast) - Math.max(...prior) : 0;
    const weight = Math.max(0, Math.min(1, settings.weight + (settings.confidenceGain || 0) * difference));
    return prior.map((value, move) => (1 - weight) * value + weight * forecast[move]);
  }

  adaptiveFeatures.supportsSequenceEvidence = true;
  adaptiveFeatures.opponentExperts = opponentExperts;
  adaptiveFeatures.blendOpponent = blendOpponent;
  adaptiveFeatures.blendLearned = blendLearned;
  if (typeof module === 'object' && module.exports) module.exports = adaptiveFeatures;
  else root.JankenAdaptiveFeatures = adaptiveFeatures;
})(globalThis);
