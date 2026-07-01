// コース背景の Canvas 描画。画像アセットは使わず図形/シルエットで描く。
//
// drawCourseBackground : 現在セクションの空・背景・モチーフをパララックスで描く
// drawCourseMotif      : CourseMotifType ごとのシルエット描画
// drawRoadRunner       : Route66 砂漠セクションのロードランナー演出
//
// すべて足場/プレイヤーの「背面」に描かれる。モチーフは半透明シルエットで
// 足場・プレイヤーの視認性を妨げない。

import {
  type CourseConfig,
  type CourseMotif,
  type CourseSection,
} from '../config/courseConfig';
import { getSectionProgress } from '../lib/courseManager';

// ---- 色ヘルパー -----------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

// ---- 背景描画 -------------------------------------------------------------

/**
 * 現在距離のセクションを解決し、空・背景・モチーフを描く。
 * セクション境界付近では次セクションへ緩やかにクロスフェードする。
 */
export function drawCourseBackground(
  ctx: CanvasRenderingContext2D,
  course: CourseConfig,
  distance: number,
  logicalW: number,
  logicalH: number,
  baseY: number,
  scrollX: number,
): void {
  const { section, next, blend } = getSectionProgress(course, distance);

  // 境界付近 (blend>0.8) は次セクションの色へ補間
  const fadeT = next && blend > 0.8 ? (blend - 0.8) / 0.2 : 0;
  const skyColor = next
    ? lerpColor(section.skyColor, next.skyColor, fadeT)
    : section.skyColor;
  const bgColor = next
    ? lerpColor(section.backgroundColor, next.backgroundColor, fadeT)
    : section.backgroundColor;

  // 空のグラデーション (上=sky / 下=background)。
  // グラデは地平線(baseY 付近)で bgColor に到達し、以降は bgColor で画面下端まで塗る。
  const horizon = Math.min(baseY + 12, logicalH);
  const grad = ctx.createLinearGradient(0, 0, 0, horizon);
  grad.addColorStop(0, skyColor);
  grad.addColorStop(1, bgColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, logicalW, logicalH);

  // 遠景の地平の帯 (背景色を少し暗く)
  ctx.fillStyle = lerpColor(bgColor, '#000000', 0.18);
  ctx.fillRect(0, baseY - 26, logicalW, 38);

  // モチーフ描画。background なのでセクション幅で繰り返しタイル状に配置。
  drawSectionMotifs(ctx, section, logicalW, baseY, scrollX, 1);
  if (next && fadeT > 0) {
    ctx.save();
    ctx.globalAlpha = fadeT;
    drawSectionMotifs(ctx, next, logicalW, baseY, scrollX, 1);
    ctx.restore();
  }
}

const SECTION_WORLD_W = 960; // モチーフ xOffset の論理セクション幅

function drawSectionMotifs(
  ctx: CanvasRenderingContext2D,
  section: CourseSection,
  logicalW: number,
  baseY: number,
  scrollX: number,
  alphaMul: number,
): void {
  // モチーフは半透明シルエット (足場/プレイヤーを邪魔しない)
  for (const motif of section.motifs) {
    // type ごとにパララックス係数を変える (遠景ほど遅い)
    const parallax = motifParallax(motif.type);
    // セクション幅でループさせて連続スクロール
    const span = SECTION_WORLD_W;
    const base = (motif.xOffset + scrollX * parallax) % span;
    const start = base < 0 ? base + span : base;
    // 画面に収まる分だけ描く (最大2タイル)
    for (let x = start - span; x < logicalW + span; x += span) {
      ctx.save();
      ctx.globalAlpha = motifAlpha(motif.type) * alphaMul;
      drawCourseMotif(ctx, motif, x, baseY, motif.scale);
      ctx.restore();
    }
  }
}

/** モチーフ種別ごとのパララックス係数 (小さいほど遠景) */
function motifParallax(type: CourseMotif['type']): number {
  switch (type) {
    case 'sun':
    case 'moon':
      return 0.05;
    case 'mountain':
    case 'monument':
    case 'desert':
      return 0.15;
    case 'tower':
    case 'castle':
    case 'temple':
    case 'baobab':
    case 'savanna_tree':
    case 'bridge':
      return 0.25;
    default:
      return 0.38;
  }
}

/** モチーフ種別ごとの不透明度 (背景シルエット感を出す) */
function motifAlpha(type: CourseMotif['type']): number {
  switch (type) {
    case 'sun':
    case 'moon':
      return 0.9;
    case 'mountain':
    case 'monument':
    case 'desert':
      return 0.55;
    case 'road_sign':
    case 'sign':
    case 'gate':
    case 'torii':
    case 'supporter_board':
    case 'film_marker':
      return 0.85;
    default:
      return 0.7;
  }
}

// ---- モチーフ描画 ---------------------------------------------------------

/**
 * 1モチーフを描く。x = 画面x座標, baseY = 地面ライン。
 * yOffset は地面からの「上方向」オフセット。
 */
export function drawCourseMotif(
  ctx: CanvasRenderingContext2D,
  motif: CourseMotif,
  x: number,
  baseY: number,
  scale: number,
): void {
  const s = scale;
  const groundY = baseY - motif.yOffset;
  const color = motif.color ?? '#3a3a3a';
  const accent = motif.accentColor ?? '#ffffff';

  switch (motif.type) {
    case 'mountain': {
      const w = 180 * s;
      const h = 130 * s;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, groundY);
      ctx.lineTo(x, groundY - h);
      ctx.lineTo(x + w / 2, groundY);
      ctx.closePath();
      ctx.fill();
      // 雪/冠
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(x, groundY - h);
      ctx.lineTo(x - w * 0.16, groundY - h * 0.68);
      ctx.lineTo(x - w * 0.07, groundY - h * 0.74);
      ctx.lineTo(x + w * 0.05, groundY - h * 0.66);
      ctx.lineTo(x + w * 0.16, groundY - h * 0.72);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'tower': {
      // 先細りの塔 + 格子 (東京タワー風)
      const h = 150 * s;
      const wBot = 56 * s;
      const wTop = 12 * s;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - wBot / 2, groundY);
      ctx.lineTo(x - wTop / 2, groundY - h);
      ctx.lineTo(x + wTop / 2, groundY - h);
      ctx.lineTo(x + wBot / 2, groundY);
      ctx.closePath();
      ctx.fill();
      // 格子
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        const yy = groundY - h * t;
        const ww = wBot + (wTop - wBot) * t;
        ctx.beginPath();
        ctx.moveTo(x - ww / 2, yy);
        ctx.lineTo(x + ww / 2, yy);
        ctx.stroke();
      }
      // 頂点アンテナ
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, groundY - h);
      ctx.lineTo(x, groundY - h - 18 * s);
      ctx.stroke();
      break;
    }
    case 'gate': {
      // 雷門風: 2本の柱 + 横梁 + 吊り提灯
      const h = 96 * s;
      const w = 110 * s;
      const pw = 14 * s;
      ctx.fillStyle = color;
      ctx.fillRect(x - w / 2, groundY - h, pw, h);
      ctx.fillRect(x + w / 2 - pw, groundY - h, pw, h);
      ctx.fillRect(x - w / 2, groundY - h, w, 16 * s);
      // 屋根
      ctx.beginPath();
      ctx.moveTo(x - w / 2 - 12 * s, groundY - h);
      ctx.lineTo(x, groundY - h - 24 * s);
      ctx.lineTo(x + w / 2 + 12 * s, groundY - h);
      ctx.closePath();
      ctx.fill();
      // 吊り提灯
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(x, groundY - h + 38 * s, 16 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'castle': {
      // 段重ねの屋根 (天守閣風)
      const w = 100 * s;
      const tiers = 3;
      let ty = groundY;
      ctx.fillStyle = color;
      for (let i = 0; i < tiers; i++) {
        const tw = w * (1 - i * 0.22);
        const th = 30 * s;
        ctx.fillRect(x - tw / 2, ty - th, tw, th);
        // 反り屋根
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(x - tw / 2 - 8 * s, ty - th);
        ctx.lineTo(x, ty - th - 16 * s);
        ctx.lineTo(x + tw / 2 + 8 * s, ty - th);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = color;
        ty -= th + 12 * s;
      }
      break;
    }
    case 'temple': {
      // 五重塔風: 段々の屋根
      const w = 80 * s;
      const tiers = 5;
      let ty = groundY;
      for (let i = 0; i < tiers; i++) {
        const tw = w * (1 - i * 0.13);
        const bh = 20 * s;
        ctx.fillStyle = color;
        ctx.fillRect(x - tw * 0.32, ty - bh, tw * 0.64, bh);
        // 屋根
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(x - tw / 2, ty - bh);
        ctx.lineTo(x, ty - bh - 12 * s);
        ctx.lineTo(x + tw / 2, ty - bh);
        ctx.closePath();
        ctx.fill();
        ty -= bh + 8 * s;
      }
      break;
    }
    case 'shrine': {
      // 小さな鳥居 + 社殿の箱
      ctx.fillStyle = color;
      ctx.fillRect(x - 24 * s, groundY - 36 * s, 48 * s, 36 * s);
      ctx.beginPath();
      ctx.moveTo(x - 30 * s, groundY - 36 * s);
      ctx.lineTo(x, groundY - 52 * s);
      ctx.lineTo(x + 30 * s, groundY - 36 * s);
      ctx.closePath();
      ctx.fill();
      // 鳥居
      ctx.fillStyle = accent;
      ctx.fillRect(x - 20 * s, groundY - 80 * s, 6 * s, 44 * s);
      ctx.fillRect(x + 14 * s, groundY - 80 * s, 6 * s, 44 * s);
      ctx.fillRect(x - 28 * s, groundY - 80 * s, 56 * s, 6 * s);
      break;
    }
    case 'torii': {
      // 赤い鳥居
      const h = 90 * s;
      const w = 78 * s;
      const pw = 9 * s;
      ctx.fillStyle = motif.color ?? '#d6402f';
      ctx.fillRect(x - w / 2, groundY - h, pw, h);
      ctx.fillRect(x + w / 2 - pw, groundY - h, pw, h);
      // 笠木 (上の横梁、両端反り)
      ctx.beginPath();
      ctx.moveTo(x - w / 2 - 12 * s, groundY - h + 4 * s);
      ctx.lineTo(x + w / 2 + 12 * s, groundY - h + 4 * s);
      ctx.lineTo(x + w / 2 + 12 * s, groundY - h - 8 * s);
      ctx.quadraticCurveTo(x, groundY - h - 16 * s, x - w / 2 - 12 * s, groundY - h - 8 * s);
      ctx.closePath();
      ctx.fill();
      // 貫
      ctx.fillRect(x - w / 2, groundY - h + 24 * s, w, 8 * s);
      break;
    }
    case 'sign': {
      // 汎用ビルボード看板 (柱 + パネル)
      const w = 78 * s;
      const h = 44 * s;
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(x - 3 * s, groundY - 56 * s, 6 * s, 56 * s);
      ctx.fillStyle = color;
      ctx.fillRect(x - w / 2, groundY - 56 * s - h, w, h);
      ctx.fillStyle = accent;
      ctx.fillRect(x - w / 2 + 5 * s, groundY - 56 * s - h + 5 * s, w - 10 * s, h - 10 * s);
      if (motif.label) {
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.round(14 * s)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(motif.label, x, groundY - 56 * s - h / 2);
        ctx.textAlign = 'start';
      }
      break;
    }
    case 'road_sign': {
      // 米国ハイウェイ風シールド (公式ロゴではない汎用形)
      const w = 62 * s;
      const h = 70 * s;
      const top = groundY - 64 * s - h;
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(x - 3 * s, groundY - 64 * s, 6 * s, 64 * s);
      // シールド形
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, top + 8 * s);
      ctx.quadraticCurveTo(x - w / 2, top, x - w * 0.18, top);
      ctx.lineTo(x + w * 0.18, top);
      ctx.quadraticCurveTo(x + w / 2, top, x + w / 2, top + 8 * s);
      ctx.lineTo(x + w / 2, top + h * 0.55);
      ctx.quadraticCurveTo(x + w / 2, top + h * 0.9, x, top + h);
      ctx.quadraticCurveTo(x - w / 2, top + h * 0.9, x - w / 2, top + h * 0.55);
      ctx.closePath();
      ctx.fill();
      // 内側白縁
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.font = `bold ${Math.round(20 * s)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(motif.label ?? '66', x, top + h * 0.5);
      ctx.textAlign = 'start';
      break;
    }
    case 'desert': {
      // 砂丘のうねり
      const w = 200 * s;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, groundY);
      ctx.quadraticCurveTo(x - w * 0.2, groundY - 34 * s, x + w * 0.1, groundY - 14 * s);
      ctx.quadraticCurveTo(x + w * 0.3, groundY - 2 * s, x + w / 2, groundY - 22 * s);
      ctx.lineTo(x + w / 2, groundY);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'cactus': {
      // サグアロ型サボテン
      const h = 84 * s;
      const tw = 16 * s;
      ctx.fillStyle = color;
      ctx.fillRect(x - tw / 2, groundY - h, tw, h);
      // 左腕
      ctx.fillRect(x - tw / 2 - 18 * s, groundY - h * 0.55, 12 * s, 8 * s);
      ctx.fillRect(x - tw / 2 - 18 * s, groundY - h * 0.55 - 22 * s, 8 * s, 26 * s);
      // 右腕
      ctx.fillRect(x + tw / 2 + 6 * s, groundY - h * 0.68, 12 * s, 8 * s);
      ctx.fillRect(x + tw / 2 + 10 * s, groundY - h * 0.68 - 26 * s, 8 * s, 30 * s);
      break;
    }
    case 'gas_station': {
      // キャノピー + ポンプ
      const w = 90 * s;
      ctx.fillStyle = color;
      // キャノピー
      ctx.fillRect(x - w / 2, groundY - 72 * s, w, 14 * s);
      // 支柱
      ctx.fillRect(x - w / 2 + 6 * s, groundY - 58 * s, 8 * s, 58 * s);
      ctx.fillRect(x + w / 2 - 14 * s, groundY - 58 * s, 8 * s, 58 * s);
      // ポンプ
      ctx.fillStyle = accent;
      ctx.fillRect(x - 8 * s, groundY - 40 * s, 16 * s, 40 * s);
      ctx.fillRect(x - 4 * s, groundY - 50 * s, 8 * s, 10 * s);
      break;
    }
    case 'motel': {
      // 建物 + 縦長サイン
      const w = 96 * s;
      const h = 54 * s;
      ctx.fillStyle = color;
      ctx.fillRect(x - w / 2, groundY - h, w, h);
      // 屋根
      ctx.fillRect(x - w / 2 - 4 * s, groundY - h - 8 * s, w + 8 * s, 8 * s);
      // ドア窓
      ctx.fillStyle = lerpColor(color, '#000000', 0.3);
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x - w / 2 + 12 * s + i * 28 * s, groundY - h + 16 * s, 16 * s, h - 24 * s);
      }
      // サイン
      ctx.fillStyle = accent;
      ctx.fillRect(x + w / 2 - 6 * s, groundY - h - 56 * s, 12 * s, 56 * s);
      ctx.beginPath();
      ctx.arc(x + w / 2, groundY - h - 56 * s, 14 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bridge': {
      // アーチ橋
      const w = 160 * s;
      ctx.strokeStyle = color;
      ctx.lineWidth = 8 * s;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, groundY);
      ctx.quadraticCurveTo(x, groundY - 70 * s, x + w / 2, groundY);
      ctx.stroke();
      // 吊りライン
      ctx.lineWidth = 2 * s;
      for (let i = -2; i <= 2; i++) {
        const px = x + (i / 2.5) * (w / 2);
        const t = 1 - Math.abs(i / 2.5);
        ctx.beginPath();
        ctx.moveTo(px, groundY);
        ctx.lineTo(px, groundY - 70 * s * t * 0.9);
        ctx.stroke();
      }
      break;
    }
    case 'monument': {
      // メサ/ビュート型 (台形の岩、もしくは街ビル代用)
      const w = 84 * s;
      const h = 96 * s;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, groundY);
      ctx.lineTo(x - w * 0.36, groundY - h);
      ctx.lineTo(x + w * 0.36, groundY - h);
      ctx.lineTo(x + w / 2, groundY);
      ctx.closePath();
      ctx.fill();
      // 層の線
      ctx.strokeStyle = lerpColor(color, '#000000', 0.25);
      ctx.lineWidth = 1.5 * s;
      for (let i = 1; i < 3; i++) {
        const yy = groundY - (h * i) / 3;
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + i * 6 * s, yy);
        ctx.lineTo(x + w / 2 - i * 6 * s, yy);
        ctx.stroke();
      }
      break;
    }
    case 'animal': {
      // 汎用の小さな4足/人シルエット
      const w = 44 * s;
      const h = 30 * s;
      ctx.fillStyle = color;
      // 胴
      ctx.fillRect(x - w / 2, groundY - h, w * 0.78, h * 0.55);
      // 頭
      ctx.beginPath();
      ctx.arc(x + w * 0.3, groundY - h + h * 0.2, h * 0.26, 0, Math.PI * 2);
      ctx.fill();
      // 脚4本
      const lw = 4 * s;
      for (let i = 0; i < 4; i++) {
        const lx = x - w / 2 + 5 * s + i * (w * 0.2);
        ctx.fillRect(lx, groundY - h * 0.45, lw, h * 0.45);
      }
      break;
    }
    case 'tree': {
      // 汎用の木 (幹 + 樹冠)
      const h = 70 * s;
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(x - 5 * s, groundY - h * 0.5, 10 * s, h * 0.5);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, groundY - h * 0.62, 26 * s, 0, Math.PI * 2);
      ctx.arc(x - 18 * s, groundY - h * 0.5, 20 * s, 0, Math.PI * 2);
      ctx.arc(x + 18 * s, groundY - h * 0.5, 20 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sun': {
      const r = 30 * s;
      ctx.fillStyle = motif.color ?? '#ffce5a';
      ctx.beginPath();
      ctx.arc(x, groundY, r, 0, Math.PI * 2);
      ctx.fill();
      // 光の筋
      ctx.strokeStyle = motif.color ?? '#ffce5a';
      ctx.lineWidth = 3 * s;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * (r + 6 * s), groundY + Math.sin(a) * (r + 6 * s));
        ctx.lineTo(x + Math.cos(a) * (r + 18 * s), groundY + Math.sin(a) * (r + 18 * s));
        ctx.stroke();
      }
      break;
    }
    case 'moon': {
      const r = 26 * s;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, groundY, r, 0, Math.PI * 2);
      ctx.fill();
      // 三日月の影
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + r * 0.4, groundY - r * 0.15, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'road_runner': {
      // 背景の静止モチーフ用ロードランナー (走行演出は drawRoadRunner)
      drawRoadRunnerShape(ctx, x, groundY, s, color, 0);
      break;
    }
    case 'baobab': {
      // バオバブ: 太い幹 + 広い樹冠
      const h = 96 * s;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 22 * s, groundY);
      ctx.quadraticCurveTo(x - 12 * s, groundY - h * 0.6, x - 8 * s, groundY - h * 0.7);
      ctx.lineTo(x + 8 * s, groundY - h * 0.7);
      ctx.quadraticCurveTo(x + 12 * s, groundY - h * 0.6, x + 22 * s, groundY);
      ctx.closePath();
      ctx.fill();
      // 樹冠 (横長)
      ctx.beginPath();
      ctx.ellipse(x, groundY - h * 0.78, 48 * s, 18 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'savanna_tree': {
      // アカシア: 細い幹 + 平らな樹冠
      const h = 78 * s;
      ctx.strokeStyle = motif.color ?? '#5a4a2a';
      ctx.lineWidth = 6 * s;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, groundY - h * 0.62);
      ctx.moveTo(x, groundY - h * 0.62);
      ctx.lineTo(x - 22 * s, groundY - h * 0.78);
      ctx.moveTo(x, groundY - h * 0.62);
      ctx.lineTo(x + 24 * s, groundY - h * 0.74);
      ctx.stroke();
      // 平たい樹冠
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(x, groundY - h * 0.82, 46 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'elephant': {
      const w = 76 * s;
      const h = 52 * s;
      ctx.fillStyle = color;
      // 胴
      ctx.beginPath();
      ctx.ellipse(x, groundY - h * 0.6, w * 0.42, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // 頭
      ctx.beginPath();
      ctx.arc(x + w * 0.34, groundY - h * 0.62, h * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // 鼻
      ctx.lineWidth = 7 * s;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.46, groundY - h * 0.55);
      ctx.quadraticCurveTo(x + w * 0.6, groundY - h * 0.2, x + w * 0.5, groundY - 2 * s);
      ctx.stroke();
      // 脚
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x - w * 0.32 + i * w * 0.2, groundY - h * 0.32, 8 * s, h * 0.32);
      }
      break;
    }
    case 'giraffe': {
      const h = 96 * s;
      ctx.fillStyle = color;
      // 胴
      ctx.fillRect(x - 22 * s, groundY - h * 0.42, 44 * s, h * 0.26);
      // 首
      ctx.save();
      ctx.translate(x + 14 * s, groundY - h * 0.42);
      ctx.rotate(-0.35);
      ctx.fillRect(-7 * s, -h * 0.5, 14 * s, h * 0.52);
      ctx.restore();
      // 頭
      ctx.beginPath();
      ctx.arc(x + 30 * s, groundY - h * 0.88, 10 * s, 0, Math.PI * 2);
      ctx.fill();
      // 脚
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x - 20 * s + i * 13 * s, groundY - h * 0.42, 6 * s, h * 0.42);
      }
      break;
    }
    case 'lion': {
      const w = 64 * s;
      const h = 42 * s;
      ctx.fillStyle = color;
      // 胴
      ctx.fillRect(x - w / 2, groundY - h * 0.7, w * 0.74, h * 0.42);
      // たてがみ + 頭
      ctx.beginPath();
      ctx.arc(x + w * 0.28, groundY - h * 0.62, h * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lerpColor(color, '#000000', 0.25);
      ctx.beginPath();
      ctx.arc(x + w * 0.34, groundY - h * 0.62, h * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // 脚 + 尾
      ctx.fillStyle = color;
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x - w / 2 + 4 * s + i * (w * 0.18), groundY - h * 0.32, 6 * s, h * 0.32);
      }
      ctx.fillRect(x - w / 2 - 4 * s, groundY - h * 0.66, 8 * s, 3 * s);
      break;
    }
    case 'village': {
      // 土の家の集まり
      const huts = 3;
      for (let i = 0; i < huts; i++) {
        const hx = x - 34 * s + i * 34 * s;
        const hw = 28 * s;
        const hh = 26 * s;
        ctx.fillStyle = color;
        ctx.fillRect(hx - hw / 2, groundY - hh, hw, hh);
        // 円錐屋根
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(hx - hw / 2 - 3 * s, groundY - hh);
        ctx.lineTo(hx, groundY - hh - 18 * s);
        ctx.lineTo(hx + hw / 2 + 3 * s, groundY - hh);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'market': {
      // 屋台 (台 + ストライプ天幕)
      const w = 70 * s;
      ctx.fillStyle = '#5a4530';
      ctx.fillRect(x - w / 2, groundY - 26 * s, w, 26 * s);
      // 支柱
      ctx.fillRect(x - w / 2 + 2 * s, groundY - 58 * s, 5 * s, 32 * s);
      ctx.fillRect(x + w / 2 - 7 * s, groundY - 58 * s, 5 * s, 32 * s);
      // 天幕
      const stripes = 4;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? (motif.color ?? '#8a4a3a') : accent;
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + (i * w) / stripes, groundY - 58 * s);
        ctx.lineTo(x - w / 2 + ((i + 1) * w) / stripes, groundY - 58 * s);
        ctx.lineTo(x - w / 2 + ((i + 1) * w) / stripes - 4 * s, groundY - 48 * s);
        ctx.lineTo(x - w / 2 + (i * w) / stripes - 4 * s, groundY - 48 * s);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'film_marker': {
      // カチンコ
      const w = 70 * s;
      const h = 46 * s;
      const top = groundY - h;
      ctx.fillStyle = motif.color ?? '#1a1a1a';
      ctx.fillRect(x - w / 2, top + 12 * s, w, h - 12 * s);
      // 上のクラッパー
      ctx.save();
      ctx.translate(x - w / 2, top + 12 * s);
      ctx.rotate(-0.18);
      ctx.fillRect(0, -12 * s, w, 12 * s);
      // 斜めストライプ
      ctx.fillStyle = accent;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 14 * s, -12 * s);
        ctx.lineTo(i * 14 * s + 7 * s, -12 * s);
        ctx.lineTo(i * 14 * s + 1 * s, 0);
        ctx.lineTo(i * 14 * s - 6 * s, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'supporter_board': {
      // 手描きの応援看板 (杭 + 板)
      const w = 84 * s;
      const h = 40 * s;
      ctx.fillStyle = '#6a4a30';
      ctx.fillRect(x - 4 * s, groundY - 50 * s, 8 * s, 50 * s);
      ctx.fillStyle = motif.color ?? '#d2691e';
      ctx.save();
      ctx.translate(x, groundY - 50 * s - h / 2);
      ctx.rotate(-0.05);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      // 手描き縁
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5 * s;
      ctx.strokeRect(-w / 2 + 5 * s, -h / 2 + 5 * s, w - 10 * s, h - 10 * s);
      ctx.fillStyle = accent;
      ctx.font = `bold ${Math.round(13 * s)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GO!', 0, 0);
      ctx.textAlign = 'start';
      ctx.restore();
      break;
    }
    default: {
      // 未知タイプは小さな矩形でフォールバック
      ctx.fillStyle = color;
      ctx.fillRect(x - 10 * s, groundY - 20 * s, 20 * s, 20 * s);
      break;
    }
  }
}

// ---- ロードランナー演出 ---------------------------------------------------

/** ロードランナーの鳥シルエットを描く内部関数 (脚位相 legPhase) */
function drawRoadRunnerShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string,
  legPhase: number,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  // 胴体 (小さな楕円)
  ctx.beginPath();
  ctx.ellipse(x, y - 22 * s, 16 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // 長い尾 (後方へ上向き)
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y - 24 * s);
  ctx.quadraticCurveTo(x - 34 * s, y - 30 * s, x - 44 * s, y - 44 * s);
  ctx.lineTo(x - 38 * s, y - 42 * s);
  ctx.quadraticCurveTo(x - 28 * s, y - 28 * s, x - 10 * s, y - 20 * s);
  ctx.closePath();
  ctx.fill();

  // 首 + 頭 (前方へ)
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  ctx.moveTo(x + 10 * s, y - 26 * s);
  ctx.quadraticCurveTo(x + 20 * s, y - 36 * s, x + 24 * s, y - 40 * s);
  ctx.stroke();
  // 頭
  ctx.beginPath();
  ctx.arc(x + 25 * s, y - 42 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  // 頭の冠羽
  ctx.beginPath();
  ctx.moveTo(x + 24 * s, y - 47 * s);
  ctx.lineTo(x + 21 * s, y - 56 * s);
  ctx.lineTo(x + 28 * s, y - 50 * s);
  ctx.closePath();
  ctx.fill();
  // 細長いくちばし
  ctx.beginPath();
  ctx.moveTo(x + 30 * s, y - 43 * s);
  ctx.lineTo(x + 42 * s, y - 41 * s);
  ctx.lineTo(x + 30 * s, y - 39 * s);
  ctx.closePath();
  ctx.fill();

  // 脚 (速い動き)
  ctx.lineWidth = 2.5 * s;
  const swing = Math.sin(legPhase) * 8 * s;
  const swing2 = Math.sin(legPhase + Math.PI) * 8 * s;
  ctx.beginPath();
  ctx.moveTo(x + 2 * s, y - 12 * s);
  ctx.lineTo(x + 2 * s + swing, y);
  ctx.moveTo(x - 4 * s, y - 12 * s);
  ctx.lineTo(x - 4 * s + swing2, y);
  ctx.stroke();
}

/**
 * 走行中のロードランナーを描く (背景アクター)。
 * x,y = 足元中心。time = ミリ秒。後方に砂煙を出す。
 * カートゥーンキャラを連想させない素朴な茶/暗色の鳥シルエット。
 */
export function drawRoadRunner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
): void {
  const s = 1;
  // 砂煙 (後方)
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#d8c0a0';
  for (let i = 0; i < 3; i++) {
    const px = x - 24 - i * 14;
    const r = (6 + i * 4) * (0.7 + 0.3 * Math.sin(time * 0.02 + i));
    ctx.beginPath();
    ctx.arc(px, y - 6, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 鳥本体 (脚を高速で動かす)
  ctx.save();
  ctx.globalAlpha = 0.92;
  const legPhase = time * 0.06;
  drawRoadRunnerShape(ctx, x, y, s, '#3a2a1e', legPhase);
  ctx.restore();
}
