# Agent Bridge

学校PCでも使いやすい、完全ブラウザ型の「手動エージェント・ブリッジ」です。

## 基本の使い方

```text
作業フォルダ選択
  ↓
「AI用説明をコピー」→ AIへ送る
  ↓
AIの最初の返答はJSONではなく
「何を作成・修正・調査したいですか？」
  ↓
ユーザーが具体的な依頼を伝える
  ↓
AIが必要なtool actionをJSONで返す
  ↓
Agent Bridgeへ貼る → 実行
  ↓
結果JSONを自動コピー → AIへ返す
  ↓
必要なら次のJSON
  ↓
作業完了時はAIがJSONをやめて通常文で報告
```

「詳細説明をコピー」を使うと、追加ツールの使い方・例・注意点までAIへ渡せます。

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

内蔵ツールは **227種類** です。

- `file.*` ファイル/フォルダ操作、部分編集、安全パッチ、分割読込、比較、ハッシュ
- `text.*` 文字列変換、検索、差分、文脈抽出、不可視文字、括弧/引用符診断
- `json.*` JSON処理、JSONファイルの構造化部分編集
- `csv.*` CSV処理と列数整合性チェック
- `html.*` HTML解析、重複ID、未閉じタグ、alt/label、ローカル参照
- `css.*` CSS括弧、重複プロパティ、`!important`、URL、カスタムプロパティ診断
- `code.*` JavaScript構文確認、console/debugger/eval、重複宣言、行長、空白診断
- `util.*` 配列・数値・日時
- `project.*` プロジェクト調査、参照切れ、JSON/JS一括検査、総合診断、編集後検査
- `agent.*` ツール検索、詳しいヘルプ、JSONプロトコル説明、候補ツール提案

定義:

- `tool/catalog.js` 基本123ツール
- `tool/catalog-diagnostics.js` 診断64ツール
- `tool/catalog-agent.js` Agent/構造化編集40ツール

## JSONが失敗しにくい入力方式

以前は `JSON.parse()` 一発だったため、少しでも形式がずれると失敗していました。現在は次を受け付けます。

### 標準形式

```json
{"version":1,"actions":[{"tool":"file.list","args":{"path":"."}}]}
```

### 単一action

```json
{"tool":"file.list","args":{"path":"."}}
```

### action配列

```json
[
  {"tool":"file.list","args":{"path":"."}},
  {"tool":"project.summary","args":{"path":"."}}
]
```

### その他

- ```json のコードブロック付き
- JSONの前後に短い説明文が付いている
- `//` / `/* */` コメント
- 末尾カンマ
- 1行1actionのJSON Lines
- `args` の代わりに `arguments` / `parameters`
- `tool` の代わりに `name` / `toolId`

「JSONを正規化」ボタンで、貼り付けた入力を標準形式へ変換できます。

## 長いJSONを小さくする

通常action同士でも前の結果を参照できます。

```json
{
  "version":1,
  "actions":[
    {"id":"a1","tool":"file.read_text","args":{"path":"README.md"}},
    {"id":"a2","tool":"text.char_count","args":{"text":"{{results.a1.result.text}}"}}
  ]
}
```

文字列全体が `{{...}}` の場合は、配列やオブジェクトも文字列化せずそのまま渡します。

1回に大量actionや巨大本文を詰め込まず、原則3〜10 actions程度で結果を見ながら続けるのを推奨します。

## JSONファイルは構造化編集を優先

長いJSONファイルを `file.write_text` で全文再生成すると、引用符・改行・エスケープ事故が起きやすくなります。

### 1項目だけ変更

```json
{
  "tool":"json.file_set",
  "args":{
    "path":"config.json",
    "jsonPath":"ui.theme",
    "value":"dark"
  }
}
```

### 一部だけ読む

```json
{
  "tool":"json.file_get",
  "args":{
    "path":"package.json",
    "jsonPath":"scripts"
  }
}
```

### オブジェクトをまとめてマージ

```json
{
  "tool":"json.file_merge",
  "args":{
    "path":"config.json",
    "jsonPath":"ui",
    "value":{"theme":"dark","compact":true}
  }
}
```

配列には `json.file_push` / `json.file_unshift` / `json.file_insert` / `json.file_remove_index` を使えます。

## 大きなファイル

全文を一度に返さず、次を使います。

- `file.read_chunk` : 文字数で分割読込
- `file.read_around` : 検索語の前後だけ取得
- `file.read_matches` : 複数一致箇所の周辺を取得
- `file.preview` : 先頭/末尾/指定行周辺を取得

## 安全な部分編集

- `file.apply_patch_exact` : 完全一致・一致数確認・dry-run
- `file.apply_edits` : 複数の完全一致編集をまとめて検査してから適用
- `file.patch_by_context` : 前後文脈込みで一意確認して置換
- `file.safe_replace` : 期待一致数を指定した置換
- `file.write_if_unchanged` : SHA-256が変わっていない場合だけ上書き

まず `dryRun:true` で確認し、その結果をAIへ返してから本適用するのが安全です。

## AIがツールの使い方に迷った場合

```json
{"tool":"agent.search_tools","args":{"query":"JSON ファイル 一部変更"}}
```

候補が見つかったら:

```json
{"tool":"agent.tool_help","args":{"toolId":"json.file_set"}}
```

詳細な引数・使用例・注意点を取得できます。

カテゴリ一覧は `agent.list_groups`、カテゴリ別ヘルプは `agent.group_help`、プロトコルそのものは `agent.protocol_help` です。

## 推奨作業フロー

1. `project.quick_context` で全体把握
2. `file.read_around` / `file.read_lines` / `json.file_get` で対象だけ読む
3. `agent.tool_help` で不明な引数を確認
4. `dryRun:true` で部分編集を確認
5. 実編集
6. `project.verify_after_edit` で変更ファイルを検査
7. 必要なら `project.diagnostics` で全体検査
8. 問題なければAIはJSON出力を終了し、通常の日本語で完了報告

## カスタムツール

作業フォルダ内の `tool/*.agenttool.json` を「toolフォルダ再読込」で自動認識します。

```text
project/
├ index.html
├ src/
└ tool/
   └ my-tool.agenttool.json
```

詳しい作り方は `tool/TOOL_AUTHORING.md` を参照してください。

1回につき最大50アクション、カスタムマクロは最大25ステップです。通常は巨大な1バッチではなく小さく分割してください。
