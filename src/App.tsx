// UI シェル。タイトル / キャラ選択 / スコア / 操作説明 / Canvas を組み立て、
// createGame() を介してゲームエンジンと React 状態を橋渡しする。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setMuted, unlockAudio } from './game/audio';
import {
  playBgm,
  unlockBgm,
  setBgmMuted,
  onGameOverAudioFlow,
} from './lib/audioManager';
import { CHARACTERS } from './game/characters';
import { createGame, type GameHandle } from './game/engine';
import type { CharacterId, CourseId, GameStatus } from './game/types';
import {
  getCourseById,
  getCourseMilestones,
  getGameOverMessage,
} from './lib/courseManager';
import {
  getActiveCampaign,
  getActiveMilestones,
  getGameOverSupporters,
  getRoadsideBoardItem,
} from './lib/adSlotManager';
import { trackEvent, type TrackEventName } from './lib/tracking';
import { SUPPORT_PLANS, type Supporter, type SupporterPlan } from './config/supporterConfig';
import type { MilestoneSponsor } from './config/milestoneConfig';

// プラン → tracking イベント名 のマップ (型安全のため明示)
const SUPPORT_CLICK_EVENT: Record<SupporterPlan, TrackEventName> = {
  tip: 'support_click_tip',
  weekly_message: 'support_click_weekly_message',
  weekly_boost: 'support_click_weekly_boost',
};

const BEST_KEY = 'hpr_best';
const NAME_KEY = 'hpr_name';
const COURSE_KEY = 'hpr_course';
const MUTE_KEY = 'hpr_muted';
// 難度順（易 → 難）で並べる
const CHARACTER_ORDER: CharacterId[] = ['baby_carriage', 'runner', 'bike', 'rickshaw'];
const COURSE_ORDER: CourseId[] = ['japan', 'route66', 'africa'];

const isValidCourseId = (v: string | null): v is CourseId =>
  v === 'japan' || v === 'route66' || v === 'africa';

// localStorage に保存された値を正規化する (旧 'usa' は 'route66' へ移行)。
const normalizeCourseId = (v: string | null): CourseId => {
  if (v === 'usa') return 'route66';
  return isValidCourseId(v) ? v : 'japan';
};

// コース別マイルストーンとスポンサーマイルストーンを統合して engine 形式にする。
const buildMilestones = (courseId: CourseId): MilestoneSponsor[] => {
  const courseMs: MilestoneSponsor[] = getCourseMilestones(courseId).map((m, i) => ({
    id: `course_${courseId}_${i}_${m.distance}`,
    distance: m.distance,
    sponsorName: '',
    message: m.message,
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    isActive: true,
    courseId,
  }));
  // スポンサーマイルストーン: courseId 未指定 or 一致のものだけ採用。
  const sponsorMs = getActiveMilestones().filter(
    (m) => !m.courseId || m.courseId === courseId,
  );
  // 同じ distance が複数あると engine 側で 1フレーム目に片方 → 次フレームで
  // もう片方に上書きされ、先に触った方が「一瞬しか見えない」バグ (Codex 指摘)。
  // コースの旅ナラティブを優先して先勝ちで dedupe する。
  const merged = [...courseMs, ...sponsorMs].sort((a, b) => a.distance - b.distance);
  const seenDistances = new Set<number>();
  const deduped: MilestoneSponsor[] = [];
  for (const m of merged) {
    if (seenDistances.has(m.distance)) continue;
    seenDistances.add(m.distance);
    deduped.push(m);
  }
  return deduped;
};

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
  const [courseId, setCourseId] = useState<CourseId>(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(COURSE_KEY) : null;
    return normalizeCourseId(raw);
  });
  const [stageLabel, setStageLabel] = useState<string>('STAGE 1');
  const [regionName, setRegionName] = useState<string>('');
  const [stageFlash, setStageFlash] = useState<string | null>(null);
  const stageFlashTimer = useRef<number | null>(null);
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

  // --- マネタイズ層 (沿道看板 / マイルストーン / Game Over CTA) ---
  const campaign = useMemo(() => getActiveCampaign(), []);
  const [boostSupporters, setBoostSupporters] = useState<Supporter[]>(() =>
    getGameOverSupporters(),
  );

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
      initialCourse: courseId,
      onScore: (s) => setScore(s),
      onStageChange: (idx, label) => {
        setStageLabel(label);
        // 最初の表示はフラッシュしない（STAGE 1 開始時）
        if (idx > 0) {
          setStageFlash(`${label} UP!`);
          if (stageFlashTimer.current !== null) {
            window.clearTimeout(stageFlashTimer.current);
          }
          stageFlashTimer.current = window.setTimeout(() => {
            setStageFlash(null);
            stageFlashTimer.current = null;
          }, 1600);
        }
      },
      onRegionChange: (name) => setRegionName(name),
      onMilestoneReached: (m) => {
        trackEvent('milestone_impression', {
          id: m.id,
          distance: m.distance,
          message: m.message,
          sponsor: m.sponsorName || undefined,
        });
      },
      onBillboardImpression: (item) => {
        trackEvent('roadside_billboard_impression', {
          id: item.id,
          source: item.source,
          displayName: item.displayName,
        });
      },
      onGameOver: (finalScore) => {
        const floored = Math.floor(finalScore);
        trackEvent('game_over', { score: floored });
        // Game Over音声フロー: プレイ中BGMをフェードアウト → ジングル → タイトルBGM小音量
        void onGameOverAudioFlow();
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

  // コース変更をゲームに反映 + localStorage 保存
  useEffect(() => {
    gameRef.current?.setCourse(courseId);
    try {
      localStorage.setItem(COURSE_KEY, courseId);
    } catch {
      // ignore
    }
  }, [courseId]);

  // ミュート状態を audio モジュール (効果音 + BGM) に反映 + 保存
  useEffect(() => {
    setMuted(muted);
    setBgmMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // ignore
    }
  }, [muted]);

  // 初回ユーザー操作で音声をアンロック (ブラウザの自動再生制限対応)。
  // それまで予約されていた BGM (タイトル曲) がここで鳴り始める。
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      unlockBgm();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // 選択画面ではタイトルBGMを再生 (アンロック前は予約のみ)。
  // playing は beginRun、gameover は onGameOverAudioFlow が担当するのでここでは扱わない。
  useEffect(() => {
    if (status === 'select') playBgm('title');
  }, [status]);

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

  const beginRun = useCallback(
    (source: 'start' | 'retry') => {
      unlockAudio();
      unlockBgm();
      // 選択中コースの BGM に切り替え (Restart時もここを通る)
      playBgm(courseId);
      const ch = CHARACTERS[selected];
      setScore(0);
      setStageLabel('STAGE 1');
      setStageFlash(null);
      setRegionName(getCourseById(courseId).sections[0]?.name ?? '');
      setStatus('playing');
      setSubmitState('idle');
      setSubmitError(null);
      trackEvent(source === 'retry' ? 'retry' : 'play_start', {
        character: selected,
        course: courseId,
      });
      // 最新のサポーター/マイルストーンを反映 (HMR でconfig差し替え時のため)
      setBoostSupporters(getGameOverSupporters());
      gameRef.current?.start(ch, {
        milestones: buildMilestones(courseId),
        getBillboard: getRoadsideBoardItem,
      });
    },
    [selected, courseId],
  );

  const handleStart = useCallback(() => beginRun('start'), [beginRun]);
  const handleRestart = useCallback(() => beginRun('retry'), [beginRun]);

  const handleReset = useCallback(() => {
    gameRef.current?.stop();
    setScore(0);
    setStatus('select');
  }, []);

  // 支援ボタンクリック (外部決済リンクへ遷移 + tracking)
  const openSupportLink = useCallback(
    (plan: SupporterPlan) => {
      const url = campaign.supportLinks[plan];
      trackEvent(SUPPORT_CLICK_EVENT[plan], {
        plan,
        url,
        campaignId: campaign.id,
      });
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    },
    [campaign],
  );

  // キャンペーンCTAクリック (イベントモードの時の主導線)
  const openCampaignCta = useCallback(
    (kind: 'primary' | 'secondary') => {
      const url =
        kind === 'primary'
          ? campaign.gameOverCta.primaryButtonUrl
          : campaign.gameOverCta.secondaryButtonUrl;
      trackEvent('campaign_cta_click', {
        campaignId: campaign.id,
        kind,
        url,
      });
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    },
    [campaign],
  );

  // Game Over CTA表示時に1回 impression を記録
  useEffect(() => {
    if (status === 'gameover') {
      trackEvent('support_cta_impression', {
        campaignId: campaign.id,
        boostCount: boostSupporters.length,
      });
    }
  }, [status, campaign.id, boostSupporters.length]);

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
    const text = `人力走 -JINRIKISOU- を ${charName} で ${dist}m 走破！ #人力走 #JINRIKISOU`;
    const url = 'https://human-power-run.vercel.app';
    const fullText = `${text}\n${url}`;
    type NavigatorWithShare = Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    const nav = navigator as NavigatorWithShare;
    if (typeof nav.share === 'function') {
      nav
        .share({ title: '人力走 -JINRIKISOU-', text, url })
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
          <img
            src="/logo.png"
            alt="人力走 -JINRIKISOU-"
            className="title-logo"
            onError={(e) => {
              // 画像がまだ配置されていない時のフォールバック表示
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'inline-block';
            }}
          />
          <span className="title-fallback">
            人力走 <span className="title-accent">-JINRIKISOU-</span>
          </span>
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
        {status === 'playing' && (
          <div className="hud-row">
            <span className="hud-chip">{regionName}</span>
            <span className="hud-chip hud-chip-stage">{stageLabel}</span>
          </div>
        )}
        {stageFlash && status === 'playing' && (
          <div className="stage-flash">{stageFlash}</div>
        )}

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

            <div className="section-label">COURSE</div>
            <div className="theme-list">
              {COURSE_ORDER.map((id) => {
                const c = getCourseById(id);
                const isOn = courseId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`theme-btn ${isOn ? 'is-on' : ''}`}
                    onClick={() => setCourseId(id)}
                    style={isOn ? { borderColor: c.themeColor } : undefined}
                  >
                    <span className="theme-name">{c.displayName}</span>
                    <span className="theme-tag">{c.description}</span>
                    <span className="theme-spec">
                      全6セクション / 3000m
                    </span>
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
            <div className="result-row">
              <span className="overlay-text">
                Distance: <strong>{Math.floor(score)}m</strong>
              </span>
              <span className="overlay-text">
                Best: <strong>{best}m</strong>
              </span>
            </div>

            {/* ---- コース別の旅メッセージ ---- */}
            <p className="course-gameover-msg">
              {getGameOverMessage(courseId)
                .split('\n')
                .map((line, i) => (
                  <span key={i} className="course-gameover-line">
                    {line}
                  </span>
                ))}
            </p>

            {/* ---- 支援CTA (キャンペーン枠 + 追い風サポーター) ---- */}
            <section className="support-cta">
              <h3 className="support-cta-title">{campaign.gameOverCta.title}</h3>
              <p className="support-cta-desc">{campaign.gameOverCta.description}</p>

              {boostSupporters.length > 0 && (
                <div className="boost-supporters">
                  <span className="boost-supporters-label">今週の追い風サポーター</span>
                  <ul className="boost-supporters-list">
                    {boostSupporters.map((s) => (
                      <li key={s.id}>
                        <span className="boost-name">{s.displayName ?? s.name}</span>
                        {s.message && (
                          <span className="boost-msg">「{s.message}」</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="restart-row">
                <button
                  type="button"
                  className="primary-btn primary-btn-sm"
                  onClick={handleRestart}
                >
                  RESTART
                </button>
              </div>

              {campaign.supportEnabled ? (
                <>
                  {/* 主導線: ¥300 差し入れ + ¥1,500 メッセージ応援 */}
                  <div className="support-row">
                    <button
                      type="button"
                      className="support-btn"
                      onClick={() => openSupportLink('tip')}
                    >
                      <span className="support-btn-label">{SUPPORT_PLANS.tip.label}</span>
                      <span className="support-btn-price">¥{SUPPORT_PLANS.tip.price}〜</span>
                    </button>
                    <button
                      type="button"
                      className="support-btn"
                      onClick={() => openSupportLink('weekly_message')}
                    >
                      <span className="support-btn-label">
                        {SUPPORT_PLANS.weekly_message.label}
                      </span>
                      <span className="support-btn-price">
                        ¥{SUPPORT_PLANS.weekly_message.price}
                      </span>
                    </button>
                  </div>

                  {/* プレミアム: ¥5,000 追い風サポーター (幅広1本、目立たせる) */}
                  <button
                    type="button"
                    className="support-btn support-btn-boost"
                    onClick={() => openSupportLink('weekly_boost')}
                  >
                    <span className="support-btn-label">
                      🔥 {SUPPORT_PLANS.weekly_boost.label}
                    </span>
                    <span className="support-btn-price">
                      ¥{SUPPORT_PLANS.weekly_boost.price}
                    </span>
                  </button>

                  <p className="support-note">
                    掲載ありの応援は、毎週日曜23:59締切・翌週月曜反映です。
                  </p>
                </>
              ) : (
                /* Stripe Payment Link 準備前は「準備中」を表示 */
                <div className="support-comingsoon">
                  <div className="support-comingsoon-badge">COMING SOON</div>
                  <p className="support-comingsoon-title">応援機能は準備中です</p>
                  <p className="support-comingsoon-desc">
                    差し入れ ¥{SUPPORT_PLANS.tip.price}〜 / メッセージ応援 ¥
                    {SUPPORT_PLANS.weekly_message.price} / 追い風サポーター ¥
                    {SUPPORT_PLANS.weekly_boost.price}
                  </p>
                  <p className="support-comingsoon-note">
                    近日、決済リンクを公開します。それまでは走って楽しんでください！
                  </p>
                </div>
              )}

              {/* キャンペーンが eventMode の時だけ専用CTAを足す */}
              {campaign.eventMode && (
                <button
                  type="button"
                  className="ghost-btn campaign-cta-btn"
                  onClick={() => openCampaignCta('primary')}
                >
                  {campaign.gameOverCta.primaryButtonText}
                </button>
              )}
            </section>

            {/* ---- ランキング登録 (任意) ---- */}
            <details className="ranking-section" open>
              <summary className="ranking-summary">🏆 ランキングに登録する</summary>
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
            </details>

            <div className="button-row button-row-sub">
              <button type="button" className="ghost-btn" onClick={handleReset}>
                RESET
              </button>
              <button type="button" className="ghost-btn" onClick={openLeaderboard}>
                🏆 ランキング
              </button>
              <button type="button" className="ghost-btn" onClick={handleShare}>
                𝕏 シェア
              </button>
            </div>
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
        <p className="credit">
          Produced by{' '}
          <a
            href="https://www.instagram.com/justforfun_movie/"
            target="_blank"
            rel="noopener noreferrer"
          >
            JustForFun inc.
          </a>
        </p>
        <p className="legal-links">
          <a href="/legal/tokushoho.html" target="_blank" rel="noopener noreferrer">
            特定商取引法に基づく表記
          </a>
          <span className="legal-sep">/</span>
          <a href="/legal/privacy.html" target="_blank" rel="noopener noreferrer">
            プライバシーポリシー
          </a>
        </p>
      </footer>
    </div>
  );
}

const Overlay = ({ children }: { children: React.ReactNode }) => (
  <div className="overlay">
    <div className="overlay-card">{children}</div>
  </div>
);
