# BriskRoute

Edge-native, high-throughput API Gateway built with Bun, ElysiaJS, TypeScript, and embedded SQLite.

## Stack

- Runtime: Bun
- Framework: ElysiaJS
- Database: `bun:sqlite`
- Auth: `@elysiajs/jwt`
- Validation: Elysia TypeBox schemas

## Requirements

- Bun 1.3+

Check install:

```bash
bun --version
```

## Install

```bash
bun install
```

## Run

Development with watch mode:

```bash
bun run dev
```

Production-style start:

```bash
bun run start
```

Default server URL:

```text
http://localhost:3000
```

## Environment

Optional variables:

```bash
PORT=3000
JWT_SECRET=replace-with-secure-secret
DEFAULT_UPSTREAM=http://localhost:4000
BRISKTROUTE_DB_PATH=.data/briskroute.sqlite
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

Notes:

- `JWT_SECRET` defaults to local development secret if unset. Set real secret outside local dev.
- `DEFAULT_UPSTREAM` seeds default `/api` route on first database creation.
- SQLite runtime files live under `.data/` by default and are ignored by git.

## Health Check

```bash
curl http://localhost:3000/_gateway/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "BriskRoute"
}
```

## Configure Routes

Register or update upstream route:

```bash
curl -X POST http://localhost:3000/_gateway/routes \
  -H 'content-type: application/json' \
  -d '{"prefix":"/api","target":"http://localhost:4000"}'
```

Response:

```json
{
  "prefix": "/api",
  "target": "http://localhost:4000"
}
```

Route matching uses longest prefix match. Example:

- `/api` routes to `http://localhost:4000`
- `/api/users` routes to more specific upstream if configured

## Proxy Requests

Start upstream service on configured target, then call BriskRoute:

```bash
curl http://localhost:3000/api/example \
  -H 'authorization: Bearer <jwt>'
```

BriskRoute resolves `/api/example`, strips hop-by-hop headers, forwards request with native `fetch`, then streams upstream response back.

Stripped headers:

- `connection`
- `keep-alive`
- `proxy-authenticate`
- `proxy-authorization`
- `te`
- `trailer`
- `transfer-encoding`
- `upgrade`
- `host`

## Authentication

Protected proxy routes require:

```text
Authorization: Bearer <jwt>
```

JWT payload must include string `sub` claim:

```json
{
  "sub": "user-id",
  "scope": "optional-scope"
}
```

Public endpoints:

- `GET /_gateway/health`
- `POST /_gateway/routes`

## Rate Limit

IP-based limiter runs before auth.

Defaults:

- Window: `60000` ms
- Max requests: `120`

On breach:

```json
{
  "error": "Too Many Requests",
  "limit": 120,
  "resetAt": "..."
}
```

Response status: `429`

## Scripts

```bash
bun run dev        # watch mode
bun run start      # run gateway
bun run typecheck  # strict TypeScript check
bun test           # run tests
```

## Verification

```bash
bun run typecheck
bun test
```

Current test coverage includes route prefix normalization and longest-prefix route resolution.

## Project Layout

```text
src/
├── config/
│   ├── database.ts
│   └── database.test.ts
├── plugins/
│   ├── auth.ts
│   └── rateLimit.ts
├── routes/
│   └── proxy.ts
└── index.ts
```
