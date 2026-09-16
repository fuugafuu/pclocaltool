'use strict';
(() => {
const C=window.AGENT_TOOL_CATALOG=window.AGENT_TOOL_CATALOG||[];
const add=(id,description,args,usage,example,notes='')=>C.push({id,description,args,group:id.split('.')[0],usage,example,notes});
add('agent.protocol_help','Agent BridgeのJSONプロトコルとaction間参照方法を詳しく返す',{},'JSON形式に迷ったとき最初に使う。','{"tool":"agent.protocol_help","args":{}}');
add('agent.search_tools','用途や単語から利用可能ツールを検索する','query,maxResults','どのツールを使うか不明なときに検索する。','{"tool":"agent.search_tools","args":{"query":"JSON ファイル 一部変更","maxResults":10}}');
add('agent.tool_help','1つのツールの引数・用途・例・注意点を返す','toolId','実行前に引数仕様を確認したいとき使う。','{"tool":"agent.tool_help","args":{"toolId":"json.file_set"}}');
add('agent.group_help','指定カテゴリのツール一覧と使い方を返す','group','file/json/project/code等をまとめて確認する。','{"tool":"agent.group_help","args":{"group":"json"}}');
add('agent.examples','代表的な作業パターンのJSON例を返す','topic','read/edit/json/diagnose/chainingから例を取得。','{"tool":"agent.examples","args":{"topic":"chaining"}}');
add('agent.recommended_workflow','作業種類に応じた安全な推奨手順を返す','task','編集・調査・JSON修正などの実行順を確認する。','{"tool":"agent.recommended_workflow","args":{"task":"既存JSの一部修正"}}');
add('agent.validate_request','Agent Bridgeへ送るリクエストJSONを検査・正規化する','text または value','生成したJSONを実行前に自己検査したいとき使う。','{"tool":"agent.validate_request","args":{"value":{"actions":[{"tool":"file.list","args":{"path":"."}}]}}}');
add('agent.suggest_tools','自然文の作業内容から候補ツールを返す','task,maxResults','ユーザー依頼から使うツール候補を絞る。','{"tool":"agent.suggest_tools","args":{"task":"package.jsonのscriptsだけ変更したい"}}');
add('agent.list_tools','利用可能な全ツールのIDと短い説明を返す','group(optional)','現在ロード済みのtoolを確認する。','{"tool":"agent.list_tools","args":{"group":"project"}}');
add('agent.list_groups','ツールカテゴリと件数を返す',{},'機能全体を把握したいとき使う。','{"tool":"agent.list_groups","args":{}}');

add('json.file_read','JSONファイルを解析してJSON値として返す','path','JSONを文字列ではなく構造化データとして読む。','{"tool":"json.file_read","args":{"path":"package.json"}}','長いJSON編集ではfile.read_textより優先。');
add('json.file_write','JSON値を正しいJSON形式でファイルへ保存する','path,value,indent','AI側で改行や引用符を手動エスケープせずJSONを書き込む。','{"tool":"json.file_write","args":{"path":"data.json","value":{"enabled":true},"indent":2}}');
add('json.file_get','JSONファイル内の指定パスだけ取得する','path,jsonPath','例: scripts.dev や users.0.name。','{"tool":"json.file_get","args":{"path":"package.json","jsonPath":"scripts.dev"}}');
add('json.file_set','JSONファイル内の指定パスだけ変更する','path,jsonPath,value,indent','JSON全体を再掲せず1項目だけ変更する。','{"tool":"json.file_set","args":{"path":"config.json","jsonPath":"ui.theme","value":"dark","indent":2}}','長いJSONの部分編集に推奨。');
add('json.file_delete','JSONファイル内の指定パスだけ削除する','path,jsonPath,indent','指定キー/配列要素だけ削除する。','{"tool":"json.file_delete","args":{"path":"config.json","jsonPath":"legacy.enabled","indent":2}}');
add('json.file_merge','JSONファイルのオブジェクトへ値をマージする','path,jsonPath,value,indent','複数キーをまとめて追加/更新する。','{"tool":"json.file_merge","args":{"path":"config.json","jsonPath":"ui","value":{"theme":"dark","compact":true}}}');
add('json.file_push','JSON配列の末尾へ値を追加する','path,jsonPath,value,indent','配列全体を書き直さず末尾追加。','{"tool":"json.file_push","args":{"path":"data.json","jsonPath":"items","value":{"id":3}}}');
add('json.file_unshift','JSON配列の先頭へ値を追加する','path,jsonPath,value,indent','配列先頭へ追加する。','{"tool":"json.file_unshift","args":{"path":"data.json","jsonPath":"items","value":{"id":0}}}');
add('json.file_insert','JSON配列の指定位置へ値を挿入する','path,jsonPath,index,value,indent','配列の途中へ追加する。','{"tool":"json.file_insert","args":{"path":"data.json","jsonPath":"items","index":1,"value":{"id":2}}}');
add('json.file_remove_index','JSON配列の指定番号を削除する','path,jsonPath,index,indent','配列から1要素だけ削除する。','{"tool":"json.file_remove_index","args":{"path":"data.json","jsonPath":"items","index":2}}');
add('json.file_format','JSONファイルを解析して整形し直す','path,indent','内容を変えずにJSONを整形する。','{"tool":"json.file_format","args":{"path":"data.json","indent":2}}');
add('json.file_validate','JSONファイルの妥当性とエラー位置を調べる','path','書込み後の検証に使う。','{"tool":"json.file_validate","args":{"path":"data.json"}}');

add('file.read_chunk','大きなテキストファイルを文字位置で分割して読む','path,startChar,maxChars','巨大ファイルを一度にAIへ返さないために使う。','{"tool":"file.read_chunk","args":{"path":"app.js","startChar":0,"maxChars":12000}}');
add('file.read_around','検索文字列の前後だけを行単位で読む','path,search,beforeLines,afterLines,occurrence','編集対象の周辺だけ取得する。','{"tool":"file.read_around","args":{"path":"app.js","search":"function startGame","beforeLines":8,"afterLines":30,"occurrence":1}}');
add('file.read_matches','検索語に一致する各箇所の周辺文脈を返す','path,search,beforeLines,afterLines,maxResults','同名コードが複数あるか確認する。','{"tool":"file.read_matches","args":{"path":"app.js","search":"render()","beforeLines":2,"afterLines":4,"maxResults":10}}');
add('file.apply_edits','1ファイルへ複数の完全一致置換を安全に順番適用する','path,edits,dryRun','edits=[{find,replace,expectedCount}]。一致数違いなら全体を中止。','{"tool":"file.apply_edits","args":{"path":"app.js","dryRun":true,"edits":[{"find":"const a=1;","replace":"const a=2;","expectedCount":1}]}}');
add('file.patch_by_context','前後文脈を含めて対象を一意確認して部分置換する','path,before,target,after,replace,dryRun','target単体が複数あっても前後文脈で場所を限定する。','{"tool":"file.patch_by_context","args":{"path":"app.js","before":"function run(){","target":"return false;","after":"}","replace":"return true;","dryRun":true}}');
add('file.write_if_unchanged','SHA-256が確認時と同じ場合だけファイルを書き込む','path,text,expectedSha256','読み取り後に他の変更が入った場合の上書きを防止。','{"tool":"file.write_if_unchanged","args":{"path":"app.js","text":"...","expectedSha256":"..."}}');
add('file.append_lines','文字列配列を改行区切りで末尾へ追加する','path,lines,finalNewline','長い改行テキストを1つのJSON文字列へ詰め込まず追加する。','{"tool":"file.append_lines","args":{"path":"notes.txt","lines":["one","two"],"finalNewline":true}}');
add('file.prepend_lines','文字列配列を改行区切りで先頭へ追加する','path,lines,finalNewline','複数行を安全に先頭へ追加。','{"tool":"file.prepend_lines","args":{"path":"notes.txt","lines":["header","---"]}}');
add('file.write_lines','文字列配列を改行区切りでファイル保存する','path,lines,finalNewline','複数行をJSON配列として渡せるためエスケープ事故を減らす。','{"tool":"file.write_lines","args":{"path":"notes.txt","lines":["line1","line2"],"finalNewline":true}}');
add('file.ensure_text','ファイルに指定文字列が無ければ追加する','path,text,position','positionは start/end。重複追加を防ぐ。','{"tool":"file.ensure_text","args":{"path":"style.css","text":"\n/* marker */\n","position":"end"}}');

add('project.find_text_files','テキストとして扱いやすいファイルだけ列挙する','path,maxFiles','バイナリらしい拡張子を避けて調査対象を取得。','{"tool":"project.find_text_files","args":{"path":".","maxFiles":300}}');
add('project.read_changed_files','このセッションで変更したファイル内容をまとめて返す','maxCharsPerFile,maxFiles','編集後レビュー用。','{"tool":"project.read_changed_files","args":{"maxCharsPerFile":12000,"maxFiles":20}}');
add('project.read_by_extension','指定拡張子のファイルを上限付きでまとめて読む','path,extensions,maxFiles,maxCharsPerFile','例: html/cssだけ確認する。','{"tool":"project.read_by_extension","args":{"path":".","extensions":[".html",".css"],"maxFiles":20,"maxCharsPerFile":8000}}');
add('project.quick_context','AIが作業開始時に必要なプロジェクト概要をまとめて取得する','path,maxFiles','最初の調査を1ツールで行う。','{"tool":"project.quick_context","args":{"path":".","maxFiles":300}}');
add('project.verify_after_edit','変更ファイル中心にJSON/JS/HTML/CSSの基本診断をまとめて行う','maxResults','編集後に毎回実行する推奨検査。','{"tool":"project.verify_after_edit","args":{"maxResults":200}}');

add('text.diff_lines','2つのテキストを行単位で比較する','a,b,maxDiffs','編集前後の差分確認に使う。','{"tool":"text.diff_lines","args":{"a":"one\ntwo","b":"one\nTHREE","maxDiffs":50}}');
add('text.context_excerpt','文字列中の検索語周辺だけ抜き出す','text,search,beforeLines,afterLines,occurrence','ファイル以外の長文結果を絞り込む。','{"tool":"text.context_excerpt","args":{"text":"...","search":"error","beforeLines":3,"afterLines":5}}');
add('text.replace_preview','文字列置換を実際には変更せず件数とプレビューだけ返す','text,search,replace,maxPreview','置換内容を事前確認する。','{"tool":"text.replace_preview","args":{"text":"abc abc","search":"abc","replace":"xyz"}}');
})();
