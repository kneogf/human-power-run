// HTMLAudioElement ベースの BGM / ジングル管理。
// audio.ts (Web Audio の効果音) とは別レイヤーで、mp3 の音楽を担当する。
//
// 自動再生制限への対応:
//   ブラウザは初回ユーザー操作まで音を再生できない。
//   それまでの playBgm() は「予約 (pendingKey)」だけして、unlockBgm() で実再生する。
//
// Game Over フロー (onGameOverAudioFlow):
//   プレイ中BGMを 0.3秒フェードアウト → Game Overジングル → 終了後タイトルBGMを小音量で。
//   ミュート時は一切鳴らさない。

import {
  AUDIO_TRACKS,
  BGM_FADEOUT_MS,
  TITLE_AFTER_GAMEOVER_VOLUME,
  type AudioTrackKey,
} from '../config/audioConfig';
import { trackEvent } from './tracking';

let muted = false;
let unlocked = false;
let currentKey: AudioTrackKey | null = null;
let pendingKey: AudioTrackKey | null = null;
let pendingVolume: number | undefined;
let fadeTimer: number | null = null;
// Game Overフロー(非同期)の世代トークン。新しいBGM再生が走ると無効化される。
let flowToken = 0;
// 進行中の Game Over ジングルを中断するためのクリーンアップ (Codex 指摘):
// Restart で startTrack が走るとジングルを pause だけしていたので、'ended' リスナが
// リークして次回 Game Over 時に古いリスナも発火し gameover_jingle_end が二重計測されていた。
// startTrack / stopBgm / setBgmMuted(true) から明示的に呼び出す。
let activeJingleCleanup: (() => void) | null = null;

const elements = new Map<AudioTrackKey, HTMLAudioElement>();

const getEl = (key: AudioTrackKey): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null;
  let el = elements.get(key);
  if (!el) {
    const t = AUDIO_TRACKS[key];
    el = new Audio(t.src);
    el.loop = t.loop;
    el.preload = 'auto';
    el.volume = t.volume;
    elements.set(key, el);
  }
  return el;
};

const clearFade = () => {
  if (fadeTimer !== null) {
    window.clearInterval(fadeTimer);
    fadeTimer = null;
  }
};

const stopOthers = (keep: AudioTrackKey | null) => {
  elements.forEach((el, k) => {
    if (k !== keep && !el.paused) {
      el.pause();
      el.currentTime = 0;
    }
  });
};

// 実際にトラックを鳴らす (unlock済み・非ミュート前提)
const startTrack = (key: AudioTrackKey, volume?: number) => {
  const el = getEl(key);
  if (!el) return;
  clearFade();
  // 別トラックに切り替える時はジングルのリスナを解放する
  if (key !== 'gameover' && activeJingleCleanup) {
    const cleanup = activeJingleCleanup;
    activeJingleCleanup = null;
    cleanup();
  }
  stopOthers(key);
  el.volume = volume ?? AUDIO_TRACKS[key].volume;
  // 別トラックへ切替 or 再生し終わっていたら頭から
  if (currentKey !== key || el.ended) el.currentTime = 0;
  el.play().catch(() => {
    // 自動再生ブロック等 — 無視
  });
  currentKey = key;
};

/** ループBGMを再生 (title / japan / route66 / africa / star)。未unlockなら予約のみ。 */
export const playBgm = (key: AudioTrackKey, volume?: number) => {
  flowToken++; // 進行中の Game Over フローを無効化
  pendingKey = key;
  pendingVolume = volume;
  if (muted || !unlocked) return;
  startTrack(key, volume);
};

/** 全BGMを停止。 */
export const stopBgm = () => {
  flowToken++;
  clearFade();
  if (activeJingleCleanup) {
    const cleanup = activeJingleCleanup;
    activeJingleCleanup = null;
    cleanup();
  }
  stopOthers(null);
  currentKey = null;
  pendingKey = null;
  pendingVolume = undefined;
};

/** 初回ユーザー操作で呼ぶ。予約していたBGMを実際に再生開始する。 */
export const unlockBgm = () => {
  if (unlocked) return;
  unlocked = true;
  if (!muted && pendingKey) startTrack(pendingKey, pendingVolume);
};

/** BGMミュート切替。localStorage の hpr_muted と同期して呼ぶ。 */
export const setBgmMuted = (next: boolean) => {
  muted = next;
  if (muted) {
    // ミュートで無音停止する時もジングルリスナは解放する
    if (activeJingleCleanup) {
      const cleanup = activeJingleCleanup;
      activeJingleCleanup = null;
      cleanup();
    }
    elements.forEach((el) => el.pause());
  } else if (unlocked && pendingKey) {
    startTrack(pendingKey, pendingVolume);
  }
};

/** 現在のBGMを durationMs かけてフェードアウトして停止する。 */
export const fadeOutCurrentBgm = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    const el = currentKey ? elements.get(currentKey) ?? null : null;
    if (!el || el.paused) {
      resolve();
      return;
    }
    clearFade();
    const startVol = el.volume;
    const steps = 12;
    let i = 0;
    fadeTimer = window.setInterval(() => {
      i++;
      el.volume = Math.max(0, startVol * (1 - i / steps));
      if (i >= steps) {
        clearFade();
        el.pause();
        el.volume = startVol; // 次回のために音量を戻す
        resolve();
      }
    }, Math.max(16, durationMs / steps));
  });
};

/** Game Over ジングルを再生 (loopしない)。再生終了 or 中断で解決する。 */
export const playGameOverJingle = (): Promise<void> => {
  return new Promise((resolve) => {
    if (muted || !unlocked) {
      resolve();
      return;
    }
    const el = getEl('gameover');
    if (!el) {
      resolve();
      return;
    }
    // 前回のジングルがまだ生きていたら先に始末する (防御的)
    if (activeJingleCleanup) {
      const prev = activeJingleCleanup;
      activeJingleCleanup = null;
      prev();
    }
    clearFade();
    stopOthers('gameover');
    el.volume = AUDIO_TRACKS.gameover.volume;
    el.currentTime = 0;
    currentKey = 'gameover';

    let done = false;
    // 中断時 (Restart / stopBgm / ミュート) と正常終了の両方から共通で呼ぶ後処理
    const finish = (reason: 'ended' | 'aborted') => {
      if (done) return;
      done = true;
      el.removeEventListener('ended', onEnded);
      if (activeJingleCleanup === abort) activeJingleCleanup = null;
      if (reason === 'ended') trackEvent('gameover_jingle_end');
      resolve();
    };
    const onEnded = () => finish('ended');
    const abort = () => finish('aborted');

    activeJingleCleanup = abort;
    el.addEventListener('ended', onEnded);
    trackEvent('gameover_jingle_start');
    el.play().catch(() => finish('aborted'));
  });
};

/** Game Over 後、タイトルBGMを小音量で再開する。ミュート中は「予約」だけ更新する。 */
export const playTitleBgmLowVolumeAfterGameOver = () => {
  // Codex 指摘: mute 中でも startTrack を呼んでしまい音が漏れていた。
  // pendingKey は常に更新して、unmute 時に正しいBGMが再開されるようにする。
  pendingKey = 'title';
  pendingVolume = TITLE_AFTER_GAMEOVER_VOLUME;
  if (muted || !unlocked) return;
  startTrack('title', TITLE_AFTER_GAMEOVER_VOLUME);
};

/**
 * Game Over時の音声フロー:
 *   プレイ中BGMをフェードアウト → Game Overジングル → 終了後タイトルBGMを小音量で。
 * ミュート(BGM OFF)時は何も鳴らさない。
 * 途中で別BGM (Restart等) が始まったら以降の処理を中断する。
 */
export const onGameOverAudioFlow = async (): Promise<void> => {
  if (muted) return;
  const token = ++flowToken;
  await fadeOutCurrentBgm(BGM_FADEOUT_MS);
  // Codex 指摘: await の途中で mute された場合、abort による resolve は
  // flowToken を変えないので token 比較だけでは通過してしまい音が漏れる。
  // 毎 await 後に muted も再確認する。
  if (muted || token !== flowToken) return;
  await playGameOverJingle();
  if (muted || token !== flowToken) return;
  playTitleBgmLowVolumeAfterGameOver();
};
