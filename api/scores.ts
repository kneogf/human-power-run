// Vercel Serverless Function: /api/scores
// GET  → リーダーボードTOP20を返す
// POST → name / character / score を受け取り Upstash Redis に zadd
//
// データ構造:
//   SORTED SET "scores:global"
//     member = "<name>::<character>::<timestamp>"  (timestampで一意化)
//     score  = 走破距離（整数）
//
// 不正対策:
//   - name: 1〜20文字、制御文字 / 区切り文字 :: を除去
//   - character: 列挙ホワイトリスト
//   - score: 0〜1,000,000の整数のみ
//   - 上位200件を超えたら下位を捨てる（容量制御）

import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scoresLimiter, getClientIp } from './_ratelimit';

const redis = Redis.fromEnv();
const KEY = 'scores:global';
const MAX_NAME_LENGTH = 20;
const MAX_SCORE = 1_000_000;
const TOP_N = 20;
const CAP = 200;
const VALID_CHARS = new Set([
  'baby_carriage',
  'runner',
  'bike',
  'rickshaw',
]);

interface ScoreEntry {
  name: string;
  character: string;
  score: number;
  ts: number;
}

const fetchTop = async (): Promise<ScoreEntry[]> => {
  // 上位から並べた member, score の配列が返る
  const result = (await redis.zrange(KEY, 0, TOP_N - 1, {
    rev: true,
    withScores: true,
  })) as Array<string | number>;

  const entries: ScoreEntry[] = [];
  for (let i = 0; i < result.length; i += 2) {
    const member = String(result[i]);
    const score = Number(result[i + 1]);
    const parts = member.split('::');
    if (parts.length < 3) continue;
    const [name, character, tsStr] = parts;
    entries.push({
      name,
      character,
      score: Math.floor(score),
      ts: Number(tsStr) || 0,
    });
  }
  return entries;
};

// 制御文字 U+0000..U+001F と U+007F を除去
// ASCIIエスケープで書いてソースに制御文字を残さない
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]/g;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (req.method === 'GET') {
      const top = await fetchTop();
      // 軽くキャッシュ（10秒）
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
      return res.status(200).json({ top });
    }

    if (req.method === 'POST') {
      // Rate limit
      if (scoresLimiter) {
        const ip = getClientIp(req);
        const { success, reset } = await scoresLimiter.limit(ip);
        if (!success) {
          const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({ error: 'too many requests' });
        }
      }

      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const rawName = String(body?.name ?? '').trim();
      const character = String(body?.character ?? '');
      const score = Math.floor(Number(body?.score ?? 0));

      const name = rawName
        .replace(CONTROL_CHARS_RE, '')
        .replace(/::/g, ':')
        .slice(0, MAX_NAME_LENGTH);

      if (!name) return res.status(400).json({ error: 'name required' });
      if (!VALID_CHARS.has(character))
        return res.status(400).json({ error: 'invalid character' });
      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE)
        return res.status(400).json({ error: 'invalid score' });

      const ts = Date.now();
      const member = `${name}::${character}::${ts}`;
      await redis.zadd(KEY, { score, member });

      // 容量制御：上位 CAP 件を残し、下位を削除
      // rank: 0 = lowest score, -1 = highest score
      await redis.zremrangebyrank(KEY, 0, -CAP - 1);

      const top = await fetchTop();
      return res.status(200).json({ top, ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('scores api error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}
