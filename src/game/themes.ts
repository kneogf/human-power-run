// 背景テーマ定義 + テーマ別の描画関数。
// engine.ts からは THEMES と drawBackground(theme, ...) を import する。
// 後から「アフリカ」「ヨーロッパ」など足したいときはこのファイルに追加。

import type { Theme, ThemeId } from './types';

export const THEMES: Record<ThemeId, Theme> = {
  mono: {
    id: 'mono',
    name: 'MONO',
    tagline: '黒×白のアドベンチャー',
  },
  gump: {
    id: 'gump',
    name: 'GUMP 鈴木',
    tagline: '日本の街道 / 富士山 / 桜',
  },
  route66: {
    id: 'route66',
    name: 'ROUTE 66',
    tagline: '砂漠 / サボテン / 夕陽',
  },
};

/** 共通カラー（地面色などはテーマで差し替え） */
export interface ThemePalette {
  sky: [string, string];
  sun: { fill: string; stroke: string };
  mountainFill: string;
  mountainStroke: string;
  groundFill: string;
  groundStroke: string;
  coinFill: string;
  coinStroke: string;
  fg: string; // 前景線色（パーティクル等）
}

export const THEME_PALETTES: Record<ThemeId, ThemePalette> = {
  mono: {
    sky: ['#0a0a0a', '#2a2a2a'],
    sun: { fill: '#fff', stroke: '#000' },
    mountainFill: '#1a1a1a',
    mountainStroke: '#3a3a3a',
    groundFill: '#000',
    groundStroke: '#fff',
    coinFill: '#fff',
    coinStroke: '#000',
    fg: '#fff',
  },
  gump: {
    // 夜明けの空 → 山並み（淡墨）→ 街道（黒）
    sky: ['#fde2e4', '#fff5e1'],
    sun: { fill: '#ffd166', stroke: '#a8580c' },
    mountainFill: '#445e7a',
    mountainStroke: '#1f2d3f',
    groundFill: '#3b2616',
    groundStroke: '#1c1009',
    coinFill: '#ffd166',
    coinStroke: '#5a2a00',
    fg: '#1f2d3f',
  },
  route66: {
    // 夕焼け→砂漠
    sky: ['#fc5c4d', '#ffcb6b'],
    sun: { fill: '#fff3c1', stroke: '#a8260a' },
    mountainFill: '#5a2520',
    mountainStroke: '#2b0e0a',
    groundFill: '#c08a5a',
    groundStroke: '#5d3a1c',
    coinFill: '#ffd166',
    coinStroke: '#5a2a00',
    fg: '#2b0e0a',
  },
};

/**
 * 背景を描く。
 * @param ctx Canvas 2D context
 * @param themeId 適用するテーマ
 * @param w 論理幅
 * @param h 論理高さ
 * @param baseY 地面ラインの y
 * @param scrollX 背景パララックス用のスクロール量
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  themeId: ThemeId,
  w: number,
  h: number,
  baseY: number,
  scrollX: number,
) {
  const palette = THEME_PALETTES[themeId];

  // 空（グラデ）
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(1, palette.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // 太陽（テーマで色変え）
  ctx.save();
  ctx.fillStyle = palette.sun.fill;
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.25, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.sun.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // テーマ別のミドルレイヤー（山やサボテンや桜）
  if (themeId === 'mono') {
    drawMountains(ctx, w, baseY, scrollX, palette, 6);
  } else if (themeId === 'gump') {
    drawFuji(ctx, w, h, baseY, scrollX, palette);
    drawSakura(ctx, w, h, scrollX);
  } else if (themeId === 'route66') {
    drawRoute66Hills(ctx, w, baseY, scrollX, palette);
    drawCactus(ctx, w, baseY, scrollX, palette);
  }

  // 地平線
  ctx.strokeStyle = palette.groundStroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 10);
  ctx.lineTo(w, baseY + 10);
  ctx.stroke();
}

// ---- mono: 三角の山 -------------------------------------------------------

function drawMountains(
  ctx: CanvasRenderingContext2D,
  w: number,
  baseY: number,
  scrollX: number,
  palette: ThemePalette,
  count: number,
) {
  ctx.fillStyle = palette.mountainFill;
  ctx.strokeStyle = palette.mountainStroke;
  ctx.lineWidth = 2;
  const baseMountY = baseY + 10;
  for (let i = 0; i < count; i++) {
    const spacing = w / 3;
    const mx = ((i * spacing + scrollX) % (w + spacing)) - spacing / 2;
    const mh = 80 + (i % 3) * 30;
    ctx.beginPath();
    ctx.moveTo(mx, baseMountY);
    ctx.lineTo(mx + spacing / 2, baseMountY - mh);
    ctx.lineTo(mx + spacing, baseMountY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// ---- gump: 富士山シルエット ------------------------------------------------

function drawFuji(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  baseY: number,
  scrollX: number,
  palette: ThemePalette,
) {
  ctx.fillStyle = palette.mountainFill;
  ctx.strokeStyle = palette.mountainStroke;
  ctx.lineWidth = 2;

  // パララックスで富士山を1〜2基描く
  const spacing = w * 0.9;
  for (let i = 0; i < 3; i++) {
    const cx = ((i * spacing + scrollX * 0.6) % (w + spacing)) - spacing * 0.3;
    const top = baseY - 160;
    const halfBase = 140;
    // 山の本体
    ctx.beginPath();
    ctx.moveTo(cx - halfBase, baseY + 8);
    ctx.lineTo(cx - 40, top + 18);
    ctx.lineTo(cx - 22, top);
    ctx.lineTo(cx + 22, top);
    ctx.lineTo(cx + 40, top + 18);
    ctx.lineTo(cx + halfBase, baseY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 雪
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - 24, top + 14);
    ctx.lineTo(cx - 22, top);
    ctx.lineTo(cx + 22, top);
    ctx.lineTo(cx + 24, top + 14);
    ctx.lineTo(cx + 10, top + 26);
    ctx.lineTo(cx, top + 18);
    ctx.lineTo(cx - 10, top + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.mountainFill;
  }
}

// ---- gump: 桜の花びらが舞う -----------------------------------------------

function drawSakura(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scrollX: number,
) {
  // 簡易: ピンクの小さな円を疑似ランダムに配置
  ctx.fillStyle = 'rgba(255, 192, 203, 0.85)';
  const count = 30;
  for (let i = 0; i < count; i++) {
    // 各花びらに固有の位相（時間でゆらぐ）
    const seed = i * 1234.567;
    const baseX = ((seed + scrollX * 1.2) % (w + 40)) - 20;
    const baseY = (Math.sin(seed * 0.7) * 0.5 + 0.5) * (h * 0.6) + 20;
    const drift = Math.sin(scrollX * 0.05 + i) * 8;
    ctx.beginPath();
    ctx.arc(baseX, baseY + drift, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- route66: なだらかな丘 -------------------------------------------------

function drawRoute66Hills(
  ctx: CanvasRenderingContext2D,
  w: number,
  baseY: number,
  scrollX: number,
  palette: ThemePalette,
) {
  ctx.fillStyle = palette.mountainFill;
  ctx.strokeStyle = palette.mountainStroke;
  ctx.lineWidth = 2;

  const baseHillY = baseY + 10;
  // 重なった丘を3つ
  for (let i = 0; i < 4; i++) {
    const spacing = w * 0.7;
    const cx = ((i * spacing + scrollX * 0.6) % (w + spacing)) - spacing * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - 220, baseHillY);
    ctx.quadraticCurveTo(cx, baseHillY - 120, cx + 220, baseHillY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// ---- route66: サボテン ----------------------------------------------------

function drawCactus(
  ctx: CanvasRenderingContext2D,
  w: number,
  baseY: number,
  scrollX: number,
  palette: ThemePalette,
) {
  ctx.fillStyle = '#3e6b2f';
  ctx.strokeStyle = palette.mountainStroke;
  ctx.lineWidth = 1.5;
  const spacing = 220;
  for (let i = 0; i < 4; i++) {
    const seed = i * 9999;
    const cx = ((seed + scrollX * 0.9) % (w + spacing)) - 60;
    const trunkH = 60 + (i % 3) * 12;
    const baseLine = baseY + 6;

    // 幹
    ctx.fillRect(cx - 4, baseLine - trunkH, 8, trunkH);
    ctx.strokeRect(cx - 4, baseLine - trunkH, 8, trunkH);
    // 左の枝
    ctx.fillRect(cx - 18, baseLine - trunkH * 0.8, 6, trunkH * 0.4);
    ctx.fillRect(cx - 18, baseLine - trunkH * 0.85, 14, 5);
    // 右の枝
    ctx.fillRect(cx + 12, baseLine - trunkH * 0.7, 6, trunkH * 0.3);
    ctx.fillRect(cx + 4, baseLine - trunkH * 0.75, 14, 5);
  }
}
