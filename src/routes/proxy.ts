import { Elysia, t } from 'elysia'
import { normalizePrefix, resolveRoute, saveRoute } from '../config/database'

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

  for (const [key, value] of headers.entries()) {
    if (!hopByHopHeaders.has(key.toLowerCase())) nextHeaders.set(key, value)
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
  const response = await fetch(upstreamUrl(route.target, route.prefix, request.url), {
    method,
    headers: proxiedHeaders(request.headers),
    body: hasBody ? request.body : undefined,
    redirect: 'manual'
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
    ({ body, set }) => {
      const prefix = normalizePrefix(body.prefix)
      const target = new URL(body.target).toString().replace(/\/+$/, '')

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
