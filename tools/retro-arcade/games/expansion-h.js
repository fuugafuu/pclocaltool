'use strict';
(() => {
const G=window.RetroGameKit;
const m=(id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg={})=>({id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg});
G.registerMany([
m('golden-axe','Golden Axe',1989,'ARCADE','Beat ’em up','platform','剣や魔法を使い複数の敵を倒しながら進むベルトアクション風。','敵との間合いを詰め、近距離攻撃で突破する。','コンボと短時間防御を追加。','←→ / ↑ / スペース','最寄り敵へ近づき攻撃',{enemies:16,levelW:2700,beat:true,jump:250,gravity:700}),
m('final-fight','Final Fight',1989,'ARCADE','Beat ’em up','platform','街中を右へ進み群がる敵を倒すベルトアクション風。','敵を一体ずつ処理しながら前進する。','コンボ・危険方向表示を追加。','←→ / ↑ / スペース','最寄り敵へ近づき連続攻撃',{enemies:18,levelW:2800,beat:true,jump:240,gravity:720}),
m('prince-persia','Prince of Persia',1989,'COMPUTER','Platform','platform','慣性と着地を重視して罠の多い遺跡を進むアクション風。','ジャンプ距離と着地位置を慎重に読む。','着地点補助と短い復帰補助を追加。','←→ / ↑','障害前で跳び安全に前進',{enemies:8,levelW:2600,jump:320,gravity:780}),
m('simcity','SimCity',1989,'COMPUTER','Simulation','strategy','都市区画を配置し人口と資源を伸ばす都市運営シミュレーション風。','資源を使い住宅と生産区画を増やす。','状態表示と自動配置補助を追加。','クリック','人口と資源を見て建設',{goal:70,pressure:.35}),
m('mega-man-3','Mega Man 3',1990,'FAMICOM','Platform','platform','射撃とジャンプで多彩な敵配置を突破する横アクション風。','敵の間合いを読みながら前進する。','危険表示と連続撃破を追加。','←→ / ↑ / スペース','敵接近で攻撃し前進',{enemies:16,levelW:2850,jump:350,gravity:760,beat:true}),
m('castlevania-3','Castlevania III',1989,'FAMICOM','Platform','platform','分岐や高難度の足場を越えるゴシック横アクション風。','敵と穴を見て慎重にジャンプする。','ルート表示と復帰補助を追加。','←→ / ↑ / スペース','敵接近で攻撃し障害前でジャンプ',{enemies:16,levelW:2800,jump:315,gravity:790,beat:true}),
m('phantasy-star-2','Phantasy Star II',1989,'MEGA DRIVE','RPG','adventure','SF世界を探索し仲間と目的を追うRPG風。','敵を倒し重要物を集めて出口へ進む。','目的表示と危険度表示を追加。','矢印 / スペース','未回収目標優先で戦闘',{items:8,enemies:10,tough:true}),
m('raiden','Raiden',1990,'ARCADE','Shooter','scrollShooter','縦スクロールで大量の敵機を迎撃するSTG風。','弾幕を避けながら前方へ進む。','強化弾と危険弾表示を追加。','矢印 / スペース','中央付近を維持し連射',{vertical:true,enemySpeed:145,fireRate:.12,tough:true}),
m('pilotwings','Pilotwings',1990,'SUPER FAMICOM','Simulation','racer','飛行課題をこなし着地点やコースを狙うフライト訓練風。','速度と進路を調整して目標距離を進む。','進路表示とブースト区間を追加。','←→ / ↑↓','障害物を避け目標速度維持',{lanes:5,maxSpeed:220,lapLength:4200}),
m('actraiser','ActRaiser',1990,'SUPER FAMICOM','Action','platform','横アクションと街の成長を組み合わせた雰囲気を持つアクション風。','敵を倒しながらステージを前進する。','目的表示とコンボを追加。','←→ / ↑ / スペース','敵へ攻撃しながら前進',{enemies:13,levelW:2500,jump:330,gravity:730,beat:true}),
m('f-zero','F-Zero',1990,'SUPER FAMICOM','Racing','racer','高速反重力マシンで未来コースを走るレース風。','高速走行と車線変更で障害をかわす。','ブーストと危険車線表示を追加。','←→ / ↑↓','接触を避け最高速を維持',{lanes:5,maxSpeed:340,lapLength:7000}),
m('super-mario-world','Super Mario World',1990,'SUPER FAMICOM','Platform','platform','広い横スクロールステージを走り跳んで進むアクション風。','敵や穴を越えながらゴールを目指す。','着地点表示と回収コンボを追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:14,levelW:3000,jump:365,gravity:800}),
m('wing-commander','Wing Commander',1990,'COMPUTER','Shooter','scrollShooter','宇宙戦闘機で敵を追い射撃するスペースコンバット風。','敵弾を避けて目標を迎撃する。','危険軌道表示と短時間強化弾を追加。','矢印 / スペース','敵弾を避けながら射撃',{enemySpeed:150,fireRate:.12,tough:true}),
m('commander-keen','Commander Keen',1990,'COMPUTER','Platform','platform','軽快に跳びながら敵や障害を越えるPC横アクション風。','足場と敵配置を読んで前進する。','危険表示と着地点補助を追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:11,levelW:2500,jump:355,gravity:730}),
m('lemmings','Lemmings',1991,'COMPUTER','Puzzle','strategy','集団を安全に出口へ導くパズル的管理ゲーム風。','限られた資源を配置し全体の生存を伸ばす。','状態表示と自動配置補助を追加。','クリック','不足している設備を優先配置',{goal:55,pressure:.6}),
m('sonic','Sonic the Hedgehog',1991,'MEGA DRIVE','Platform','platform','速度を乗せて坂や障害を駆け抜ける高速横アクション風。','勢いを維持しながら敵や段差を越える。','速度表示と着地点予告を追加。','←→ / ↑','高速前進し障害前でジャンプ',{enemies:12,levelW:3200,jump:350,gravity:760,slippery:true}),
m('street-fighter-2','Street Fighter II',1991,'ARCADE','Fighting','fighter','個性的な技を持つキャラクター同士が1対1で戦う対戦格闘風。','間合い・軽攻撃・強攻撃を使い分ける。','コンボ表示と入力猶予を追加。','←→ / ↑ / スペース / X','間合いを詰め隙で攻撃',{time:75,light:7,heavy:15,speed:180,aiAggro:2.4}),
m('civilization','Sid Meier’s Civilization',1991,'COMPUTER','Strategy','strategy','都市を育てながら資源と人口を伸ばす文明発展戦略風。','限られた資源で区画を増やし目標人口を目指す。','進捗と脅威表示、自動配置補助を追加。','クリック','資源と人口を見て区画を配置',{goal:85,pressure:.55}),
m('another-world','Another World',1991,'COMPUTER','Adventure','platform','危険な世界を走り跳びながら生き延びるシネマティックアクション風。','タイミングを読んで敵や罠を越える。','着地点補助と危険表示を追加。','←→ / ↑ / スペース','敵接近で攻撃し障害前でジャンプ',{enemies:10,levelW:2500,jump:320,gravity:760,beat:true}),
m('micro-machines','Micro Machines',1991,'COMPUTER / CONSOLE','Racing','racer','小さな乗り物で机や家庭用品の上を走るトップビュー系レース風。','狭いコースで接触を避け周回する。','危険車線表示とブーストを追加。','←→ / ↑↓','障害を避け最高速を維持',{lanes:4,maxSpeed:245,lapLength:3600}),
m('streets-rage','Streets of Rage',1991,'MEGA DRIVE','Beat ’em up','platform','街を進みながら複数の敵と戦うベルトアクション風。','接近戦を繰り返し画面右へ進む。','コンボと危険方向表示を追加。','←→ / ↑ / スペース','最寄り敵へ近づき攻撃',{enemies:17,levelW:2800,beat:true,jump:250,gravity:700}),
m('sensible-soccer','Sensible Soccer',1992,'COMPUTER','Sports','sports','素早いパスと移動で得点を狙う見下ろしサッカー風。','ボールへ寄り相手ゴールへ運ぶ。','得点差・残り時間表示を強化。','矢印 / スペース','ボールへ寄りゴール方向へ蹴る',{time:70,ballSpeed:340,aiSpeed:140}),
m('mortal-kombat','Mortal Kombat',1992,'ARCADE','Fighting','fighter','重い攻撃と間合いを意識する1対1格闘風。','軽打と強打を使い分けて体力を削る。','コンボ表示と攻撃予告を追加。','←→ / ↑ / スペース / X','間合いを詰め強弱攻撃',{time:80,light:8,heavy:17,speed:170,aiAggro:2.6}),
m('wolfenstein-3d','Wolfenstein 3D',1992,'COMPUTER','FPS','raycast','迷路状の室内を一人称視点で進み敵を撃つFPS風。','旋回・前後移動・射撃で敵を排除する。','照準、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し距離を詰めて射撃',{enemies:7,ammo:70}),
m('kirbys-dream-land','Kirby’s Dream Land',1992,'GAME BOY','Platform','platform','やさしい操作感で敵や足場を越えて進む横アクション風。','ジャンプで敵を避けながらゴールへ進む。','着地点表示と回収ボーナスを追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:9,levelW:2300,jump:345,gravity:650}),
m('super-mario-kart','Super Mario Kart',1992,'SUPER FAMICOM','Racing','racer','キャラクターとアイテム要素を組み合わせたカートレース風。','車線と速度を管理し他車を抜いて周回する。','ブースト区間と危険車線表示を追加。','←→ / ↑↓','他車を避け最高速維持',{lanes:5,maxSpeed:285,lapLength:5200}),
m('alone-dark','Alone in the Dark',1992,'COMPUTER','Adventure','adventure','屋敷を探索し危険を避けながら重要物を集めるホラーアドベンチャー風。','敵を避けつつ必要物を集め出口へ。','目的表示と危険度表示を追加。','矢印 / スペース','目標物優先で安全経路を選ぶ',{items:6,enemies:5,tough:true}),
m('dune-2','Dune II',1992,'COMPUTER','Strategy','strategy','資源を増やし拠点を築くリアルタイム戦略風。','資源配分と生産施設配置で人口・戦力を伸ばす。','状態表示と自動建設補助を追加。','クリック','資源余裕に応じて施設配置',{goal:75,pressure:.8}),
m('dr-mario','Dr. Mario',1990,'FAMICOM / GAME BOY','Puzzle','puzzle','色を合わせて縦横につなぎ消す落下パズル風。','落下する2色の組を配置し同色を4つ以上つなげる。','連鎖表示と落下補助を追加。','←→ / ↑ 回転 / ↓ 落下','盤面の高さと隣接色を評価して配置',{cols:8,rows:16,objective:'同じ色を4つつなげる'}),
m('ultima-6','Ultima VI',1990,'COMPUTER','RPG','adventure','広い世界を探索し目的物を集めるコンピューターRPG風。','探索と戦闘を進めて重要地点へ到達する。','目的表示と危険度表示を追加。','矢印 / スペース','未回収目標を優先し敵を処理',{items:8,enemies:9,tough:true})
]);
})();