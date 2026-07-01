// マイルストーン協賛。指定距離を初めて超えた時に1回だけ表示する。
//
// 運用:
//   - 期間外 / isActive=false は表示しない
//   - sponsorName が空ならJFF純粋な応援メッセージ
//   - sponsorName ありなら "supported by ◯◯" 形式の表示で legal的にも明示

export type MilestoneSponsor = {
  id: string;
  distance: number;     // この距離(m)を初めて超えた時に発火
  sponsorName: string;  // '' ならスポンサーなし
  message: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  /** 特定コース限定のマイルストーン。未指定なら全コース共通 */
  courseId?: 'japan' | 'route66' | 'africa';
};

export const MILESTONES: MilestoneSponsor[] = [
  {
    id: 'ms_100',
    distance: 100,
    sponsorName: '',
    message: '100m — 今日も前へ！',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    isActive: true,
  },
  {
    id: 'ms_500',
    distance: 500,
    sponsorName: '',
    message: '500m突破！',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    isActive: true,
  },
  {
    id: 'ms_1000',
    distance: 1000,
    sponsorName: '',
    message: '1000m地点に到達！',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    isActive: true,
  },
  {
    id: 'ms_3000',
    distance: 3000,
    sponsorName: '',
    message: '3000m — もはや旅人。',
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    isActive: true,
  },
];
