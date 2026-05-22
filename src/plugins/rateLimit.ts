import { Elysia } from 'elysia'
import { db } from '../config/database'

const WINDOW_MS = Number(Bun.env.RATE_LIMIT_WINDOW_MS ?? 60_000)
const MAX_REQUESTS = Number(Bun.env.RATE_LIMIT_MAX ?? 120)

const selectHit = db.query('SELECT count, reset_at AS resetAt FROM rate_limit_hits WHERE key = $key')
const insertHit = db.query('INSERT OR REPLACE INTO rate_limit_hits (key, count, reset_at) VALUES ($key, $count, $resetAt)')
const incrementHit = db.query('UPDATE rate_limit_hits SET count = count + 1 WHERE key = $key')
const deleteExpired = db.query('DELETE FROM rate_limit_hits WHERE reset_at < $now')

interface RateLimitHit {
  count: number
  resetAt: number
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown'

  return request.headers.get('x-real-ip') ?? 'unknown'
}

export const rateLimitPlugin = new Elysia({ name: 'rate-limit' }).onBeforeHandle(({ request, set }) => {
  const now = Date.now()
  const key = getClientIp(request)
  const hit = selectHit.get({ $key: key }) as RateLimitHit | null

  if (!hit || hit.resetAt <= now) {
    insertHit.run({ $key: key, $count: 1, $resetAt: now + WINDOW_MS })
    deleteExpired.run({ $now: now })
    return undefined
  }

  if (hit.count >= MAX_REQUESTS) {
    set.status = 429
    set.headers['retry-after'] = String(Math.ceil((hit.resetAt - now) / 1000))
    return {
      error: 'Too Many Requests',
      limit: MAX_REQUESTS,
      resetAt: new Date(hit.resetAt).toISOString()
    }
  }

  incrementHit.run({ $key: key })
  return undefined
})
