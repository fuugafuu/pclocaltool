'use strict';
(() => {
const G=window.RetroGameKit;
const m=(id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg={})=>({id,title,year,system,genre,kind,description,classic,modern,controls,auto,cfg});
G.registerMany([
m('pokemon-red-green','Pokémon Red / Green',1996,'GAME BOY','RPG','adventure','フィールドを巡り仲間や重要物を集めて進む携帯RPG風。','探索と戦闘を繰り返し目的地へ進む。','目的表示と収集進捗を追加。','矢印 / スペース','未回収目標を優先し敵を処理',{items:8,enemies:8}),
m('resident-evil','Resident Evil',1996,'PLAYSTATION','Adventure','adventure','閉鎖空間を探索し重要物を集めて脱出を目指すサバイバルホラー風。','敵との接触を避けながら必要物を回収する。','目的表示と危険度表示を追加。','矢印 / スペース','敵距離を保ち目標物へ進む',{items:7,enemies:7,tough:true}),
m('quake','Quake',1996,'COMPUTER','FPS','raycast','高速移動と射撃で立体迷路を突破するFPS風。','旋回・前後移動・射撃で敵を排除する。','照準、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し高速射撃',{enemies:11,ammo:100,tough:true}),
m('super-mario-64','Super Mario 64',1996,'NINTENDO 64','Platform','platform','広い空間を走り跳んで目標を集める3Dアクションを2Dに再構成した風。','勢いとジャンプで敵や障害を越える。','着地点表示と回収コンボを追加。','←→ / ↑','目標へ前進し障害前でジャンプ',{enemies:10,levelW:3100,jump:380,gravity:760}),
m('tomb-raider','Tomb Raider',1996,'PLAYSTATION / PC','Adventure','platform','遺跡を進み罠や足場を越える探索アクション風。','ジャンプ距離と着地位置を読みながら進む。','着地点補助と危険表示を追加。','←→ / ↑ / スペース','障害前で跳び敵接近で攻撃',{enemies:9,levelW:2800,jump:340,gravity:780,beat:true}),
m('crash-bandicoot','Crash Bandicoot',1996,'PLAYSTATION','Platform','platform','奥行きを意識した一本道を走り障害を越えるアクションを横画面化した風。','前進とジャンプで敵や穴を越える。','着地点表示と回収コンボを追加。','←→ / ↑','前進し障害前でジャンプ',{enemies:12,levelW:2900,jump:360,gravity:800}),
m('diablo','Diablo',1996,'COMPUTER','RPG','adventure','暗いダンジョンを探索し敵を倒しながら深部へ進むアクションRPG風。','敵を処理し重要物を集め出口へ進む。','危険度表示と目的マーカーを追加。','矢印 / スペース','目標物優先で隣接敵を攻撃',{items:7,enemies:12,tough:true}),
m('duke-nukem-3d','Duke Nukem 3D',1996,'COMPUTER','FPS','raycast','市街地風の迷路を進み敵を撃つ高速FPS風。','旋回・移動・射撃で敵を排除する。','照準、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し射撃',{enemies:10,ammo:95,tough:true}),
m('civilization-2','Civilization II',1996,'COMPUTER','Strategy','strategy','都市と資源を拡大して文明を育てる戦略ゲーム風。','施設を配置し人口と資源を増やす。','脅威表示と自動建設補助を追加。','クリック','資源と脅威を見て施設配置',{goal:100,pressure:.65}),
m('metal-slug','Metal Slug',1996,'ARCADE','Run & Gun','platform','大量の敵を撃ちながら派手に前進するラン＆ガン風。','射撃とジャンプを組み合わせて突破する。','武器強化と撃破コンボを追加。','←→ / ↑ / スペース','敵接近で攻撃し障害前でジャンプ',{enemies:18,levelW:3000,jump:350,gravity:790,beat:true}),
m('mario-kart-64','Mario Kart 64',1996,'NINTENDO 64','Racing','racer','アイテムや接触を意識したカートレース風。','他車を避けながら周回し順位を上げる。','ブースト区間と危険車線表示を追加。','←→ / ↑↓','他車を避け最高速維持',{lanes:5,maxSpeed:300,lapLength:6000}),
m('goldeneye-007','GoldenEye 007',1997,'NINTENDO 64','FPS','raycast','任務目標を進めながら敵を撃つ一人称アクション風。','敵を排除しながらエリアを進む。','照準、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し射撃',{enemies:9,ammo:80,tough:true}),
m('castlevania-sotn','Castlevania: Symphony of the Night',1997,'PLAYSTATION','Platform','platform','広い城を探索しながら戦う探索型横アクション風。','敵を処理しつつ長いステージを進む。','進行方向表示と短時間強化を追加。','←→ / ↑ / スペース','敵接近で攻撃し前進',{enemies:15,levelW:3200,jump:335,gravity:720,beat:true}),
m('final-fantasy-7','Final Fantasy VII',1997,'PLAYSTATION','RPG','adventure','広い世界を巡り仲間と目的を進めるRPG風。','重要物を集め敵を処理して出口へ進む。','目的表示と危険度表示を追加。','矢印 / スペース','未回収目標優先で敵を処理',{items:9,enemies:10,tough:true}),
m('fallout','Fallout',1997,'COMPUTER','RPG','adventure','荒廃世界を探索し重要物を集めるRPG風。','危険地帯を避けながら目的物を集める。','目的表示と危険度表示を追加。','矢印 / スペース','安全経路で未回収目標へ進む',{items:8,enemies:9,tough:true}),
m('gran-turismo','Gran Turismo',1997,'PLAYSTATION','Racing','racer','車種と走行ラインを意識するサーキットレース風。','他車との接触を避け速度を維持する。','理想ライン表示とブースト区間を追加。','←→ / ↑↓','他車を避け最高速を維持',{lanes:5,maxSpeed:335,lapLength:7000}),
m('star-fox-64','Star Fox 64',1997,'NINTENDO 64','Shooter','scrollShooter','奥方向へ高速移動しながら敵編隊を撃つレールSTG風。','上下左右で弾を避けて敵を撃つ。','危険軌道表示と強化弾を追加。','矢印 / スペース','弾を避けながら正面敵を攻撃',{enemySpeed:165,fireRate:.13,tough:true}),
m('age-of-empires','Age of Empires',1997,'COMPUTER','Strategy','strategy','資源を集め都市と軍事力を伸ばすRTS風。','施設を配置し人口と資源を増やす。','脅威表示と自動建設補助を追加。','クリック','資源と脅威に応じて施設配置',{goal:100,pressure:1.05}),
m('tekken-3','Tekken 3',1997,'ARCADE / PS','Fighting','fighter','高速な連係と間合いを重視する対戦格闘風。','軽打と強打を組み合わせて体力を削る。','コンボ表示と攻撃予告を追加。','←→ / ↑ / スペース / X','間合いを詰め連続攻撃',{time:80,light:8,heavy:17,speed:190,aiAggro:3.0}),
m('dance-dance-revolution','Dance Dance Revolution',1998,'ARCADE','Rhythm','rhythm','4方向の指示に合わせてタイミングよく入力するリズムゲーム風。','判定ラインで対応方向を押し続ける。','判定表示とコンボ表示を追加。','←↓↑→','流れてくるノートをタイミングよく入力',{time:70,interval:.5,speed:250}),
m('half-life','Half-Life',1998,'COMPUTER','FPS','raycast','施設探索と戦闘を一体化した一人称アクション風。','敵を排除しながら迷路状エリアを進む。','照準、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ旋回し射撃',{enemies:10,ammo:95,tough:true}),
m('starcraft','StarCraft',1998,'COMPUTER','Strategy','strategy','資源・生産・防衛を拡大するRTS風。','施設を増やし脅威への余力を作る。','脅威表示と自動建設を追加。','クリック','資源と脅威を見て施設配置',{goal:105,pressure:1.2}),
m('metal-gear-solid','Metal Gear Solid',1998,'PLAYSTATION','Stealth','stealth','敵の視線や巡回を避けて目標へ進む潜入アクション風。','監視範囲を避け、重要物を回収して脱出する。','警戒方向と目的地表示を追加。','矢印','視線を避け最短の安全経路を選ぶ',{guards:7}),
m('ocarina-time','The Legend of Zelda: Ocarina of Time',1998,'NINTENDO 64','Adventure','adventure','フィールドやダンジョンを探索し重要物を集めるアクションアドベンチャー風。','敵を倒しながら重要物を集めて出口へ進む。','目的表示と危険度表示を追加。','矢印 / スペース','未回収目標優先で隣接敵を攻撃',{items:8,enemies:9,tough:true}),
m('thief-dark-project','Thief: The Dark Project',1998,'COMPUTER','Stealth','stealth','暗所と敵の視線を利用して目標物を盗み脱出するステルス風。','監視範囲を避けて重要物へ近づく。','視界表示と目的地マーカーを追加。','矢印','警戒範囲を避け目標へ進む',{guards:8}),
m('rollercoaster-tycoon','RollerCoaster Tycoon',1999,'COMPUTER','Simulation','management','資金と満足度を見ながら遊園地を運営する経営シミュレーション風。','資金・体力・満足度を管理し一定期間運営する。','状態ゲージと自動運営補助を追加。','矢印 / スペース','最も不足している状態を優先',{days:40,objective:'遊園地を安定運営'}),
m('counter-strike','Counter-Strike',1999,'COMPUTER','FPS','raycast','短いラウンドで敵を排除する競技FPS風。','慎重に旋回し敵を先に発見して撃つ。','照準、弾数、敵接近表示を追加。','←→ 旋回 / ↑↓ 移動 / スペース','最寄り敵へ照準し距離を詰める',{enemies:7,ammo:50,tough:true}),
m('crazy-taxi','Crazy Taxi',1999,'ARCADE / DREAMCAST','Racing','racer','街中を高速で走り目的地へ急ぐタクシードライブ風。','他車を避けつつ速度を落とさず距離を稼ぐ。','ブースト区間と危険車線表示を追加。','←→ / ↑↓','他車を避け最高速を維持',{lanes:5,maxSpeed:325,lapLength:6200}),
m('tony-hawk-pro-skater','Tony Hawk’s Pro Skater',1999,'PLAYSTATION','Sports','racer','速度を保ちながら障害を越えスコアを稼ぐスケートアクション風。','衝突を避けながら距離と得点を伸ばす。','コンボ表示とブースト区間を追加。','←→ / ↑↓','障害を避け速度を維持',{lanes:5,maxSpeed:245,lapLength:4500}),
m('super-smash-bros','Super Smash Bros.',1999,'NINTENDO 64','Fighting','fighter','相手との距離を詰め強弱攻撃で場外方向へ押す対戦アクション風。','接近して攻撃を重ね相手の体力を削る。','コンボ表示と攻撃予告を追加。','←→ / ↑ / スペース / X','間合いを詰め連続攻撃',{time:85,light:7,heavy:16,speed:195,aiAggro:3.1})
]);
})();