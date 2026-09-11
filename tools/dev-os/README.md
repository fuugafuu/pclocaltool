# Dev OS Lab v3.1

PC Local Tool 内で動く、完全ブラウザ内の仮想OSシミュレーターです。実PCのBIOS、Windows設定、レジストリ、プロセス、ファイル、セキュリティには接続しません。

## 主な機能

- POST / UEFI / device / kernel / driver / service / security / user / shell を段階表示する新ブート画面
- BIOS / UEFI、Secure Boot、TPM、Boot order、仮想デバイス、起動・回復
- デスクトップ、スタート、タスクバー、ウィンドウ、右クリックメニュー
- デスクトップアイコン自由移動、位置保存、画面端クランプ、解像度変更時の自動補正
- 単一/複数選択、ドラッグ範囲選択、タッチ長押しコンテキストメニュー
- 日本語 / English の表示言語設定
- Theme、Wallpaper、Accent、Desktop icon size
- Task Manager、Performance、Startup、Services
- Dev Security、スキャン、隔離、Protection history
- Event Viewer、Service Control Manager、Device Manager
- File Explorer、Dev Terminal、Registry Simulator
- BSOD、BugCheck、Kernel-Power、Automatic Repair、Safe Mode
- App Downloader / Dev OS package sandbox
- `.devapp.html` 特殊HTMLパッケージ形式
- GitHub / Vercel / ローカルファイル対応の Dev OS Update
- NightWorm Lab Sample：Dev OS専用の多段階仮想マルウェア挙動シミュレーター

## Dev OS Update

現在の初期リリースは `3.1.0 / build 30100` です。

### Vercel版

`*.vercel.app` 上で動いていることを検出すると、起動後に自動で GitHub の `updates/latest.json` を確認します。

1. GitHub Raw の最新版マニフェストを取得
2. 現在のDev OSバージョンと比較
3. 新版がある場合、`pclocaltool.vercel.app` の本番マニフェストも確認
4. GitHubだけ先行している場合は「Vercel deployment waiting」
5. 本番Vercelも同じ版になったら「Update and restart」が有効化
6. 更新時は本番URLへキャッシュ回避パラメータ付きで再起動

Vercelのproduction URLは `https://pclocaltool.vercel.app/tools/dev-os/index.html` です。

### ローカル版

`file://` で `index.html` を開いた場合はローカルモードになります。

- `.devupdate.json` を読み込み可能
- Edge / Chrome など File System Access API 対応ブラウザでは Dev OS フォルダーを選択して実ファイルを更新可能
- 更新前の既存ファイルは `.devos-backup/<旧version>-<timestamp>/` に保存
- 更新元は `fuugafuu/pclocaltool` の GitHub Raw または `pclocaltool.vercel.app` のみ許可
- 選択したフォルダーが Dev OS 本体か `index.html` を使って検査してから書き込み

ブラウザがフォルダー書き込みAPIに対応しない場合、ローカル本体の自動上書きは行いません。

### 更新リリースの作り方

今後の修正では、以下を同時に更新します。

- `update-system.js` の `RELEASE.version / build`
- `updates/latest.json` の `version / build / notes / files`
- 必要なら `updates/devos-X.Y.Z.devupdate.json`

例：`3.1.0 → 3.1.1 → 3.2.0`。

## パッケージ形式

`.devapp.html` は通常のHTMLに次を埋め込みます。

```html
<meta name="devos-package" content="1">
<script type="application/devos-package+json">
{"id":"hello.tools","name":{"ja":"Hello Tools","en":"Hello Tools"},"version":"1.0.0","ui":"declarative"}
</script>
<template data-devos-view>
  <button data-devos-action="hello">Hello</button>
</template>
```

任意JavaScriptは実行しません。`script`、`iframe`、イベント属性などはパッケージUIから除去し、manifestに定義された許可済みの仮想アクションだけを実行します。

## NightWorm simulation

NightWorm は本物のマルウェアではありません。Dev OS内部状態だけを変化させるシミュレーターです。

感染は5段階で進みます。

1. Foothold：仮想payload、Runキー、Scheduled Task、サービスを作成
2. Persistence：永続化修復、子プロセス増殖、仮想通信ビーコン
3. Interference：サービス停止、仮想ファイル変更、デスクトップアイコン座標変更
4. System tampering：リアルタイム保護やEventLogへの干渉、プロセス増殖
5. Critical instability：GPU/TDR異常、表示グリッチ、最終的に仮想BSODが発生する場合あり

連動対象：

- Task Manager のプロセス / CPU / RAM負荷
- Services
- Startup / Run key / Scheduled Tasks
- Registry Simulator
- File Explorer の仮想ファイル
- Dev Security
- Event Viewer / pending event buffer
- Desktop wallpaper / icon positions / notification
- Device Manager の仮想GPU状態
- Boot integrity表示
- BSOD / Automatic Repair / Safe Mode

Dev Security のリアルタイム保護がONなら一部挙動をブロックし感染進行を遅らせます。隔離すると作成物・永続化・改変ファイル・停止サービス・GPU状態・壁紙・アイコン位置をできる限り復元します。

## 安全境界

このプロジェクトは教育・遊び用シミュレーターです。

- host OS のレジストリ、サービス、プロセスを操作しない
- NightWormは実ネットワーク通信を行わない
- Dev OS package の任意JavaScriptを実行しない
- OS更新で書き込めるのは、ユーザーが明示的に選んだDev OSフォルダーのみ
- 更新元URLは指定GitHub repo / Vercel productionへ制限

Dev OS内部状態は主にブラウザの `localStorage` に保存されます。
