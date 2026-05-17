// 3キャラのパラメータと描画関数。
// 後から新キャラ（ガンプ鈴木スタイル、Route66風、など）を足せるよう、
// すべて (ctx, x, y, w, h, phase) を受ける純粋関数にしてある。

import type { Character, CharacterId } from './types';

export const CHARACTERS: Record<CharacterId, Character> = {
  runner: {
    id: 'runner',
    name: '人が走る',
    tagline: '軽い / 2段ジャンプ / 初心者向け',
    speed: 4.8,
    jumpPower: -15,
    gravity: 0.72,
    maxJumps: 2,
  },
  bike: {
    id: 'bike',
    name: '自転車',
    tagline: '標準 / 2段ジャンプ / バランス型',
    speed: 5.4,
    jumpPower: -14,
    gravity: 0.72,
    maxJumps: 2,
  },
  rickshaw: {
    id: 'rickshaw',
    name: '人力車',
    tagline: '重い / 1段ジャンプ / 上級者向け',
    speed: 4.5,
    jumpPower: -13,
    gravity: 0.78,
    maxJumps: 1,
  },
};

/** キャラ別の描画関数の型。(x, y) はプレイヤーの左上座標 */
export type CharacterDrawer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  phase: number,
) => void;

// ---- 共通ヘルパー ----------------------------------------------------------

const stroke = (ctx: CanvasRenderingContext2D, color = '#fff', width = 2) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
};

const fill = (ctx: CanvasRenderingContext2D, color = '#fff') => {
  ctx.fillStyle = color;
};

// ---- 人が走る -------------------------------------------------------------

const drawRunner: CharacterDrawer = (ctx, x, y, w, h, phase) => {
  // 中心とサイズ
  const cx = x + w / 2;
  const headR = Math.min(w, h) * 0.18;
  const headY = y + headR + 2;
  const bodyTop = headY + headR;
  const bodyBottom = y + h * 0.7;
  const legSwing = Math.sin(phase * 0.6) * (h * 0.25);
  const armSwing = Math.sin(phase * 0.6 + Math.PI) * (h * 0.2);

  // 頭
  fill(ctx, '#fff');
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  stroke(ctx, '#fff', 3);

  // 胴体
  ctx.beginPath();
  ctx.moveTo(cx, bodyTop);
  ctx.lineTo(cx, bodyBottom);
  ctx.stroke();

  // 腕（前後に振れる）
  ctx.beginPath();
  ctx.moveTo(cx, bodyTop + (bodyBottom - bodyTop) * 0.25);
  ctx.lineTo(cx + armSwing, bodyTop + (bodyBottom - bodyTop) * 0.55);
  ctx.moveTo(cx, bodyTop + (bodyBottom - bodyTop) * 0.25);
  ctx.lineTo(cx - armSwing, bodyTop + (bodyBottom - bodyTop) * 0.55);
  ctx.stroke();

  // 足（左右で逆位相）
  ctx.beginPath();
  ctx.moveTo(cx, bodyBottom);
  ctx.lineTo(cx + legSwing, y + h);
  ctx.moveTo(cx, bodyBottom);
  ctx.lineTo(cx - legSwing, y + h);
  ctx.stroke();
};

// ---- 自転車 ---------------------------------------------------------------

const drawBike: CharacterDrawer = (ctx, x, y, w, h, phase) => {
  const wheelR = h * 0.22;
  const wheelY = y + h - wheelR - 2;
  const wheelLX = x + w * 0.22;
  const wheelRX = x + w * 0.78;

  stroke(ctx, '#fff', 2);

  // 車輪（回転スポーク付き）
  const drawWheel = (wx: number, wy: number) => {
    ctx.beginPath();
    ctx.arc(wx, wy, wheelR, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = phase * 0.4 + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * wheelR, wy + Math.sin(a) * wheelR);
      ctx.stroke();
    }
  };
  drawWheel(wheelLX, wheelY);
  drawWheel(wheelRX, wheelY);

  // フレーム（三角形 + シートポスト）
  const seatX = x + w * 0.5;
  const seatY = y + h * 0.35;
  const handleX = x + w * 0.78;
  const handleY = y + h * 0.32;
  ctx.beginPath();
  ctx.moveTo(wheelLX, wheelY);
  ctx.lineTo(seatX, seatY);
  ctx.lineTo(wheelRX, wheelY);
  ctx.moveTo(seatX, seatY);
  ctx.lineTo(handleX, handleY);
  ctx.stroke();

  // ハンドル
  ctx.beginPath();
  ctx.moveTo(handleX - 6, handleY - 6);
  ctx.lineTo(handleX + 6, handleY - 6);
  ctx.stroke();

  // 乗っている人（頭・胴・腕）
  fill(ctx, '#fff');
  const riderHeadX = seatX + w * 0.05;
  const riderHeadY = y + h * 0.18;
  ctx.beginPath();
  ctx.arc(riderHeadX, riderHeadY, h * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(riderHeadX, riderHeadY + h * 0.1);
  ctx.lineTo(seatX, seatY); // 胴体（お尻）
  ctx.moveTo(riderHeadX, riderHeadY + h * 0.12);
  ctx.lineTo(handleX, handleY); // 腕
  ctx.stroke();

  // ペダルを漕ぐ脚（位相で揺れる）
  const pedalCx = (wheelLX + wheelRX) / 2;
  const pedalCy = wheelY - 2;
  const legA = phase * 0.4;
  const legBX = pedalCx + Math.cos(legA) * (h * 0.1);
  const legBY = pedalCy + Math.sin(legA) * (h * 0.1);
  ctx.beginPath();
  ctx.moveTo(seatX, seatY);
  ctx.lineTo(legBX, legBY);
  ctx.stroke();
};

// ---- 人力車 ---------------------------------------------------------------

const drawRickshaw: CharacterDrawer = (ctx, x, y, w, h, phase) => {
  // 前方（右）で人が引いて、後ろ（左）に乗客が乗る箱と大きな車輪。
  const pullerCx = x + w * 0.78;
  const pullerHeadR = h * 0.12;
  const pullerHeadY = y + h * 0.22;
  const bodyTop = pullerHeadY + pullerHeadR;
  const bodyBottom = y + h * 0.62;
  const legSwing = Math.sin(phase * 0.6) * (h * 0.2);

  // 箱（乗客が乗る本体）
  const boxX = x + w * 0.05;
  const boxY = y + h * 0.32;
  const boxW = w * 0.5;
  const boxH = h * 0.45;
  fill(ctx, '#000');
  ctx.fillRect(boxX, boxY, boxW, boxH);
  stroke(ctx, '#fff', 2);
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // 屋根
  ctx.beginPath();
  ctx.moveTo(boxX - 4, boxY);
  ctx.lineTo(boxX + boxW / 2, boxY - h * 0.12);
  ctx.lineTo(boxX + boxW + 4, boxY);
  ctx.closePath();
  ctx.stroke();

  // 乗客シルエット（うっすら）
  fill(ctx, 'rgba(255,255,255,0.35)');
  ctx.beginPath();
  ctx.arc(boxX + boxW * 0.5, boxY + boxH * 0.35, boxH * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(
    boxX + boxW * 0.35,
    boxY + boxH * 0.5,
    boxW * 0.3,
    boxH * 0.35,
  );

  // 車輪（1輪、大きめ）
  const wheelR = h * 0.28;
  const wheelX = boxX + boxW * 0.55;
  const wheelY = y + h - wheelR - 1;
  stroke(ctx, '#fff', 2);
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = phase * 0.4 + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(wheelX, wheelY);
    ctx.lineTo(wheelX + Math.cos(a) * wheelR, wheelY + Math.sin(a) * wheelR);
    ctx.stroke();
  }

  // 梶棒（2本、箱から引く人の手元へ）
  ctx.beginPath();
  ctx.moveTo(boxX + boxW, boxY + boxH * 0.4);
  ctx.lineTo(pullerCx - 2, bodyTop + (bodyBottom - bodyTop) * 0.4);
  ctx.moveTo(boxX + boxW, boxY + boxH * 0.55);
  ctx.lineTo(pullerCx + 2, bodyTop + (bodyBottom - bodyTop) * 0.5);
  ctx.stroke();

  // 引く人（前傾姿勢の棒人間）
  fill(ctx, '#fff');
  ctx.beginPath();
  ctx.arc(pullerCx, pullerHeadY, pullerHeadR, 0, Math.PI * 2);
  ctx.fill();

  stroke(ctx, '#fff', 3);
  ctx.beginPath();
  ctx.moveTo(pullerCx, bodyTop);
  ctx.lineTo(pullerCx - 2, bodyBottom);
  ctx.stroke();

  // 足
  ctx.beginPath();
  ctx.moveTo(pullerCx - 2, bodyBottom);
  ctx.lineTo(pullerCx - 2 + legSwing, y + h);
  ctx.moveTo(pullerCx - 2, bodyBottom);
  ctx.lineTo(pullerCx - 2 - legSwing, y + h);
  ctx.stroke();
};

export const CHARACTER_DRAWERS: Record<CharacterId, CharacterDrawer> = {
  runner: drawRunner,
  bike: drawBike,
  rickshaw: drawRickshaw,
};
