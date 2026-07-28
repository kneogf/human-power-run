// スピード段階（距離に応じた難度カーブ）の定義。
//
// 背景・地域システムは courseConfig.ts / courseRenderer.ts に移行済み。
// このファイルはコース共通のスピード段階のみを担当する。
//
// 挙動:
//   - HUD / STAGE UP フラッシュは step 型で判定 (getStageIndex / resolveSpeedStage)
//   - 実際の速度・gap・yジッターは stage 間を線形補間して滑らかに上げる
//     (getSmoothMultiplier) → プレイ体感は段階的な「ガクッ」がなく自然

interface SpeedStage {
  fromDistance: number;
  multiplier: number;
  label: string;
}

const SPEED_STAGES: SpeedStage[] = [
  { fromDistance: 0, multiplier: 1.0, label: 'STAGE 1' },
  { fromDistance: 300, multiplier: 1.1, label: 'STAGE 2' },
  { fromDistance: 700, multiplier: 1.25, label: 'STAGE 3' },
  { fromDistance: 1200, multiplier: 1.45, label: 'STAGE 4' },
  { fromDistance: 2000, multiplier: 1.7, label: 'STAGE 5' },
];

/** HUD の現在ステージラベル判定 (step 型) */
export function resolveSpeedStage(distance: number): SpeedStage {
  let stage = SPEED_STAGES[0];
  for (const s of SPEED_STAGES) {
    if (distance >= s.fromDistance) stage = s;
    else break;
  }
  return stage;
}

/** STAGE UP フラッシュ判定用 (step 型) */
export function getStageIndex(distance: number): number {
  let idx = 0;
  for (let i = 0; i < SPEED_STAGES.length; i++) {
    if (distance >= SPEED_STAGES[i].fromDistance) idx = i;
    else break;
  }
  return idx;
}

/**
 * 実速度・gap・yジッター用の連続的な倍率。
 * 各ステージ内で次ステージへ向けて線形補間し、境界での「ガクッ」を無くす。
 * 最終ステージ以降は最大値で固定。
 */
export function getSmoothMultiplier(distance: number): number {
  const stages = SPEED_STAGES;
  for (let i = 0; i < stages.length; i++) {
    const current = stages[i];
    const next = stages[i + 1];
    if (!next) {
      // 最終ステージ以降は上限値で固定
      return current.multiplier;
    }
    if (distance < next.fromDistance) {
      const span = next.fromDistance - current.fromDistance;
      if (span <= 0) return current.multiplier;
      // 現在ステージ内での進行率 (0..1) を線形補間
      const t = Math.max(0, Math.min(1, (distance - current.fromDistance) / span));
      return current.multiplier + (next.multiplier - current.multiplier) * t;
    }
  }
  return stages[0].multiplier;
}
