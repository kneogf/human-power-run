// UI シェル。タイトル / キャラ選択 / スコア / 操作説明 / Canvas を組み立て、
// createGame() を介してゲームエンジンと React 状態を橋渡しする。

import { useCallback, useEffect, useRef, useState } from 'react';
import { setMuted, unlockAudio } from './game/audio';
import { CHARACTERS } from './game/characters';
import { createGame, type GameHandle } from './game/engine';
import { THEMES } from './game/themes';
import type { CharacterId, GameStatus, ThemeId } from './game/types';

const BEST_KEY = 'hpr_best';
const NAME_KEY = 'hpr_name';
const THEME_KEY = 'hpr_theme';
const MUTE_KEY = 'hpr_muted';
// 難度順（易 → 難）で並べる
const CHARACTER_ORDER: CharacterId[] = ['baby_carriage', 'runner', 'bike', 'rickshaw'];
const THEME_ORDER: ThemeId[] = ['mono', 'gump', 'route66'];

const isValidThemeId = (v: string | null): v is ThemeId =>
  v === 'mono' || v === 'gump' || v === 'route66';

// リーダーボードAPIのレスポンス型
interface ScoreEntry {
  name: string;
  character: string;
  score: number;
  ts: number;
}

const fetchLeaderboard = async (): Promise<ScoreEntry[]> => {
  const res = await fetch('/api/scores', { method: 'GET' });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.top) ? (data.top as ScoreEntry[]) : [];
};

const submitScore = async (
  name: string,
  character: CharacterId,
  score: number,
): Promise<ScoreEntry[]> => {
  const res = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, character, score }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error ?? `submit failed: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.top) ? (data.top as ScoreEntry[]) : [];
};

export function App() {
  const [status, setStatus] = useState<GameStatus>('select');
  const [selected, setSelected] = useState<CharacterId>('baby_carriage');
  const [theme, setTheme] = useState<ThemeId>(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    return isValidThemeId(raw) ? raw : 'mono';
  });
  const [muted, setMutedState] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
  });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(BEST_KEY) : null;
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? Math.floor(n) : 0;
  });

  // --- リーダーボード関連 ---
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(NAME_KEY) ?? '' : '';
  });
  const [submitState, setSubmitState] = useState<
    'idle' | 'submitting' | 'submitted' | 'error'
  >('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const statusRef = useRef<GameStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ゲームエンジンの生成 / 破棄
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createGame(canvas, {
      initialTheme: theme,
      onScore: (s) => setScore(s),
      onGameOver: (finalScore) => {
        const floored = Math.floor(finalScore);
        setStatus('gameover');
        setBest((prev) => {
          if (floored > prev) {
            try {
              localStorage.setItem(BEST_KEY, String(floored));
            } catch {
              // ignore: localStorage 不可な環境（プライベートブラウズ等）
            }
            return floored;
          }
          return prev;
        });
      },
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // テーマ変更をゲームに反映 + localStorage 保存
  useEffect(() => {
    gameRef.current?.setTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // ミュート状態を audio モジュールに反映 + 保存
  useEffect(() => {
    setMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // ignore
    }
  }, [muted]);

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => !prev);
  }, []);

  // 入力（キーボード）
  useEffect(() => {
    const isJumpKey = (e: KeyboardEvent) =>
      e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
    const onKeyDown = (e: KeyboardEvent) => {
      if (isJumpKey(e)) {
        e.preventDefault();
        if (statusRef.current === 'playing') gameRef.current?.jump();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        gameRef.current?.setLateral(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        gameRef.current?.setLateral(1);
      } else if (e.code === 'Enter') {
        if (statusRef.current === 'select') handleStart();
        else if (statusRef.current === 'gameover') handleRestart();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'KeyA' ||
        e.code === 'KeyD'
      ) {
        gameRef.current?.setLateral(0);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(() => {
    unlockAudio();
    const ch = CHARACTERS[selected];
    setScore(0);
    setStatus('playing');
    setSubmitState('idle');
    setSubmitError(null);
    gameRef.current?.start(ch);
  }, [selected]);

  const handleRestart = useCallback(() => {
    unlockAudio();
    const ch = CHARACTERS[selected];
    setScore(0);
    setStatus('playing');
    setSubmitState('idle');
    setSubmitError(null);
    gameRef.current?.start(ch);
  }, [selected]);

  const handleReset = useCallback(() => {
    gameRef.current?.stop();
    setScore(0);
    setStatus('select');
  }, []);

  // リーダーボードを開く（取得） & 閉じる
  const openLeaderboard = useCallback(async () => {
    setLeaderboardOpen(true);
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const top = await fetchLeaderboard();
      setLeaderboard(top);
    } catch (err) {
      console.error(err);
      setLeaderboardError('リーダーボードの取得に失敗しました');
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const closeLeaderboard = useCallback(() => {
    setLeaderboardOpen(false);
  }, []);

  // スコア投稿
  const handleSubmitScore = useCallback(async () => {
    const name = playerName.trim();
    if (!name) {
      setSubmitState('error');
      setSubmitError('名前を入力してください');
      return;
    }
    setSubmitState('submitting');
    setSubmitError(null);
    try {
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch {
        // ignore
      }
      const top = await submitScore(name, selected, Math.floor(score));
      setLeaderboard(top);
      setSubmitState('submitted');
    } catch (err) {
      console.error(err);
      setSubmitState('error');
      setSubmitError(err instanceof Error ? err.message : '送信に失敗しました');
    }
  }, [playerName, selected, score]);

  // X (Twitter) シェア。Web Share API が使えるならそちら、無ければ Intent URL。
  const handleShare = useCallback(() => {
    const dist = Math.floor(score);
    const charName = CHARACTERS[selected].name;
    const text = `HUMAN POWER RUN を ${charName} で ${dist}m 走破！ #HumanPowerRun`;
    const url = 'https://human-power-run.vercel.app';
    const fullText = `${text}\n${url}`;
    type NavigatorWithShare = Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    const nav = navigator as NavigatorWithShare;
    if (typeof nav.share === 'function') {
      nav
        .share({ title: 'HUMAN POWER RUN', text, url })
        .catch(() => {
          // ユーザーがキャンセル等 — 無視
        });
    } else {
      // X (Twitter) の投稿画面を開く
      const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
      window.open(intent, '_blank', 'noopener,noreferrer');
    }
  }, [score, selected]);

  // タップ/クリックでジャンプ
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (status === 'playing') {
      e.preventDefault();
      unlockAudio();
      gameRef.current?.jump();
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="title">
          HUMAN <span className="title-accent">POWER</span> RUN
        </h1>
        <div className="scoreboard">
          <div className="score-cell">
            <span className="score-label">Distance</span>
            <span className="score-value">{Math.floor(score)}m</span>
          </div>
          <div className="score-cell">
            <span className="score-label">Best</span>
            <span className="score-value">{best}m</span>
          </div>
          <button
            type="button"
            className="mute-btn"
            onClick={toggleMuted}
            aria-label={muted ? '音をオンにする' : '音をミュートする'}
            title={muted ? '音をオンにする' : '音をミュートする'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      <main className="stage">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          onPointerDown={onCanvasPointerDown}
        />

        {status === 'select' && (
          <Overlay>
            <h2 className="overlay-title">CHOOSE YOUR POWER</h2>
            <div className="character-list">
              {CHARACTER_ORDER.map((id) => {
                const ch = CHARACTERS[id];
                const isOn = selected === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`character-btn ${isOn ? 'is-on' : ''}`}
                    onClick={() => setSelected(id)}
                  >
                    <span className="character-name">{ch.name}</span>
                    <span className="character-tag">{ch.tagline}</span>
                    <span className="character-spec">
                      Jump×{ch.maxJumps} / Speed {ch.speed}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="section-label">WORLD</div>
            <div className="theme-list">
              {THEME_ORDER.map((id) => {
                const t = THEMES[id];
                const isOn = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`theme-btn ${isOn ? 'is-on' : ''}`}
                    onClick={() => setTheme(id)}
                  >
                    <span className="theme-name">{t.name}</span>
                    <span className="theme-tag">{t.tagline}</span>
                  </button>
                );
              })}
            </div>

            <div className="button-row">
              <button type="button" className="primary-btn" onClick={handleStart}>
                START
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={openLeaderboard}
              >
                🏆 ランキング
              </button>
            </div>
          </Overlay>
        )}

        {status === 'gameover' && (
          <Overlay>
            <h2 className="overlay-title">GAME OVER</h2>
            <p className="overlay-text">
              Distance: <strong>{Math.floor(score)}m</strong>
            </p>
            <p className="overlay-text">
              Best: <strong>{best}m</strong>
            </p>

            <div className="leaderboard-submit">
              {submitState === 'submitted' ? (
                <p className="overlay-text">✅ ランキングに登録しました！</p>
              ) : (
                <>
                  <input
                    type="text"
                    className="name-input"
                    placeholder="名前 (1〜20文字)"
                    maxLength={20}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={submitState === 'submitting'}
                  />
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSubmitScore}
                    disabled={submitState === 'submitting' || !playerName.trim()}
                  >
                    {submitState === 'submitting' ? '送信中…' : 'ランキングに登録'}
                  </button>
                </>
              )}
              {submitError && submitState === 'error' && (
                <p className="error-text">{submitError}</p>
              )}
            </div>

            <div className="button-row">
              <button type="button" className="primary-btn" onClick={handleRestart}>
                RESTART
              </button>
              <button type="button" className="ghost-btn" onClick={handleReset}>
                RESET
              </button>
              <button type="button" className="ghost-btn" onClick={openLeaderboard}>
                🏆 ランキング
              </button>
            </div>
            <button type="button" className="share-btn" onClick={handleShare}>
              𝕏 で結果をシェア
            </button>
          </Overlay>
        )}

        {leaderboardOpen && (
          <Overlay>
            <h2 className="overlay-title">🏆 LEADERBOARD</h2>
            {leaderboardLoading && <p className="overlay-text">読み込み中…</p>}
            {leaderboardError && <p className="error-text">{leaderboardError}</p>}
            {!leaderboardLoading && !leaderboardError && (
              <div className="leaderboard-table">
                {leaderboard.length === 0 ? (
                  <p className="overlay-text">まだ誰も登録していません。一番乗りしよう。</p>
                ) : (
                  <ol className="leaderboard-list">
                    {leaderboard.map((entry, i) => {
                      const isValidChar = entry.character in CHARACTERS;
                      const charLabel = isValidChar
                        ? CHARACTERS[entry.character as CharacterId].name
                        : entry.character;
                      return (
                        <li key={`${entry.ts}-${i}`} className="leaderboard-row">
                          <span className="rank">{i + 1}</span>
                          <span className="player-name">{entry.name}</span>
                          <span className="player-char">{charLabel}</span>
                          <span className="player-score">{entry.score}m</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            )}
            <button type="button" className="primary-btn" onClick={closeLeaderboard}>
              閉じる
            </button>
          </Overlay>
        )}
      </main>

      <footer className="controls">
        <div className="controls-row">
          <span>
            <kbd>Tap</kbd> / <kbd>Space</kbd> / <kbd>↑</kbd> でジャンプ
          </span>
          <span>
            <kbd>←</kbd> <kbd>→</kbd> で左右に微調整 (PC)
          </span>
        </div>
        <p className="tagline">人力のみで走り抜けろ — どこまで進めるかが勝負。</p>
      </footer>
    </div>
  );
}

const Overlay = ({ children }: { children: React.ReactNode }) => (
  <div className="overlay">
    <div className="overlay-card">{children}</div>
  </div>
);
