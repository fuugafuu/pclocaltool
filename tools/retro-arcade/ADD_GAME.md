# Retro Arcade Lab — ゲーム追加ガイド

Retro Arcade Lab は、100本以上へ拡張できるようにゲーム本体とランチャーを分離しています。

## 基本構造

```text
tools/retro-arcade/
├ index.html
├ style.css
├ core.js
├ ADD_GAME.md
└ games/
   ├ catalog.js
   ├ classics-a.js
   ├ classics-b.js
   ├ classics-c.js
   └ classics-d.js
```

ゲーム追加時は、既存パックへ追加しても、新しい `games/pack-name.js` を作っても構いません。

## 最小登録形式

```js
RetroArcade.register({
  id: 'my-game',
  title: 'MY GAME',
  year: 1983,
  system: 'ARCADE',
  genre: 'Action',
  color: '#66ffaa',
  description: 'ランチャーに表示する説明',
  classic: '昔のルール・操作感',
  modern: 'Modernモードで自然に追加する機能',
  controls: '←→ / Space',
  auto: 'AUTOモードがどのようにプレイするか'
}, (host, api) => {
  return api.canvas({
    width: 640,
    height: 480,

    reset(env) {
      // 状態初期化
    },

    auto(env, dt, cfg) {
      // AUTO専用AI
      // env.autoKeys.add('ArrowLeft') など
      // cfg.skill: 0〜1
      // cfg.humanize: 0〜0.6
    },

    update(env, dt) {
      // 1フレーム分のゲーム進行
      // dt はランチャーの速度設定を反映済み
    },

    draw(env) {
      // Canvasへ描画
    },

    keyDown(env, code, event) {},
    keyUp(env, code, event) {},
    pointerDown(env, pointer, event) {},
    pointerMove(env, pointer, event) {},
    pointerUp(env, pointer, event) {}
  });
});
```

## 共通API

### api.mode

`classic` または `modern`。

古いゲーム性を壊す機能は Modern 側だけに入れてください。

### api.speed

現在のゲーム速度。

ランタイムが `dt` 自体を倍率化するため、通常はゲーム側で再計算する必要はありません。

### api.auto

AUTOが有効かどうか。

### api.autoSkill

0〜1。ランチャー設定の「オートAIの強さ」。

### api.humanize

0〜0.6。AUTOへ人間らしいズレやミスを加えるための値。

### api.setScore / api.addScore

```js
api.setScore(1000);
api.addScore(50);
```

ハイスコアはゲームID・Classic/Modern別に自動保存されます。

### api.setStatus

筐体右側の状態表示を書き換えます。

```js
api.setStatus('STAGE 2');
```

### api.beep

Web Audio APIで簡易ビープ音。

```js
api.beep(440, 0.05, 'square', 0.04);
```

外部音声ファイルは不要です。

### api.storage

ゲーム専用localStorage。

```js
api.storage.set('save', data);
const data = api.storage.get('save', null);
```

## AUTOモード必須ルール

Retro Arcade Labへ追加するゲームは原則として `auto()` を実装してください。

AUTOはゲームごとに専用ロジックを持たせます。

例:

- パドルゲーム: ボール到達位置予測
- シューティング: 敵弾回避 + 照準 + 射撃
- 落ち物: 盤面評価
- 迷路: BFS / 安全度評価
- カード: 有効手探索
- 物理ゲーム: 速度・位置フィードバック制御

単純なランダム入力だけにはしないでください。

## 倍速対応ルール

ゲーム側で `setInterval` や独自の実時間時計をゲーム進行に使わず、必ず `update(env, dt)` の `dt` を基準にしてください。

共通ランタイムは0.5×〜4×の速度変更時にサブステップへ分割するため、高速時の当たり判定抜けを抑えます。

## Classic / Modern設計方針

Classic:

- 当時の基本ルール
- 当時らしい画面比率・色・単純な図形
- 当時の不便さまで完全再現する必要はないが、ゲーム性を変えすぎない

Modern:

- 現行リメイクなどで一般化した快適性を参考にする
- パワーアップ
- ゴースト表示
- コンボ
- ヒント
- 操作バッファ
- ローカル保存
- 視認性向上

などを、元のゲーム性を壊さない範囲で追加します。

## ランチャー設定

設定は2階層です。

1. 全ゲーム共通
2. ゲーム個別上書き

設定項目:

- Classic / Modern 初期モード
- 速度 0.5× / 0.75× / 1× / 1.25× / 1.5× / 2× / 3× / 4×
- AUTO ON/OFF
- AUTO AI強度
- 人間らしさ / ミス率
- サウンド
- CRT走査線
- タッチ操作

## パック追加

新しいファイルを作った場合は `index.html` で読み込んでください。

```html
<script src="games/my-pack.js"></script>
```

また `games/catalog.js` にも記録しておくと管理しやすくなります。

## 著作物について

このプロジェクトでは、元ゲームのROM、画像、音声、スプライト、フォントをコピーせず、Canvas図形・自作ビープ音・独自の簡易表現で再構成してください。

ゲーム名や歴史的なルールを参照する場合も、素材そのものを転載しない構成を維持します。
