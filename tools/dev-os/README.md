# Dev OS Lab

PC Local Tool の完全ローカル仮想OSシミュレーターです。本物のWindows、学校PCの管理設定、実際のBIOS/UEFI、セキュリティ機能には一切アクセスしません。すべてブラウザ内の仮想状態です。

## 主な機能

- POST / UEFI風ブート画面
- 仮想BIOS/UEFI: Secure Boot、TPM、Virtualization、Fast Boot、Boot order、ファンプロファイル
- ロック画面 / デスクトップ / スタートメニュー / タスクバー
- タスクマネージャー: プロセス、パフォーマンス、サービス、スタートアップ、プロセス終了
- セキュリティセンター: Defender風状態、Firewall、Secure Boot、TPM、スキャン、検疫履歴
- イベントビューアー: System / Application / Security / Setup、レベル・イベントID・ソース・検索
- Services: start / stop、起動種類
- デバイスマネージャー: 仮想ドライバと状態
- ファイルエクスプローラー: 仮想ファイルツリー
- ターミナル: help、dir、cd、type、systeminfo、tasklist、sc、eventlog、sfc、chkdsk、crash など
- BSODシミュレーター: Stop code、ダンプ進行、イベントログ連携
- 自動修復 / セーフモード
- 仮想レジストリ・ブート状態・イベント履歴
- localStorage に仮想OS状態を保存

## 安全性

このツールは教育・遊び用のシミュレーターです。ブラウザ外のファイル、レジストリ、プロセス、BIOS、ネットワーク制限、学校の管理設定を変更・回避する機能はありません。
