// Canvas ゲーム本体。createGame() でクロージャ的に状態を持ち、
// React 側からは start/stop/jump/setLateral/destroy を叩く。
//
// パラメータ（物理・難度・生成）は冒頭の TUNING にまとめてある。
// ここを触れば挙動を一気に調整できる。

import { playCoin, playGameOver, playJump } from './audio';
import { CHARACTER_DRAWERS } from './characters';
import {
  COURSES,
  getStageIndex,
  resolveRegion,
  resolveSpeedStage,
} from './courses';
import { DECORATION_DRAWERS } from './decorations';
import { drawSky, getSkyState } from './timeofday';
import type {
  Character,
  Coin,
  CourseId,
  Particle,
  Platform,
  Player,
  Region,
} from './types';

// ---- チューニング ---------------------------------------------------------

const TUNING = {
  /** ベースキャンバスの論理サイズ。実際は DPR とフィットでスケールされる */
  worldW: 960,
  worldH: 540,
  /** プレイヤー固定 x 座標（画面左寄せ） */
  playerX: 160,
  playerW: 56,
  playerH: 72,
  /** 横方向の微調整（PC: 左右キー）の倍率 */
  lateralSpeed: 1.6,
  /** 微調整 x の許容範囲（playerX を中心とした幅） */
  lateralRange: 80,

  // --- ステージ生成 ---
  platformMinW: 140,
  platformMaxW: 240,
  platformGapMin: 60,
  platformGapMax: 90,
  /** 序盤の足場 y のばらつき幅 */
  platformYJitter: 24,
  /** 足場の標準高さ（地面ライン） */
  platformBaseY: 410,
  platformThickness: 24,

  // --- 難度上昇 ---
  speedMaxBonus: 4.0,
  /** スコアが何進むごとに speed が +0.3 されるか */
  speedRampScore: 500,
  gapMaxBonus: 50,
  yJitterMaxBonus: 30,

  // --- コイン ---
  coinSpawnChance: 0.4,
  coinValue: 10,
  coinRadius: 8,

  // --- スコア ---
  /** speed×係数 = 1フレームあたりの距離スコア */
  distanceScorePerFrame: 0.1,
} as const;

// ---- API 型 ---------------------------------------------------------------

export interface GameHandle {
  start(character: Character): void;
  stop(): void;
  jump(): void;
  setLateral(dir: -1 | 0 | 1): void;
  setCourse(course: CourseId): void;
  destroy(): void;
}

export interface GameCallbacks {
  onScore?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onStageChange?: (stageIndex: number, label: string) => void;
  onRegionChange?: (regionName: string) => void;
  initialCourse?: CourseId;
}

// ---- メイン ---------------------------------------------------------------

export function createGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks = {},
): GameHandle {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // ロジック上の論理サイズ。DPRリサイズはこの関数側で行う。
  let logicalW: number = TUNING.worldW;
  let logicalH: number = TUNING.worldH;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // 表示サイズに合わせて内部解像度を上げる
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    logicalW = rect.width;
    logicalH = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  // --- 状態 ---
  let running = false;
  let rafId = 0;
  let character: Character | null = null;

  let player: Player = {
    x: TUNING.playerX,
    y: 0,
    vx: 0,
    vy: 0,
    width: TUNING.playerW,
    height: TUNING.playerH,
    jumpsLeft: 0,
    onGround: false,
    animPhase: 0,
  };
  let platforms: Platform[] = [];
  let coins: Coin[] = [];
  let particles: Particle[] = [];
  let score = 0;
  let lateralDir: -1 | 0 | 1 = 0;
  let bgScroll = 0;
  let currentCourseId: CourseId = callbacks.initialCourse ?? 'japan';
  let lastStageIndex = -1;
  let lastRegionName = '';

  // --- ヘルパー ---

  const baseY = () =>
    Math.min(TUNING.platformBaseY, logicalH - TUNING.platformThickness - 40);

  const currentSpeed = (): number => {
    if (!character) return 0;
    const course = COURSES[currentCourseId];
    const stage = resolveSpeedStage(score);
    // 段階倍率 × コース倍率 × キャラの基準速度
    return character.speed * stage.multiplier * course.speedMultiplier;
  };

  const currentGapMax = (): number => {
    const course = COURSES[currentCourseId];
    const stage = resolveSpeedStage(score);
    // gap も同じ段階に従って広がる
    const stageGapBonus = (stage.multiplier - 1) * 50;
    return (TUNING.platformGapMax + stageGapBonus) * course.gapMultiplier;
  };

  const currentYJitter = (): number => {
    const stage = resolveSpeedStage(score);
    return TUNING.platformYJitter + (stage.multiplier - 1) * 30;
  };

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  // 新規プラットフォーム生成（末尾の右隣に追加）
  const spawnPlatform = () => {
    const last = platforms[platforms.length - 1];
    const gap = rand(TUNING.platformGapMin, currentGapMax());
    const width = rand(TUNING.platformMinW, TUNING.platformMaxW);
    const yJ = currentYJitter();
    // ベース高さから少し揺らす。前のプラットフォームとあまり離さない。
    const targetY = baseY() + rand(-yJ, yJ);
    const prevY = last ? last.y : baseY();
    const y = Math.max(
      baseY() - 60,
      Math.min(baseY() + 60, (prevY + targetY) / 2),
    );
    const x = last ? last.x + last.width + gap : logicalW * 0.1;
    const platform: Platform = { x, y, width, height: TUNING.platformThickness };
    platforms.push(platform);

    // 一定確率でコインを 1〜3 枚出す
    if (Math.random() < TUNING.coinSpawnChance) {
      const count = 1 + Math.floor(Math.random() * 3);
      const startX = x + width * 0.2;
      const endX = x + width * 0.8;
      for (let i = 0; i < count; i++) {
        const cx =
          count === 1 ? (startX + endX) / 2 : startX + ((endX - startX) * i) / (count - 1);
        coins.push({
          x: cx,
          y: y - 28,
          r: TUNING.coinRadius,
          collected: false,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  };

  // 最初の足場を地続きで配置（序盤を簡単に）
  const initPlatforms = () => {
    platforms = [];
    coins = [];
    const firstWidth = 320;
    platforms.push({
      x: 0,
      y: baseY(),
      width: firstWidth,
      height: TUNING.platformThickness,
    });
    while (
      platforms[platforms.length - 1].x +
        platforms[platforms.length - 1].width <
      logicalW + 200
    ) {
      spawnPlatform();
    }
  };

  const spawnCoinParticles = (x: number, y: number) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1,
        life: 30,
        maxLife: 30,
        color: '#fff',
        size: 2 + Math.random() * 2,
      });
    }
  };

  // --- ループ ---

  let prevTime = 0;
  const tick = (now: number) => {
    if (!running) return;
    const dt = prevTime ? Math.min(40, now - prevTime) : 16;
    prevTime = now;

    update(dt);
    draw();

    rafId = requestAnimationFrame(tick);
  };

  const update = (_dt: number) => {
    if (!character) return;
    const speed = currentSpeed();

    // 入力反映（横方向の微調整）
    player.vx = lateralDir * TUNING.lateralSpeed;
    player.x += player.vx;
    // 微調整の許容範囲内に収める
    const xMin = TUNING.playerX - TUNING.lateralRange;
    const xMax = TUNING.playerX + TUNING.lateralRange;
    if (player.x < xMin) player.x = xMin;
    if (player.x > xMax) player.x = xMax;

    // 重力
    player.vy += character.gravity;
    const prevBottom = player.y + player.height - player.vy; // 直前フレームの底
    player.y += player.vy;

    // ワールドスクロール（プラットフォーム / コインを左に流す）
    for (const p of platforms) p.x -= speed;
    for (const c of coins) c.x -= speed;
    bgScroll -= speed * 0.2;

    // 画面外（左）の整理
    platforms = platforms.filter((p) => p.x + p.width > -50);
    coins = coins.filter((c) => c.x + c.r > -20);

    // 必要なら新しい足場を生成
    while (
      platforms.length === 0 ||
      platforms[platforms.length - 1].x +
        platforms[platforms.length - 1].width <
        logicalW + 200
    ) {
      spawnPlatform();
    }

    // 着地判定（上から落ちてくるときのみ、AABB & 直前フレームで上にいたか）
    player.onGround = false;
    if (player.vy >= 0) {
      for (const p of platforms) {
        const playerLeft = player.x;
        const playerRight = player.x + player.width;
        const playerBottom = player.y + player.height;
        if (
          playerRight > p.x &&
          playerLeft < p.x + p.width &&
          playerBottom >= p.y &&
          prevBottom <= p.y + 1 // 直前フレームの底がプラットフォーム上端より上にあった
        ) {
          player.y = p.y - player.height;
          player.vy = 0;
          player.onGround = true;
          player.jumpsLeft = character.maxJumps;
          break;
        }
      }
    }

    // コイン取得（円vs矩形）
    for (const c of coins) {
      if (c.collected) continue;
      c.phase += 0.15;
      // 簡易: コインの中心が player AABB の外周からどれだけ近いか
      const nx = Math.max(player.x, Math.min(c.x, player.x + player.width));
      const ny = Math.max(player.y, Math.min(c.y, player.y + player.height));
      const dx = c.x - nx;
      const dy = c.y - ny;
      if (dx * dx + dy * dy <= c.r * c.r) {
        c.collected = true;
        score += TUNING.coinValue;
        spawnCoinParticles(c.x, c.y);
        playCoin();
      }
    }
    coins = coins.filter((c) => !c.collected);

    // パーティクル更新
    for (const pt of particles) {
      pt.vy += 0.15;
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= 1;
    }
    particles = particles.filter((pt) => pt.life > 0);

    // スコア（距離）
    score += speed * TUNING.distanceScorePerFrame;
    callbacks.onScore?.(score);

    // ステージ変化を通知
    const stageIdx = getStageIndex(score);
    if (stageIdx !== lastStageIndex) {
      lastStageIndex = stageIdx;
      const stage = resolveSpeedStage(score);
      callbacks.onStageChange?.(stageIdx, stage.label);
    }

    // 地域変化を通知
    const course = COURSES[currentCourseId];
    const { current: region } = resolveRegion(course, score);
    if (region.name !== lastRegionName) {
      lastRegionName = region.name;
      callbacks.onRegionChange?.(region.name);
    }

    // 走り/車輪のアニメ位相
    player.animPhase += player.onGround ? 0.6 : 0.2;

    // 死亡判定（落下）
    if (player.y > logicalH + 80) {
      running = false;
      playGameOver();
      callbacks.onGameOver?.(score);
      cancelAnimationFrame(rafId);
    }
  };

  // --- 描画 ---

  const getCurrentRegion = (): Region => {
    const course = COURSES[currentCourseId];
    return resolveRegion(course, score).current;
  };

  const drawPlatform = (p: Platform) => {
    const region = getCurrentRegion();
    const fill = region.groundFill ?? '#000';
    const stroke = region.groundStroke ?? '#fff';
    ctx.fillStyle = fill;
    ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.fillStyle = stroke;
    ctx.fillRect(p.x, p.y, p.width, 2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, p.y, p.width, p.height);
  };

  const drawCoin = (c: Coin) => {
    const wobble = Math.sin(c.phase) * 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(c.x, c.y + wobble, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a2a00';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#5a2a00';
    ctx.beginPath();
    ctx.arc(c.x, c.y + wobble, c.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawParticles = () => {
    for (const pt of particles) {
      const alpha = pt.life / pt.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  };

  const drawPlayer = () => {
    if (!character) return;
    const drawer = CHARACTER_DRAWERS[character.id];
    drawer(ctx, player.x, player.y, player.width, player.height, player.animPhase);
  };

  const drawDecorationsForCurrentRegion = () => {
    const course = COURSES[currentCourseId];
    const { current, next, blend } = resolveRegion(course, score);
    // 現在の地域の装飾
    for (const decoId of current.decorations) {
      const drawer = DECORATION_DRAWERS[decoId];
      drawer(ctx, logicalW, logicalH, baseY(), bgScroll);
    }
    // 次の地域へ近づいたらクロスフェード（blend > 0.85 で次の装飾も重ねる）
    if (next && blend > 0.85) {
      const alpha = (blend - 0.85) / 0.15;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      for (const decoId of next.decorations) {
        const drawer = DECORATION_DRAWERS[decoId];
        drawer(ctx, logicalW, logicalH, baseY(), bgScroll);
      }
      ctx.restore();
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, logicalW, logicalH);
    // 距離ベースで時間帯を計算 → 空 + 太陽/月 + 星
    const skyState = getSkyState(score, logicalW, logicalH);
    drawSky(ctx, skyState, logicalW, logicalH);
    // 地域の装飾
    drawDecorationsForCurrentRegion();
    // 地平線
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY() + 10);
    ctx.lineTo(logicalW, baseY() + 10);
    ctx.stroke();
    // プラットフォーム → コイン → パーティクル → プレイヤー
    for (const p of platforms) drawPlatform(p);
    for (const c of coins) drawCoin(c);
    drawParticles();
    drawPlayer();
  };

  // --- API ---

  const start: GameHandle['start'] = (ch) => {
    character = ch;
    score = 0;
    bgScroll = 0;
    lastStageIndex = -1;
    lastRegionName = '';
    player = {
      x: TUNING.playerX,
      y: baseY() - TUNING.playerH - 10,
      vx: 0,
      vy: 0,
      width: TUNING.playerW,
      height: TUNING.playerH,
      jumpsLeft: ch.maxJumps,
      onGround: false,
      animPhase: 0,
    };
    particles = [];
    initPlatforms();
    running = true;
    prevTime = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  };

  const stop: GameHandle['stop'] = () => {
    running = false;
    cancelAnimationFrame(rafId);
  };

  const jump: GameHandle['jump'] = () => {
    if (!running || !character) return;
    if (player.jumpsLeft > 0) {
      player.vy = character.jumpPower;
      player.jumpsLeft -= 1;
      player.onGround = false;
      playJump();
    }
  };

  const setLateral: GameHandle['setLateral'] = (dir) => {
    lateralDir = dir;
  };

  const setCourse: GameHandle['setCourse'] = (course) => {
    currentCourseId = course;
    // ゲーム未開始時でも背景だけ更新したいので 1 フレーム描画
    if (!running) {
      draw();
    }
  };

  const destroy: GameHandle['destroy'] = () => {
    stop();
    window.removeEventListener('resize', onResize);
  };

  return { start, stop, jump, setLateral, setCourse, destroy };
}
