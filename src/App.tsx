// UI シェル。タイトル / キャラ選択 / スコア / 操作説明 / Canvas を組み立て、
// createGame() を介してゲームエンジンと React 状態を橋渡しする。

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHARACTERS } from './game/characters';
import { createGame, type GameHandle } from './game/engine';
import type { CharacterId, GameStatus } from './game/types';

const BEST_KEY = 'hpr_best';
const CHARACTER_ORDER: CharacterId[] = ['runner', 'bike', 'rickshaw'];

export function App() {
  const [status, setStatus] = useState<GameStatus>('select');
  const [selected, setSelected] = useState<CharacterId>('runner');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(BEST_KEY) : null;
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? Math.floor(n) : 0;
  });

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
    const ch = CHARACTERS[selected];
    setScore(0);
    setStatus('playing');
    gameRef.current?.start(ch);
  }, [selected]);

  const handleRestart = useCallback(() => {
    const ch = CHARACTERS[selected];
    setScore(0);
    setStatus('playing');
    gameRef.current?.start(ch);
  }, [selected]);

  const handleReset = useCallback(() => {
    gameRef.current?.stop();
    setScore(0);
    setStatus('select');
  }, []);

  // タップ/クリックでジャンプ
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (status === 'playing') {
      e.preventDefault();
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
            <button type="button" className="primary-btn" onClick={handleStart}>
              START
            </button>
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
            <div className="button-row">
              <button type="button" className="primary-btn" onClick={handleRestart}>
                RESTART
              </button>
              <button type="button" className="ghost-btn" onClick={handleReset}>
                RESET
              </button>
            </div>
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
