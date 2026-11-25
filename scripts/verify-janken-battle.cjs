'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.GAME_BASE_URL || 'http://127.0.0.1:8103').replace(/\/$/, '');
const simpleKey = 'pclocaltool_janken_play_v1';
const labKey = 'pclocaltool_janken_ai_v1';
const names = ['rock', 'paper', 'scissors'];
fs.mkdirSync('output/janken-battle', { recursive: true });

async function instrument(page) {
  await page.addInitScript(() => {
    let implementation;
    window.__testCommittedHands = [];
    Object.defineProperty(window, 'JankenOpponent', {
      get: () => implementation,
      set: value => {
        implementation = value;
        const original = value.sample;
        value.sample = function(...args) {
          const move = original(...args);
          window.__testCommittedHands.push(move);
          return move;
        };
      }
    });
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await instrument(page);
    await page.goto(base + '/tools/janken-ai/play.html');
    assert.deepEqual(await page.evaluate(() => ({
      network: typeof window.JankenLearnedModel.predictBattleFeatures,
      policy: window.JankenLearnedModel.battlePolicy?.id,
      features: window.JankenLearnedModel.battleFeatureVersion
    })), { network: 'function', policy: 'human-adaptive-v5', features: 4 });
    assert.equal(await page.locator('[data-move]').count(), 3);
    assert.equal(await page.locator('#opponent-move').textContent(), '—');
    assert.equal(await page.evaluate(() => window.__testCommittedHands.length), 1);
    for (const move of ['rock', 'paper']) {
      const pending = await page.evaluate(() => window.__testCommittedHands.at(-1));
      const count = await page.evaluate(() => window.__testCommittedHands.length);
      await page.locator('[data-move="' + move + '"]').click();
      const revealed = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
      assert.equal(revealed.ai, names[pending]);
      assert.equal(await page.evaluate(() => window.__testCommittedHands.length), count + 1);
    }
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), simpleKey);
    assert.equal(saved.battle.round, 2);
    assert.equal('pending' in saved.battle, false);
    await page.reload();
    assert.equal(await page.locator('#opponent-move').textContent(), '—');
    await page.locator('[data-move="scissors"]').click();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).battle.round, simpleKey), 3);
    await page.screenshot({ path: 'output/janken-battle/duel.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'output/janken-battle/mobile.png', fullPage: true });

    await page.goto(base + '/tools/janken-ai/');
    await page.locator('[data-mode="ai"]').click();
    await page.locator('#start-match').click();
    assert.equal(await page.locator('#round-result').isVisible(), false);
    assert.equal(await page.locator('#move-inputs [data-move]').count(), 3);
    for (const move of ['rock', 'paper']) {
      const pending = await page.evaluate(() => window.__testCommittedHands.at(-1));
      await page.locator('#move-inputs [data-move="' + move + '"]').click();
      const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).activeMatch, labKey);
      assert.equal(stored.rounds.at(-1).moves['@janken-ai'], names[pending]);
      assert.equal(stored.battleState.round, stored.rounds.length);
    }
    const beforeUndo = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).activeMatch.battleState, labKey);
    await page.locator('#move-inputs [data-move="rock"]').click();
    await page.locator('#undo-round').click();
    const afterUndo = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).activeMatch.battleState, labKey);
    assert.deepEqual(afterUndo, beforeUndo);
    await page.reload();
    assert.equal(await page.locator('#session-rounds').textContent(), '2');
    await page.locator('#move-inputs [data-move="paper"]').click();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).activeMatch.battleState.round, labKey), 3);
    await page.screenshot({ path: 'output/janken-battle/lab.png', fullPage: true });

    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({
      history: [0, 4, 8], battle: { version: 1, round: 7, tables: [] }
    })), simpleKey);
    await page.goto(base + '/tools/janken-ai/play.html');
    await page.locator('[data-move="rock"]').click();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).battle.round, simpleKey), 4);
    await page.setViewportSize({ width: 1250, height: 900 });
    await page.goto(base + '/tools/janken-ai/network.html');
    assert.equal(await page.locator('#opponent-move').textContent(), '—');
    assert.equal(await page.locator('#network-probs').isVisible(), false);
    assert.equal(await page.locator('#branch-list button').count(), 4);
    const committed = await page.evaluate(() => window.__testCommittedHands.at(-1));
    await page.locator('[data-move="paper"]').click();
    const trace = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(trace.ai, names[committed]);
    assert.equal(trace.round, 5);
    assert.equal(trace.signal.length, 3);
    assert.match(await page.locator('#network-decision').textContent(), /AIが出した手の選択確率/);
    await page.evaluate(() => window.advanceTime(200));
    assert.notEqual(await page.evaluate(() => JSON.parse(window.render_game_to_text()).yaw), trace.yaw);
    await page.locator('#branch-list button').last().click();
    assert.match(await page.locator('#network-shape').textContent(), /113 → 96 → 36 → 1/);
    assert.match(await page.locator('#network-status').textContent(), /第5手・パーの信号/);
    await page.locator('#network-pause').click();
    await page.locator('#network-canvas').press('ArrowRight');
    const rotated = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(rotated.paused, true);
    await page.locator('#network-reset').click();
    assert.notEqual(await page.evaluate(() => JSON.parse(window.render_game_to_text()).yaw), rotated.yaw);
    await page.screenshot({ path: 'output/janken-battle/network.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'output/janken-battle/network-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Committed hands, learning persistence, undo, migration, 3D controls and mobile layout pass');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
