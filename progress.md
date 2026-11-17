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

Follow-up completed: user requested trainable AI, Reversi, richer effects, and game-only fullscreen. User also requested PC shutdown after completion.
- Added bounded TD(0) residual learning with independent per-game persistent models, enable/disable and reset.
- Added Reversi engine, iterative-deepening alpha-beta worker, pass/endgame, five levels, human side/practice/spectating.
- Added flip cascades, drop bounce, rings, sparks, score interpolation, corner bursts, end-game confetti and audio.
- Added Tetris impact rings and clear sweeps; fullscreen now targets arena panel with in-panel touch controls.
- Fixed intrinsic canvas resize/flex feedback and shared hub paths for nested games.
- Passed 20 Node tests; passed full browser matches, nonzero learned weights, persistence/OFF/reset, both fullscreens and nested offline Worker. Inspected screenshots and reran the skill client for both games.
- Final steps: final checks, push and CI verification; only then perform the authorized PC shutdown.


2026-10-20 follow-up: 本気でRetro ArcadeとAgent Bridgeを強化。
- Retro: fixed-step lifecycle, finish/pause overlays, input release, gamepads, fullscreen, reflected paddle AUTO, modern score particles, recent/random/search persistence and session stats.
- Fixed Mario Bros. uninitialized enemy collection discovered by 400 game/mode smoke cases.
- Agent: staged virtual workspace, diff/file browser, conflict preflight, partial failure retention, batch validation, missing reference errors, cancellation, tab-local history and change-set export.
- Fixed diagnostics bundle syntax error; all 227 catalog tools now register.
- Tests cover memory and real FileSystemHandle editing, external conflicts, markers, 400 arcade boots with AUTO and browser input/fullscreen controls. No required TODOs after final checks.
- Previous shutdown request was fulfilled on 2026-10-19; no new shutdown was requested for this follow-up.


2026-10-21: Imported five upstream Stack Arena queue fixes. Added Agent Bridge file editor (open/create/stage/keyboard save, stale content guard, workspace switch protection), portable v2 change sets with original baselines and atomic validation/import, pending deletion visibility. Added Node conflict/roundtrip validation tests and Playwright editor workflow coverage. Cache release bumped to v8. Existing 400 retro mode boots and Agent regression suite pass.

2026-10-21 follow-up: confirmed origin/main matches local latest; independent seven-bag upstream fix preserved. Raster caches, ResizeObserver sizing, change-only HUD, idle render suppression and no hidden Tetris particles when effects OFF. Reversi shares cache infrastructure for discs/background. Agent now saves one file to the direct filesystem (retains unrelated staged previews), exposes memory-only storage + download, literal find/replace and cursor position. Common hub added to launcher, selective backup restore, update/offline status, focus return and non-conflicting shortcuts. Cache release v9. 36 Node tests and browser game/arena/editor/hub flows pass; provided skill action client run and screenshots reviewed. Performance measurement details are in docs/update-20261021.md. User additionally requested shutdown after entire update and GitHub verification; schedule only after all work is saved, pushed and CI verified.

Final validation: 37 Node tests pass, full game/arena/editor/hub regression flows and 400 retro game-mode boots pass. Confirmed the editor writes to a real FileSystemHandle backend and downloads memory-mode text. Final repeat benchmark remains 1/2 DOM mutations and zero frame-loop layout reads, with 300/320 rounded paths (ON/OFF); timing remains near the display frame interval.


2026-11-06 Scratch Lite 2.0: Fast-forwarded origin changes through f2c10cb, preserving Typing Arena and all separate Scratch project binaries/documents (including the latest Japanese-name reorganization). Added worker ZIP/JSON analysis and CRC-verified asset inflation, fflate for small entries/native streaming for large entries, bounded 2-12 asset supply, deduplicated requests, transferable buffers, Blob-backed project cache with legacy ArrayBuffer support, VM/WebGL reuse, queue/worker cleanup. VM ASSET_PROGRESS reports actual decoded costume/sound/font references; overall progress is explicitly a weighted estimate and 100% waits for completed project construction + first layout. Vendored immutable Scaffolding 0.4.0 and fflate 0.8.2 with licenses; offline export embeds worker + inflater.
Validation: 49 Node tests pass; real latest project (23,889,809B / 582 targets / 103,318 blocks / 28,786 costume references / 176 sounds) loads with zero broken assets and one Canvas after reload/cache reuse. Browser flows verify green flag, URL, raw JSON, SB2, old cache format, no-Worker fallback, failures/recovery, regular web offline and standalone HTML offline. Reference benchmark: 26.968s -> 25.243s load, maximum 50ms heartbeat gap 1895ms -> 1012ms, long-task sum 1923ms -> 1350ms; no universal speed guarantee. Release cache pct v13 / Scratch v6.

2026-11-18 Janken follow-up: evaluated four newly trained neural candidates and confidence/calibration grids. Obtained the pinned Roshambo.me export from doi:10.57745/NZTMN9, file 398373, SHA-256 1e6166bfb8cdea62d2ea16966381dab0d76f4e35ed80fa767126dc7657641e45. Canonical paired-perspective deduplication excludes existing sequences and keeps both views in one split. Added 413,008 training samples, 89,102 validation and 87,800 test samples; total training 551,893. Player IDs are unavailable, so new splits are game-disjoint only. Source and model weight attribution/license documented.
- Selected on validation: pool old and newly trained INT4 neural logits during the first 8 observations, then use the incumbent network. Existing hybrid and online calibration remain active. Seven test sets: 64,048/144,298 -> 64,300/144,298 (44.39% -> 44.56%). Original six: 55.7967% -> 55.8073%. New Roshambo: 37.0433% -> 37.3235%. Transfer and original bot tests lose 4 hits each. 90% remains unmet.
- Feature generation now writes batches of 512 samples. Checked byte-identical floats/labels against an in-memory reference across batch boundaries and missing-round resets. Verified deterministic new dataset split membership and zero exact sequence overlap.
- 55 Node tests pass. 760 exported predictions match selection calculations within 1e-10. Browser checks cover hidden hands, reveal/outcome, saved learning, original lab and v21 offline navigation. Skill client gameplay screenshot inspected. Model is 525,116 bytes. 64-round browser inference median about 4.5 ms; early-stage pilot median about 4.8 ms. No new shutdown reservation requested on this follow-up.
