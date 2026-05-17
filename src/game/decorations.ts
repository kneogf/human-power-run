// 各地域に並べる装飾の描画関数群。
// すべて (ctx, w, h, baseY, scrollX) を受ける関数として登録。
// パララックス係数 scrollSpeed は呼び出し側で乗算済みの scrollX を渡す。

import type { DecorationId } from './types';

type Drawer = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseY: number,
  scrollX: number,
) => void;

// 共通: スクロール位置から繰り返し配置する x を計算
function repeated(
  scrollX: number,
  spacing: number,
  count: number,
  offset = 0,
): number[] {
  const xs: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = ((i * spacing + scrollX + offset) % (spacing * count + 200)) - 100;
    xs.push(x);
  }
  return xs;
}

// 個別シードによる擬似ランダム
function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ===== 日本 =================================================================

const drawOkinawaBeach: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // 椰子の木 + 砂浜のキラめき
  const xs = repeated(scrollX, 280, 3);
  ctx.lineWidth = 2;
  xs.forEach((x, i) => {
    const trunkX = x + (i * 53) % 100;
    const trunkBase = baseY + 8;
    const trunkH = 70 + ((i * 37) % 20);
    // 幹
    ctx.fillStyle = '#5a3a1f';
    ctx.fillRect(trunkX - 3, trunkBase - trunkH, 6, trunkH);
    // 葉（弧4本）
    ctx.strokeStyle = '#1b6b3f';
    ctx.lineWidth = 3;
    for (let k = 0; k < 5; k++) {
      const a = (Math.PI * (k - 2)) / 5;
      ctx.beginPath();
      ctx.moveTo(trunkX, trunkBase - trunkH);
      ctx.quadraticCurveTo(
        trunkX + Math.cos(a) * 32,
        trunkBase - trunkH - 20,
        trunkX + Math.cos(a) * 56,
        trunkBase - trunkH - 5 + Math.sin(a) * 18,
      );
      ctx.stroke();
    }
  });
};

const drawFujiSakura: Drawer = (ctx, w, h, baseY, scrollX) => {
  // 富士山（パララックス遅め）+ 桜の花びら
  ctx.fillStyle = '#445e7a';
  ctx.strokeStyle = '#1f2d3f';
  ctx.lineWidth = 2;
  const spacing = w * 0.9;
  for (let i = 0; i < 3; i++) {
    const cx = ((i * spacing + scrollX * 0.5) % (w + spacing)) - spacing * 0.3;
    const top = baseY - 160;
    const halfBase = 140;
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
    ctx.fillStyle = '#445e7a';
  }
  // 桜の花びら
  ctx.fillStyle = 'rgba(255, 192, 203, 0.85)';
  for (let i = 0; i < 28; i++) {
    const seed = i * 1234.567;
    const bx = ((seed + scrollX * 1.2) % (w + 40)) - 20;
    const by = (Math.sin(seed * 0.7) * 0.5 + 0.5) * (h * 0.6) + 20;
    const drift = Math.sin(scrollX * 0.05 + i) * 8;
    ctx.beginPath();
    ctx.arc(bx, by + drift, 3, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawTohokuForest: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // 杉の三角形を密に
  const trees = repeated(scrollX, 60, 12);
  trees.forEach((x, i) => {
    const treeH = 60 + ((i * 37) % 30);
    const treeBase = baseY + 8;
    ctx.fillStyle = '#1f5532';
    ctx.strokeStyle = '#0e2818';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 18, treeBase);
    ctx.lineTo(x, treeBase - treeH);
    ctx.lineTo(x + 18, treeBase);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
};

const drawHokkaidoSnow: Drawer = (ctx, w, h, baseY, scrollX) => {
  // 雪原（地面の上に白を被せる） + 雪の木
  // ※ 地面そのものはregionで上書きするので、ここは雪の粒と木のみ
  // 雪
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 50; i++) {
    const seed = i * 911.3;
    const sx = ((seed + scrollX * 1.5) % (w + 40)) - 20;
    const sy = (Math.sin(seed * 0.4) * 0.5 + 0.5) * h * 0.9;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // 雪をかぶった針葉樹
  const trees = repeated(scrollX, 110, 7);
  trees.forEach((x, i) => {
    const treeH = 70 + ((i * 23) % 20);
    const base = baseY + 8;
    // 暗い緑の三角
    ctx.fillStyle = '#0e3a23';
    ctx.beginPath();
    ctx.moveTo(x - 18, base);
    ctx.lineTo(x, base - treeH);
    ctx.lineTo(x + 18, base);
    ctx.closePath();
    ctx.fill();
    // 雪を被せた白い三角
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 18, base);
    ctx.lineTo(x, base - treeH);
    ctx.lineTo(x + 18, base);
    ctx.lineTo(x + 10, base - 5);
    ctx.lineTo(x, base - treeH * 0.6);
    ctx.lineTo(x - 10, base - 5);
    ctx.closePath();
    ctx.fill();
  });
};

// ===== アメリカ =============================================================

const drawNYSkyline: Drawer = (ctx, w, _h, baseY, scrollX) => {
  // 縦長の長方形ビル群 + 窓
  const buildings = 18;
  const slot = w / 8;
  for (let i = 0; i < buildings; i++) {
    const bx = ((i * slot + scrollX * 0.7) % (w + slot * 2)) - slot;
    const bw = 36 + ((i * 11) % 24);
    const bh = 130 + ((i * 53) % 100);
    const by = baseY - bh;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
    // 窓（ちらほら明るい）
    ctx.fillStyle = 'rgba(255, 230, 120, 0.85)';
    for (let r = 0; r < Math.floor(bh / 14); r++) {
      for (let c = 0; c < Math.floor(bw / 8); c++) {
        if (rand(i * 100 + r * 7 + c) > 0.6) {
          ctx.fillRect(bx + 2 + c * 8, by + 4 + r * 14, 4, 6);
        }
      }
    }
  }
};

const drawRoute66Desert: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // サボテン
  const cactuses = repeated(scrollX, 200, 5);
  cactuses.forEach((cx, i) => {
    const trunkH = 60 + ((i * 19) % 18);
    const base = baseY + 6;
    ctx.fillStyle = '#3e6b2f';
    ctx.strokeStyle = '#0e2818';
    ctx.lineWidth = 1.5;
    // 幹
    ctx.fillRect(cx - 4, base - trunkH, 8, trunkH);
    ctx.strokeRect(cx - 4, base - trunkH, 8, trunkH);
    // 左枝
    ctx.fillRect(cx - 16, base - trunkH * 0.8, 6, trunkH * 0.4);
    ctx.fillRect(cx - 16, base - trunkH * 0.85, 12, 5);
    // 右枝
    ctx.fillRect(cx + 10, base - trunkH * 0.7, 6, trunkH * 0.3);
    ctx.fillRect(cx + 4, base - trunkH * 0.75, 12, 5);
  });
};

const drawMonumentValley: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // 三段の赤いビュート
  ctx.fillStyle = '#a3411a';
  ctx.strokeStyle = '#5a1f0a';
  ctx.lineWidth = 2;
  const buttes = repeated(scrollX * 0.4, 400, 3);
  buttes.forEach((cx, i) => {
    const top = baseY - 150;
    const w1 = 120 + ((i * 31) % 40);
    const indent = 18;
    ctx.beginPath();
    ctx.moveTo(cx - w1 / 2, baseY + 8);
    ctx.lineTo(cx - w1 / 2 + indent, top + 30);
    ctx.lineTo(cx - w1 / 2 + indent, top);
    ctx.lineTo(cx + w1 / 2 - indent, top);
    ctx.lineTo(cx + w1 / 2 - indent, top + 30);
    ctx.lineTo(cx + w1 / 2, baseY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
};

const drawGumpRunner: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // 地平線寄りに 1人 走る人のシルエット（パララックスかなり遅め）。
  // 走ってるアニメは scrollX で軽くバウンス。
  const cx = ((scrollX * 0.25) % 600) - 100;
  const cy = baseY - 30;
  const bounce = Math.sin(scrollX * 0.1) * 2;
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  // 頭
  ctx.beginPath();
  ctx.arc(cx, cy - 22 + bounce, 5, 0, Math.PI * 2);
  ctx.fill();
  // 胴
  ctx.beginPath();
  ctx.moveTo(cx, cy - 17 + bounce);
  ctx.lineTo(cx, cy - 4 + bounce);
  // 足
  const swing = Math.sin(scrollX * 0.3) * 5;
  ctx.moveTo(cx, cy - 4 + bounce);
  ctx.lineTo(cx + swing, cy + 6 + bounce);
  ctx.moveTo(cx, cy - 4 + bounce);
  ctx.lineTo(cx - swing, cy + 6 + bounce);
  // 腕
  ctx.moveTo(cx, cy - 13 + bounce);
  ctx.lineTo(cx - swing * 0.8, cy - 6 + bounce);
  ctx.moveTo(cx, cy - 13 + bounce);
  ctx.lineTo(cx + swing * 0.8, cy - 6 + bounce);
  ctx.stroke();
  // ヒゲ風の線（フォレスト感）
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 20 + bounce);
  ctx.lineTo(cx - 7, cy - 18 + bounce);
  ctx.moveTo(cx + 3, cy - 20 + bounce);
  ctx.lineTo(cx + 7, cy - 18 + bounce);
  ctx.stroke();
};

const drawSantaMonicaPier: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // 海 + 観覧車 + 桟橋
  const px = ((scrollX * 0.7) % 800) - 200;
  // 海
  ctx.fillStyle = 'rgba(56, 130, 184, 0.7)';
  ctx.fillRect(0, baseY - 4, 2000, 4);

  // 桟橋
  ctx.fillStyle = '#7a4a26';
  ctx.fillRect(px, baseY - 8, 400, 8);
  // 支柱
  ctx.fillStyle = '#3a1f10';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(px + 20 + i * 50, baseY, 4, 24);
  }

  // 観覧車
  const wx = px + 200;
  const wy = baseY - 80;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(wx, wy, 56, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + scrollX * 0.005;
    const ex = wx + Math.cos(a) * 56;
    const ey = wy + Math.sin(a) * 56;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // ゴンドラ
    ctx.fillStyle = '#ff6b4a';
    ctx.fillRect(ex - 4, ey - 4, 8, 8);
  }
  // 支柱
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wx - 30, baseY - 8);
  ctx.lineTo(wx, wy);
  ctx.lineTo(wx + 30, baseY - 8);
  ctx.stroke();
};

// ===== アフリカ =============================================================

const drawSavannaAcacia: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // アカシア（傘状）の木を並べる
  const trees = repeated(scrollX, 180, 5);
  trees.forEach((x, i) => {
    const trunkH = 70 + ((i * 27) % 20);
    const base = baseY + 8;
    // 幹
    ctx.fillStyle = '#6b3a1a';
    ctx.fillRect(x - 3, base - trunkH, 6, trunkH);
    // 葉（横長楕円）
    ctx.fillStyle = '#3a5a2a';
    ctx.beginPath();
    ctx.ellipse(x, base - trunkH - 8, 38, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a7a3a';
    ctx.beginPath();
    ctx.ellipse(x - 4, base - trunkH - 14, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  });
};

const drawAnimalElephant: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // ゾウ（横向き、シルエット）
  const cx = ((scrollX * 0.6) % 900) - 100;
  const base = baseY;
  ctx.fillStyle = '#7a7a7a';
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 2;
  // 体
  ctx.beginPath();
  ctx.ellipse(cx, base - 22, 30, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 頭
  ctx.beginPath();
  ctx.arc(cx + 28, base - 26, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 鼻（鼻の長い線）
  ctx.beginPath();
  ctx.moveTo(cx + 40, base - 22);
  ctx.quadraticCurveTo(cx + 50, base - 14, cx + 46, base - 4);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#7a7a7a';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3a3a3a';
  // 耳
  ctx.beginPath();
  ctx.arc(cx + 22, base - 30, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();
  ctx.stroke();
  // 足 4本
  ctx.fillStyle = '#7a7a7a';
  for (const dx of [-18, -6, 8, 22]) {
    ctx.fillRect(cx + dx, base - 14, 7, 14);
    ctx.strokeRect(cx + dx, base - 14, 7, 14);
  }
};

const drawAnimalGiraffe: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // キリン（長い首）
  const cx = ((scrollX * 0.6 + 240) % 900) - 100;
  const base = baseY;
  ctx.fillStyle = '#d8a14d';
  ctx.strokeStyle = '#5a3a10';
  ctx.lineWidth = 2;
  // 体
  ctx.beginPath();
  ctx.ellipse(cx, base - 22, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 首
  ctx.fillRect(cx + 12, base - 70, 8, 50);
  ctx.strokeRect(cx + 12, base - 70, 8, 50);
  // 頭
  ctx.beginPath();
  ctx.ellipse(cx + 20, base - 75, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 角
  ctx.beginPath();
  ctx.moveTo(cx + 18, base - 80);
  ctx.lineTo(cx + 18, base - 86);
  ctx.moveTo(cx + 22, base - 80);
  ctx.lineTo(cx + 22, base - 86);
  ctx.stroke();
  // 足
  ctx.fillStyle = '#d8a14d';
  for (const dx of [-14, -4, 6, 16]) {
    ctx.fillRect(cx + dx, base - 12, 4, 12);
    ctx.strokeRect(cx + dx, base - 12, 4, 12);
  }
  // 模様（茶のドット）
  ctx.fillStyle = '#7a4a10';
  ctx.beginPath();
  ctx.arc(cx - 8, base - 22, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 4, base - 18, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 14, base - 50, 2, 0, Math.PI * 2);
  ctx.fill();
};

const drawAnimalZebra: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  const cx = ((scrollX * 0.6 + 480) % 900) - 100;
  const base = baseY;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  // 体
  ctx.beginPath();
  ctx.ellipse(cx, base - 18, 24, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 頭
  ctx.beginPath();
  ctx.ellipse(cx + 22, base - 24, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 縞
  ctx.fillStyle = '#000';
  for (let i = -3; i <= 3; i++) {
    ctx.fillRect(cx + i * 6 - 1, base - 28, 2, 18);
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx + 16 + i * 4, base - 28, 2, 8);
  }
  // 足
  for (const dx of [-14, -6, 4, 12]) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx + dx, base - 10, 4, 10);
    ctx.strokeRect(cx + dx, base - 10, 4, 10);
  }
};

const drawTribalFigure: Drawer = (ctx, _w, _h, baseY, scrollX) => {
  // 槍を持つ民族のシルエット
  const cx = ((scrollX * 0.55 + 700) % 900) - 100;
  const base = baseY;
  ctx.fillStyle = '#2a1410';
  ctx.strokeStyle = '#2a1410';
  ctx.lineWidth = 2;
  // 頭
  ctx.beginPath();
  ctx.arc(cx, base - 50, 6, 0, Math.PI * 2);
  ctx.fill();
  // 胴
  ctx.fillRect(cx - 4, base - 44, 8, 24);
  // 足
  ctx.fillRect(cx - 5, base - 20, 4, 20);
  ctx.fillRect(cx + 1, base - 20, 4, 20);
  // 槍（手と一緒に）
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 8, base - 60);
  ctx.lineTo(cx + 8, base - 4);
  ctx.stroke();
  // 槍の先（三角）
  ctx.beginPath();
  ctx.moveTo(cx + 8, base - 60);
  ctx.lineTo(cx + 5, base - 56);
  ctx.lineTo(cx + 11, base - 56);
  ctx.closePath();
  ctx.fill();
};

const drawAfricanBeach: Drawer = (ctx, w, _h, baseY, scrollX) => {
  // ヤシ + 波打ち際
  // 海
  ctx.fillStyle = 'rgba(50, 140, 180, 0.6)';
  ctx.fillRect(0, baseY - 6, w, 6);
  // 波の白い線
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x < w; x += 8) {
    const wave = Math.sin((x + scrollX * 0.5) * 0.05) * 2;
    if (x === 0) ctx.moveTo(x, baseY - 2 + wave);
    else ctx.lineTo(x, baseY - 2 + wave);
  }
  ctx.stroke();
  // ヤシ
  const xs = repeated(scrollX, 240, 4);
  xs.forEach((x, i) => {
    const trunkH = 80 + ((i * 23) % 16);
    const base = baseY + 8;
    ctx.fillStyle = '#5a3a1f';
    ctx.fillRect(x - 3, base - trunkH, 6, trunkH);
    ctx.strokeStyle = '#1b6b3f';
    ctx.lineWidth = 3;
    for (let k = 0; k < 5; k++) {
      const a = (Math.PI * (k - 2)) / 5;
      ctx.beginPath();
      ctx.moveTo(x, base - trunkH);
      ctx.quadraticCurveTo(
        x + Math.cos(a) * 32,
        base - trunkH - 20,
        x + Math.cos(a) * 56,
        base - trunkH - 5 + Math.sin(a) * 18,
      );
      ctx.stroke();
    }
  });
};

export const DECORATION_DRAWERS: Record<DecorationId, Drawer> = {
  okinawa_beach: drawOkinawaBeach,
  fuji_sakura: drawFujiSakura,
  tohoku_forest: drawTohokuForest,
  hokkaido_snow: drawHokkaidoSnow,
  ny_skyline: drawNYSkyline,
  route66_desert: drawRoute66Desert,
  monument_valley: drawMonumentValley,
  gump_runner: drawGumpRunner,
  santa_monica_pier: drawSantaMonicaPier,
  savanna_acacia: drawSavannaAcacia,
  animal_elephant: drawAnimalElephant,
  animal_giraffe: drawAnimalGiraffe,
  animal_zebra: drawAnimalZebra,
  tribal_figure: drawTribalFigure,
  african_beach: drawAfricanBeach,
};
