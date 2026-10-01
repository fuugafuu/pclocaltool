'use strict';
(() => {
const G=window.RetroGameKit;
const m=(id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg={})=>({id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg});
G.registerMany([
m('mario-bros','Mario Bros.',1983,'ARCADE','Action','platform','配管ステージで敵を下から突き上げて倒す固定画面アクション風。','足場を上下し、敵の進行方向を読んで処理する。','敵位置マーカーと連続撃破ボーナスを追加。','←→ / ↑','敵の接近方向を見て足場上を移動',{enemies:10,levelW:1500,jump:300,gravity:680}),
m('spy-hunter','Spy Hunter',1983,'ARCADE','Racing','racer','武装車で交通を抜けながら敵車をかわすスパイカーアクション風。','車線変更と速度管理で敵車を避けつつ進む。','ブースト車線と危険車表示を追加。','←→ / ↑↓','危険車線を避け最高速を維持',{lanes:4,maxSpeed:280,lapLength:5200}),
m('tapper','Tapper',1983,'ARCADE','Action','management','複数レーンを管理しながら注文へ素早く対応する接客アクション風。','要求が溜まる前に順番よく処理する忙しさが中心。','優先度表示と連続処理ボーナスを追加。','矢印 / スペース','最も低い状態を優先して処理',{days:18,objective:'注文を滞らせない'}),
m('mappy','Mappy',1983,'ARCADE','Maze','maze','トランポリンや通路を使い品物を回収する追跡迷路風。','敵を避けながら価値の高い目標を順に回収する。','残り目標表示と回収コンボを追加。','矢印','未回収目標と敵距離を評価',{enemies:5,items:38,smart:.76}),
m('dragons-lair','Dragon’s Lair',1983,'ARCADE','Action','rhythm','映像に合わせて正しい方向入力を選ぶQTEアドベンチャー風。','短い入力タイミングを見極めて先へ進む。','判定幅表示と連続成功ボーナスを追加。','←↓↑→','流れてくる指示をタイミングよく入力',{time:55,interval:.85,speed:210}),
m('track-field','Track & Field',1983,'ARCADE','Sports','sports','短時間の連打やタイミングで記録を競う陸上競技風。','制限時間内に相手より多く得点する。','ペース表示と記録更新ボーナスを追加。','矢印 / スペース','ボールへ素早く寄り得点を重ねる',{time:50,ballSpeed:320,aiSpeed:125}),
m('elevator-action','Elevator Action',1983,'ARCADE','Action','platform','ビル内の扉を巡りながら上下階を移動する潜入アクション風。','敵を避けつつ階層を横断して目的地へ進む。','目的地表示と危険方向マーカーを追加。','←→ / ↑ / スペース','前方の敵を避けながら右方向へ進む',{enemies:9,levelW:1800,beat:true,jump:250,gravity:650}),
m('karate-champ','Karate Champ',1984,'ARCADE','Fighting','fighter','間合いと技のタイミングで一本を狙う対戦格闘風。','相手との距離を測り、軽打と強打を使い分ける。','体力表示、コンボ表示、入力猶予を追加。','←→ / ↑ / スペース / X','間合いを詰め攻撃機会を選ぶ',{time:60,light:8,heavy:14,speed:160}),
m('kung-fu-master','Kung-Fu Master',1984,'ARCADE','Action','platform','横スクロールしながら次々に敵を倒して進む格闘アクション風。','前進と近距離攻撃を繰り返しながら突破する。','コンボと短時間無敵を追加。','←→ / ↑ / スペース','敵へ近づき攻撃し続ける',{enemies:14,levelW:2200,beat:true,jump:260,gravity:700}),
m('1942','1942',1984,'ARCADE','Shooter','scrollShooter','縦スクロール空戦で多数の敵機を迎撃するSTG風。','上下左右へ動きながら敵編隊と弾を避ける。','連続撃墜と強化弾を追加。','矢印 / スペース','弾を避け中央を維持し連射',{vertical:true,enemySpeed:130,fireRate:.09}),
m('marble-madness','Marble Madness',1984,'ARCADE','Racing','racer','球体を転がして狭いコースを下るタイムアタック風。','速度を出しすぎず障害物を避けてゴールを狙う。','危険車線表示とリカバリー補助を追加。','←→ / ↑↓','障害物を避けて速度を維持',{lanes:5,maxSpeed:210,lapLength:3400}),
m('paperboy','Paperboy',1985,'ARCADE','Racing','racer','自転車で街路を進み障害物を避ける配達アクション風。','車線変更と速度調整で衝突を避ける。','危険物表示と連続配達ボーナスを追加。','←→ / ↑↓','前方障害を避けつつ速度維持',{lanes:4,maxSpeed:215,lapLength:4200}),
m('ghosts-goblins','Ghosts ’n Goblins',1985,'ARCADE','Action','platform','高難度の敵配置を越えて進む横スクロールアクション風。','ジャンプの着地と敵間隔を慎重に読む。','危険予告と短いリトライ補助を追加。','←→ / ↑ / スペース','敵接近で跳びつつ前進',{enemies:15,levelW:2400,jump:330,gravity:780}),
m('gradius','Gradius',1985,'ARCADE','Shooter','scrollShooter','横スクロール宇宙戦で強化を重ねるSTG風。','敵弾を避けつつパワーを維持して進む。','短時間強化弾と危険弾表示を追加。','矢印 / スペース','敵弾を避けつつ右側の敵を攻撃',{enemySpeed:130,tough:true,fireRate:.1}),
m('super-mario-bros','Super Mario Bros.',1985,'FAMICOM','Platform','platform','走る・跳ぶ・ブロックを越える横スクロールアクション風。','助走とジャンプで敵や穴を越えゴールへ進む。','着地点補助とチェックポイント的な復帰を追加。','←→ / ↑','前進し障害の手前でジャンプ',{enemies:12,levelW:2600,jump:360,gravity:820}),
m('ice-climber','Ice Climber',1985,'FAMICOM','Platform','platform','滑る足場や雲を使い山頂を目指す縦方向アクション風。','滑りやすい移動とジャンプで上段へ進む。','足場位置表示とジャンプ猶予を追加。','←→ / ↑','前進し足場の切れ目でジャンプ',{enemies:8,levelW:1500,jump:350,gravity:720,slippery:true}),
m('gauntlet','Gauntlet',1985,'ARCADE','Action','adventure','迷宮を探索し大量の敵を処理しながら出口を探すダンジョン風。','鍵や目標物を回収し、囲まれないよう進む。','目的地表示と危険度マーカーを追加。','矢印 / スペース','未回収目標へ進み隣接敵を攻撃',{items:6,enemies:10,tough:true}),
m('commando','Commando',1985,'ARCADE','Shooter','arena','上方向へ進みながら周囲の敵兵を撃つラン＆ガン風。','全方向から来る敵をかわし前進する。','危険方向表示と撃破コンボを追加。','矢印 / スペース','敵との距離を保ち連射',{enemies:9,enemySpeed:88,enemyScore:30}),
m('hang-on','Hang-On',1985,'ARCADE','Racing','racer','バイクで高速コーナーと他車を抜ける疑似3Dレース風。','速度維持と車線変更で接触を避ける。','ブースト区間と理想ライン表示を追加。','←→ / ↑↓','他車を避け最高速を維持',{lanes:4,maxSpeed:300,lapLength:5800}),
m('space-harrier','Space Harrier',1985,'ARCADE','Shooter','scrollShooter','奥へ高速移動しながら敵を撃つ疑似3Dシューティング風。','上下左右移動で障害と弾を避ける。','危険軌道表示と強化ショットを追加。','矢印 / スペース','弾を避けつつ敵へ射撃',{vertical:false,enemySpeed:150,fireRate:.12}),
m('yie-ar-kung-fu','Yie Ar Kung-Fu',1985,'ARCADE','Fighting','fighter','個性的な相手と1対1で戦う初期対戦格闘風。','距離と攻撃タイミングを重視する。','体力・コンボ・攻撃猶予を追加。','←→ / ↑ / スペース / X','相手へ近づき隙で攻撃',{time:65,light:7,heavy:13,speed:170}),
m('road-fighter','Road Fighter',1984,'FAMICOM','Racing','racer','交通量の多い道路で燃料を意識しながら走るレース風。','車線変更と速度管理で接触を避ける。','危険車線表示とブーストアイテムを追加。','←→ / ↑↓','前方車を避け最高速を維持',{lanes:4,maxSpeed:250,lapLength:5000}),
m('bomb-jack','Bomb Jack',1984,'ARCADE','Action','platform','画面内の爆弾を順に集めるジャンプアクション風。','高いジャンプを使い敵を避けて回収する。','回収順ボーナスと危険位置表示を追加。','←→ / ↑','未回収目標へ進み敵を避ける',{enemies:8,levelW:1700,jump:380,gravity:650}),
m('circus-charlie','Circus Charlie',1984,'ARCADE','Action','platform','輪くぐりや障害越えを連続するサーカスアクション風。','タイミングよく跳んで障害を越え続ける。','着地点予告と連続成功ボーナスを追加。','←→ / ↑','前進し障害位置に合わせてジャンプ',{enemies:9,levelW:2100,jump:340,gravity:760}),
m('punch-out','Punch-Out!!',1984,'ARCADE','Fighting','fighter','相手の動きを見てパンチと回避を使い分けるボクシング風。','間合いと攻撃タイミングで体力を削る。','体力・コンボ・攻撃予告を追加。','←→ / ↑ / スペース / X','相手へ近づき隙を見て強弱攻撃',{time:90,light:6,heavy:15,speed:150,aiAggro:2}),
m('duck-hunt','Duck Hunt',1984,'FAMICOM','Shooter','fixedShooter','動き回る小さな標的を素早く狙う射撃ゲーム風。','限られた機会で標的へ正確に当てる。','命中コンボと高速標的を追加。','←→ / スペース','最寄り標的へ照準し射撃',{cols:7,rows:2,dive:true,fireRate:.015,enemyScore:50}),
m('tower-druaga','The Tower of Druaga',1984,'ARCADE','Adventure','adventure','塔の各階で鍵や宝を探して出口へ進む迷宮アクション風。','敵を避けながら必要アイテムを回収して出口へ。','目的物と出口の進捗表示を追加。','矢印 / スペース','未回収アイテム優先で隣接敵を攻撃',{items:5,enemies:7}),
m('pac-land','Pac-Land',1984,'ARCADE','Platform','platform','横方向の街や丘を走ってゴールを目指すアクション風。','敵や障害を跳び越えて先へ進む。','着地点予告と回収ボーナスを追加。','←→ / ↑','前進し敵接近でジャンプ',{enemies:10,levelW:2300,jump:320,gravity:720}),
m('karateka','Karateka',1984,'COMPUTER','Fighting','fighter','横画面で構えと間合いを意識して戦う格闘アクション風。','慎重に距離を詰め、攻撃の隙を見て打つ。','体力表示と入力猶予を追加。','←→ / ↑ / スペース / X','間合いを保ち攻撃機会で打つ',{time:80,light:7,heavy:14,speed:145}),
m('kings-quest','King’s Quest',1984,'COMPUTER','Adventure','adventure','フィールドを歩き回り目的物を集める初期グラフィックアドベンチャー風。','探索と収集を進めて出口へ到達する。','目的リストと進捗表示を追加。','矢印 / スペース','未回収目標を優先し安全経路を選ぶ',{items:7,enemies:3})
]);
})();