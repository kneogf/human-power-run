// ゲーム内で使う基本型をまとめたファイル。
// キャラ仕様・ゲーム状態・描画オブジェクトの型を 1 箇所で管理する。

export type CharacterId = 'baby_carriage' | 'runner' | 'bike' | 'rickshaw';

export type GameStatus = 'select' | 'playing' | 'gameover';

/** 背景・地面色のテーマ。後から世界観を増やせるよう列挙にしてある */
export type ThemeId = 'mono' | 'gump' | 'route66';

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
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
