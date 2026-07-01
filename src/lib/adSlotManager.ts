// 沿道看板 / マイルストーン / Game Over CTA のスロット制御。
//
// 個人応援と法人スポンサーは内部では同じプールで重み付き抽選するが、
// 表示時に source で区別して見た目を変える設計。
// JFF告知 (type='jff') は一定確率で必ず混ぜる (賑やかさ & 自社告知を絶やさないため)。

import {
  SUPPORTERS,
  type Supporter,
} from '../config/supporterConfig';
import {
  SPONSORS,
  type Sponsor,
  type SponsorSlot,
} from '../config/sponsorConfig';
import {
  MILESTONES,
  type MilestoneSponsor,
} from '../config/milestoneConfig';
import {
  CAMPAIGNS,
  type Campaign,
} from '../config/campaignConfig';

/** 沿道看板に出す統一アイテム形式 */
export type BillboardItem = {
  id: string;
  source: 'supporter' | 'corporate' | 'jff' | 'event';
  displayName: string;
  /** タイトル下のサブコピー (英文タグライン想定) */
  tagline?: string;
  message?: string;
  linkUrl?: string;
  weight: number;
};

/** JFF告知を強制的に出す確率 (1.0で常に、0で抽選任せ) */
const JFF_FORCE_RATE = 0.22;

// 日付判定のタイムゾーン。JFFは日本運用なので JST 固定 (Codex指摘: toISOString だと
// JSTの深夜0〜9時の間だけUTCの前日日付が返り、締切/開始の判定がズレる)。
const BUSINESS_TIMEZONE = 'Asia/Tokyo';
// 'en-CA' ロケールは YYYY-MM-DD で返るので startDate/endDate の '2026-05-24' 形式と直接比較できる。
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
});

const todayISO = () => DATE_FORMATTER.format(new Date());

// ---- 期間/有効フィルタ ----

export function isWithinDateRange(item: { startDate?: string; endDate?: string }): boolean {
  const today = todayISO();
  if (item.startDate && today < item.startDate) return false;
  if (item.endDate && today > item.endDate) return false;
  return true;
}

// ---- 取得系 ----

export function getActiveSupporters(): Supporter[] {
  return SUPPORTERS.filter((s) => s.isActive && isWithinDateRange(s));
}

export function getActiveSponsors(slot?: SponsorSlot): Sponsor[] {
  return SPONSORS.filter(
    (s) => s.isActive && isWithinDateRange(s) && (!slot || s.slot === slot),
  );
}

export function getActiveCampaign(): Campaign {
  // default 以外で先にヒットしたものを優先。default は常時 isActive=true で残っている
  // 前提なので、素朴に find() すると必ず default に当たってしまい event キャンペーンに
  // 切り替わらないバグを避ける (Codex 指摘)。
  const priority = CAMPAIGNS.find(
    (c) => c.isActive && c.theme !== 'default' && isWithinDateRange(c),
  );
  if (priority) return priority;
  const found = CAMPAIGNS.find((c) => c.isActive && isWithinDateRange(c));
  return found ?? CAMPAIGNS[0]; // 万一誰もactiveじゃなくても default にフォールバック
}

export function getActiveMilestones(): MilestoneSponsor[] {
  return MILESTONES.filter((m) => m.isActive && isWithinDateRange(m)).sort(
    (a, b) => a.distance - b.distance,
  );
}

export function getMilestoneSponsor(distance: number): MilestoneSponsor | null {
  return getActiveMilestones().find((m) => m.distance === distance) ?? null;
}

// ---- 抽選 ----

/** 重み付きランダム抽選 (weight<=0 は除外) */
export function getWeightedRandomItem<T extends { weight: number }>(items: T[]): T | null {
  const pool = items.filter((x) => x.weight > 0);
  if (pool.length === 0) return null;
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
}

export function shouldShowJffBoard(): boolean {
  return Math.random() < JFF_FORCE_RATE;
}

// ---- 看板アイテム化 ----

function supporterToBillboard(s: Supporter): BillboardItem {
  // weekly_boost は priority 的に重み増し
  const boostMultiplier = s.planName === 'weekly_boost' ? 1.6 : 1.0;
  return {
    id: s.id,
    source: 'supporter',
    displayName: s.displayName ?? s.name,
    message: s.message,
    weight: s.weight * boostMultiplier,
  };
}

function sponsorToBillboard(s: Sponsor): BillboardItem {
  // priority が高いほど weight も底上げされる
  const source: BillboardItem['source'] =
    s.type === 'corporate' ? 'corporate' : s.type === 'jff' ? 'jff' : 'event';
  return {
    id: s.id,
    source,
    displayName: s.displayName,
    tagline: s.tagline,
    message: s.message,
    linkUrl: s.linkUrl,
    weight: s.weight * (1 + s.priority / 100),
  };
}

/** 沿道看板の次の1枚を返す。アクティブな全プールから重み付き抽選。 */
export function getRoadsideBoardItem(): BillboardItem | null {
  const allSponsors = getActiveSponsors('roadside');
  const jffPool = allSponsors.filter((s) => s.type === 'jff');
  const otherSponsors = allSponsors.filter((s) => s.type !== 'jff');
  const supporters = getActiveSupporters().filter((s) => s.showOnRoadside);

  // JFF強制枠: 一定確率でjff限定プールから抽選 (法人が増えてもJFFが消えないように)
  if (jffPool.length > 0 && shouldShowJffBoard()) {
    const pick = getWeightedRandomItem(jffPool);
    if (pick) return sponsorToBillboard(pick);
  }

  // 通常: jff + 法人 + イベント + 個人応援(掲載ありのみ) を全部混ぜて重み付き抽選。
  // ※ 以前は jff を除外していたため、他プールが空のとき jffPool[0] (常にRESTART) に
  //   フォールバックし続けるバグがあった。今は混ぜることで均等に出る。
  const allPool: BillboardItem[] = [
    ...jffPool.map(sponsorToBillboard),
    ...otherSponsors.map(sponsorToBillboard),
    ...supporters.map(supporterToBillboard),
  ];
  return getWeightedRandomItem(allPool);
}

/** Game Over画面に並べる追い風サポーター (最大3名) */
export function getGameOverSupporters(): Supporter[] {
  return getActiveSupporters()
    .filter((s) => s.showOnGameOver && s.planName === 'weekly_boost')
    .slice(0, 3);
}
