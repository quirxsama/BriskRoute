import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from './env'

export interface GatewayRoute {
  id: number
  prefix: string
  target: string
  createdAt: string
}

const databasePath = config.databasePath

mkdirSync(dirname(databasePath), { recursive: true })

export const db = new Database(databasePath, {
  create: true
})

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS gateway_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT NOT NULL UNIQUE,
    target TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rate_limit_hits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_gateway_routes_prefix ON gateway_routes(prefix);
  CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_reset_at ON rate_limit_hits(reset_at);
`)

const routeCount = db.query('SELECT COUNT(*) AS count FROM gateway_routes').get() as { count: number }

if (routeCount.count === 0) {
  db.query('INSERT INTO gateway_routes (prefix, target) VALUES ($prefix, $target)').run({
    $prefix: '/api',
    $target: config.defaultUpstream
  })
}

const allRoutes = db.query(`
  SELECT id, prefix, target, created_at AS createdAt
  FROM gateway_routes
  ORDER BY LENGTH(prefix) DESC
`)

const upsertRoute = db.query(`
  INSERT INTO gateway_routes (prefix, target)
  VALUES ($prefix, $target)
  ON CONFLICT(prefix) DO UPDATE SET target = excluded.target
`)

export function resolveRoute(pathname: string): GatewayRoute | null {
  return routeCache.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) ?? null
}

export function saveRoute(prefix: string, target: string): void {
  const normalizedPrefix = normalizePrefix(prefix)
  upsertRoute.run({ $prefix: normalizedPrefix, $target: target })
  routeCache = loadRoutes()
}

function loadRoutes(): GatewayRoute[] {
  return allRoutes.all() as GatewayRoute[]
}

let routeCache = loadRoutes()

export function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim()
  if (trimmed === '') return '/'
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash
}
