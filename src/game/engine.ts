// Canvas ゲーム本体。createGame() でクロージャ的に状態を持ち、
// React 側からは start/stop/jump/setLateral/destroy を叩く。
//
// パラメータ（物理・難度・生成）は冒頭の TUNING にまとめてある。
// ここを触れば挙動を一気に調整できる。

import { playCoin, playJump } from './audio';
import { CHARACTER_DRAWERS } from './characters';
import { getSmoothMultiplier, getStageIndex, resolveSpeedStage } from './courses';
import { drawCourseBackground, drawRoadRunner } from './courseRenderer';
import type {
  Character,
  Coin,
  CourseId,
  Particle,
  Platform,
  Player,
} from './types';
import { getCourseById, getCourseSection } from '../lib/courseManager';
import type { MilestoneSponsor } from '../config/milestoneConfig';

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

  // --- 沿道看板 (マネタイズ層) ---
  // 走行中も読めるよう、空に近い位置に置く。幅・高さは文字量で動的決定。
  billboardGapMin: 360,
  billboardGapMax: 620,
  billboardMinW: 220,
  billboardMaxW: 460,
  /** 看板下端が baseY からこの距離上に来る (高さによらず底辺は揃う) */
  billboardBottomOffset: 70,
  /** 補充トリガ: 末尾看板の x がこの位置を切ったらスポーン */
  billboardSpawnAheadOf: 60,

  // --- マイルストーン帯 ---
  milestoneBannerHeight: 44,
  milestoneBannerDurationMs: 2200,
  milestoneBannerFadeMs: 220,
} as const;

// ---- 沿道看板 (マネタイズ) ------------------------------------------------

/** 看板の表示元 (adSlotManager の BillboardItem を engine 用に絞った形) */
export type EngineBillboardItem = {
  id: string;
  source: 'supporter' | 'corporate' | 'jff' | 'event';
  displayName: string;
  /** タイトル下に小さく入る英文タグライン (省略可) */
  tagline?: string;
  message?: string;
};

/** 看板内のテキスト配置 (spawn時に決定し、毎フレームの描画で使う) */
type BillboardLayout = {
  padL: number;
  padR: number;
  titleY: number;     // signY からの相対 y
  taglineY: number;   // 描画なしは -1
  messageY: number;   // 描画なしは -1
  subtitleText: string;
};

/** 看板の内部表現 (engine 内ストア) */
type Billboard = {
  x: number;
  signY: number;
  signW: number;
  signH: number;
  layout: BillboardLayout;
  item: EngineBillboardItem;
  impressed: boolean;
};

// 看板テキストのフォント定数 (measure と draw で一致させるため一元管理)
const FONT_TITLE =
  'bold 20px "Helvetica Neue", system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif';
const FONT_TAGLINE =
  'italic bold 13px "Helvetica Neue", system-ui, sans-serif';
const FONT_MESSAGE =
  'bold 15px "Helvetica Neue", system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif';

const TITLE_LINE_H = 24;
const TAGLINE_LINE_H = 18;
const MESSAGE_LINE_H = 22;

// ---- API 型 ---------------------------------------------------------------

export interface StartOptions {
  /** マイルストーン一覧 (距離越え時に1回ずつ発火) */
  milestones?: MilestoneSponsor[];
  /** 沿道看板の次の1枚を返す。null返しなら看板スキップ */
  getBillboard?: () => EngineBillboardItem | null;
}

export interface GameHandle {
  start(character: Character, opts?: StartOptions): void;
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
  /** マイルストーン到達時 (engine 内で帯も表示する) */
  onMilestoneReached?: (milestone: MilestoneSponsor) => void;
  /** 沿道看板が新しく画面右からスポーンした瞬間 (1看板1回) */
  onBillboardImpression?: (item: EngineBillboardItem) => void;
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

  // 沿道看板
  let billboards: Billboard[] = [];
  let getBillboard: (() => EngineBillboardItem | null) | null = null;

  // マイルストーン (純粋距離 = traveled で判定。score はコイン分を含むので別管理)
  let traveled = 0;
  let milestones: MilestoneSponsor[] = [];
  const triggeredMilestoneIds = new Set<string>();
  let milestoneBanner: { text: string; spawnAt: number } | null = null;

  // Route66 砂漠セクションのロードランナー (背景アクター・当たり判定なし)
  let roadRunner: { x: number; y: number } | null = null;
  let roadRunnerCooldown = 0;

  // --- ヘルパー ---

  const baseY = () =>
    Math.min(TUNING.platformBaseY, logicalH - TUNING.platformThickness - 40);

  const currentSpeed = (): number => {
    if (!character) return 0;
    // step ではなく連続補間された倍率を使うことで、ステージ境界での
    // 「ガクッ」を無くし、じわっと自然に速くなる。
    return character.speed * getSmoothMultiplier(score);
  };

  const currentGapMax = (): number => {
    // gap 幅も連続的に広がる
    const stageGapBonus = (getSmoothMultiplier(score) - 1) * 50;
    return TUNING.platformGapMax + stageGapBonus;
  };

  const currentYJitter = (): number => {
    // 高さのばらつきも連続的に増える
    return TUNING.platformYJitter + (getSmoothMultiplier(score) - 1) * 30;
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

  // 看板に出すサブテキスト (message があればそれ、なければソース別フォールバック)
  const resolveBillboardSubtitle = (item: EngineBillboardItem): string => {
    if (item.message) {
      return item.source === 'supporter' ? `「${item.message}」` : item.message;
    }
    return item.source === 'supporter'
      ? '沿道から応援中'
      : item.source === 'corporate'
        ? 'supported by'
        : item.source === 'event'
          ? '開催中'
          : '';
  };

  // 文字量を測って看板の幅・高さ・テキスト位置を決定する
  const computeBillboardLayout = (
    item: EngineBillboardItem,
  ): { w: number; h: number; layout: BillboardLayout } => {
    const isJff = item.source === 'jff';
    const padL = item.source === 'supporter' ? 28 : isJff ? 14 : 14;
    const padR = 14;
    const topPad = isJff ? 24 : 10; // JFFは上部のオレンジ"JFF"タグを避ける
    const bottomPad = 10;
    const subtitleText = resolveBillboardSubtitle(item);

    // 各行の幅を実測
    ctx.save();
    ctx.font = FONT_TITLE;
    const titleW = ctx.measureText(item.displayName).width;
    ctx.font = FONT_TAGLINE;
    const taglineW = item.tagline ? ctx.measureText(item.tagline).width : 0;
    ctx.font = FONT_MESSAGE;
    const messageW = subtitleText ? ctx.measureText(subtitleText).width : 0;
    ctx.restore();

    const widest = Math.max(titleW, taglineW, messageW);
    const w = Math.max(
      TUNING.billboardMinW,
      Math.min(TUNING.billboardMaxW, Math.ceil(widest) + padL + padR),
    );

    let cursor = topPad;
    const titleY = cursor;
    cursor += TITLE_LINE_H;

    let taglineY = -1;
    if (item.tagline) {
      taglineY = cursor;
      cursor += TAGLINE_LINE_H;
    }

    let messageY = -1;
    if (subtitleText) {
      messageY = cursor;
      cursor += MESSAGE_LINE_H;
    }

    const h = cursor + bottomPad;

    return {
      w,
      h,
      layout: { padL, padR, titleY, taglineY, messageY, subtitleText },
    };
  };

  // 沿道看板を末尾の右側に1枚追加。連続で同じ看板が出ないよう最大2回リトライ。
  const spawnBillboard = () => {
    if (!getBillboard) return;
    let item = getBillboard();
    if (!item) return;
    const lastId = billboards[billboards.length - 1]?.item.id;
    for (let i = 0; i < 2 && item.id === lastId; i++) {
      const next = getBillboard();
      if (!next) break;
      item = next;
    }
    const { w, h, layout } = computeBillboardLayout(item);
    const last = billboards[billboards.length - 1];
    const gap = rand(TUNING.billboardGapMin, TUNING.billboardGapMax);
    const x = last
      ? last.x + last.signW + gap
      : logicalW + TUNING.billboardSpawnAheadOf;
    // 底辺を baseY - billboardBottomOffset に揃える (高さがバラついても sit on ground)
    const signY = baseY() - TUNING.billboardBottomOffset - h;
    billboards.push({
      x,
      signY,
      signW: w,
      signH: h,
      layout,
      item,
      impressed: false,
    });
  };

  const initBillboards = () => {
    billboards = [];
    if (!getBillboard) return;
    for (let i = 0; i < 3; i++) spawnBillboard();
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

  // Route66 の砂漠セクション (DESERT RUN) の時だけロードランナーを走らせる。
  // 当たり判定は無く、画面を高速で横切る背景演出。
  const updateRoadRunner = () => {
    if (roadRunner) {
      // 走行中: 左へ高速移動。画面外で消す。
      roadRunner.x -= currentSpeed() + 6;
      if (roadRunner.x < -60) roadRunner = null;
      return;
    }
    if (roadRunnerCooldown > 0) {
      roadRunnerCooldown -= 1;
      return;
    }
    // 出現条件: route66 かつ現在セクションが DESERT RUN
    if (currentCourseId !== 'route66') return;
    const course = getCourseById(currentCourseId);
    const section = getCourseSection(course, traveled);
    if (section.id !== 'r66_desert') return;
    // ときどき出現
    if (Math.random() < 0.012) {
      roadRunner = { x: logicalW + 50, y: baseY() - 6 };
    } else {
      roadRunnerCooldown = 30;
    }
  };

  // --- ループ ---

  let prevTime = 0;
  const tick = (now: number) => {
    if (!running) return;
    const dt = prevTime ? Math.min(40, now - prevTime) : 16;
    prevTime = now;

    update(dt);
    draw(now);

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

    // ワールドスクロール（プラットフォーム / コイン / 看板を左に流す）
    for (const p of platforms) p.x -= speed;
    for (const c of coins) c.x -= speed;
    for (const b of billboards) b.x -= speed;
    bgScroll -= speed * 0.2;

    // 画面外（左）の整理
    platforms = platforms.filter((p) => p.x + p.width > -50);
    coins = coins.filter((c) => c.x + c.r > -20);
    billboards = billboards.filter((b) => b.x + b.signW > -60);

    // 必要なら新しい足場を生成
    while (
      platforms.length === 0 ||
      platforms[platforms.length - 1].x +
        platforms[platforms.length - 1].width <
        logicalW + 200
    ) {
      spawnPlatform();
    }

    // 沿道看板の補充 + impression発火
    while (
      getBillboard !== null &&
      (billboards.length === 0 ||
        billboards[billboards.length - 1].x < logicalW + TUNING.billboardSpawnAheadOf)
    ) {
      const before = billboards.length;
      spawnBillboard();
      if (billboards.length === before) break; // getBillboard が null 返し続けたら抜ける
    }
    for (const b of billboards) {
      if (!b.impressed && b.x < logicalW - 10) {
        b.impressed = true;
        callbacks.onBillboardImpression?.(b.item);
      }
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
    const distanceDelta = speed * TUNING.distanceScorePerFrame;
    score += distanceDelta;
    traveled += distanceDelta;
    callbacks.onScore?.(score);

    // マイルストーン判定 (純粋距離で判定し、1フレーム1個まで)
    const traveledM = Math.floor(traveled);
    for (const m of milestones) {
      if (!triggeredMilestoneIds.has(m.id) && traveledM >= m.distance) {
        triggeredMilestoneIds.add(m.id);
        milestoneBanner = { text: m.message, spawnAt: performance.now() };
        callbacks.onMilestoneReached?.(m);
        break;
      }
    }

    // ステージ変化を通知
    const stageIdx = getStageIndex(score);
    if (stageIdx !== lastStageIndex) {
      lastStageIndex = stageIdx;
      const stage = resolveSpeedStage(score);
      callbacks.onStageChange?.(stageIdx, stage.label);
    }

    // セクション(地域)変化を通知
    const course = getCourseById(currentCourseId);
    const section = getCourseSection(course, traveled);
    if (section.name !== lastRegionName) {
      lastRegionName = section.name;
      callbacks.onRegionChange?.(section.name);
    }

    // Route66 砂漠セクションのロードランナー演出
    updateRoadRunner();

    // 走り/車輪のアニメ位相
    player.animPhase += player.onGround ? 0.6 : 0.2;

    // 死亡判定（落下）
    // ※ Game Over の音は App 側で onGameOverAudioFlow() が担当 (mp3ジングル)
    if (player.y > logicalH + 80) {
      running = false;
      callbacks.onGameOver?.(score);
      cancelAnimationFrame(rafId);
    }
  };

  // --- 描画 ---

  const drawPlatform = (p: Platform) => {
    // 足場はセクションの groundColor を使う。
    // プレイヤー視認性のため、地面は濃いめ + 上端に明るいラインで強調する。
    const course = getCourseById(currentCourseId);
    const section = getCourseSection(course, traveled);
    const fill = section.groundColor;
    ctx.fillStyle = fill;
    ctx.fillRect(p.x, p.y, p.width, p.height);
    // 上端の明るいライン (足場の縁を必ず見せる)
    ctx.fillStyle = section.accentColor;
    ctx.fillRect(p.x, p.y, p.width, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
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

  // コース背景 (空 + セクションのモチーフ) を描く。
  const drawCourseScenery = () => {
    const course = getCourseById(currentCourseId);
    drawCourseBackground(
      ctx,
      course,
      traveled,
      logicalW,
      logicalH,
      baseY(),
      bgScroll,
    );
  };

  // 沿道看板を1枚描画 (装飾と足場の間に置く)
  // 3段構成: タイトル / タグライン(任意) / メッセージ(任意)
  // ソース別アクセント:
  //   supporter: 白地+黒文字、左上にオレンジ点 (温かさ)
  //   corporate: 白地+黒文字 (きっちり)
  //   event   : 白地+黒文字、下にオレンジ帯
  //   jff     : 黒地+白文字、左上に "JFF" タグ + 下にオレンジ帯
  const drawBillboard = (b: Billboard) => {
    const { x, signY, signW, signH, item, layout } = b;
    const groundY = baseY() + 8;

    // 支柱2本
    ctx.strokeStyle = 'rgba(40,40,40,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + signW * 0.18, signY + signH);
    ctx.lineTo(x + signW * 0.18, groundY);
    ctx.moveTo(x + signW * 0.82, signY + signH);
    ctx.lineTo(x + signW * 0.82, groundY);
    ctx.stroke();

    const isJff = item.source === 'jff';

    // 影 (背景に溶けないよう)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, signY + 4, signW, signH);
    ctx.restore();

    // パネル背景
    ctx.fillStyle = isJff ? '#0a0a0a' : '#f7f5ee';
    ctx.fillRect(x, signY, signW, signH);
    ctx.strokeStyle = isJff ? '#fff' : '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, signY, signW, signH);

    // アクセント
    if (item.source === 'supporter') {
      ctx.fillStyle = '#ff8c2a';
      ctx.beginPath();
      ctx.arc(x + 14, signY + 14, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.source === 'event') {
      ctx.fillStyle = '#ff8c2a';
      ctx.fillRect(x, signY + signH - 5, signW, 5);
    } else if (item.source === 'jff') {
      // 左上のJFFタグ
      ctx.fillStyle = '#ff8c2a';
      ctx.fillRect(x, signY, 36, 18);
      ctx.fillStyle = '#0a0a0a';
      ctx.font = 'bold 11px "Helvetica Neue", system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('JFF', x + 8, signY + 4);
      // 下のオレンジ帯
      ctx.fillStyle = '#ff8c2a';
      ctx.fillRect(x, signY + signH - 4, signW, 4);
    }

    // テキスト共通設定
    ctx.textBaseline = 'top';
    const textX = x + layout.padL;

    // タイトル
    ctx.fillStyle = isJff ? '#fff' : '#0a0a0a';
    ctx.font = FONT_TITLE;
    ctx.fillText(item.displayName, textX, signY + layout.titleY);

    // タグライン (オレンジ・斜体)
    if (layout.taglineY >= 0 && item.tagline) {
      ctx.fillStyle = '#ff8c2a';
      ctx.font = FONT_TAGLINE;
      ctx.fillText(item.tagline, textX, signY + layout.taglineY);
    }

    // メッセージ (太め)
    if (layout.messageY >= 0 && layout.subtitleText) {
      ctx.fillStyle = isJff ? '#ffffff' : '#1a1a1a';
      ctx.font = FONT_MESSAGE;
      ctx.fillText(layout.subtitleText, textX, signY + layout.messageY);
    }
  };

  const drawBillboards = () => {
    for (const b of billboards) {
      if (b.x + b.signW < -10 || b.x > logicalW + 10) continue;
      drawBillboard(b);
    }
  };

  // マイルストーン帯 (画面上部、フェード in/out)
  const drawMilestoneBanner = (now: number) => {
    if (!milestoneBanner) return;
    const elapsed = now - milestoneBanner.spawnAt;
    if (elapsed > TUNING.milestoneBannerDurationMs) {
      milestoneBanner = null;
      return;
    }
    let alpha = 1;
    if (elapsed < TUNING.milestoneBannerFadeMs) {
      alpha = elapsed / TUNING.milestoneBannerFadeMs;
    } else if (elapsed > TUNING.milestoneBannerDurationMs - TUNING.milestoneBannerFadeMs) {
      alpha = (TUNING.milestoneBannerDurationMs - elapsed) / TUNING.milestoneBannerFadeMs;
    }
    const h = TUNING.milestoneBannerHeight;
    const y = 12;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, y, logicalW, h);
    ctx.fillStyle = '#ff8c2a';
    ctx.fillRect(0, y, logicalW, 3);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px "Helvetica Neue", system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(milestoneBanner.text, logicalW / 2, y + h / 2 + 2);
    ctx.textAlign = 'start';
    ctx.restore();
  };

  const draw = (now: number = performance.now()) => {
    ctx.clearRect(0, 0, logicalW, logicalH);
    // コース背景 (セクションの空 + モチーフのパララックス)
    drawCourseScenery();
    // ロードランナー演出 (背景アクター・足場の手前/プレイヤーの背面)
    if (roadRunner) {
      drawRoadRunner(ctx, roadRunner.x, roadRunner.y, now);
    }
    // 沿道看板 (背景と地平線の間に配置)
    drawBillboards();
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
    // マイルストーン帯は最前面 (UIレイヤ)
    drawMilestoneBanner(now);
  };

  // --- API ---

  const start: GameHandle['start'] = (ch, opts) => {
    character = ch;
    score = 0;
    traveled = 0;
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
    milestones = (opts?.milestones ?? []).slice().sort((a, b) => a.distance - b.distance);
    triggeredMilestoneIds.clear();
    milestoneBanner = null;
    roadRunner = null;
    roadRunnerCooldown = 0;
    getBillboard = opts?.getBillboard ?? null;
    initPlatforms();
    initBillboards();
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

// (旧 truncateToWidth は看板の動的幅化で不要になったため削除)
