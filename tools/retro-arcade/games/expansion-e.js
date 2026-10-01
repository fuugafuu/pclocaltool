'use strict';
(() => {
const G=window.RetroGameKit;
const m=(id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg={})=>({id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg});
G.registerMany([
m('computer-space','Computer Space',1971,'ARCADE','Shooter','arena','宇宙空間で敵機を避けながら撃ち合う初期アーケード風。','慣性よりも単純な旋回と射撃、限られた画面内で生存を競う。','照準補助、敵接近警告、コンボ得点を追加。','矢印 / スペース','最寄り敵との距離を保ちながら射撃',{enemies:4,enemySpeed:55}),
m('gun-fight','Gun Fight',1975,'ARCADE','Shooter','arena','障害物越しに相手ガンマンを狙う西部劇デュエル風。','短い射程と遮蔽物を意識して撃ち合う。','命中表示とラウンド連勝ボーナスを追加。','矢印 / スペース','間合いを保ち射線が通る位置へ移動',{enemies:1,enemySpeed:45,enemyScore:100}),
m('sea-wolf','Sea Wolf',1976,'ARCADE','Shooter','fixedShooter','潜望鏡風の照準で航行する艦船を撃つ射撃ゲーム風。','横切る標的を素早く狙い撃つスコアアタック。','連続命中ボーナスと高速標的を追加。','←→ / スペース','標的の進行先へ照準を合わせて射撃',{cols:8,rows:2,fireRate:.02,enemyScore:40}),
m('night-driver','Night Driver',1976,'ARCADE','Racing','racer','暗闇の道路を路肩ポールだけで見分けて走る夜間レース風。','速度を上げつつ道路から外れないことが中心。','速度表示、危険予告、ブースト区間を追加。','←→ / ↑↓','障害車を避けながら最高速を維持',{lanes:3,maxSpeed:230,lapLength:4200}),
m('sprint-2','Sprint 2',1976,'ARCADE','Racing','racer','小さなマシンで周回コースを競うトップビュー系レース風。','接触を避け、安定した周回タイムを狙う。','ゴースト相当のタイム目標とブーストを追加。','←→ / ↑↓','前方車を避けつつ速度を維持',{lanes:4,maxSpeed:245,lapLength:3600}),
m('canyon-bomber','Canyon Bomber',1977,'ARCADE','Action','physics','谷へ爆弾を落として標的を破壊する砲撃アクション風。','限られた弾数で角度と落下位置を読む。','風表示と着弾予測補助を追加。','←→ 威力 / ↑↓ 角度 / スペース','標的位置から角度と威力を逆算',{shots:12}),
m('combat','Combat',1977,'ATARI 2600','Shooter','tank','戦車や飛行機で対戦する家庭用対戦アクション風。','旋回・前進・射撃のシンプルな1対1戦。','命中方向表示と短時間シールドを追加。','←→ 旋回 / ↑↓ 移動 / スペース','敵へ砲塔を合わせて距離を詰める',{enemies:1,tough:false}),
m('space-wars','Space Wars',1977,'ARCADE','Shooter','arena','重力のある宇宙空間で互いに撃ち合う対戦宇宙船風。','中央付近の危険地帯を避けつつ射撃する。','危険距離表示と連射補助を追加。','矢印 / スペース','接近しすぎず最寄り敵を狙う',{enemies:3,enemySpeed:50}),
m('atari-football','Atari Football',1978,'ARCADE','Sports','sports','フィールド上でボールを運び得点を狙う初期スポーツゲーム風。','短い試合時間で相手ゴールへ運ぶ。','残り時間と得点差を見やすく表示。','矢印 / スペース','ボールへ寄り相手ゴール方向へ押し込む',{time:70,ballSpeed:300,aiSpeed:120}),
m('atari-basketball','Atari Basketball',1979,'ATARI 2600','Sports','sports','1対1でボールを奪いゴールを狙うバスケット風。','相手より先にボールへ触れ得点を重ねる。','シュート補助と連続得点ボーナスを追加。','矢印 / スペース','ボールへ寄りゴール方向へシュート',{time:60,ballSpeed:340,aiSpeed:130}),
m('galaxian','Galaxian',1979,'ARCADE','Shooter','fixedShooter','編隊から急降下する敵を迎撃する固定画面STG風。','隊列待機と急降下を見ながら左右移動で迎撃。','コンボと危険弾の視認性を追加。','←→ / スペース','敵弾を避け列へ照準し射撃',{cols:10,rows:4,dive:true,fireRate:.055,enemyScore:35}),
m('head-on','Head On',1979,'ARCADE','Racing','racer','狭い周回路で相手車を避けながら点を集める迷路レース風。','同じコース上で衝突を避けて周回する。','危険車線予告と連続周回ボーナスを追加。','←→ / ↑↓','前方車を避けつつ得点ラインを維持',{lanes:3,maxSpeed:210,lapLength:3000}),
m('monaco-gp','Monaco GP',1979,'ARCADE','Racing','racer','上から見下ろす高速道路で他車をかわすレース風。','車線変更で事故を避けながら距離を稼ぐ。','ブースト標識とニアミス得点を追加。','←→ / ↑↓','危険車線を先読みして回避',{lanes:4,maxSpeed:270,lapLength:5200}),
m('adventure-2600','Adventure',1980,'ATARI 2600','Adventure','adventure','迷路を探索し、重要アイテムを見つけて出口へ戻る冒険風。','単純な画面構成の中で探索と敵回避を行う。','収集進捗と目的地表示を追加。','矢印 / スペース','未回収アイテムを優先し敵を避ける',{items:4,enemies:4}),
m('battlezone','Battlezone',1980,'ARCADE','Shooter','tank','戦車の照準を合わせて敵車両を撃破する戦車戦風。','旋回と前進で射線を作り、正面戦闘を行う。','敵方向インジケータと耐久表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ砲身を向けて射撃',{enemies:5,tough:true}),
m('berzerk','Berzerk',1980,'ARCADE','Maze','maze','迷路内を移動しロボットを避けながら出口を目指す風。','狭い通路で敵に囲まれない進路選びが重要。','危険距離表示と連続回収得点を追加。','矢印','安全な通路と目標アイテムを優先',{enemies:6,items:28,smart:.8}),
m('defender','Defender',1981,'ARCADE','Shooter','scrollShooter','横スクロール空間で敵を撃ち、人々を守る高速STG風。','左右に広い戦場を飛び回り敵を迎撃する。','パワーアップと危険弾表示を追加。','矢印 / スペース','弾を避けつつ最寄り敵を迎撃',{enemySpeed:125,fireRate:.1,travelScore:3}),
m('scramble','Scramble',1981,'ARCADE','Shooter','scrollShooter','地形近くを飛び、空中と地上の敵を攻撃する横スクロールSTG風。','一定方向へ進みながら敵や障害を避ける。','連射補助と短時間強化弾を追加。','矢印 / スペース','危険弾を避け画面右側の敵へ攻撃',{enemySpeed:115,fireRate:.09}),
m('tempest','Tempest',1981,'ARCADE','Shooter','fixedShooter','奥へ伸びるレーンから迫る敵を外周で迎撃するチューブSTG風。','外周移動と射撃で接近前に敵を倒す。','連続撃破と危険レーン強調を追加。','←→ / スペース','敵が近いレーンへ合わせて射撃',{cols:12,rows:3,fireRate:.07,enemyScore:45}),
m('qbert','Q*bert',1982,'ARCADE','Puzzle Action','maze','段差状のマスを飛び移り、全マスの状態を変えていく風。','敵を避けながら必要なマスを踏み進める。','残り対象の強調と連続踏破ボーナスを追加。','矢印','未取得マスと敵距離を同時評価',{enemies:4,items:42,smart:.65}),
m('dig-dug','Dig Dug',1982,'ARCADE','Maze','maze','地中を掘り進みながら敵を避けて得点する地下迷路風。','自分で通路を広げつつ敵との距離を管理する。','危険距離表示と連続撃破ボーナスを追加。','矢印','アイテムを取りつつ包囲されない経路を選ぶ',{enemies:5,items:32,smart:.7}),
m('joust','Joust',1982,'ARCADE','Action','platform','空中で高さを取り、相手より上からぶつかる浮遊アクション風。','慣性のある移動と高さの取り合いが中心。','落下予測と短時間シールドを追加。','←→ / ↑','敵位置を見ながら先へ進み接触を回避',{enemies:9,jump:280,gravity:520,slippery:true}),
m('robotron-2084','Robotron: 2084',1982,'ARCADE','Shooter','arena','全方向から迫る敵を撃ち続けるツインスティック系アリーナSTG風。','大量の敵をかわしながら素早く撃破する。','危険方向表示とコンボを追加。','矢印 / スペース','敵群から距離を取り最寄り敵を連射',{enemies:8,enemySpeed:92,enemyScore:30}),
m('pole-position','Pole Position',1982,'ARCADE','Racing','racer','予選タイムを突破して本戦を走る疑似3Dレース風。','高速走行と車線変更でタイムを縮める。','理想ライン表示とブーストを追加。','←→ / ↑↓','他車を避け最高速を維持',{lanes:4,maxSpeed:290,lapLength:6000}),
m('burgertime','BurgerTime',1982,'ARCADE','Action','platform','足場を上下しながら材料を完成させるアクションパズル風。','敵を避けて各階層の目標を回収する。','目的物の強調と連続回収得点を追加。','←→ / ↑','最短ルートで目標へ進み敵を回避',{enemies:8,levelW:1800,jump:270}),
m('ms-pac-man','Ms. Pac-Man',1982,'ARCADE','Maze','maze','変化する迷路でドットを集め追跡者を避ける迷路アクション風。','迷路ごとの通路差と敵の追跡を読みながら回収する。','残りドット表示とコンボを追加。','矢印','最寄り目標へ向かいつつ敵との距離を確保',{enemies:4,items:48,smart:.82}),
m('zaxxon','Zaxxon',1982,'ARCADE','Shooter','scrollShooter','斜め視点を意識した空間で高度感のある飛行STG風。','障害と敵弾を同時に避けながら進む。','危険軌道表示と強化弾を追加。','矢印 / スペース','障害と弾を避けながら正面敵を攻撃',{enemySpeed:135,tough:true,fireRate:.1}),
m('moon-patrol','Moon Patrol',1982,'ARCADE','Action','platform','月面車で穴や障害を跳び越えつつ敵を撃つ横スクロール風。','地面障害のジャンプと前方攻撃を使い分ける。','着地点表示と連続回避ボーナスを追加。','←→ / ↑ / スペース','障害に合わせてジャンプし前進',{enemies:8,levelW:2400,jump:350,gravity:760}),
m('xevious','Xevious',1983,'ARCADE','Shooter','scrollShooter','縦方向へ進み空中・地上目標を攻撃するSTG風。','前進しながら敵弾を避け、連続して標的を破壊する。','標的マーカーと短時間強化弾を追加。','矢印 / スペース','危険弾を避けて中央付近を維持',{vertical:true,enemySpeed:125,fireRate:.08}),
m('donkey-kong-jr','Donkey Kong Jr.',1982,'ARCADE','Action','platform','足場やつるを登りながら上部の目的地へ進むアクション風。','上下移動と敵回避を組み合わせて最上部を目指す。','ジャンプ猶予と危険位置表示を追加。','←→ / ↑','敵を避けて右方向へ進み要所でジャンプ',{enemies:8,levelW:1600,jump:310,gravity:650})
]);
})();