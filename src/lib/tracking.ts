// 計測イベントを localStorage に積むだけのシンプルな実装。
// 将来 Supabase / GA4 / 自前API に送る時は trackEvent 内で分岐すればOK。
//
// 確認方法:
//   ブラウザの DevTools コンソールで:
//     window.__hprEvents()         // 全イベント配列
//     window.__hprClearEvents()    // 全削除

const STORAGE_KEY = 'hpr_events';
const MAX_EVENTS = 500;

export type TrackEventName =
  | 'play_start'
  | 'game_over'
  | 'retry'
  | 'roadside_billboard_impression'
  | 'milestone_impression'
  | 'support_cta_impression'
  | 'sponsor_click'
  | 'support_click_tip'
  | 'support_click_weekly_name'
  | 'support_click_weekly_message'
  | 'support_click_weekly_boost'
  | 'campaign_cta_click'
  | 'gameover_jingle_start'
  | 'gameover_jingle_end';

export type TrackedEvent = {
  eventName: TrackEventName;
  timestamp: string;
  payload?: Record<string, unknown>;
};

export function trackEvent(
  eventName: TrackEventName,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  const evt: TrackedEvent = {
    eventName,
    timestamp: new Date().toISOString(),
    payload,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: TrackedEvent[] = raw ? JSON.parse(raw) : [];
    arr.push(evt);
    const trimmed = arr.length > MAX_EVENTS ? arr.slice(-MAX_EVENTS) : arr;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // private window / quota exceeded — 静かに無視
  }
  // ↓将来Supabase/GA4等に送る時はここに足す
  // dispatchToRemote(evt);
}

export function getStoredEvents(): TrackedEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrackedEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearStoredEvents(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// DevTools から覗ける窓口
if (typeof window !== 'undefined') {
  type W = Window & {
    __hprEvents?: () => TrackedEvent[];
    __hprClearEvents?: () => void;
  };
  const w = window as W;
  w.__hprEvents = getStoredEvents;
  w.__hprClearEvents = clearStoredEvents;
}
