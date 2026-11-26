'use strict';
(() => {
  const canvas = document.getElementById('network-canvas');
  const branches = window.JankenLearnedModel?.describeBattleNetwork?.() || [];
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('network-status');
  if (!ctx || !branches.length) {
    status.textContent = 'ネットワークを表示できません。';
    return;
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = document.getElementById('network-pause');
  const branchList = document.getElementById('branch-list');
  const probabilities = document.getElementById('network-probs');
  const decision = document.getElementById('network-decision');
  const labels = ['グー', 'パー', 'チョキ'];
  const moveIds = ['rock', 'paper', 'scissors'];
  const initialYaw = -0.48, initialPitch = 0.28;
  const geometry = branches.map(({ sizes, connections }) => ({
    layers: sizes.map((size, index) => Array.from({ length: size }, (_, node) => {
      const phase = node * Math.PI * (3 - Math.sqrt(5));
      const radius = size === 1 ? 0 : (0.83 - index * 0.17) * Math.sqrt((node + 0.5) / size);
      return { x: radius * Math.cos(phase), z: radius * Math.sin(phase),
        y: 0.57 - 1.14 * index / (sizes.length - 1) };
    })),
    edges: connections.flatMap((edges, layer) => edges.map(edge => ({ ...edge, layer })))
  }));
  let branch = 0, lastRound, paused = motion.matches, frame = 0, lastTime = 0;
  let width = 1, yaw = initialYaw, pitch = initialPitch, animationAge = 0;
  let pointer;

  function render() {
    const { layers, edges } = geometry[branch];
    const signal = lastRound?.branches?.[branch]?.activations;
    const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
    function project(node) {
      const x = cosYaw * node.x - sinYaw * node.z;
      const depth = sinYaw * node.x + cosYaw * node.z;
      const y = node.y * cosPitch - depth * sinPitch;
      const z = node.y * sinPitch + depth * cosPitch;
      const perspective = 3.5 / (3.5 - z);
      return { x: width * (0.5 + 0.43 * x * perspective),
        y: width * (0.5 + 0.43 * y * perspective), z, perspective };
    }
    const points = layers.map(layer => layer.map(project));
    ctx.clearRect(0, 0, width, width);
    for (const edge of edges) {
      const { layer, source, target, weight } = edge;
      const from = points[layer][source], to = points[layer + 1][target];
      const intensity = signal ? Math.abs(signal[layer][source] * weight) : 0;
      const alpha = 0.12 + Math.min(0.47, 0.14 * Math.log1p(intensity * 13));
      ctx.strokeStyle = weight > 0 ? 'rgba(120,227,212,' + alpha + ')' : 'rgba(255,173,129,' + alpha + ')';
      ctx.lineWidth = 0.55 + Math.min(1.4, Math.abs(weight) * 1.6);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      const phase = (animationAge - layer * 140) / 550 - (source % 7) * 0.09;
      if (intensity > 0.035 && phase >= 0 && phase < 1) {
        ctx.fillStyle = weight > 0 ? '#dcffaa' : '#ffd2a9';
        ctx.beginPath();
        ctx.arc(from.x + (to.x - from.x) * phase, from.y + (to.y - from.y) * phase,
          Math.min(2.8, 1 + intensity), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const nodes = points.flatMap((layer, index) => layer.map((point, node) => ({
      ...point, input: index === 0, output: layer.length === 1,
      signal: Math.abs(signal?.[index]?.[node] || 0)
    }))).sort((a, b) => a.z - b.z);
    for (const node of nodes) {
      const strength = Math.min(1, Math.log1p(node.signal) / 1.7);
      const radius = (node.output ? 4.5 : node.input ? 0.95 : 2.25) * node.perspective;
      ctx.fillStyle = strength > 0.2 || node.output ? '#dbff9f' : '#95c8b6';
      ctx.globalAlpha = node.output ? 1 : 0.37 + 0.53 * strength;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 1.25 * strength, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function advance(ms) {
    if (!paused) {
      animationAge += ms;
      if (!pointer) yaw += ms * 0.00022;
    }
    render();
  }
  function animate(now) {
    advance(lastTime ? Math.min(50, now - lastTime) : 0);
    lastTime = now;
    frame = requestAnimationFrame(animate);
  }
  function setPaused(value) {
    paused = value;
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? '動きを再開' : '動きを止める';
    cancelAnimationFrame(frame);
    lastTime = 0;
    if (!paused) frame = requestAnimationFrame(animate);
    render();
  }
  function rotate(dx, dy) {
    yaw = (yaw + dx) % (Math.PI * 2);
    pitch = Math.max(-1.15, Math.min(1.15, pitch + dy));
    render();
  }
  const buttons = branches.map(({ name }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.addEventListener('click', () => { branch = index; updateReadout(); render(); });
    branchList.append(button);
    return button;
  });
  function updateReadout() {
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === branch)));
    const { sizes, parameters, connections } = branches[branch];
    const links = connections.reduce((sum, edges) => sum + edges.length, 0);
    document.getElementById('network-shape').textContent =
      sizes.join(' → ') + '  /  ' + parameters.toLocaleString('ja-JP') + ' パラメーター・表示結線 ' + links.toLocaleString('ja-JP') + ' 本';
    const trace = lastRound?.branches?.[branch];
    if (!trace) return;
    status.textContent = '第' + lastRound.round + '手・' + labels[lastRound.human] + 'の信号 / 混合比 ' + Math.round(trace.share * 100) + '%';
    probabilities.hidden = false;
    probabilities.replaceChildren(...trace.probabilities.map((value, hand) => {
      const item = document.createElement('span');
      item.className = 'probability';
      item.style.setProperty('--value', (value * 100) + '%');
      item.textContent = labels[hand] + ' ' + (100 * value).toFixed(1) + '%';
      return item;
    }));
    const predicted = lastRound.forecast.indexOf(Math.max(...lastRound.forecast));
    const played = moveIds.indexOf(lastRound.ai);
    decision.hidden = false;
    decision.textContent = '全予測の最多候補 ' + labels[predicted] + ' ' +
      (lastRound.forecast[predicted] * 100).toFixed(1) + '%　/　AIが出した手の選択確率 ' +
      (lastRound.action[played] * 100).toFixed(1) + '%';
  }
  new ResizeObserver(() => {
    width = Math.max(1, canvas.clientWidth);
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(width * dpr);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / width, 0, 0);
    render();
  }).observe(canvas);
  canvas.addEventListener('pointerdown', event => {
    if (pointer || event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return;
    rotate((event.clientX - pointer.x) * 0.012, (event.clientY - pointer.y) * 0.012);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
  canvas.addEventListener('lostpointercapture', event => { if (pointer?.id === event.pointerId) pointer = undefined; });
  canvas.addEventListener('keydown', event => {
    const offsets = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] };
    if (!Object.hasOwn(offsets, event.key)) return;
    event.preventDefault();
    rotate(...offsets[event.key]);
  });
  pause.addEventListener('click', () => setPaused(!paused));
  motion.addEventListener('change', event => setPaused(event.matches));
  document.getElementById('network-reset').addEventListener('click', () => {
    yaw = initialYaw;
    pitch = initialPitch;
    render();
  });
  window.addEventListener('janken:round', ({ detail }) => {
    lastRound = detail;
    const panel = document.getElementById('network-planning');
    const plan = detail.plan;
    if (panel && plan) {
      panel.hidden = false;
      document.getElementById('network-planning-title').textContent = '読み先の評価 · ' + plan.depth + '手 / ' + plan.positions + '局面';
      document.getElementById('network-planning-hint').textContent = plan.depth === 1 ?
        '相手の反応を判断できるまでは、今の手を評価します。' :
        '読み先の点数は、相手が取りうる手と、その後の応手を重み付きで計算した値です。';
      const scores = labels.map((label, index) => {
        const row = document.createElement('tr');
        const hand = document.createElement('th');
        hand.scope = 'row';
        hand.textContent = label;
        row.append(hand);
        for (const value of [plan.immediate[index], plan.future[index], plan.total[index]]) {
          row.insertCell().textContent = value.toFixed(3);
        }
        return row;
      });
      document.getElementById('network-planning-scores').replaceChildren(...scores);
    }
    animationAge = 0;
    updateReadout();
    render();
  });
  const renderPlay = window.render_game_to_text;
  window.render_game_to_text = () => JSON.stringify({
    ...JSON.parse(renderPlay()), branch, branches: branches.length, yaw, pitch, paused,
    round: lastRound?.round, signal: lastRound?.branches?.[branch]?.probabilities,
    planning: lastRound?.plan
  });
  window.advanceTime = ms => advance(ms);
  updateReadout();
  setPaused(paused);
})();
