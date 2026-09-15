# Agent Bridge

学校PCでも使いやすい、完全ブラウザ型の「手動エージェント・ブリッジ」です。

## 目的

外部AIに最初に Agent Bridge の使い方とツール一覧を渡し、AIが返したJSONを貼り付けて実行します。実行結果はJSONとして返し、次のAI入力へコピーします。

```text
作業フォルダ選択
  ↓
AI用説明をコピー → AIへ送る
  ↓
AI: JSON actions
  ↓
Agent Bridgeへ貼る → 実行
  ↓
result JSONをコピー → AIへ送る
  ↓
繰り返し
```

## 学校PC向け

- インストール不要
- `index.html` を直接開いて利用可能
- 管理者権限不要
- shell / cmd / PowerShell / Python実行なし
- ネットワークツールなし
- 学校PCの制限を回避する機能なし
- AIがアクセスできるのはユーザーが選んだ作業フォルダだけ
- `../` で作業フォルダ外へ出るパスは拒否

### 直接編集モード

Chrome / Edge で `showDirectoryPicker` が許可されている場合、選んだフォルダへ直接保存します。

### 読み込み専用モード

学校側のブラウザポリシーなどで直接編集が使えない場合、`webkitdirectory` でフォルダを読み込みます。編集内容はブラウザのメモリ上で保持され、変更ファイルをダウンロードできます。

## 内蔵ツール

`tool/catalog.js` に123種類のツール定義があります。

主なカテゴリ:

- `file.*` ファイル/フォルダ操作
- `text.*` 文字列変換・検索
- `json.*` JSON処理
- `csv.*` CSV処理
- `html.*` HTML解析
- `code.*` コード構造調査
- `util.*` 配列・数値・日時
- `project.*` プロジェクト調査

実装は `tool/runtime-*.js` に分割しています。

## カスタムツール

作業フォルダに次の形式で追加できます。

```text
project/
├ index.html
├ src/
└ tool/
   └ my-tool.agenttool.json
```

Agent Bridgeの「toolフォルダ再読込」で自動認識し、AIへコピーする利用可能ツール一覧にも追加されます。

詳しい作り方は `tool/TOOL_AUTHORING.md` を参照してください。

## JSON protocol

AIから受け取る例:

```json
{
  "version": 1,
  "actions": [
    {"id":"a1","tool":"file.list","args":{"path":"."}},
    {"id":"a2","tool":"file.read_text","args":{"path":"README.md"}}
  ]
}
```

Agent Bridgeの返却例:

```json
{
  "version": 1,
  "ok": true,
  "workspace": "my-project",
  "results": [
    {"id":"a1","tool":"file.list","ok":true,"result":[]}
  ]
}
```

1回につき最大50アクション、カスタムマクロは最大25ステップです。
