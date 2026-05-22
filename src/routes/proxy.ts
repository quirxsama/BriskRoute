import { Elysia, t } from 'elysia'
import { config } from '../config/env'
import { assertAllowedUpstream } from '../config/upstreamPolicy'
import { type JwtVerifier, hasScope, verifyAuthUser } from '../plugins/auth'
import { normalizePrefix, resolveRoute, saveRoute } from '../config/database'

interface AdminContext {
  jwt?: JwtVerifier
}

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host'
])

function proxiedHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers()
  const connectionHeaders = new Set(
    (headers.get('connection') ?? '')
      .split(',')
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean)
  )

  for (const [key, value] of headers.entries()) {
    const normalizedKey = key.toLowerCase()
    if (!hopByHopHeaders.has(normalizedKey) && !connectionHeaders.has(normalizedKey)) nextHeaders.set(key, value)
  }

  return nextHeaders
}

function upstreamUrl(target: string, prefix: string, requestUrl: string): string {
  const source = new URL(requestUrl)
  const base = new URL(target)
  const suffix = source.pathname.slice(prefix.length)
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`

  base.pathname = `${base.pathname.replace(/\/+$/, '')}${normalizedSuffix}`
  base.search = source.search
  return base.toString()
}

async function proxyRequest(request: Request): Promise<Response> {
  const route = resolveRoute(new URL(request.url).pathname)

  if (!route) {
    return Response.json({ error: 'No upstream route configured' }, { status: 404 })
  }

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  await assertAllowedUpstream(route.target)

  const response = await fetch(upstreamUrl(route.target, route.prefix, request.url), {
    method,
    headers: proxiedHeaders(request.headers),
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
    signal: AbortSignal.timeout(config.upstreamTimeoutMs)
  })

  const headers = proxiedHeaders(response.headers)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

export const proxyRoutes = new Elysia({ name: 'proxy-routes' })
  .post(
    '/_gateway/routes',
    async (context) => {
      const { body, set } = context
      const { jwt } = context as typeof context & AdminContext
      const user = jwt ? await verifyAuthUser(jwt, context.request.headers) : null

      if (!user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      if (!hasScope(user, config.jwtAdminScope)) {
        set.status = 403
        return { error: 'Forbidden' }
      }

      const prefix = normalizePrefix(body.prefix)
      const target = (await assertAllowedUpstream(body.target)).toString().replace(/\/+$/, '')

      saveRoute(prefix, target)
      set.status = 201
      return { prefix, target }
    },
    {
      body: t.Object({
        prefix: t.String({ minLength: 1 }),
        target: t.String({ format: 'uri' })
      })
    }
  )
  .all('*', ({ request }) => proxyRequest(request))
