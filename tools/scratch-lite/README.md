# Scratch Lite Launcher

Scratch/TurboWarp プロジェクトを、編集画面を出さずに再生する軽量ランチャーです。

## 主な機能

- `.sb3` / `.sb2` / `.sb` ファイル読み込み
- Scratch / TurboWarp URL またはプロジェクトID読み込み
- 直接URL読み込み（CORSで許可されているURLのみ）
- 読み込み前に `project.json` を先読みして作品の重さを推定
- CPU論理コア数、メモリ目安、作品規模から自動設定
- TurboWarpコンパイラを常時利用
- 30 FPS互換を基本に、描画品質・補間・高品質ペン・クローン上限を自動調整
- ターボモード、Warpタイマー、クローン上限、Fencing、Misc limits を手動調整可能
- ブロック/コード/スプライト一覧を表示しない再生専用UI
- 一度開いた作品をIndexedDBへ保存し「最近開いたプロジェクト」から1タップ再読込
- URL/プロジェクトIDも取得済みデータを優先して再利用
- 保存済み解析結果も再利用するため2回目は再解析不要
- Service Workerでランタイムをキャッシュ
- 「オフラインHTMLを書き出す」でScaffolding with-musicを埋め込んだ単一HTMLを生成

## オート最適化

AUTOでは、カスタムFPSで作品速度を壊さないことを優先して通常30 FPSを維持します。
負荷が高いときは描画品質を段階的に下げ、補間や高品質ペンをOFFにします。
ペンや3D系を検出した作品では、補間を原則OFFにします。

## ローカル動作

### 一番簡単
Web版を一度開き、設定の **オフラインHTMLを書き出す** を使います。
生成された `scratch-lite-offline.html` は単一ファイルで、ローカルの `.sb3/.sb2/.sb` をネット無しで再生できます。

### このフォルダを直接配布する場合
`vendor/scaffolding-min.js` を置けば、ローカルHTTPサーバーでも外部CDN無しで起動できます。
通常の公開版では公式jsDelivrからTurboWarp Scaffolding 0.4.0を取得し、ブラウザキャッシュへ保存します。

## 注意

- ScratchのカスタムFPSは作品のロジック速度を変える場合があるため、AUTOでは30 FPSを基本にします。
- 高品質ペンは負荷が高いため、AUTOでは高性能端末かつ軽量なペン作品に限定します。
- URL直接読み込みは配信元のCORS設定に依存します。
- Scratchの未共有プロジェクトはIDだけでは取得できません。ファイル保存して読み込んでください。
- 本ツールはScratch Foundationとは無関係です。

## ライセンス

TurboWarp Scaffoldingは Mozilla Public License 2.0 (MPL-2.0) です。
詳細は `THIRD_PARTY_LICENSES.md` を参照してください。
