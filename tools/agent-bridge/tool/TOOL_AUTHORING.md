# Agent Bridge custom tool authoring

Agent Bridge は、作業フォルダ内の `tool/*.agenttool.json` を読み込み、AIへ渡す利用可能ツール一覧に自動追加します。

学校PC向けビルドでは安全のため、カスタムツールから任意JavaScript・Python・Shellは実行しません。カスタムツールは「既存の内蔵ツールを順番に呼ぶマクロ」です。

## 最小例

`tool/read-and-count.agenttool.json`

```json
{
  "id": "custom.read_and_count",
  "description": "テキストファイルを読み、文字数を返す",
  "args": {
    "path": "対象ファイル"
  },
  "steps": [
    {
      "tool": "file.read_text",
      "args": {"path": "{{args.path}}"}
    },
    {
      "tool": "text.char_count",
      "args": {"text": "{{steps.0.result.text}}"}
    }
  ]
}
```

保存後、Agent Bridgeで「toolフォルダ再読込」を押すと `custom.read_and_count` がAI用説明に追加されます。

## 形式

- `id`: `a-z A-Z 0-9 _ . -` のみ、3〜80文字。既存ツールと重複させない。
- `description`: AIが用途を判断する説明。
- `args`: AIへ見せる引数メモ。自由なJSONオブジェクトでよい。
- `steps`: 最大25個。各要素は `{ "tool": "内蔵tool ID", "args": {...} }`。

## テンプレート

文字列の中で次が使えます。

- `{{args.path}}` : AIから受け取った引数
- `{{steps.0.result}}` : 1個目のステップ結果
- `{{steps.1.result.text}}` : 2個目のステップ結果内の `text`

値全体が `{{...}}` だけの場合は、配列やオブジェクトもそのまま次のツールへ渡されます。

## 例: READMEのTODO抽出

```json
{
  "id": "custom.readme_todos",
  "description": "README.mdのTODO/FIXMEを抽出",
  "args": {},
  "steps": [
    {"tool":"file.read_text","args":{"path":"README.md"}},
    {"tool":"code.todo","args":{"text":"{{steps.0.result.text}}"}}
  ]
}
```

## 設計上の制限

- カスタムツールから別のカスタムツールは呼べません。
- `../` で作業フォルダ外へ出るパスは拒否されます。
- ネットワークアクセス、OSコマンド、PowerShell、cmd、Python実行は学校PC版では提供しません。
- 直接編集がブラウザ/学校ポリシーで禁止されている場合、読み込み専用モードで実行し、変更ファイルをダウンロードして使います。

## AIとの基本ループ

1. Agent Bridgeで作業フォルダを選ぶ。
2. 「AI用説明をコピー」を押してAIへ送る。
3. AIからJSONだけを受け取る。
4. JSONを貼り付けて「実行」。
5. 結果JSONがコピーされるのでAIへ送る。
6. 作業が終わるまで3〜5を繰り返す。
