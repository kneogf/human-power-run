// ゲーム内で使う基本型をまとめたファイル。
// キャラ仕様・ゲーム状態・描画オブジェクトの型を 1 箇所で管理する。

export type CharacterId = 'baby_carriage' | 'runner' | 'bike' | 'rickshaw';

export type GameStatus = 'select' | 'playing' | 'gameover';

/**
 * 旧 ThemeId は Course に置き換え。
 * 後方互換のためエイリアスとして残しているがUIからは使わない。
 */
export type ThemeId = CourseId;

/** プレイ可能なコース */
export type CourseId = 'japan' | 'usa' | 'africa';

/** 各地域に置く装飾の識別子 */
export type DecorationId =
  // 日本
  | 'okinawa_beach'
  | 'fuji_sakura'
  | 'tohoku_forest'
  | 'hokkaido_snow'
  // アメリカ
  | 'ny_skyline'
  | 'route66_desert'
  | 'monument_valley'
  | 'gump_runner'
  | 'santa_monica_pier'
  // アフリカ
  | 'savanna_acacia'
  | 'animal_elephant'
  | 'animal_giraffe'
  | 'animal_zebra'
  | 'tribal_figure'
  | 'african_beach';

/**
 * 距離(m)で区切られた地域。
 * Course.regions は startDistance の昇順に並んでいる前提。
 */
export interface Region {
  startDistance: number;
  name: string;
  decorations: DecorationId[];
  /** 地面の色をこの地域だけ上書きしたい場合 */
  groundFill?: string;
  groundStroke?: string;
}

/** コース定義（コースごとに難易度と地域シーケンス） */
export interface Course {
  id: CourseId;
  name: string;
  tagline: string;
  /** 1=易, 2=中, 3=難。UI表示用 */
  difficulty: 1 | 2 | 3;
  /** speed と gap を一律にスケールする倍率 */
  speedMultiplier: number;
  gapMultiplier: number;
  /** 距離に応じて切り替わる地域 */
  regions: Region[];
}

export interface Character {
  id: CharacterId;
  name: string;
  /** 選択画面で見せる一言（軽い・標準・重い など） */
  tagline: string;
  speed: number;
  /** ジャンプの初速。Canvas 座標系なので負の値が上方向 */
  jumpPower: number;
  gravity: number;
  maxJumps: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  jumpsLeft: number;
  onGround: boolean;
  /** 走り・車輪回転アニメ用の位相 */
  animPhase: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Coin {
  x: number;
  y: number;
  r: number;
  collected: boolean;
  phase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
