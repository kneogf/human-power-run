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
    weekly_message: string;
    weekly_boost: string;
  };
};

const COMMON_SUPPORT_LINKS = {
  // Stripe Payment Link (JPY 単発決済) — 3プラン構成
  // 全部揃ったので default_campaign.supportEnabled を true にすれば公開される。
  tip: 'https://buy.stripe.com/9B600jdgh2Qwee8aly7ss11', // ¥300 ✅
  weekly_message: 'https://buy.stripe.com/8x2eVddghbn26LGfFS7ss10', // ¥1,500 ✅
  weekly_boost: 'https://buy.stripe.com/eVqfZh0tvfDib1W9hu7ss12', // ¥5,000 ✅
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
    supportEnabled: true, // Stripe Payment Link 3本準備完了、本番公開中
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
