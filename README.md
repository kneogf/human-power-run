# HUMAN POWER RUN

人力のみで進む横スクロールランゲームのMVP。
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

## 既知の制限 / 今後の拡張余地

- 障害物（鳥・落石）はまだ無い。MVPでは「崖落下のみ」で死ぬ。
- BGM・効果音は未実装。
- 背景はモノクロのプレースホルダー。後で「アフリカ」「Route66」「日本街道」など世界観バリアントを `drawBackground` 差し替えで足せる構造にしてある。
- キャラのドット絵化・画像化はまだ。`CHARACTER_DRAWERS` を差し替えれば差分なく追加できる。
- スマホ縦持ち時のレイアウト微調整は要改善。

## ライセンス

社内プロトタイプ。外部公開・商用利用は未確定。
