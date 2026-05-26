// =============================================================
// /api/scores POST 用レート制限
//
// 環境変数が未設定の場合は no-op（素通り）。
// Vercel KV 連携の場合は KV_REST_API_URL / KV_REST_API_TOKEN、
// 素の Upstash の場合は UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN を読む。
// =============================================================
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { VercelRequest } from '@vercel/node';

function hasUpstashEnv(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
  );
}

type Limiter = {
  limit: (id: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

function makeLimiter(): Limiter | null {
  if (!hasUpstashEnv()) return null;
  const redis = Redis.fromEnv();
  const minute = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: false,
    prefix: 'rl:scores:m',
  });
  const hour = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 h'),
    analytics: false,
    prefix: 'rl:scores:h',
  });
  return {
    async limit(id: string) {
      const [m, h] = await Promise.all([minute.limit(id), hour.limit(id)]);
      const winner = m.success ? h : m;
      return {
        success: m.success && h.success,
        limit: winner.limit,
        remaining: Math.min(m.remaining, h.remaining),
        reset: Math.max(m.reset, h.reset),
      };
    },
  };
}

export const scoresLimiter = makeLimiter();

export function getClientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (raw) {
    const first = raw.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real) return real;
  return 'anon';
}
