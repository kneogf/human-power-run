// 距離(m) → 時間帯フェーズ(0..1) → 空のグラデ + 太陽/月の位置。
// 1サイクル ≈ DAY_CYCLE_DISTANCE で「朝日 → 昼 → 夕日 → 夜 → 朝日」。
// engine.ts から距離を渡せば必要なものが全部返る。

const DAY_CYCLE_DISTANCE = 2200;

export interface SkyState {
  /** 上端の空色 */
  topColor: string;
  /** 下端の空色 */
  bottomColor: string;
  /** 太陽（昼間に見える） */
  sun: { x: number; y: number; visible: boolean; fill: string; stroke: string };
  /** 月（夜に見える） */
  moon: { x: number; y: number; visible: boolean };
  /** 星のアルファ（夜に強く） */
  starAlpha: number;
  /** 時間帯ラベル（HUD用） */
  label: string;
  /** 0..1 のフェーズ値 */
  phase: number;
}

/** RGB各成分を線形補間 */
function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bb = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bb})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

// 各キーフェーズの空色 (top, bottom) と太陽/月の状態
// 上端→下端の順
const KEYFRAMES: Array<{
  at: number;
  top: string;
  bottom: string;
  label: string;
}> = [
  { at: 0.0, top: '#3a1f47', bottom: '#ff8a5b', label: '朝日' }, // 朝焼け
  { at: 0.1, top: '#ffb56b', bottom: '#ffe8a3', label: '朝' },
  { at: 0.25, top: '#7ec9f0', bottom: '#fff5d6', label: '朝' },
  { at: 0.45, top: '#5fb8eb', bottom: '#b8e3fb', label: '昼' },
  { at: 0.6, top: '#ffae5e', bottom: '#fff0c2', label: '午後' },
  { at: 0.72, top: '#ff5c4e', bottom: '#ffb56b', label: '夕日' },
  { at: 0.82, top: '#5a2e6e', bottom: '#ff6b4a', label: '黄昏' },
  { at: 0.9, top: '#1a1738', bottom: '#5a2e6e', label: '夜' },
  { at: 0.97, top: '#0a0a1f', bottom: '#1a1738', label: '深夜' },
  { at: 1.0, top: '#3a1f47', bottom: '#ff8a5b', label: '朝日' },
];

function getColorPair(phase: number): { top: string; bottom: string; label: string } {
  // phase を含む区間を見つけ、線形補間
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (phase >= a.at && phase <= b.at) {
      const t = (phase - a.at) / (b.at - a.at);
      return {
        top: lerpColor(a.top, b.top, t),
        bottom: lerpColor(a.bottom, b.bottom, t),
        label: t < 0.5 ? a.label : b.label,
      };
    }
  }
  return { top: KEYFRAMES[0].top, bottom: KEYFRAMES[0].bottom, label: KEYFRAMES[0].label };
}

/**
 * 距離から時間帯の状態を計算する。
 * @param distance 走破距離 (m)
 * @param w 描画幅
 * @param h 描画高さ
 */
export function getSkyState(distance: number, w: number, h: number): SkyState {
  const phase = ((distance / DAY_CYCLE_DISTANCE) % 1 + 1) % 1;
  const { top, bottom, label } = getColorPair(phase);

  // 太陽は左→上→右へアーチ移動。phase 0.05〜0.7 が「昼間」想定。
  // angle: -0.1π (左下) 〜 1.1π (右下) を 0.05〜0.7 にマップ。
  const sunVisible = phase >= 0.05 && phase <= 0.7;
  const sunT = sunVisible ? (phase - 0.05) / 0.65 : -1;
  const sunAngle = Math.PI * (1.1 - 1.2 * sunT);
  const sunX = w * 0.5 + Math.cos(sunAngle) * w * 0.55;
  const sunY = h * 0.7 - Math.sin(sunAngle) * h * 0.6;

  // 月は phase 0.78〜1.0 で出現
  const moonVisible = phase >= 0.78 || phase <= 0.04;
  const moonPhase = phase >= 0.78 ? (phase - 0.78) / (1.04 - 0.78) : (phase + 0.22) / 0.26;
  const moonAngle = Math.PI * (1.1 - 1.2 * moonPhase);
  const moonX = w * 0.5 + Math.cos(moonAngle) * w * 0.55;
  const moonY = h * 0.7 - Math.sin(moonAngle) * h * 0.6;

  // 太陽の色：朝/夕は赤→白へ
  const sunRedness = Math.min(1, Math.abs(phase - 0.4) * 2.2);
  const sunFill = lerpColor('#fff5c1', '#ff8a3d', sunRedness);
  const sunStroke = lerpColor('#a8580c', '#5a1a00', sunRedness);

  // 星のアルファ：夜に強く
  let starAlpha = 0;
  if (phase >= 0.88) starAlpha = Math.min(1, (phase - 0.88) / 0.12);
  else if (phase <= 0.05) starAlpha = Math.min(1, (0.05 - phase) / 0.05);

  return {
    topColor: top,
    bottomColor: bottom,
    sun: { x: sunX, y: sunY, visible: sunVisible, fill: sunFill, stroke: sunStroke },
    moon: { x: moonX, y: moonY, visible: moonVisible },
    starAlpha,
    label,
    phase,
  };
}

/**
 * 空・天体を描く。背景の最下層。
 */
export function drawSky(
  ctx: CanvasRenderingContext2D,
  state: SkyState,
  w: number,
  h: number,
) {
  // 空グラデ
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, state.topColor);
  grad.addColorStop(1, state.bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 星（夜のみ）
  if (state.starAlpha > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${state.starAlpha})`;
    // 固定シードで疎な星を撒く
    const starCount = 40;
    for (let i = 0; i < starCount; i++) {
      const sx = ((i * 173) % 1000) / 1000 * w;
      const sy = ((i * 89) % 1000) / 1000 * (h * 0.55);
      const r = (i % 4 === 0) ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 太陽
  if (state.sun.visible) {
    ctx.save();
    ctx.fillStyle = state.sun.fill;
    ctx.beginPath();
    ctx.arc(state.sun.x, state.sun.y, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state.sun.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // 月
  if (state.moon.visible) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(state.moon.x, state.moon.y, 26, 0, Math.PI * 2);
    ctx.fill();
    // 三日月の影
    ctx.fillStyle = state.topColor;
    ctx.beginPath();
    ctx.arc(state.moon.x + 9, state.moon.y - 3, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
