'use strict';
(() => {
const G=window.RetroGameKit;
const m=(id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg={})=>({id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg});
G.registerMany([
m('zelda-1986','The Legend of Zelda',1986,'FAMICOM DISK','Adventure','adventure','広いフィールドとダンジョンを探索し、重要アイテムを集めるアクションアドベンチャー風。','複数の重要物を集めながら敵を避け、出口へ進む。','目的進捗、危険表示、短い回復補助を追加。','矢印 / スペース','未回収目標を優先し隣接敵を攻撃',{items:8,enemies:7,tough:true}),
m('metroid','Metroid',1986,'FAMICOM DISK','Platform','platform','迷路的な横スクロール空間で強化を得ながら探索するSFアクション風。','行き止まりや敵配置を越えて奥へ進む。','進行方向表示と短時間強化を追加。','←→ / ↑ / スペース','敵接近で攻撃しつつ前進',{enemies:13,levelW:2800,jump:330,gravity:690,beat:true}),
m('kid-icarus','Kid Icarus',1986,'FAMICOM DISK','Platform','platform','縦方向の足場を登りながら敵を倒すアクション風。','落下に注意しながら上段へ進む。','足場予告と連続撃破得点を追加。','←→ / ↑ / スペース','前進し切れ目でジャンプ、敵接近で攻撃',{enemies:10,levelW:1700,jump:350,gravity:700,beat:true}),
m('dragon-quest','Dragon Quest',1986,'FAMICOM','RPG','adventure','フィールド探索と敵との戦闘を進める初期コンソールRPG風。','重要物を集め、敵を倒しながら出口へ進む。','目的表示、危険度表示、短い回復補助を追加。','矢印 / スペース','目標物を優先し隣接敵を攻撃',{items:6,enemies:8,tough:true}),
m('out-run','Out Run',1986,'ARCADE','Racing','racer','分岐する道を高速で走り抜けるドライブレース風。','交通車を避けつつ速度を維持し距離を稼ぐ。','ブースト区間と危険車線表示を追加。','←→ / ↑↓','他車を避け最高速を維持',{lanes:5,maxSpeed:320,lapLength:6500}),
m('bubble-bobble','Bubble Bobble',1986,'ARCADE','Platform','platform','固定画面の足場で敵を処理しながらステージを進むアクション風。','上下の足場を使い敵との接触を避ける。','連続撃破ボーナスと危険位置表示を追加。','←→ / ↑ / スペース','敵へ近づき攻撃し危険時はジャンプ',{enemies:9,levelW:1500,jump:330,gravity:620,beat:true}),
m('castlevania','Castlevania',1986,'FAMICOM','Platform','platform','階段や足場を進みながら敵と罠を越えるゴシックアクション風。','敵の間合いとジャンプ着地を慎重に読む。','危険表示と短いチェックポイント補助を追加。','←→ / ↑ / スペース','前進し敵接近で攻撃、障害前でジャンプ',{enemies:14,levelW:2500,jump:315,gravity:760,beat:true}),
m('ikari-warriors','Ikari Warriors',1986,'ARCADE','Shooter','arena','全方向から来る敵を撃ちながら前進するトップビュー戦闘風。','周囲の敵との距離を保ち連射し続ける。','危険方向表示とコンボ得点を追加。','矢印 / スペース','包囲を避け最寄り敵へ射撃',{enemies:10,enemySpeed:82,enemyScore:35}),
m('rampage','Rampage',1986,'ARCADE','Action','platform','巨大キャラクターで建物や敵を壊しながら進む破壊アクション風。','前進しつつ接近敵を打撃して突破する。','破壊コンボと短時間防御を追加。','←→ / ↑ / スペース','敵へ近づき攻撃し続ける',{enemies:12,levelW:2300,jump:280,gravity:720,beat:true}),
m('solomons-key','Solomon’s Key',1986,'ARCADE','Puzzle Action','adventure','部屋内の仕掛けを越え鍵や出口を探すアクションパズル風。','必要物を回収して出口へ戻る。','目的表示と経路補助を追加。','矢印 / スペース','未回収目標を優先し安全経路を選ぶ',{items:5,enemies:6}),
m('wonder-boy','Wonder Boy',1986,'ARCADE','Platform','platform','時間制限を意識しながら障害を越える横スクロールアクション風。','速度を保ちつつ敵や穴をジャンプで越える。','着地点表示と連続回収得点を追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:12,levelW:2500,jump:340,gravity:760}),
m('fantasy-zone','Fantasy Zone',1986,'ARCADE','Shooter','scrollShooter','左右へ動き回り敵拠点を壊すカラフルな横STG風。','敵弾を避けながら各拠点を破壊する。','強化弾と危険弾表示を追加。','矢印 / スペース','弾を避け最寄り敵を攻撃',{enemySpeed:115,fireRate:.09,travelScore:2}),
m('contra','Contra',1987,'ARCADE / FAMICOM','Run & Gun','platform','走りながら撃ち、ジャンプで敵弾や障害を越えるラン＆ガン風。','高速前進と攻撃を同時にこなす。','武器強化と復帰補助を追加。','←→ / ↑ / スペース','敵接近で攻撃し障害前でジャンプ',{enemies:16,levelW:2800,jump:360,gravity:800,beat:true}),
m('double-dragon','Double Dragon',1987,'ARCADE','Beat ’em up','platform','画面を右へ進みながら複数の敵と近距離戦を行うベルトアクション風。','間合いを詰めて敵を順番に倒し先へ進む。','コンボと危険方向表示を追加。','←→ / ↑ / スペース','最寄り敵へ近づき攻撃',{enemies:15,levelW:2500,beat:true,jump:260,gravity:700}),
m('r-type','R-Type',1987,'ARCADE','Shooter','scrollShooter','重い敵配置を読みながら進む横スクロールSTG風。','敵弾と地形を避けつつ火力を維持する。','短時間強化弾と危険弾表示を追加。','矢印 / スペース','危険弾を回避し正面敵を優先',{enemySpeed:125,tough:true,fireRate:.11}),
m('mega-man','Mega Man',1987,'FAMICOM','Platform','敵を撃ちながら足場とボス区間を進む横アクション風。','ジャンプと射撃を使い分けて敵配置を突破する。','危険予告と短時間強化ショットを追加。','←→ / ↑ / スペース','敵接近で攻撃し前進',{enemies:14,levelW:2600,jump:340,gravity:760,beat:true}),
m('shinobi','Shinobi',1987,'ARCADE','Action','platform','忍者を操作し敵を倒しながら人質や目的地を巡るアクション風。','攻撃とジャンプを組み合わせて前進する。','目標表示と連続撃破ボーナスを追加。','←→ / ↑ / スペース','敵を処理しつつ前進',{enemies:14,levelW:2500,jump:330,gravity:720,beat:true}),
m('final-fantasy','Final Fantasy',1987,'FAMICOM','RPG','adventure','仲間と世界を巡り重要物を集める初期ファンタジーRPG風。','探索と敵戦闘を進め目的地へ到達する。','目的表示と危険度表示を追加。','矢印 / スペース','目標物優先で敵を処理',{items:7,enemies:9,tough:true}),
m('after-burner','After Burner',1987,'ARCADE','Shooter','scrollShooter','高速飛行しながら敵機をロックして撃つ疑似3D空戦風。','上下左右移動で敵弾と敵機を避ける。','危険軌道表示と短時間連射を追加。','矢印 / スペース','弾を避けながら正面敵を攻撃',{enemySpeed:165,fireRate:.12,tough:true}),
m('metal-gear','Metal Gear',1987,'MSX2','Stealth','stealth','敵兵の視線を避けて目標を回収する潜入アクション風。','警戒範囲へ入らず必要物を回収し脱出する。','警戒方向表示と目的地マーカーを追加。','矢印','監視範囲を避け目標へ進む',{guards:6}),
m('darius','Darius',1987,'ARCADE','Shooter','scrollShooter','巨大な敵や分岐を意識して進む横スクロールSTG風。','弾幕を避けながら硬い敵を削る。','強化弾と危険弾表示を追加。','矢印 / スペース','弾を避け正面敵を攻撃',{enemySpeed:130,tough:true,fireRate:.12}),
m('operation-wolf','Operation Wolf',1987,'ARCADE','Shooter','fixedShooter','画面内へ現れる標的を次々に狙うガンシューティング風。','素早く照準を合わせて敵を撃つ。','連続命中ボーナスと危険標的表示を追加。','←→ / スペース','最寄り標的へ照準し射撃',{cols:8,rows:3,dive:true,fireRate:.04,enemyScore:45}),
m('1943','1943: The Battle of Midway',1987,'ARCADE','Shooter','scrollShooter','縦方向へ進む空戦で敵機と大型敵を迎撃するSTG風。','敵弾を避けながら編隊を崩して進む。','連続撃墜と強化弾を追加。','矢印 / スペース','弾を避け中央付近を維持',{vertical:true,enemySpeed:140,tough:true,fireRate:.1}),
m('bionic-commando','Bionic Commando',1987,'ARCADE','Platform','platform','特殊な移動感覚で足場を渡り敵を倒して進むアクション風。','足場間の移動と攻撃タイミングを読む。','移動先表示と復帰補助を追加。','←→ / ↑ / スペース','敵接近で攻撃し前進',{enemies:12,levelW:2400,jump:300,gravity:680,beat:true}),
m('tecmo-bowl','Tecmo Bowl',1987,'ARCADE / NES','Sports','sports','短い攻守で相手陣へ進み得点を狙うアメリカンフットボール風。','ボールを保持し相手ゴールへ運ぶ。','残り時間・得点差表示を追加。','矢印 / スペース','ボールへ寄りゴール方向へ押し込む',{time:70,ballSpeed:330,aiSpeed:135}),
m('rad-racer','Rad Racer',1987,'FAMICOM','Racing','racer','高速道路で他車を抜きながら規定距離を走る疑似3Dレース風。','接触を避け速度を維持する。','危険車線表示とブーストを追加。','←→ / ↑↓','前方車を避け最高速維持',{lanes:4,maxSpeed:295,lapLength:6000}),
m('rc-pro-am','R.C. Pro-Am',1988,'NES','Racing','racer','小型ラジコンカーで周回コースを走るレース風。','路上障害を避けながら周回を重ねる。','ブーストアイテムと危険予告を追加。','←→ / ↑↓','障害車線を避け速度維持',{lanes:4,maxSpeed:250,lapLength:3900}),
m('ninja-gaiden','Ninja Gaiden',1988,'NES','Platform','platform','壁や足場を使いながら敵を倒して進む高速忍者アクション風。','ジャンプと近距離攻撃をテンポよく繰り返す。','危険表示と復帰補助を追加。','←→ / ↑ / スペース','敵接近で攻撃し障害前でジャンプ',{enemies:15,levelW:2700,jump:355,gravity:780,beat:true}),
m('mega-man-2','Mega Man 2',1988,'FAMICOM','Platform','platform','多彩な敵配置と足場を越えながら進む横アクション風。','敵の間合いを見て射撃しつつ進む。','危険予告と連続撃破ボーナスを追加。','←→ / ↑ / スペース','敵接近で攻撃し前進',{enemies:15,levelW:2800,jump:345,gravity:760,beat:true}),
m('dragon-quest-3','Dragon Quest III',1988,'FAMICOM','RPG','adventure','広い世界を旅し目的物を集めて進むパーティRPG風。','探索と戦闘を積み重ね重要地点へ進む。','目的表示と危険度表示を追加。','矢印 / スペース','目標物優先で敵を処理',{items:8,enemies:10,tough:true})
]);
})();