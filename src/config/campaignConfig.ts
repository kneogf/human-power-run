// キャンペーン / イベントモード管理。
// 同時に複数 isActive=true のものがある場合、最初に一致したものが採用される。
//
// 運用:
//   - default_campaign は常に isActive=true で残しておく (フォールバック)
//   - イベント期間中はそのキャンペーンを isActive=true にする
//   - Game Over画面のCTAは getActiveCampaign() の gameOverCta が使われる
//   - supportLinks は決済リンク (Stripe Payment Link / ko-fi / BASE 等の外部URL)

export type CampaignTheme = 'default' | 'restart' | 'route66' | 'midpoint' | 'event';

export type Campaign = {
  id: string;
  name: string;
  theme: CampaignTheme;
  startDate: string;
  endDate: string;
  isActive: boolean;
  eventMode: boolean;
  /**
   * 支援ボタンを本番表示するか。false のときは Game Over 画面で
   * 「支援機能は準備中」プレースホルダに置き換わる (Stripe URL 未整備期間用)。
   * Stripe Payment Link を supportLinks に埋めた時点で true に切り替える。
   */
  supportEnabled: boolean;
  gameOverCta: {
    title: string;
    description: string;
    primaryButtonText: string;
    primaryButtonUrl: string;
    secondaryButtonText?: string;
    secondaryButtonUrl?: string;
  };
  /** プラン別の決済URL。Game Overのプラン別ボタンが押されたらここに飛ぶ */
  supportLinks: {
    tip: string;
    weekly_name: string;
    weekly_message: string;
    weekly_boost: string;
  };
};

const COMMON_SUPPORT_LINKS = {
  // TODO: 実運用ではStripe Payment Link / ko-fi / BASE などの本番URLに置き換える
  tip: 'https://justforfun.example.com/support/tip',
  weekly_name: 'https://justforfun.example.com/support/weekly-name',
  weekly_message: 'https://justforfun.example.com/support/weekly-message',
  weekly_boost: 'https://justforfun.example.com/support/weekly-boost',
};

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'default_campaign',
    name: '通常モード',
    theme: 'default',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    isActive: true,
    eventMode: false,
    supportEnabled: false, // Stripe Payment Link 用意後に true へ
    gameOverCta: {
      title: 'この旅は、みんなの応援で続いています。',
      description: '差し入れも、沿道に名前を出すのも、どちらも旅の燃料になります。',
      primaryButtonText: 'この旅を応援する',
      primaryButtonUrl: COMMON_SUPPORT_LINKS.tip,
    },
    supportLinks: COMMON_SUPPORT_LINKS,
  },
  {
    id: 'restart_campaign',
    name: 'RESTART上映会キャンペーン',
    theme: 'restart',
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    isActive: false,
    eventMode: false,
    supportEnabled: false,
    gameOverCta: {
      title: 'RESTARTの旅は、ここから始まる。',
      description: '映画『RESTART』上映会、開催中。',
      primaryButtonText: 'RESTART上映会を見る',
      primaryButtonUrl: 'https://justforfun.example.com/restart',
      secondaryButtonText: 'この旅を応援する',
      secondaryButtonUrl: COMMON_SUPPORT_LINKS.tip,
    },
    supportLinks: COMMON_SUPPORT_LINKS,
  },
  {
    id: 'midpoint_festa_campaign',
    name: 'MIDPOINT FESTA',
    theme: 'midpoint',
    startDate: '2026-05-01',
    endDate: '2026-06-30',
    isActive: false,
    eventMode: true,
    supportEnabled: false,
    gameOverCta: {
      title: 'MIDPOINT FESTAで、会いに行こう。',
      description: '人力で旅した先に、リアルな仲間がいる。',
      primaryButtonText: 'MIDPOINT FESTAの詳細',
      primaryButtonUrl: 'https://justforfun.example.com/midpoint',
      secondaryButtonText: 'この旅を応援する',
      secondaryButtonUrl: COMMON_SUPPORT_LINKS.tip,
    },
    supportLinks: COMMON_SUPPORT_LINKS,
  },
];
