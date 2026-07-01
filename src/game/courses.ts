// スピード段階（距離に応じた難度カーブ）の定義。
//
// 背景・地域システムは courseConfig.ts / courseRenderer.ts に移行済み。
// このファイルはコース共通のスピード段階のみを担当する。

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

export function resolveSpeedStage(distance: number): SpeedStage {
  let stage = SPEED_STAGES[0];
  for (const s of SPEED_STAGES) {
    if (distance >= s.fromDistance) stage = s;
    else break;
  }
  return stage;
}

export function getStageIndex(distance: number): number {
  let idx = 0;
  for (let i = 0; i < SPEED_STAGES.length; i++) {
    if (distance >= SPEED_STAGES[i].fromDistance) idx = i;
    else break;
  }
  return idx;
}
