// 3つのコースと、その地域シーケンスを定義。
// 距離（m）が startDistance を超えると次の地域に切り替わる。
// engine.ts は現在距離から「現在の地域」と「次の地域」を取って、両者の装飾を
// クロスフェード描画する。

import type { Course, CourseId, Region } from './types';

const j: Record<string, Region> = {
  okinawa: {
    startDistance: 0,
    name: '沖縄 / ビーチ',
    decorations: ['okinawa_beach'],
    groundFill: '#e8d4a3',
    groundStroke: '#7a5a1f',
  },
  fuji: {
    startDistance: 700,
    name: '富士山 / 桜',
    decorations: ['fuji_sakura'],
    groundFill: '#3a2818',
    groundStroke: '#1c1009',
  },
  tohoku: {
    startDistance: 1500,
    name: '東北 / 森',
    decorations: ['tohoku_forest'],
    groundFill: '#2a3a1f',
    groundStroke: '#0a1408',
  },
  hokkaido: {
    startDistance: 2400,
    name: '北海道 / 雪原',
    decorations: ['hokkaido_snow'],
    groundFill: '#e8eaf0',
    groundStroke: '#8a9aa8',
  },
};

const u: Record<string, Region> = {
  ny: {
    startDistance: 0,
    name: 'NEW YORK',
    decorations: ['ny_skyline'],
    groundFill: '#222',
    groundStroke: '#666',
  },
  desert: {
    startDistance: 800,
    name: 'ROUTE 66 / 砂漠',
    decorations: ['route66_desert', 'monument_valley'],
    groundFill: '#c08a5a',
    groundStroke: '#5d3a1c',
  },
  gump: {
    startDistance: 1600,
    name: 'GUMP の走り',
    decorations: ['route66_desert', 'monument_valley', 'gump_runner'],
    groundFill: '#c08a5a',
    groundStroke: '#5d3a1c',
  },
  santa: {
    startDistance: 2400,
    name: 'SANTA MONICA / 海',
    decorations: ['santa_monica_pier'],
    groundFill: '#f0d8a4',
    groundStroke: '#7a4a26',
  },
};

const a: Record<string, Region> = {
  savanna: {
    startDistance: 0,
    name: 'サバンナ',
    decorations: ['savanna_acacia', 'animal_elephant'],
    groundFill: '#b8924a',
    groundStroke: '#5a3a10',
  },
  herds: {
    startDistance: 700,
    name: '草食動物の群れ',
    decorations: ['savanna_acacia', 'animal_giraffe', 'animal_zebra'],
    groundFill: '#a87a3a',
    groundStroke: '#3a2510',
  },
  tribal: {
    startDistance: 1500,
    name: '民族の領域',
    decorations: ['savanna_acacia', 'tribal_figure', 'animal_zebra'],
    groundFill: '#9a6a2a',
    groundStroke: '#3a2010',
  },
  beach: {
    startDistance: 2400,
    name: 'アフリカ西岸 / ビーチ',
    decorations: ['african_beach'],
    groundFill: '#f0d8a4',
    groundStroke: '#7a4a26',
  },
};

export const COURSES: Record<CourseId, Course> = {
  japan: {
    id: 'japan',
    name: '日本縦断',
    tagline: '沖縄 → 富士 → 東北 → 北海道',
    difficulty: 1,
    speedMultiplier: 1.0,
    gapMultiplier: 1.0,
    regions: [j.okinawa, j.fuji, j.tohoku, j.hokkaido],
  },
  usa: {
    id: 'usa',
    name: 'アメリカ縦断',
    tagline: 'NY → ROUTE 66 → SANTA MONICA',
    difficulty: 2,
    speedMultiplier: 1.15,
    gapMultiplier: 1.1,
    regions: [u.ny, u.desert, u.gump, u.santa],
  },
  africa: {
    id: 'africa',
    name: 'アフリカ',
    tagline: 'サバンナ → 群れ → 民族 → 海',
    difficulty: 3,
    speedMultiplier: 1.3,
    gapMultiplier: 1.2,
    regions: [a.savanna, a.herds, a.tribal, a.beach],
  },
};

/**
 * 距離(m)から現在の地域と次の地域、進行率を返す。
 * - 現在の地域 = startDistance <= distance を満たす最後の region
 * - 次の地域 = その次の region（なければ null）
 * - blend = (distance - currentStart) / (nextStart - currentStart) を 0..1 にクランプ
 *   ただし完全クロスフェードは見づらいので、blend>0.85 のときだけ次の装飾を重ねる、など
 *   呼び出し側で扱う。
 */
export function resolveRegion(course: Course, distance: number): {
  current: Region;
  next: Region | null;
  /** 0..1 で「次の地域までの進行率」 */
  blend: number;
} {
  const regs = course.regions;
  let idx = 0;
  for (let i = 0; i < regs.length; i++) {
    if (distance >= regs[i].startDistance) idx = i;
    else break;
  }
  const current = regs[idx];
  const next = regs[idx + 1] ?? null;
  let blend = 0;
  if (next) {
    const span = next.startDistance - current.startDistance;
    blend = span > 0 ? (distance - current.startDistance) / span : 0;
    blend = Math.min(1, Math.max(0, blend));
  }
  return { current, next, blend };
}

// ---- スピード段階 --------------------------------------------------------

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
