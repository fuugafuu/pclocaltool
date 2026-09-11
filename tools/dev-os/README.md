# Dev OS Lab v3.1.1

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

現在のリリースは `3.1.1 / build 30101` です。

### Vercel版

`*.vercel.app` 上で動いていることを検出すると、起動後に自動で GitHub の `updates/latest.json` を確認します。

1. GitHub Raw の最新版マニフェストを取得
2. 現在のDev OSバージョンと比較
3. 新版がある場合、現在開いているVercel deploymentの同一オリジン `updates/latest.json` も確認
4. GitHubだけ先行している場合は「waiting for this Vercel deployment」
5. 現在のVercel配信も同じversion/buildになったら「Update and restart」が有効化
6. 更新時は現在のVercel URLをキャッシュ回避パラメータ付きで再読込

このリポジトリはVercelプロジェクト `pclocaltool` とGitHub `fuugafuu/pclocaltool` が連携されているため、`main` へのpush後にproduction deploymentが自動作成されます。

本番aliasは `https://pclocaltool.vercel.app/tools/dev-os/index.html` です。

### ローカル版

`file://` で `index.html` を開いた場合はローカルモードになります。

- `.devupdate.json` を読み込み可能
- `updates/devos-3.1.1.devupdate.json` はGitHub上の最新版マニフェストを指すポータブル更新ファイル
- Edge / Chrome など File System Access API 対応ブラウザでは Dev OS フォルダーを選択して実ファイルを更新可能
- 更新前の既存ファイルは `.devos-backup/<旧version>-<timestamp>/` に保存
- 更新元は `fuugafuu/pclocaltool` の GitHub Raw または許可済みVercel配信元のみ
- 選択したフォルダーが Dev OS 本体か `index.html` を使って検査してから書き込み

ブラウザがフォルダー書き込みAPIに対応しない場合、ローカル本体の自動上書きは行いません。

### 更新リリースの作り方

今後の修正では、以下を同時に更新します。

- 実行中アップデーターの `RELEASE.version / build`
- `updates/latest.json` の `version / build / notes / files`
- `updates/devos-X.Y.Z.devupdate.json`
- `index.html` が新しいアップデーターを読み込むこと

例：`3.1.1 → 3.1.2 → 3.2.0`。

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

`malware-advanced.js` が基礎感染モデルの上に追加の永続化・相互作用を重ねます。

- Virtual WMI subscription (`NW-WMI-Consumer`)
- `NWFilter` 仮想フィルタードライバ / Device Manager連動
- 仮想FirewallルールとVNETビーコン増加
- Run key / Scheduled Task / Service / watchdog の相互自己修復
- Task Managerで主要プロセスを終了しても残存永続化から再生成
- 偽 `DevOS-Critical-Update.devapp.html` をDownloadsへ配置
- 仮想DNSマッピング / package catalog overlay
- UpdateSvc妨害
- Event Viewerへの高頻度traceイベント
- 高感染段階でNWFilter timeout、GPU/TDR、仮想BSODへ波及

連動対象：Task Manager、Services、Startup、Run key、Scheduled Tasks、Virtual WMI、Registry Simulator、File Explorer、Dev Security、Event Viewer、Desktop、Device Manager、Dev OS Update、Boot integrity、BSOD、Automatic Repair、Safe Mode。

Dev Security のリアルタイム保護がONなら一部挙動をブロックし感染進行を遅らせます。隔離すると作成物・永続化・改変ファイル・停止サービス・GPU状態・壁紙・アイコン位置をできる限り復元します。Safe Modeでは第三者startupを抑止します。

## 安全境界

このプロジェクトは教育・遊び用シミュレーターです。

- host OS のレジストリ、サービス、プロセスを操作しない
- NightWormは実ネットワーク通信を行わず、通信表示はVNETという仮想状態のみ
- Dev OS package の任意JavaScriptを実行しない
- OS更新で書き込めるのは、ユーザーが明示的に選んだDev OSフォルダーのみ
- 更新元URLは指定GitHub repo / 許可済みVercel配信元へ制限

Dev OS内部状態は主にブラウザの `localStorage` に保存されます。
