'use strict';
(() => {
const G=window.RetroGameKit;
const m=(id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg={})=>({id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg});
G.registerMany([
m('doom','DOOM',1993,'COMPUTER','FPS','raycast','迷路状の施設を高速で進み敵を撃破するFPS風。','旋回・前後移動・射撃で敵を排除する。','照準表示、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し射撃',{enemies:9,ammo:90,tough:true}),
m('myst','Myst',1993,'COMPUTER','Adventure','adventure','静かな島を探索し重要な手掛かりを集める謎解きアドベンチャー風。','敵より探索と収集を重視して出口を探す。','目的表示と進捗表示を追加。','矢印 / スペース','未回収目標を優先して移動',{items:8,enemies:1}),
m('star-fox','Star Fox',1993,'SUPER FAMICOM','Shooter','scrollShooter','奥方向へ進みながら敵を撃つレールシューティング風。','上下左右移動で障害と敵弾を避ける。','危険軌道表示と短時間強化弾を追加。','矢印 / スペース','弾を避けながら正面敵を攻撃',{enemySpeed:155,fireRate:.12,tough:true}),
m('secret-mana','Secret of Mana',1993,'SUPER FAMICOM','RPG','adventure','フィールド探索とリアルタイム戦闘を組み合わせるアクションRPG風。','敵を処理しながら重要物を回収して進む。','目的表示と危険度表示を追加。','矢印 / スペース','目標物優先で隣接敵を攻撃',{items:7,enemies:9,tough:true}),
m('fifa-international','FIFA International Soccer',1993,'MEGA DRIVE / SNES','Sports','sports','チームでボールを運び相手ゴールへ得点するサッカーゲーム風。','ボールへ寄り、相手ゴール方向へ運ぶ。','残り時間・得点差・シュート補助を追加。','矢印 / スペース','ボールへ寄りゴール方向へ蹴る',{time:75,ballSpeed:350,aiSpeed:145}),
m('virtua-fighter','Virtua Fighter',1993,'ARCADE','Fighting','fighter','立体的な間合いを意識した1対1格闘風。','軽打・強打・移動で相手の体力を削る。','コンボ表示と入力猶予を追加。','←→ / ↑ / スペース / X','間合いを詰め隙で攻撃',{time:70,light:7,heavy:15,speed:180,aiAggro:2.5}),
m('day-tentacle','Day of the Tentacle',1993,'COMPUTER','Adventure','adventure','複数の場所を調べ目的物を集めるコミカルなポイント＆クリック系冒険風。','探索と収集を進めて出口へ到達する。','目的一覧と進捗表示を追加。','矢印 / スペース','未回収目標を優先して移動',{items:9,enemies:1}),
m('xcom-ufo','X-COM: UFO Defense',1994,'COMPUTER','Strategy','strategy','資源管理と対敵準備を組み合わせる戦術戦略風。','限られた資源で生産区画を増やし脅威へ備える。','脅威ゲージと自動配置補助を追加。','クリック','脅威と資源を見て施設配置',{goal:80,pressure:1.0}),
m('donkey-kong-country','Donkey Kong Country',1994,'SUPER FAMICOM','Platform','platform','高速で走り跳びながら敵や足場を越える横アクション風。','前進とジャンプのリズムでゴールを目指す。','着地点表示と回収コンボを追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:13,levelW:2900,jump:355,gravity:790}),
m('earthbound','EarthBound',1994,'SUPER FAMICOM','RPG','adventure','現代的な街や道を探索し仲間と目的を進めるRPG風。','敵を避けつつ重要物を集めて出口へ進む。','目的表示と危険度表示を追加。','矢印 / スペース','目標物優先で敵を処理',{items:7,enemies:8}),
m('warcraft','Warcraft: Orcs & Humans',1994,'COMPUTER','Strategy','strategy','資源を増やして拠点を育てるリアルタイム戦略風。','生産区画を増やし脅威へ備える。','脅威表示と自動建設補助を追加。','クリック','資源量に応じて施設配置',{goal:80,pressure:.95}),
m('doom-2','DOOM II',1994,'COMPUTER','FPS','raycast','より密度の高い敵配置を突破する高速FPS風。','旋回・移動・射撃で敵を一掃する。','照準表示、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し連射',{enemies:12,ammo:110,tough:true}),
m('tekken','Tekken',1994,'ARCADE','Fighting','fighter','立体格闘の間合いと強弱攻撃を重視する対戦格闘風。','攻撃タイミングと距離で体力を削る。','コンボ表示と攻撃予告を追加。','←→ / ↑ / スペース / X','間合いを詰め隙で攻撃',{time:80,light:8,heavy:16,speed:175,aiAggro:2.7}),
m('ridge-racer','Ridge Racer',1993,'ARCADE / PS','Racing','racer','高速コーナーとドリフト感を意識したレース風。','他車を避けながら高い速度を維持する。','危険車線表示とブースト区間を追加。','←→ / ↑↓','他車を避け最高速維持',{lanes:5,maxSpeed:325,lapLength:6500}),
m('system-shock','System Shock',1994,'COMPUTER','FPS','raycast','迷路状の施設探索と戦闘を組み合わせる一人称アクション風。','敵を排除しながらエリアを進む。','照準・弾数・敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し射撃',{enemies:8,ammo:80,tough:true}),
m('theme-park','Theme Park',1994,'COMPUTER','Simulation','management','資金と利用者満足を見ながら施設を運営する経営シミュレーション風。','資金と各状態を保ちながら一定期間運営する。','状態ゲージと自動運営補助を追加。','矢印 / スペース','最も不足した状態を優先',{days:35,objective:'パークを安定運営'}),
m('wario-land','Wario Land',1994,'GAME BOY','Platform','platform','敵を押しのけながら宝を集めて進む横アクション風。','前進とジャンプで障害を越える。','着地点表示と回収コンボを追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:10,levelW:2450,jump:330,gravity:730}),
m('super-metroid','Super Metroid',1994,'SUPER FAMICOM','Platform','platform','広いエリアを探索し強化を得ながら進むSFアクション風。','敵を撃ちながら足場や通路を越える。','進行方向表示と短時間強化を追加。','←→ / ↑ / スペース','敵接近で攻撃し前進',{enemies:14,levelW:3000,jump:345,gravity:710,beat:true}),
m('killer-instinct','Killer Instinct',1994,'ARCADE','Fighting','fighter','長い連続攻撃を特徴とする対戦格闘風。','間合いを詰め、軽打と強打を連係する。','コンボ表示と入力猶予を追加。','←→ / ↑ / スペース / X','近距離で連続攻撃を狙う',{time:75,light:7,heavy:14,speed:185,aiAggro:2.8}),
m('chrono-trigger','Chrono Trigger',1995,'SUPER FAMICOM','RPG','adventure','時代をまたぐ冒険をイメージした探索RPG風。','重要物を集め敵を処理して出口へ進む。','目的表示と危険度表示を追加。','矢印 / スペース','未回収目標優先で敵を処理',{items:8,enemies:9,tough:true}),
m('command-conquer','Command & Conquer',1995,'COMPUTER','Strategy','strategy','資源を使い基地を育て敵の圧力へ対応するRTS風。','生産施設を増やし脅威を抑えながら成長する。','脅威ゲージと自動建設を追加。','クリック','資源と脅威を見て施設配置',{goal:90,pressure:1.1}),
m('rayman','Rayman',1995,'CONSOLE','Platform','platform','カラフルな足場を跳びながら敵や罠を越える横アクション風。','ジャンプと前進でゴールを目指す。','着地点表示と回収コンボを追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:11,levelW:2600,jump:360,gravity:720}),
m('worms','Worms',1995,'COMPUTER','Strategy','physics','角度・風・威力を読んで敵へ砲撃するターン制砲撃風。','限られた弾数で着弾点を計算する。','風表示と自動照準補助を追加。','←→ 威力 / ↑↓ 角度 / スペース','目標位置から角度と威力を逆算',{shots:10}),
m('yoshis-island','Yoshi’s Island',1995,'SUPER FAMICOM','Platform','platform','独特のジャンプ感と回収要素を持つ横アクション風。','敵や穴を越えながら回収物を集める。','着地点表示と回収コンボを追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:11,levelW:2700,jump:380,gravity:680}),
m('descent','Descent',1995,'COMPUTER','FPS','raycast','迷路状の施設内を自由に移動し敵を撃つ3Dシューティング風。','旋回と前後移動で敵を捉える。','照準、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し射撃',{enemies:9,ammo:90,tough:true}),
m('warcraft-2','Warcraft II',1995,'COMPUTER','Strategy','strategy','資源採取と生産を拡大するRTS風。','施設配置を増やし脅威へ対応する。','脅威ゲージと自動配置補助を追加。','クリック','資源余裕に応じて施設配置',{goal:95,pressure:1.15}),
m('panzer-dragoon','Panzer Dragoon',1995,'SATURN','Shooter','scrollShooter','奥方向へ飛びながら敵を狙うレールシューティング風。','上下左右移動で敵弾と障害を避ける。','危険軌道表示と強化弾を追加。','矢印 / スペース','弾を避けながら正面敵を攻撃',{enemySpeed:160,fireRate:.12,tough:true}),
m('twisted-metal','Twisted Metal',1995,'PLAYSTATION','Action','racer','車両同士の衝突と攻撃を意識した車戦闘風。','車線変更で敵車をかわしながら距離を稼ぐ。','ブーストと危険車線表示を追加。','←→ / ↑↓','危険車を避け最高速維持',{lanes:5,maxSpeed:285,lapLength:5000}),
m('tekken-2','Tekken 2',1995,'ARCADE','Fighting','fighter','多様な技と重い間合いを意識する対戦格闘風。','強弱攻撃と移動で相手の体力を削る。','コンボ表示と攻撃予告を追加。','←→ / ↑ / スペース / X','間合いを詰め隙で攻撃',{time:80,light:8,heavy:17,speed:180,aiAggro:2.9}),
m('heroes-might-magic','Heroes of Might and Magic',1995,'COMPUTER','Strategy','strategy','資源と軍勢を育てるターン制戦略を簡略再構成した風。','限られた資源で施設を増やし勢力を伸ばす。','脅威表示と自動配置を追加。','クリック','資源と脅威を見て建設',{goal:90,pressure:.8})
]);
})();