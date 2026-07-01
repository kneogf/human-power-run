// courseConfig.ts のコース定義を距離から引くためのヘルパー群。
// engine / App はこれを経由してコース・セクション・マイルストーンを取得する。

import {
  courses,
  type CourseConfig,
  type CourseId,
  type CourseSection,
} from '../config/courseConfig';

/** id からコースを引く。見つからなければ japan にフォールバック */
export function getCourseById(id: CourseId): CourseConfig {
  const found = courses.find((c) => c.id === id);
  return found ?? courses[0];
}

/**
 * 距離(m)が属するセクションを返す。
 * [distanceStart, distanceEnd) で判定。範囲を超えたら最後のセクションにクランプ。
 */
export function getCourseSection(
  course: CourseConfig,
  distance: number,
): CourseSection {
  const secs = course.sections;
  for (const s of secs) {
    if (distance >= s.distanceStart && distance < s.distanceEnd) return s;
  }
  // 範囲手前なら先頭、範囲超過なら末尾
  if (distance < secs[0].distanceStart) return secs[0];
  return secs[secs.length - 1];
}

/**
 * 現在セクション・次セクション・次への進行率(0..1)を返す。
 * 次が無い(最終セクション)場合は next=null, blend=0。
 */
export function getSectionProgress(
  course: CourseConfig,
  distance: number,
): { section: CourseSection; next: CourseSection | null; blend: number } {
  const secs = course.sections;
  const section = getCourseSection(course, distance);
  const idx = secs.indexOf(section);
  const next = idx >= 0 && idx < secs.length - 1 ? secs[idx + 1] : null;
  let blend = 0;
  if (next) {
    const span = section.distanceEnd - section.distanceStart;
    blend = span > 0 ? (distance - section.distanceStart) / span : 0;
    blend = Math.min(1, Math.max(0, blend));
  }
  return { section, next, blend };
}

/**
 * 各セクションの distanceStart + milestoneText からマイルストーンを生成する。
 * 0m 地点はスタート扱いなのでスキップ。
 */
export function getCourseMilestones(
  courseId: CourseId,
): Array<{ distance: number; message: string }> {
  const course = getCourseById(courseId);
  const out: Array<{ distance: number; message: string }> = [];
  const lastIdx = course.sections.length - 1;
  course.sections.forEach((s, idx) => {
    if (s.distanceStart <= 0) return;
    if (!s.milestoneText) return;
    // Codex 指摘: 最終セクション (FINISH文言) は distanceStart で出すと
    // 500m早くゴールが表示され、さらに下の distanceEnd 出力とも重複する。
    // 最終セクションは末尾ブロックの distanceEnd 1回だけに任せる。
    if (idx === lastIdx) return;
    out.push({ distance: s.distanceStart, message: s.milestoneText });
  });
  // 最終セクションのゴール文言は末尾(distanceEnd)で1回だけ出す。
  const last = course.sections[lastIdx];
  if (last?.milestoneText) {
    out.push({ distance: last.distanceEnd, message: last.milestoneText });
  }
  return out;
}

/** コース別 Game Over 文言（\n で改行） */
export function getGameOverMessage(courseId: CourseId): string {
  switch (courseId) {
    case 'japan':
      return '日本縦断、まだ道半ば。\nもう一度、人の力で南へ。';
    case 'route66':
      return 'Route66はまだ続く。\nロードランナーにも負けず、もう一度走れ。';
    case 'africa':
      return '冒険はここで終わらない。\nRESTARTして、もう一度大地を進め。';
    default:
      return '旅はまだ終わらない。\nもう一度走り出そう。';
  }
}
