# 人力走 -JINRIKISOU-

（旧名 HUMAN POWER RUN）人力のみで進む横スクロールランゲームのMVP。
人が走る／自転車／人力車 の3キャラを切り替えて、崖と段差をジャンプで越え、どこまで進めるかを競う。

将来的にはガンプ鈴木の旅・Route66・アフリカ旅・映画 RESTART などのJFF世界観へ拡張する予定だが、まずは遊べる土台として実装している。

## 技術スタック

- Vite 5 + React 18 + TypeScript
- Canvas 2D (`requestAnimationFrame` ループ)
- 外部ゲームエンジン無し・依存最小

## ファイル構成

```
HUMAN_POWER_RUN/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.node.json
└── src/
    ├── main.tsx          # React マウント
    ├── App.tsx           # UI シェル（タイトル/スコア/選択/オーバーレイ）
    ├── index.css         # 黒白ベースのスタイル
    └── game/
        ├── types.ts      # 型定義
        ├── characters.ts # 3キャラのパラメータ & 描画関数
        └── engine.ts     # Canvasゲーム本体（物理・生成・衝突・描画）
```

物理 / 難度 / 生成のチューニングは `src/game/engine.ts` 冒頭の `TUNING` にまとまっている。挙動を変えたいときはここを最初に触ると早い。

## 起動方法

> Node.js 18+ 推奨（このMacでは v26 を利用）

```bash
cd 06_PROJECTS/HUMAN_POWER_RUN
npm install
npm run dev
```

ブラウザで `http://localhost:5173/` を開く。スマホで触る場合は同じLAN内から `http://<PCのIP>:5173/` でアクセス可能（`vite.config.ts` で `host: true` 済み）。

ビルド確認:

```bash
npm run build       # tsc -b で型チェック → vite build
npm run preview     # ビルド成果物を確認
npm run typecheck   # 型チェックのみ
```

## 操作

| 操作 | 動作 |
|------|------|
| タップ / `Space` / `↑` / `W` | ジャンプ（人・自転車は2段、人力車は1段） |
| `←` `→` / `A` `D` | 左右に少しだけ移動（PC） |
| `Enter` | 選択画面で START、Game Overで RESTART |

## キャラクター

| キャラ | 速度 | ジャンプ力 | 重力 | 段数 | 性格 |
|--------|------|----------|------|------|------|
| 人が走る | 4.8 | -15 | 0.72 | 2 | 軽い・初心者向け |
| 自転車   | 5.4 | -14 | 0.72 | 2 | 標準・バランス型 |
| 人力車   | 4.5 | -13 | 0.78 | 1 | 重い・上級者向け |

スコアは「進んだ距離」+「コイン取得ボーナス(+10)」。ベストスコアは `localStorage` の `hpr_best` に保存される。

---

## マネタイズ層の運用 (v2)

「沿道に応援者やスポンサーが現れるゲーム」という思想で、ゲーム内に応援/スポンサー枠を組み込んでいる。すべて `src/config/` 配下のファイルを書き換えるだけで反映される (再ビルド/再起動で OK、CMS不要)。

### ファイル早見表

| ファイル | 役割 |
|---------|------|
| [`src/config/supporterConfig.ts`](src/config/supporterConfig.ts) | 個人応援者 (差し入れ / 沿道 / メッセージ / 追い風) |
| [`src/config/sponsorConfig.ts`](src/config/sponsorConfig.ts) | 法人スポンサー / JFF告知 / イベント告知 |
| [`src/config/milestoneConfig.ts`](src/config/milestoneConfig.ts) | マイルストーン協賛 (100m/500m/1000m/3000m など) |
| [`src/config/campaignConfig.ts`](src/config/campaignConfig.ts) | キャンペーン / Game Over CTA / 決済リンク |
| [`src/lib/adSlotManager.ts`](src/lib/adSlotManager.ts) | 表示制御 (有効/期間/重み付き抽選/JFF枠保証) |
| [`src/lib/tracking.ts`](src/lib/tracking.ts) | 計測イベントを localStorage に蓄積 (将来Supabase/GA4へ) |

### プラン仕様 (個人応援)

| プラン | 金額 | 掲載 | 反映タイミング |
|--------|------|------|---------------|
| 差し入れ応援 (`tip`) | ¥300〜 | **掲載なし** | 即時 (掲載対応なし) |
| 今週の沿道応援 (`weekly_name`) | ¥500 | 沿道に名前 (7日間) | 翌週月曜 |
| 今週のメッセージ応援 (`weekly_message`) | ¥1,500 | 名前 + 一言 (7日間) | 翌週月曜 |
| 追い風サポーター (`weekly_boost`) | ¥5,000 | 沿道優先 + Game Over掲載 (7日間) | 翌週月曜 |

> **価格戦略メモ (案B)**: 心理的スイートスポットに寄せた4段階。
> - ¥300: 気軽な差し入れ。掲載リターン無し
> - ¥500: 「毎週コーヒー1杯分でJFFを支える」の入り口
> - ¥1,500: 中間の価値提示
> - ¥5,000: 熱狂ファン向け・法人スポンサーへのブリッジ
>
> 掲載ありは ¥500以上。即時反映は不要 — **日曜23:59締切、翌週月曜まとめて反映**。

### 個人応援者を追加する手順

1. [`src/config/supporterConfig.ts`](src/config/supporterConfig.ts) の `SUPPORTERS` 配列に1件追加
2. `id` は `spt_xxx` で一意 (重複NG)
3. `planName` は `tip` / `weekly_name` / `weekly_message` / `weekly_boost` のいずれか
4. `startDate` / `endDate` は `YYYY-MM-DD` (例: 月〜日の7日間)
5. `isActive: true` で公開、`false` で停止
6. ¥300差し入れ (`tip`) は **必ず** `showOnRoadside: false`

例:
```ts
{
  id: 'spt_sample',
  name: '本名・正式表記',
  planName: 'weekly_message',
  displayName: '表示名',
  message: '応援メッセージ',
  price: 2000,
  displayPeriod: 'weekly',
  startDate: '2026-05-25',
  endDate: '2026-05-31',
  weight: 12,        // 大きいほど沿道に出やすい
  isActive: true,
  showOnRoadside: true,
  showOnGameOver: false,
  showOnRanking: false,
}
```

### 法人スポンサーを追加する手順

[`src/config/sponsorConfig.ts`](src/config/sponsorConfig.ts) の `SPONSORS` に追記。

```ts
{
  id: 'spn_xxx',
  name: '社名 (正式)',
  type: 'corporate',          // corporate | jff | event
  slot: 'roadside',           // roadside | gameover | milestone | vehicle | stage
  displayName: '看板表示名',
  message: '一言メッセージ (省略可)',
  linkUrl: 'https://...',     // クリック先 (現状は記録のみ)
  startDate: '2026-05-01',
  endDate: '2026-12-31',
  weight: 15,                 // 表示頻度
  priority: 80,               // 優先度 (高いほど沿道で勝ちやすい)
  isActive: true,
}
```

### JFF告知 / イベント告知

同じ `sponsorConfig.ts` の `SPONSORS` で `type` を `jff` または `event` に。
JFF告知は **約22%の確率で必ず表示される** (`adSlotManager.ts` の `JFF_FORCE_RATE`)。
完全停止したい時は `isActive: false`。

### マイルストーン協賛を追加 / 編集

[`src/config/milestoneConfig.ts`](src/config/milestoneConfig.ts) の `MILESTONES` を編集。`distance` (m) を超えた瞬間に1回だけ画面上部に2秒表示される。`sponsorName` を空文字にすればJFF独自メッセージのみ。

### キャンペーンを切り替える

[`src/config/campaignConfig.ts`](src/config/campaignConfig.ts) で:
1. 今 active なキャンペーンの `isActive: false` にする
2. 切り替えたい新キャンペーンを `isActive: true` に
3. `startDate` / `endDate` が今日を含むこと

Game Over画面のタイトル/説明文 (`gameOverCta`) と決済リンク (`supportLinks`) はキャンペーン単位で持つ。

### 表示比率を変更する

- 個人応援 vs 法人スポンサー: それぞれの `weight` で調整 (大きいほど出やすい)。法人は `priority` も加味される (`weight × (1 + priority/100)`)。
- 追い風サポーター: 内部で `weight × 1.6` の補正がかかる (沿道で優先表示)。
- JFF告知の保証割合: `src/lib/adSlotManager.ts` の `JFF_FORCE_RATE` (デフォルト 0.22 = 22%)。

### 掲載を停止する

該当エントリの `isActive: false` にするか、`endDate` を過去にする。即時反映 (リロードで消える)。

### 計測イベントを確認する (localStorage)

ブラウザの DevTools コンソールで:

```js
// 全イベント (累積最大500件)
window.__hprEvents()

// 全クリア
window.__hprClearEvents()

// CSVっぽくサマリ
window.__hprEvents().reduce((acc, e) => ({...acc, [e.eventName]: (acc[e.eventName] ?? 0) + 1}), {})
```

記録されるイベント:

| イベント名 | 発火タイミング |
|-----------|---------------|
| `play_start` | 初回 START ボタン |
| `retry` | Game Over → もう一度走る |
| `game_over` | プレイヤー落下時 |
| `roadside_billboard_impression` | 沿道看板が画面内に入った瞬間 (看板1枚1回) |
| `milestone_impression` | マイルストーン距離到達時 |
| `support_cta_impression` | Game Over CTA画面の表示 |
| `support_click_tip` | 差し入れ ¥300 ボタンクリック |
| `support_click_weekly_name` | 沿道に名前 ¥500 ボタン |
| `support_click_weekly_message` | メッセージ ¥1,500 ボタン |
| `support_click_weekly_boost` | 追い風 ¥5,000 ボタン |
| `sponsor_click` | (将来用) 沿道看板タップで遷移 |
| `campaign_cta_click` | キャンペーン専用CTA (event_mode時) |

将来Supabase/GA4等に流す場合は `src/lib/tracking.ts` の `trackEvent` 内に転送ロジックを追加。

---

## コース/ステージ設計

「旅・人力・冒険」を表現するため、コースは **距離500m刻みの6セクション × 3コース** で構成される。背景は画像アセットを使わず、Canvas の図形/シルエット/テキストで描画する。

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| [`src/config/courseConfig.ts`](src/config/courseConfig.ts) | コース・セクション・モチーフの定義データ |
| [`src/lib/courseManager.ts`](src/lib/courseManager.ts) | 距離からセクション/マイルストーン/文言を引くヘルパー |
| [`src/game/courseRenderer.ts`](src/game/courseRenderer.ts) | 背景・モチーフ・ロードランナーの Canvas 描画 |

3コース: 日本縦断 (`japan`) / Route66横断 (`route66`) / アフリカ縦断 (`africa`)。各コース 0〜3000m を 500m ごとに 6 セクションへ分割。

### コースを追加する方法

`src/config/courseConfig.ts` の `courses[]` 配列に `CourseConfig` を1件足す。`id` は `CourseId` 型に追加が必要（`courseConfig.ts` 冒頭の `CourseId`、および `src/game/types.ts` の `CourseId`）。`App.tsx` の `COURSE_ORDER` にも id を足すと選択画面に出る。

### section を追加する方法

対象 `CourseConfig` の `sections[]` に `CourseSection` を追加する。`distanceStart` / `distanceEnd` を連続させ、`backgroundColor` / `skyColor` / `groundColor` / `accentColor` を地域の雰囲気で指定する。`skyColor` は白い足場が埋もれないよう中〜濃いめ・彩度高めにする。`milestoneText` を入れるとそのセクション開始距離でマイルストーン帯が出る。

### motif を追加する方法

1. `courseConfig.ts` の `CourseMotifType` に新しい種別名を足す
2. `courseRenderer.ts` の `drawCourseMotif()` の `switch` に対応する `case` を1つ追加（図形/シルエット描画）
3. 必要なら `motifParallax()` / `motifAlpha()` にも種別を足してパララックス・不透明度を調整
4. セクションの `motifs[]` に `CourseMotif`（`type` / `xOffset` / `yOffset` / `scale` / 色）を足す

`xOffset` はセクション論理幅 960px 内の水平位置、`yOffset` は地面ラインからの上方向オフセット。

### courseId ごとの milestone 設定方法

- セクション由来: `CourseSection.milestoneText` を設定すると `getCourseMilestones()` が `distanceStart` でマイルストーン化する。
- スポンサー由来: `src/config/milestoneConfig.ts` の `MilestoneSponsor` に `courseId?: 'japan' | 'route66' | 'africa'` を指定すると、そのコース限定で表示される（未指定なら全コース共通）。
- 統合は `App.tsx` の `buildMilestones()` が担当し、セクション文言とスポンサー枠をマージして engine に渡す。

### Route66 の road_runner 演出について

`route66` コースの砂漠セクション（`r66_desert` = 2000〜2500m `DESERT RUN`）でのみ、背景にロードランナー（走鳥）が時々出現し、画面を高速で横切る。当たり判定は無く、後方に砂煙を出す純粋な演出。描画は `courseRenderer.ts` の `drawRoadRunner()`、出現制御は `engine.ts` の `updateRoadRunner()`。実在の砂漠鳥のシルエット（小さな胴・長い尾・冠羽・細いくちばし）で、カートゥーンキャラには寄せない。

### 新しい地域コースの作り方

1. `courseConfig.ts` に新 `CourseConfig` を定義（6セクション・各3〜6モチーフ）
2. 必要なモチーフ種別を `CourseMotifType` + `drawCourseMotif()` に追加
3. `CourseId` 型（`courseConfig.ts` と `types.ts`）と `App.tsx` の `COURSE_ORDER` に id を追加
4. `courseManager.ts` の `getGameOverMessage()` に新コースの文言を足す

### コース別 Game Over 文言の変更方法

`src/lib/courseManager.ts` の `getGameOverMessage()` の `switch` を編集する。`\n` で改行でき、`App.tsx` の Game Over オーバーレイが行単位で表示する。

---

## BGM / Game Over ジングル

mp3 の音楽再生は `src/lib/audioManager.ts`（HTMLAudioElement ベース）が担当する。
効果音（コイン・ジャンプ）は別レイヤーの `src/game/audio.ts`（Web Audio 合成）。

### 音源ファイルの置き場所

すべて `public/audio/` に置く。差し替えは同名で上書きするだけ。

| ファイル | 用途 |
|---------|------|
| `public/audio/title-theme.mp3` | タイトル/コース選択画面のBGM |
| `public/audio/japan.mp3` | 日本縦断コースのBGM |
| `public/audio/route66.mp3` | Route66横断コースのBGM |
| `public/audio/africa.mp3` | アフリカ縦断コースのBGM |
| `public/audio/game-over.mp3` | Game Overジングル（loopしない） |
| `public/audio/star.mp3` | 予備トラック（現状未使用） |

トラック定義（src/volume/loop）は `src/config/audioConfig.ts` の `AUDIO_TRACKS`。

### Game Over ジングルの差し替え方法

`public/audio/game-over.mp3` を差し替えるだけ。音量は `audioConfig.ts` の `gameover.volume`（既定 0.65）で調整。

### Game Over 時のBGMフロー

`App.tsx` の `onGameOver` → `onGameOverAudioFlow()`（`audioManager.ts`）が実行する：

1. プレイ中のコースBGMを `BGM_FADEOUT_MS`（既定 300ms）でフェードアウト
2. `game-over.mp3` ジングルを再生（loopなし）
3. ジングル終了後、タイトルBGMを小音量（`TITLE_AFTER_GAMEOVER_VOLUME`、既定 0.3）で再開
4. Restart すると選択中コースのBGMへ、Reset するとタイトルBGM（通常音量）へ切り替わる

途中で Restart した場合は世代トークンで以降の処理を中断するため、コースBGMが上書きされない。

### BGM OFF（ミュート）時の挙動

ヘッダーの 🔊/🔇 トグル（localStorage `hpr_muted`）が ON のとき、
`setBgmMuted(true)` で**BGMもGame Overジングルも一切鳴らさない**。
`onGameOverAudioFlow()` はミュート時に即 return する。

### 自動再生制限への対応

ブラウザは初回ユーザー操作まで音を出せない。
それまでの `playBgm()` は再生を「予約」だけし、最初のタップ/キー入力で
`unlockBgm()` が呼ばれて実際に鳴り始める。

### 計測イベント

`gameover_jingle_start` / `gameover_jingle_end` が `trackEvent` で記録される
（`window.__hprEvents()` で確認可能）。

---

## 既知の制限 / 今後の拡張余地

- 障害物（鳥・落石）はまだ無い。MVPでは「崖落下のみ」で死ぬ。
- 効果音（コイン・ジャンプ）は Web Audio 合成。BGM・Game Overジングルは mp3（「BGM / Game Over ジングル」参照）。
- 背景はコース/セクション制（「コース/ステージ設計」参照）。日本縦断・Route66横断・アフリカ縦断の3コース実装済み。旧 `decorations.ts` / `timeofday.ts` は現行の描画パスでは未使用。
- キャラのドット絵化・画像化はまだ。`CHARACTER_DRAWERS` を差し替えれば差分なく追加できる。
- スマホ縦持ち時のレイアウト微調整は要改善。

## Codex によるコードレビュー

Claude Code が実装したコードに **セカンドオピニオン** を与える運用。同じ AI の自己レビューより bias が消える。

### 前提

- `codex` CLI がインストール済み (`v0.141.0+` 想定)
- ワークスペース側の [`.codex/config.toml`](../../.codex/config.toml) と [`.codex/agents/`](../../.codex/agents/) が有効
- レビュアーエージェント定義: [`.codex/agents/code-reviewer.toml`](../../.codex/agents/code-reviewer.toml)
- プロジェクト側のガイド: [`AGENTS.md`](./AGENTS.md)

### 実行パターン

すべて `06_PROJECTS/HUMAN_POWER_RUN/` を CWD にして実行。Codex には専用の `review` サブコマンドがある。

#### 1. コミット前の未コミット差分を全部レビュー（一番実用的）

```bash
cd 06_PROJECTS/HUMAN_POWER_RUN
codex review --uncommitted "code-reviewer エージェントで staged/unstaged/untracked を全部レビュー"
```

#### 2. main と比較して現ブランチをレビュー

```bash
codex review --base main "code-reviewer で main から現ブランチまでの差分をレビュー"
```

#### 3. 特定コミットのレビュー

```bash
codex review --commit 37b4e90 "code-reviewer でこのコミットをレビュー"
```

#### 4. GitHub PR をレビュー（stdin パイプ）

```bash
gh pr diff 123 | codex review - "code-reviewer で stdin の PR 差分をレビュー"
```

#### 5. 単ファイル / ざっくり質問は `codex exec` で

```bash
codex exec "code-reviewer として src/game/engine.ts をレビュー。判定サマリと指摘を出して"
```

#### 6. 対話モードで PR 全体を相談したい時

```bash
codex
# TUI で "code-reviewer として直近の差分をレビューして" と依頼
```

### レビュー判定の意味

`.codex/agents/code-reviewer.toml` の指示により、指摘は以下に分類される:

| 重大度 | 意味 | 対応 |
|--------|------|------|
| **Blocker** | 公開・マージ不可 | 即差し戻し |
| **Major** | 公開前に必ず直す | 修正後に再レビュー |
| **Minor** | 公開後でも可 | 記録のみ |
| **Nit** | 好み・フォーマット | 起案者判断 |

最終行に `PASS` または `NEEDS_CHANGES` が出るので、CI/CD への組み込みも容易。

### 推奨運用フロー

1. **Claude Code** — 実装・設計・リファクタ
2. **Codex `code-reviewer`** — 実装後のセカンドオピニオン、Blocker/Major を洗い出す
3. **Claude Code** — Codex の指摘を反映し再デプロイ

日常運用では 3. → 1. → 2. → 3. のループが自然。

## ライセンス

社内プロトタイプ。外部公開・商用利用は未確定。
