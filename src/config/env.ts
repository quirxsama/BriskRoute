function numberEnv(name: string, fallback: number, min = 0): number {
  const value = Bun.env[name]
  if (value === undefined) return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`${name} must be a number >= ${min}`)
  }

  return parsed
}

function listEnv(name: string): string[] {
  return (Bun.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const value = Bun.env[name]
  if (value === undefined) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${name} must be true or false`)
}

function jwtSecret(): string {
  const secret = Bun.env.JWT_SECRET
  const allowInsecure = Bun.env.BRISKROUTE_ALLOW_INSECURE_DEFAULTS === 'true'
  const production = Bun.env.NODE_ENV === 'production'

  if (secret && secret.length >= 32) return secret
  if (!production && (allowInsecure || Bun.env.NODE_ENV === 'test')) return secret ?? 'briskroute-local-development-secret'

  throw new Error('JWT_SECRET must be set to at least 32 characters')
}

export const config = {
  port: numberEnv('PORT', 3000, 1),
  jwtSecret: jwtSecret(),
  jwtAdminScope: Bun.env.JWT_ADMIN_SCOPE ?? 'routes:write',
  defaultUpstream: Bun.env.DEFAULT_UPSTREAM ?? 'http://localhost:4000',
  databasePath: Bun.env.BRISKTROUTE_DB_PATH ?? '.data/briskroute.sqlite',
  rateLimitWindowMs: numberEnv('RATE_LIMIT_WINDOW_MS', 60_000, 1),
  rateLimitMax: numberEnv('RATE_LIMIT_MAX', 120, 1),
  upstreamTimeoutMs: numberEnv('UPSTREAM_TIMEOUT_MS', 30_000, 1),
  upstreamAllowedHosts: new Set(listEnv('UPSTREAM_ALLOWED_HOSTS').map((host) => host.toLowerCase())),
  upstreamAllowedCidrs: listEnv('UPSTREAM_ALLOWED_CIDRS'),
  trustProxy: booleanEnv('TRUST_PROXY', false)
} as const
