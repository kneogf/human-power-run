# AGENTS.md — 人力走 -JINRIKISOU-

このファイルは Codex / Claude Code など AI エージェントが本プロジェクト配下で作業する時のガイド。
経営ドキュメント用の `Users/kyosuke/Claude-Workspace/JustForFun/AGENTS.md` とは別物で、
**このプロジェクト内では本ファイルの指示が優先** される。

## Repo 概要

- **プロダクト**: 人力走 -JINRIKISOU-（旧 HUMAN POWER RUN）
- **技術スタック**:
  - Vite 5 + React 18 + TypeScript (strict)
  - Canvas 2D (`requestAnimationFrame` ループ)
  - Vercel Serverless Functions (`api/`) + Upstash Redis (Marketplace)
  - Upstash Rate Limit (`@upstash/ratelimit`)
- **本番 URL**: https://human-power-run.vercel.app
- **GitHub**: https://github.com/kneogf/human-power-run
- **Vercel チーム**: `just-for-fun`

## ディレクトリ

| パス | 役割 |
|------|------|
| `src/game/engine.ts` | ゲームループ・物理・生成・衝突・描画統括 |
| `src/game/characters.ts` | 4キャラのパラメータ + 描画関数 |
| `src/game/courses.ts` | 3コースの地域シーケンス + ステージ倍率 |
| `src/game/decorations.ts` | 地域ごとの装飾（富士山・NY・動物など）描画 |
| `src/game/obstacles.ts` | 障害物の型と描画（進行中） |
| `src/game/timeofday.ts` | 距離ベースの時間帯サイクル・空・太陽・月 |
| `src/game/audio.ts` | Web Audio API による SE 合成 |
| `src/game/types.ts` | 型定義（キャラ/コース/地域/装飾） |
| `src/game/courseRenderer.ts` | コース背景/モチーフの Canvas 描画（マネタイズ層と連動） |
| `src/config/` | スポンサー・応援者・マイルストーン・キャンペーン設定 |
| `src/lib/` | adSlotManager / tracking / courseManager などのランタイム制御 |
| `src/App.tsx` | React UI シェル（キャラ/コース選択・HUD・オーバーレイ） |
| `api/scores.ts` | リーダーボード GET/POST |
| `api/_ratelimit.ts` | Upstash Rate Limit ラッパー |

## Commands

```bash
npm run dev        # Vite dev サーバ (http://localhost:5173)
npm run build      # tsc -b で型チェック → vite build
npm run typecheck  # 型のみ
npm run preview    # ビルド成果物を確認
```

Vercel CLI（`/opt/homebrew/bin/vercel`, スコープ `just-for-fun`）:

```bash
vercel deploy --prod --yes   # 本番デプロイ
vercel dev                    # API Routes 込みでローカル起動
vercel env pull .env.local    # KV env vars を取得
```

## コーディング規約

- **型は strict、`any` 禁止**（`unknown` から明示的に narrow する）
- **Canvas 描画関数は純粋関数**: 副作用なし、戻り値なし、引数だけで完結
- **ゲーム状態はエンジンのクロージャに閉じ込め**、React にはコールバックで通知（`onScore` / `onStageChange` など）
- **localStorage キーは `hpr_*` プレフィックス**（`hpr_best`, `hpr_name`, `hpr_course`, `hpr_muted` 等）
- **API バリデーション**: name/character/score は必ずサーバ側で正規化・列挙チェック・上限値チェック
- **座標系**: プレイヤーの `x` は固定、ワールドが左に流れる（scroll model）
- **コメントは "WHY" のみ**: WHAT は識別子で表現し、非自明な制約や意図だけを短く書く

## 追加時の更新漏れチェックリスト

新キャラを足す時:
1. `src/game/types.ts` の `CharacterId` に追加
2. `src/game/characters.ts` の `CHARACTERS` と `CHARACTER_DRAWERS` に追加
3. `src/App.tsx` の `CHARACTER_ORDER` に追加（表示順）
4. `api/scores.ts` の `VALID_CHARS` に追加

新コース／地域を足す時:
1. `src/game/types.ts` の `CourseId` / `DecorationId` に追加
2. `src/game/decorations.ts` に描画関数追加 + `DECORATION_DRAWERS` に登録
3. `src/game/courses.ts` の `COURSES` に定義追加
4. `src/App.tsx` の `COURSE_ORDER` に追加
5. `src/game/courseRenderer.ts` の `drawCourseMotif()` にも新モチーフを対応（マネタイズ層併用時）

## レビュー時に必ず見る観点

- **Canvas ループの毎フレームコスト**: `for (const ...)` の中で allocate してないか、GC 圧を発生させてないか
- **React hooks の依存配列**: stale closure、`gameRef.current` の nullability
- **API endpoint の入力バリデーション**: 制御文字・列挙外・数値範囲・レート制限
- **座標系のバグ**: `baseY()` / スクロール量 / `bgScroll` の 3 者の関係
- **音声の unlock 順**: iOS Safari は初回ユーザー操作前に AudioContext を作ると suspended になる
- **セッション永続性**: localStorage 書き込みは try/catch で囲む（プライベートブラウズ対策）

## ドメイン用語辞書

- **コース (Course)**: 日本縦断 / アメリカ縦断 / アフリカ の 3 種類
- **地域 (Region)**: コース内の距離区間（沖縄→富士→東北→北海道 など）
- **ステージ (Stage)**: 距離ベースのスピード段階（1〜5）
- **装飾 (Decoration)**: 富士山・観覧車・ゾウなど背景に置くビジュアル
- **障害物 (Obstacle)**: プレイヤーに当たると Game Over になるオブジェクト
- **応援者 / スポンサー / マイルストーン**: マネタイズ層。詳細は README.md 参照
