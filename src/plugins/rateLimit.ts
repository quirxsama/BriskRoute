import { Elysia } from 'elysia'
import { config } from '../config/env'

const WINDOW_MS = config.rateLimitWindowMs
const MAX_REQUESTS = config.rateLimitMax

interface RateLimitHit {
  count: number
  resetAt: number
}

interface RateLimitStore {
  consume(key: string, now: number): RateLimitHit
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, RateLimitHit>()

  consume(key: string, now: number): RateLimitHit {
    const hit = this.hits.get(key)
    if (!hit || hit.resetAt <= now) {
      const next = { count: 1, resetAt: now + WINDOW_MS }
      this.hits.set(key, next)
      this.cleanup(now)
      return next
    }

    hit.count += 1
    return hit
  }

  private cleanup(now: number): void {
    for (const [key, hit] of this.hits.entries()) {
      if (hit.resetAt <= now) this.hits.delete(key)
    }
  }
}

const store: RateLimitStore = new MemoryRateLimitStore()

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (config.trustProxy && forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown'
  if (config.trustProxy) return request.headers.get('x-real-ip') ?? 'unknown'

  return 'unknown'
}

export const rateLimitPlugin = new Elysia({ name: 'rate-limit' }).onBeforeHandle(({ request, set }) => {
  const now = Date.now()
  const key = getClientIp(request)
  const hit = store.consume(key, now)

  if (hit.count > MAX_REQUESTS) {
    set.status = 429
    set.headers['retry-after'] = String(Math.ceil((hit.resetAt - now) / 1000))
    return {
      error: 'Too Many Requests',
      limit: MAX_REQUESTS,
      resetAt: new Date(hit.resetAt).toISOString()
    }
  }
  return undefined
})
