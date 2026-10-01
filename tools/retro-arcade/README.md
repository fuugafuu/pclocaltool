# レトロアーケードラボ

ブラウザだけで動く、200本収録のクラシックゲーム再構成ランチャーです。

## 方針

- 元ゲームのROM・画像・音声・フォントはコピーしない
- Canvas図形と自作ビープ音で時代感を再構成
- 各ゲームに「クラシック」と「モダン」を用意
- 全ゲームでオートAIと0.5×〜4×速度設定
- 全体設定＋ゲーム個別上書き
- ハイスコア・お気に入り・設定はlocalStorage保存
- 文字選択、ピンチズーム、ダブルタップ拡大を無効化したゲーム向けUI
- 100本超でも管理できるcatalog駆動パック読込

## 実装構成

- `core.js`: ランチャー、入力、AUTO、速度、保存、設定
- `games/engine-kit.js`: ジャンル別共通エンジン
- `games/classics-a.js`〜`d.js`: 最初の20本の個別実装
- `games/expansion-e.js`〜`j.js`: 追加180本
- `games/catalog.js`: 読み込むパック一覧
- `ADD_GAME.md`: 新規ゲーム追加仕様

## 共通エンジン

固定画面シューティング、スクロールシューティング、アリーナ、プラットフォーム、レース、迷路、戦車、スポーツ、アドベンチャー、戦略、ステルス、リズム、物理砲撃、管理、対戦格闘、色合わせ落下パズル、簡易レイキャストFPSを収録しています。

## 収録ゲーム


### 1970年代（19本）

- 1971 — **Computer Space** — Shooter / ARCADE
- 1972 — **PONG** — Sports / ARCADE
- 1975 — **Gun Fight** — Shooter / ARCADE
- 1976 — **Breakout** — Action / ARCADE
- 1976 — **Night Driver** — Racing / ARCADE
- 1976 — **Sea Wolf** — Shooter / ARCADE
- 1976 — **Snake** — Arcade / ARCADE / MOBILE
- 1976 — **Sprint 2** — Racing / ARCADE
- 1977 — **Canyon Bomber** — Action / ARCADE
- 1977 — **Combat** — Shooter / ATARI 2600
- 1977 — **Space Wars** — Shooter / ARCADE
- 1978 — **Atari Football** — Sports / ARCADE
- 1978 — **Space Invaders** — Shooter / ARCADE
- 1979 — **Asteroids** — Shooter / ARCADE
- 1979 — **Atari Basketball** — Sports / ATARI 2600
- 1979 — **Galaxian** — Shooter / ARCADE
- 1979 — **Head On** — Racing / ARCADE
- 1979 — **Lunar Lander** — Simulation / ARCADE
- 1979 — **Monaco GP** — Racing / ARCADE

### 1980年代（95本）

- 1980 — **Adventure** — Adventure / ATARI 2600
- 1980 — **Battlezone** — Shooter / ARCADE
- 1980 — **Berzerk** — Maze / ARCADE
- 1980 — **Missile Command** — Defense / ARCADE
- 1980 — **PAC-MAN** — Maze / ARCADE
- 1981 — **Centipede** — Shooter / ARCADE
- 1981 — **Defender** — Shooter / ARCADE
- 1981 — **Donkey Kong** — Platform / ARCADE
- 1981 — **Frogger** — Action / ARCADE
- 1981 — **Galaga** — Shooter / ARCADE
- 1981 — **Qix** — Puzzle Action / ARCADE
- 1981 — **Scramble** — Shooter / ARCADE
- 1981 — **Tempest** — Shooter / ARCADE
- 1982 — **BurgerTime** — Action / ARCADE
- 1982 — **Dig Dug** — Maze / ARCADE
- 1982 — **Donkey Kong Jr.** — Action / ARCADE
- 1982 — **Joust** — Action / ARCADE
- 1982 — **Moon Patrol** — Action / ARCADE
- 1982 — **Ms. Pac-Man** — Maze / ARCADE
- 1982 — **Pole Position** — Racing / ARCADE
- 1982 — **Q*bert** — Puzzle Action / ARCADE
- 1982 — **Robotron: 2084** — Shooter / ARCADE
- 1982 — **Zaxxon** — Shooter / ARCADE
- 1983 — **Bomberman** — Action / COMPUTER / CONSOLE
- 1983 — **Dragon’s Lair** — Action / ARCADE
- 1983 — **Elevator Action** — Action / ARCADE
- 1983 — **Lode Runner** — Platform / COMPUTER
- 1983 — **Mappy** — Maze / ARCADE
- 1983 — **Mario Bros.** — Action / ARCADE
- 1983 — **Spy Hunter** — Racing / ARCADE
- 1983 — **Tapper** — Action / ARCADE
- 1983 — **Track & Field** — Sports / ARCADE
- 1983 — **Xevious** — Shooter / ARCADE
- 1984 — **1942** — Shooter / ARCADE
- 1984 — **Bomb Jack** — Action / ARCADE
- 1984 — **Circus Charlie** — Action / ARCADE
- 1984 — **Duck Hunt** — Shooter / FAMICOM
- 1984 — **Karate Champ** — Fighting / ARCADE
- 1984 — **Karateka** — Fighting / COMPUTER
- 1984 — **King’s Quest** — Adventure / COMPUTER
- 1984 — **Kung-Fu Master** — Action / ARCADE
- 1984 — **Marble Madness** — Racing / ARCADE
- 1984 — **Pac-Land** — Platform / ARCADE
- 1984 — **Punch-Out!!** — Fighting / ARCADE
- 1984 — **Road Fighter** — Racing / FAMICOM
- 1984 — **Tetris** — Puzzle / COMPUTER / GB
- 1984 — **The Tower of Druaga** — Adventure / ARCADE
- 1985 — **Balloon Fight** — Action / FAMICOM
- 1985 — **Commando** — Shooter / ARCADE
- 1985 — **Gauntlet** — Action / ARCADE
- 1985 — **Ghosts ’n Goblins** — Action / ARCADE
- 1985 — **Gradius** — Shooter / ARCADE
- 1985 — **Hang-On** — Racing / ARCADE
- 1985 — **Ice Climber** — Platform / FAMICOM
- 1985 — **Paperboy** — Racing / ARCADE
- 1985 — **Space Harrier** — Shooter / ARCADE
- 1985 — **Super Mario Bros.** — Platform / FAMICOM
- 1985 — **Yie Ar Kung-Fu** — Fighting / ARCADE
- 1986 — **Arkanoid** — Action / ARCADE
- 1986 — **Bubble Bobble** — Platform / ARCADE
- 1986 — **Castlevania** — Platform / FAMICOM
- 1986 — **Dragon Quest** — RPG / FAMICOM
- 1986 — **Fantasy Zone** — Shooter / ARCADE
- 1986 — **Ikari Warriors** — Shooter / ARCADE
- 1986 — **Kid Icarus** — Platform / FAMICOM DISK
- 1986 — **Metroid** — Platform / FAMICOM DISK
- 1986 — **Out Run** — Racing / ARCADE
- 1986 — **Rampage** — Action / ARCADE
- 1986 — **Solomon’s Key** — Puzzle Action / ARCADE
- 1986 — **The Legend of Zelda** — Adventure / FAMICOM DISK
- 1986 — **Wonder Boy** — Platform / ARCADE
- 1987 — **1943: The Battle of Midway** — Shooter / ARCADE
- 1987 — **After Burner** — Shooter / ARCADE
- 1987 — **Bionic Commando** — Platform / ARCADE
- 1987 — **Contra** — Run & Gun / ARCADE / FAMICOM
- 1987 — **Darius** — Shooter / ARCADE
- 1987 — **Double Dragon** — Beat ’em up / ARCADE
- 1987 — **Final Fantasy** — RPG / FAMICOM
- 1987 — **Mega Man** — Platform / FAMICOM
- 1987 — **Metal Gear** — Stealth / MSX2
- 1987 — **Operation Wolf** — Shooter / ARCADE
- 1987 — **R-Type** — Shooter / ARCADE
- 1987 — **Rad Racer** — Racing / FAMICOM
- 1987 — **Shinobi** — Action / ARCADE
- 1987 — **Tecmo Bowl** — Sports / ARCADE / NES
- 1988 — **Dragon Quest III** — RPG / FAMICOM
- 1988 — **Mega Man 2** — Platform / FAMICOM
- 1988 — **Ninja Gaiden** — Platform / NES
- 1988 — **R.C. Pro-Am** — Racing / NES
- 1989 — **Castlevania III** — Platform / FAMICOM
- 1989 — **Final Fight** — Beat ’em up / ARCADE
- 1989 — **Golden Axe** — Beat ’em up / ARCADE
- 1989 — **Phantasy Star II** — RPG / MEGA DRIVE
- 1989 — **Prince of Persia** — Platform / COMPUTER
- 1989 — **SimCity** — Simulation / COMPUTER

### 1990年代（86本）

- 1990 — **ActRaiser** — Action / SUPER FAMICOM
- 1990 — **Commander Keen** — Platform / COMPUTER
- 1990 — **Dr. Mario** — Puzzle / FAMICOM / GAME BOY
- 1990 — **F-Zero** — Racing / SUPER FAMICOM
- 1990 — **Mega Man 3** — Platform / FAMICOM
- 1990 — **Minesweeper** — Puzzle / WINDOWS
- 1990 — **Pilotwings** — Simulation / SUPER FAMICOM
- 1990 — **Raiden** — Shooter / ARCADE
- 1990 — **Solitaire** — Card / WINDOWS
- 1990 — **Super Mario World** — Platform / SUPER FAMICOM
- 1990 — **Ultima VI** — RPG / COMPUTER
- 1990 — **Wing Commander** — Shooter / COMPUTER
- 1991 — **Another World** — Adventure / COMPUTER
- 1991 — **Lemmings** — Puzzle / COMPUTER
- 1991 — **Micro Machines** — Racing / COMPUTER / CONSOLE
- 1991 — **Sid Meier’s Civilization** — Strategy / COMPUTER
- 1991 — **Sonic the Hedgehog** — Platform / MEGA DRIVE
- 1991 — **Street Fighter II** — Fighting / ARCADE
- 1991 — **Streets of Rage** — Beat ’em up / MEGA DRIVE
- 1992 — **Alone in the Dark** — Adventure / COMPUTER
- 1992 — **Dune II** — Strategy / COMPUTER
- 1992 — **Kirby’s Dream Land** — Platform / GAME BOY
- 1992 — **Mortal Kombat** — Fighting / ARCADE
- 1992 — **Sensible Soccer** — Sports / COMPUTER
- 1992 — **Super Mario Kart** — Racing / SUPER FAMICOM
- 1992 — **Wolfenstein 3D** — FPS / COMPUTER
- 1993 — **Day of the Tentacle** — Adventure / COMPUTER
- 1993 — **DOOM** — FPS / COMPUTER
- 1993 — **FIFA International Soccer** — Sports / MEGA DRIVE / SNES
- 1993 — **Myst** — Adventure / COMPUTER
- 1993 — **Ridge Racer** — Racing / ARCADE / PS
- 1993 — **Secret of Mana** — RPG / SUPER FAMICOM
- 1993 — **Star Fox** — Shooter / SUPER FAMICOM
- 1993 — **Virtua Fighter** — Fighting / ARCADE
- 1994 — **Donkey Kong Country** — Platform / SUPER FAMICOM
- 1994 — **DOOM II** — FPS / COMPUTER
- 1994 — **EarthBound** — RPG / SUPER FAMICOM
- 1994 — **Killer Instinct** — Fighting / ARCADE
- 1994 — **Super Metroid** — Platform / SUPER FAMICOM
- 1994 — **System Shock** — FPS / COMPUTER
- 1994 — **Tekken** — Fighting / ARCADE
- 1994 — **Theme Park** — Simulation / COMPUTER
- 1994 — **Warcraft: Orcs & Humans** — Strategy / COMPUTER
- 1994 — **Wario Land** — Platform / GAME BOY
- 1994 — **X-COM: UFO Defense** — Strategy / COMPUTER
- 1995 — **Chrono Trigger** — RPG / SUPER FAMICOM
- 1995 — **Command & Conquer** — Strategy / COMPUTER
- 1995 — **Descent** — FPS / COMPUTER
- 1995 — **Heroes of Might and Magic** — Strategy / COMPUTER
- 1995 — **Panzer Dragoon** — Shooter / SATURN
- 1995 — **Rayman** — Platform / CONSOLE
- 1995 — **Tekken 2** — Fighting / ARCADE
- 1995 — **Twisted Metal** — Action / PLAYSTATION
- 1995 — **Warcraft II** — Strategy / COMPUTER
- 1995 — **Worms** — Strategy / COMPUTER
- 1995 — **Yoshi’s Island** — Platform / SUPER FAMICOM
- 1996 — **Civilization II** — Strategy / COMPUTER
- 1996 — **Crash Bandicoot** — Platform / PLAYSTATION
- 1996 — **Diablo** — RPG / COMPUTER
- 1996 — **Duke Nukem 3D** — FPS / COMPUTER
- 1996 — **Mario Kart 64** — Racing / NINTENDO 64
- 1996 — **Metal Slug** — Run & Gun / ARCADE
- 1996 — **Pokémon Red / Green** — RPG / GAME BOY
- 1996 — **Quake** — FPS / COMPUTER
- 1996 — **Resident Evil** — Adventure / PLAYSTATION
- 1996 — **Super Mario 64** — Platform / NINTENDO 64
- 1996 — **Tomb Raider** — Adventure / PLAYSTATION / PC
- 1997 — **Age of Empires** — Strategy / COMPUTER
- 1997 — **Castlevania: Symphony of the Night** — Platform / PLAYSTATION
- 1997 — **Fallout** — RPG / COMPUTER
- 1997 — **Final Fantasy VII** — RPG / PLAYSTATION
- 1997 — **GoldenEye 007** — FPS / NINTENDO 64
- 1997 — **Gran Turismo** — Racing / PLAYSTATION
- 1997 — **Star Fox 64** — Shooter / NINTENDO 64
- 1997 — **Tekken 3** — Fighting / ARCADE / PS
- 1998 — **Dance Dance Revolution** — Rhythm / ARCADE
- 1998 — **Half-Life** — FPS / COMPUTER
- 1998 — **Metal Gear Solid** — Stealth / PLAYSTATION
- 1998 — **StarCraft** — Strategy / COMPUTER
- 1998 — **The Legend of Zelda: Ocarina of Time** — Adventure / NINTENDO 64
- 1998 — **Thief: The Dark Project** — Stealth / COMPUTER
- 1999 — **Counter-Strike** — FPS / COMPUTER
- 1999 — **Crazy Taxi** — Racing / ARCADE / DREAMCAST
- 1999 — **RollerCoaster Tycoon** — Simulation / COMPUTER
- 1999 — **Super Smash Bros.** — Fighting / NINTENDO 64
- 1999 — **Tony Hawk’s Pro Skater** — Sports / PLAYSTATION

## テスト

- 登録数: 200
- ID重複: 0
- クラシック/モダン: 全200本で複数フレーム実行テスト
- AUTO: 全ゲームで専用またはジャンル専用ロジック
- 外部CDN/API: 不使用

## 注意

ゲーム名は歴史的な参照・識別のために使用しています。元作品の素材そのものは同梱していません。各ゲームはブラウザ向けの簡略再構成で、完全なエミュレーションではありません。
