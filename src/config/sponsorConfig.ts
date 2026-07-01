// 法人スポンサー / JFF告知 / イベント告知の管理。
//
// 運用:
//   - type=corporate: 法人スポンサー (沿道ミニ看板 ¥30,000/月 〜 沿道パートナー ¥100,000/月 想定)
//   - type=jff: JFF自社告知 (RESTART上映会・MIDPOINT FESTAなど)
//   - type=event: イベント告知 (短期間の優先表示)
//   - slot で出る場所が決まる
//   - weight = 表示頻度、priority = 優先度 (高いほど採用されやすい)

export type SponsorType = 'corporate' | 'jff' | 'event';
export type SponsorSlot =
  | 'roadside'    // 沿道看板（ゲーム中、背景）
  | 'gameover'    // Game Over画面
  | 'milestone'   // マイルストーン帯（milestoneConfig.ts と併用可）
  | 'vehicle'     // 将来: 自転車/人力車/衣装
  | 'stage';      // 将来: ステージ全体

export type Sponsor = {
  id: string;
  name: string;
  type: SponsorType;
  slot: SponsorSlot;
  displayName: string;
  /** 看板の中段に小さく出るタグライン (英文サブコピー想定) */
  tagline?: string;
  message?: string;
  logoUrl?: string;
  linkUrl?: string;
  startDate: string;
  endDate: string;
  weight: number;
  priority: number;
  isActive: boolean;
};

export const SPONSORS: Sponsor[] = [
  // ---- 現在 ACTIVE: RESTART のみ ----
  {
    id: 'jff_restart',
    name: 'RESTART',
    type: 'jff',
    slot: 'roadside',
    displayName: 'RESTART',
    tagline: 'One Life, One Chance',
    message: '映画上映の旅 開催中！',
    linkUrl: 'https://justforfun.example.com/restart',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    weight: 20,
    priority: 80,
    isActive: true,
  },

  // ---- 一旦停止 (再開する時は isActive: true に戻す) ----
  {
    id: 'spn_merrell',
    name: 'MERRELL',
    type: 'corporate',
    slot: 'roadside',
    displayName: 'MERRELL',
    message: '人力の旅をサポート',
    linkUrl: 'https://www.merrell.com/',
    startDate: '2026-05-01',
    endDate: '2026-08-31',
    weight: 15,
    priority: 80,
    isActive: false,
  },
  {
    id: 'spn_kddi',
    name: 'KDDI',
    type: 'corporate',
    slot: 'roadside',
    displayName: 'KDDI',
    message: 'つながる旅を',
    linkUrl: 'https://www.kddi.com/',
    startDate: '2026-05-01',
    endDate: '2026-12-31',
    weight: 15,
    priority: 90,
    isActive: false,
  },
  {
    id: 'jff_company',
    name: 'JustForFun株式会社',
    type: 'jff',
    slot: 'roadside',
    displayName: 'JustForFun',
    tagline: 'Adventure Media Company',
    message: 'ちょっと面白いから、やってみよう',
    linkUrl: 'https://justforfun.example.com',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    weight: 14,
    priority: 70,
    isActive: true,
  },
  {
    id: 'jff_gump_tanaka',
    name: 'ガンプ田中 紹介',
    type: 'jff',
    slot: 'roadside',
    displayName: 'ガンプ田中',
    tagline: 'Singer / Adventurer',
    message: 'Shopifyで楽曲配信中',
    linkUrl: 'https://justforfun.example.com/gump-tanaka',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    weight: 14,
    priority: 70,
    isActive: true,
  },
  {
    id: 'jff_instagram',
    name: 'Instagram公式',
    type: 'jff',
    slot: 'roadside',
    displayName: '@justforfun_movie',
    tagline: 'Instagram公式',
    message: '日々の旅を発信中',
    linkUrl: 'https://www.instagram.com/justforfun_movie/',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    weight: 14,
    priority: 70,
    isActive: true,
  },
  {
    id: 'jff_movie',
    name: 'JUST FOR FUN (映画)',
    type: 'jff',
    slot: 'roadside',
    displayName: 'JUST FOR FUN',
    tagline: 'アメリカ横断映画',
    message: 'Amazon Prime / U-NEXTで配信中',
    linkUrl: '',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    weight: 14,
    priority: 70,
    isActive: true,
  },
  {
    id: 'jff_route66',
    name: 'Route66プロジェクト',
    type: 'jff',
    slot: 'roadside',
    displayName: 'Route66',
    message: '旅は続く',
    linkUrl: 'https://justforfun.example.com/route66',
    startDate: '2026-05-01',
    endDate: '2099-12-31',
    weight: 6,
    priority: 40,
    isActive: false,
  },
  {
    id: 'ev_midpoint',
    name: 'MIDPOINT FESTA',
    type: 'event',
    slot: 'roadside',
    displayName: 'MIDPOINT FESTA',
    message: '当日会場で会おう',
    linkUrl: 'https://justforfun.example.com/midpoint',
    startDate: '2026-05-01',
    endDate: '2026-06-30',
    weight: 10,
    priority: 70,
    isActive: false,
  },
];
