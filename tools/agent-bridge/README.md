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

内蔵ツールは **187種類** です。

主なカテゴリ:

- `file.*` ファイル/フォルダ操作、部分編集、安全な完全一致パッチ、ハッシュ、比較
- `text.*` 文字列変換、検索、不可視文字、括弧/引用符/インデント診断
- `json.*` JSON処理とファイル検証
- `csv.*` CSV処理と列数整合性チェック
- `html.*` HTML解析、重複ID、未閉じタグ、alt/label、ローカル参照
- `css.*` CSS括弧、重複プロパティ、`!important`、URL、カスタムプロパティ診断
- `code.*` JavaScript構文確認、console/debugger/eval、重複宣言、行長、空白診断
- `util.*` 配列・数値・日時
- `project.*` プロジェクト調査、参照切れ、JSON/JS一括検査、総合診断

基本123ツールは `tool/catalog.js`、追加診断64ツールは `tool/catalog-diagnostics.js` に定義されています。実装は `tool/runtime-*.js` に分割しています。

## エラーチェック推奨フロー

AIには次の順番で作業させると安全です。

1. `project.summary` や `file.tree` で構造を把握
2. `file.read_text` / `file.read_lines` で対象を確認
3. 大きな置換は `file.apply_patch_exact` または `file.safe_replace` を `dryRun:true` で事前確認
4. 実編集
5. `project.changed_diagnostics` で変更ファイルだけ検査
6. 必要に応じて `project.diagnostics` でプロジェクト全体を再検査

### 主な診断

- JavaScript構文エラー
- JSON構文エラー
- HTML重複ID
- HTML未閉じタグ/閉じ順異常
- HTMLローカル `src` / `href` 参照切れ
- `img` のalt不足
- label未接続のフォーム入力
- type未指定button
- CSS波括弧異常
- CSS重複プロパティ
- 未定義CSSカスタムプロパティ使用
- CSV列数不一致
- 行末空白/長すぎる行
- LF/CRLF混在
- 不可視文字/制御文字
- `console.*` / `debugger` / `eval` 等の残存
- 大文字小文字だけ違うファイル名衝突
- 空ファイル/巨大ファイル/重複ファイル

`code.js_syntax` はJavaScriptを実行せず、クラシックスクリプトとして構文解析します。ES moduleの `import` / `export` がある場合は、ブラウザ単体版では完全なモジュール解析をせず、構造チェック結果を返します。

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
    {"id":"a2","tool":"project.diagnostics","args":{"path":".","maxFiles":300}}
  ]
}
```

安全な部分編集例:

```json
{
  "version": 1,
  "actions": [
    {
      "id":"patch-check",
      "tool":"file.apply_patch_exact",
      "args":{
        "path":"app.js",
        "find":"const oldValue = false;",
        "replace":"const oldValue = true;",
        "expectedCount":1,
        "dryRun":true
      }
    }
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
