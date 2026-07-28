// 個人応援者リスト。毎週月曜にここを書き換える。
//
// 運用:
//   - 日曜 23:59 締切 → 翌週月曜にこのファイルへ追記
//   - ¥300〜の差し入れ応援 (tip) は掲載なし。showOnRoadside=false
//   - 掲載ありは ¥1,500 以上から (weekly_message / weekly_boost)
//   - 期間外 / isActive=false は表示されない

export type SupporterPlan =
  | 'tip'              // ¥300〜 差し入れだけ。掲載なし
  | 'weekly_message'   // ¥1,500 / 週 沿道に名前 + 一言
  | 'weekly_boost';    // ¥5,000 / 週 沿道優先 + Game Over掲載

export type Supporter = {
  id: string;
  name: string;
  planName: SupporterPlan;
  displayName?: string;
  message?: string;
  price: number;
  displayPeriod: 'none' | 'weekly' | 'monthly' | 'permanent';
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
  weight: number;
  isActive: boolean;
  showOnRoadside: boolean;
  showOnGameOver: boolean;
  showOnRanking: boolean;
};

/** プラン定義（金額・掲載仕様の単一の真実） */
// 価格戦略（案B改）: 3段階に絞ってシンプル化。
//   ¥300  差し入れ (掲載なし・気持ち)
//   ¥1,500 メッセージ (名前+一言・掲載ありの入口)
//   ¥5,000 追い風 (熱狂ファン・Game Over画面にも出る・法人ブリッジ)
export const SUPPORT_PLANS = {
  tip: {
    label: '差し入れ応援',
    price: 300,
    displayed: false,
    note: '気持ちだけ。掲載は出ません。',
  },
  weekly_message: {
    label: '今週のメッセージ応援',
    price: 1500,
    displayed: true,
    note: '7日間、名前＋一言メッセージが沿道に出ます。',
  },
  weekly_boost: {
    label: '追い風サポーター',
    price: 5000,
    displayed: true,
    note: '7日間、沿道優先表示＋Game Over画面にも出ます。',
  },
} as const;

/** 個人応援者リスト（サンプル） */
export const SUPPORTERS: Supporter[] = [
  {
    id: 'spt_nana',
    name: '佐藤なな',
    planName: 'weekly_message',
    displayName: 'ななさん',
    message: '今日も前へ！',
    price: 1500,
    displayPeriod: 'weekly',
    startDate: '2026-05-18',
    endDate: '2026-05-24',
    weight: 12,
    isActive: false,
    showOnRoadside: true,
    showOnGameOver: false,
    showOnRanking: false,
  },
  {
    id: 'spt_ayuka',
    name: '山田あゆか',
    planName: 'weekly_boost',
    displayName: 'あゆかさん',
    message: '人力で行ける！',
    price: 5000,
    displayPeriod: 'weekly',
    startDate: '2026-05-18',
    endDate: '2026-05-24',
    weight: 20,
    isActive: false,
    showOnRoadside: true,
    showOnGameOver: true,
    showOnRanking: true,
  },
];
