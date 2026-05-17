// Web Audio API でゲームSEを合成する小さなヘルパー。
// 外部mp3/wavに依存しないので軽い。
// 初回のユーザー入力で AudioContext を resume する必要があるブラウザ用に
// unlock() を提供する（App側でジャンプ/Start時に呼ぶ）。

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

const ensureCtx = () => {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const W = window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioCtor = window.AudioContext || W.webkitAudioContext;
    if (!AudioCtor) return null;
    ctx = new AudioCtor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(ctx.destination);
  } catch {
    return null;
  }
  return ctx;
};

/** ユーザー入力時に呼ぶ。iOS Safari など resume が要る環境向け */
export const unlockAudio = () => {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    c.resume().catch(() => {
      // ignore
    });
  }
};

/** 全SEのミュート切替 */
export const setMuted = (next: boolean) => {
  muted = next;
};

export const isMuted = () => muted;

// 簡易な「短い音」を鳴らすヘルパー。波形と周波数曲線を渡す。
type Tone = {
  type?: OscillatorType;
  freqStart: number;
  freqEnd: number;
  duration: number; // 秒
  volume?: number; // 0..1
};

const playTone = (tone: Tone) => {
  if (muted) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = tone.type ?? 'square';
  osc.frequency.setValueAtTime(tone.freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(tone.freqEnd, 0.0001),
    now + tone.duration,
  );
  // 短いエンベロープでクリック音を避ける
  const vol = tone.volume ?? 0.6;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + tone.duration + 0.02);
};

// ---- 各SE ----------------------------------------------------------------

export const playJump = () => {
  playTone({
    type: 'square',
    freqStart: 220,
    freqEnd: 520,
    duration: 0.14,
    volume: 0.4,
  });
};

export const playCoin = () => {
  // 2音重ねでベル風に
  playTone({
    type: 'triangle',
    freqStart: 880,
    freqEnd: 1320,
    duration: 0.12,
    volume: 0.5,
  });
  setTimeout(() => {
    playTone({
      type: 'triangle',
      freqStart: 1320,
      freqEnd: 1760,
      duration: 0.12,
      volume: 0.35,
    });
  }, 50);
};

export const playGameOver = () => {
  // 下降アルペジオ
  const notes = [440, 330, 220, 165];
  notes.forEach((f, i) => {
    setTimeout(() => {
      playTone({
        type: 'sawtooth',
        freqStart: f,
        freqEnd: f * 0.5,
        duration: 0.22,
        volume: 0.45,
      });
    }, i * 110);
  });
};

export const playCoinSimple = playCoin;
