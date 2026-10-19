Original prompt: 新しいgameツール。演出とUIを充実したテトリス。一人・人間vsAI・AIvsAI。テトリス99式の対戦。強力なレベル選択AI。

Implementation plan:
- Standalone deterministic engine: 7-bag, SRS, hold, ghost, lock delay, T-spins, combos/B2B, garbage cancellation.
- Duel adaptation: 12 pending / 20 attack caps; 99 base table and badge multipliers. Best-of rounds carry badge fragments; no fake 99-player targeting.
- Worker AI: reachable placements, hold, beam lookahead, board evaluation; five levels independently selectable.
- Canvas effects, synth audio, reduced-motion option, touch controls, mode/level settings, results and persistence.
- Register game in launcher and offline cache; engine tests and actual browser checks.

Completed:
- Added tools/game with all three modes, 5 AI tiers, independent spectator levels, match rounds and badge carry-over.
- Added 7-bag/SRS/hold/ghost/lock delay, T-spin/mini, REN/B2B/perfect clears, timed capped garbage and cancellation.
- Added canvas bursts, beams, lock flashes, hard-drop trails, audio, reduced-motion defaults, touch UI and solo records.
- Registered eighth tool in launcher/shared hub and v5 offline cache. Direct game startup also registers the worker.
- Passed 13 Node tests including 100 legal Apex placements; repeated skill client and inspected gameplay captures.
- Browser checks passed: keyboard/touch, rotations/hold/drop, pause, attack, round/match finish, solo completion, preferences/audio/record persistence, independent AI levels and offline worker execution. No console errors.
- Inspected desktop attack/spectator and 390px mobile captures under output/game (ignored).
- Tuned aggressive AI with a safe-stack well bias, future attack rewards and incoming cancellation priority; tested normal play and battle.

No required TODOs. Optional future work: additional games and a separate multi-opponent lobby. This version intentionally implements a 1v1 adaptation, documented in rules and README.
