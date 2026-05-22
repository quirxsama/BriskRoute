import { jwt } from '@elysiajs/jwt'
import { Elysia } from 'elysia'

export interface AuthUser {
  sub: string
  scope?: string
}

const publicPrefixes = ['/_gateway/health', '/_gateway/routes']

function isPublicPath(pathname: string): boolean {
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function bearerToken(headers: Headers): string | null {
  const authorization = headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: Bun.env.JWT_SECRET ?? 'briskroute-local-development-secret'
    })
  )
  .derive(async ({ jwt: jwtService, request, set }) => {
    const pathname = new URL(request.url).pathname

    if (isPublicPath(pathname)) return { user: null as AuthUser | null }

    const token = bearerToken(request.headers)
    if (!token) {
      set.status = 401
      return { user: null as AuthUser | null }
    }

    const payload = await jwtService.verify(token)
    if (!payload || typeof payload.sub !== 'string') {
      set.status = 401
      return { user: null as AuthUser | null }
    }

    const scope = typeof payload.scope === 'string' ? payload.scope : undefined
    return { user: { sub: payload.sub, scope } satisfies AuthUser }
  })
  .onBeforeHandle(({ request, user, set }) => {
    const pathname = new URL(request.url).pathname
    if (isPublicPath(pathname) || user) return undefined

    set.status = 401
    return { error: 'Unauthorized' }
  })
