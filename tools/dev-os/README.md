# Dev OS Lab v2

PC Local Tool 内で動く、完全ブラウザ内の仮想OSシミュレーターです。実PCのBIOS、Windows設定、レジストリ、プロセス、ファイル、セキュリティには接続しません。

## v2 の主な機能

- BIOS / UEFI、Secure Boot、TPM、Boot order、仮想デバイス、起動・回復
- デスクトップ、スタート、タスクバー、ウィンドウ、右クリックメニュー
- デスクトップの単一/複数選択、ドラッグ範囲選択、タッチ長押しコンテキストメニュー
- 日本語 / English の表示言語設定
- Theme、Wallpaper、Accent、Desktop icon size
- Task Manager、Performance、Startup、Services
- Dev Security、スキャン、隔離、Protection history
- Event Viewer、Service Control Manager、Device Manager
- File Explorer、Dev Terminal、Registry Simulator
- BSOD、BugCheck、Kernel-Power、Automatic Repair、Safe Mode
- App Downloader / Dev OS package sandbox
- `.devapp.html` 特殊HTMLパッケージ形式
- packages フォルダーの catalog 読み込み、またはフォルダー選択によるローカル導入
- NightWorm Lab Sample：Dev OS専用の仮想マルウェア挙動シミュレーター

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

NightWorm は本物のマルウェアではありません。Dev OS の状態オブジェクトだけに対して以下を模擬します。

- 仮想Runキー / Startup persistence
- 仮想Scheduled Task
- nightworm.dev / nw-worker.dev プロセス
- 仮想ファイルの作成
- 仮想Registry mutation
- SearchIndexerサービスへの干渉
- 仮想Desktop personalization変更
- Security / Application / Systemイベント生成

Dev Security のリアルタイム保護がONなら未署名パッケージをブロックします。強制インストールした場合でも、Full/Quick scan → quarantine で永続化・仮想ファイル・仮想Registry・プロセスをまとめて除去できます。Safe Modeでは第三者autorunを抑止します。

## 安全境界

このプロジェクトは教育・遊び用シミュレーターです。

- host OS のファイルを読み書きしない
- host のプロセス/サービス/レジストリを操作しない
- 任意シェルコマンドを実行しない
- Dev OS パッケージ内の任意JavaScriptを実行しない
- ネットワーク攻撃や外部感染機能を持たない

状態はブラウザの `localStorage` に保存されます。
