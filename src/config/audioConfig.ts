// BGM / ジングルのトラック定義。
// 差し替えは public/audio/ のファイルを置き換え、ここの src / volume を変えるだけ。
//
// audio.ts (Web Audio で合成する効果音) とは別レイヤー。
// こちらは mp3 の「音楽」を HTMLAudioElement で再生する (audioManager.ts が使う)。

export type AudioTrackKey =
  | 'title'    // タイトル / コース選択画面
  | 'japan'    // 日本縦断コース BGM
  | 'route66'  // Route66横断コース BGM
  | 'africa'   // アフリカ縦断コース BGM
  | 'gameover' // Game Over ジングル (loopしない)
  | 'star';    // 予備トラック (現状未使用 / 将来のスター演出用)

export type AudioTrack = {
  key: AudioTrackKey;
  name: string;
  src: string;
  loop: boolean;
  volume: number;
};

export const AUDIO_TRACKS: Record<AudioTrackKey, AudioTrack> = {
  title: {
    key: 'title',
    name: 'Title Theme',
    src: '/audio/title-theme.mp3',
    loop: true,
    volume: 0.5,
  },
  japan: {
    key: 'japan',
    name: '日本縦断 BGM',
    src: '/audio/japan.mp3',
    loop: true,
    volume: 0.5,
  },
  route66: {
    key: 'route66',
    name: 'Route66横断 BGM',
    src: '/audio/route66.mp3',
    loop: true,
    volume: 0.5,
  },
  africa: {
    key: 'africa',
    name: 'アフリカ縦断 BGM',
    src: '/audio/africa.mp3',
    loop: true,
    volume: 0.5,
  },
  gameover: {
    key: 'gameover',
    name: 'Game Over',
    src: '/audio/game-over.mp3',
    loop: false,
    volume: 0.65,
  },
  star: {
    key: 'star',
    name: 'Star Theme',
    src: '/audio/star.mp3',
    loop: true,
    volume: 0.5,
  },
};

/** Game Over 後に小さく流すタイトルBGMの音量 */
export const TITLE_AFTER_GAMEOVER_VOLUME = 0.3;

/** Game Over時、プレイ中BGMをフェードアウトする時間(ms) */
export const BGM_FADEOUT_MS = 300;
