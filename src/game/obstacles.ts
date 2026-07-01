// 障害物の型と描画 + 衝突用のAABB。
// 各障害物は (x, y, w, h, kind) を持つ。位置はワールド座標で、
// engine 側で毎フレーム -= speed して左に流す。
//
// kind から描画関数と「空中／地面」属性を引く。

export type ObstacleKind =
  | 'bird'
  | 'rock'
  | 'lightning'
  | 'taxi'
  | 'hyena'
  | 'spear'
  | 'lion';

export interface ObstacleSpec {
  kind: ObstacleKind;
  /** 空中障害物か。true なら地面ではなく空中の固定高さに出現 */
  isAir: boolean;
  width: number;
  height: number;
  /** 地面からの「足元の高さ」(地面=0)。空中障害物は地面上のオフセット */
  airOffsetY: number;
  /** ヒットボックス縮小（描画より小さくしてフェアに） */
  hitInsetX: number;
  hitInsetY: number;
}

export const OBSTACLE_SPECS: Record<ObstacleKind, ObstacleSpec> = {
  bird: {
    kind: 'bird',
    isAir: true,
    width: 40,
    height: 24,
    airOffsetY: 120,
    hitInsetX: 6,
    hitInsetY: 4,
  },
  rock: {
    kind: 'rock',
    isAir: false,
    width: 44,
    height: 32,
    airOffsetY: 0,
    hitInsetX: 6,
    hitInsetY: 4,
  },
  lightning: {
    kind: 'lightning',
    isAir: true,
    width: 22,
    height: 200,
    airOffsetY: 0, // top to ground
    hitInsetX: 6,
    hitInsetY: 0,
  },
  taxi: {
    kind: 'taxi',
    isAir: false,
    width: 88,
    height: 36,
    airOffsetY: 0,
    hitInsetX: 10,
    hitInsetY: 4,
  },
  hyena: {
    kind: 'hyena',
    isAir: false,
    width: 56,
    height: 32,
    airOffsetY: 0,
    hitInsetX: 6,
    hitInsetY: 4,
  },
  spear: {
    kind: 'spear',
    isAir: true,
    width: 60,
    height: 8,
    airOffsetY: 80,
    hitInsetX: 4,
    hitInsetY: 2,
  },
  lion: {
    kind: 'lion',
    isAir: false,
    width: 60,
    height: 36,
    airOffsetY: 0,
    hitInsetX: 6,
    hitInsetY: 4,
  },
};

export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  y: number; // 左上座標
  width: number;
  height: number;
  phase: number; // アニメ用
}

/**
 * ヒットボックスを取得（描画より少し小さい）。
 */
export function getHitbox(o: Obstacle): { x: number; y: number; w: number; h: number } {
  const spec = OBSTACLE_SPECS[o.kind];
  return {
    x: o.x + spec.hitInsetX,
    y: o.y + spec.hitInsetY,
    w: o.width - spec.hitInsetX * 2,
    h: o.height - spec.hitInsetY * 2,
  };
}

type Drawer = (ctx: CanvasRenderingContext2D, o: Obstacle) => void;

const drawBird: Drawer = (ctx, o) => {
  const cx = o.x + o.width / 2;
  const cy = o.y + o.height / 2;
  const wing = Math.sin(o.phase * 0.4) * 8;
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  // 体
  ctx.beginPath();
  ctx.ellipse(cx, cy, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 翼（羽ばたく）
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx - 18, cy - 8 - wing);
  ctx.moveTo(cx + 6, cy);
  ctx.lineTo(cx + 18, cy - 8 - wing);
  ctx.stroke();
  // 嘴
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx - 16, cy - 1);
  ctx.lineTo(cx - 16, cy + 1);
  ctx.closePath();
  ctx.fill();
};

const drawRock: Drawer = (ctx, o) => {
  const cx = o.x + o.width / 2;
  const baseY = o.y + o.height;
  ctx.fillStyle = '#5a4a3a';
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 2;
  // 不規則な多角形
  ctx.beginPath();
  ctx.moveTo(o.x + 4, baseY);
  ctx.lineTo(o.x, baseY - 10);
  ctx.lineTo(cx - 8, o.y + 6);
  ctx.lineTo(cx + 4, o.y);
  ctx.lineTo(cx + 14, o.y + 8);
  ctx.lineTo(o.x + o.width, baseY - 6);
  ctx.lineTo(o.x + o.width - 4, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ハイライト
  ctx.fillStyle = '#8a7a6a';
  ctx.beginPath();
  ctx.ellipse(cx - 4, o.y + 10, 5, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
};

const drawLightning: Drawer = (ctx, o) => {
  const cx = o.x + o.width / 2;
  const flicker = Math.sin(o.phase * 0.5) > 0;
  // 雲
  ctx.fillStyle = '#2a2a3a';
  ctx.strokeStyle = '#1a1a2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx - 8, o.y + 14, 14, 0, Math.PI * 2);
  ctx.arc(cx + 6, o.y + 10, 16, 0, Math.PI * 2);
  ctx.arc(cx + 14, o.y + 18, 12, 0, Math.PI * 2);
  ctx.fill();
  // 稲妻（点滅）
  if (flicker) {
    ctx.fillStyle = '#fff6a0';
    ctx.strokeStyle = '#ffae00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 2, o.y + 24);
    ctx.lineTo(cx + 6, o.y + 64);
    ctx.lineTo(cx, o.y + 64);
    ctx.lineTo(cx + 4, o.y + 110);
    ctx.lineTo(cx - 6, o.y + 70);
    ctx.lineTo(cx - 2, o.y + 70);
    ctx.lineTo(cx - 10, o.y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
};

const drawTaxi: Drawer = (ctx, o) => {
  // 黄色いタクシー
  ctx.fillStyle = '#ffd400';
  ctx.strokeStyle = '#3a2a00';
  ctx.lineWidth = 2;
  // 車体
  ctx.fillRect(o.x, o.y + 10, o.width, o.height - 14);
  ctx.strokeRect(o.x, o.y + 10, o.width, o.height - 14);
  // ルーフ
  ctx.beginPath();
  ctx.moveTo(o.x + 14, o.y + 10);
  ctx.lineTo(o.x + 24, o.y);
  ctx.lineTo(o.x + o.width - 24, o.y);
  ctx.lineTo(o.x + o.width - 14, o.y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // タクシーサイン
  ctx.fillStyle = '#000';
  ctx.fillRect(o.x + o.width / 2 - 8, o.y - 4, 16, 6);
  ctx.fillStyle = '#fff';
  ctx.font = '7px sans-serif';
  ctx.fillText('TAXI', o.x + o.width / 2 - 7, o.y + 1);
  // タイヤ
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(o.x + 14, o.y + o.height - 2, 5, 0, Math.PI * 2);
  ctx.arc(o.x + o.width - 14, o.y + o.height - 2, 5, 0, Math.PI * 2);
  ctx.fill();
};

const drawHyena: Drawer = (ctx, o) => {
  const cx = o.x + o.width / 2;
  const baseY = o.y + o.height;
  // ハイエナ — 茶色 + 黒スポット
  ctx.fillStyle = '#a07840';
  ctx.strokeStyle = '#3a2010';
  ctx.lineWidth = 2;
  // 体
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 14, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 頭
  ctx.beginPath();
  ctx.ellipse(cx + 18, baseY - 18, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 耳
  ctx.beginPath();
  ctx.moveTo(cx + 16, baseY - 26);
  ctx.lineTo(cx + 14, baseY - 30);
  ctx.lineTo(cx + 18, baseY - 25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 足 4本
  ctx.fillStyle = '#a07840';
  for (const dx of [-14, -4, 8, 18]) {
    ctx.fillRect(cx + dx, baseY - 6, 4, 8);
    ctx.strokeRect(cx + dx, baseY - 6, 4, 8);
  }
  // 黒い斑
  ctx.fillStyle = '#3a2010';
  ctx.beginPath();
  ctx.arc(cx - 6, baseY - 14, 2, 0, Math.PI * 2);
  ctx.arc(cx + 4, baseY - 18, 2, 0, Math.PI * 2);
  ctx.arc(cx + 8, baseY - 12, 1.5, 0, Math.PI * 2);
  ctx.fill();
};

const drawSpear: Drawer = (ctx, o) => {
  // 横向きの槍
  ctx.strokeStyle = '#6b3a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(o.x + 8, o.y + o.height / 2);
  ctx.lineTo(o.x + o.width - 4, o.y + o.height / 2);
  ctx.stroke();
  // 先端の三角
  ctx.fillStyle = '#3a3a3a';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(o.x, o.y + o.height / 2);
  ctx.lineTo(o.x + 10, o.y);
  ctx.lineTo(o.x + 10, o.y + o.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 羽根
  ctx.fillStyle = '#aa3322';
  ctx.fillRect(o.x + o.width - 6, o.y - 2, 6, o.height + 4);
};

const drawLion: Drawer = (ctx, o) => {
  const cx = o.x + o.width / 2;
  const baseY = o.y + o.height;
  ctx.fillStyle = '#d8a14d';
  ctx.strokeStyle = '#3a2010';
  ctx.lineWidth = 2;
  // 体
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 16, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // たてがみ
  ctx.fillStyle = '#7a4a10';
  ctx.beginPath();
  ctx.arc(cx + 18, baseY - 22, 13, 0, Math.PI * 2);
  ctx.fill();
  // 頭
  ctx.fillStyle = '#d8a14d';
  ctx.beginPath();
  ctx.arc(cx + 18, baseY - 22, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 足
  for (const dx of [-16, -4, 8, 20]) {
    ctx.fillStyle = '#d8a14d';
    ctx.fillRect(cx + dx, baseY - 6, 4, 8);
    ctx.strokeRect(cx + dx, baseY - 6, 4, 8);
  }
};

export const OBSTACLE_DRAWERS: Record<ObstacleKind, Drawer> = {
  bird: drawBird,
  rock: drawRock,
  lightning: drawLightning,
  taxi: drawTaxi,
  hyena: drawHyena,
  spear: drawSpear,
  lion: drawLion,
};
