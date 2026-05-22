import { jwt } from '@elysiajs/jwt'
import { Elysia } from 'elysia'
import { config } from '../config/env'

export interface AuthUser {
  sub: string
  scope?: string
}

export interface JwtVerifier {
  verify(token: string): Promise<false | Record<string, unknown>>
}

const publicPrefixes = ['/_gateway/health']

function isPublicPath(pathname: string): boolean {
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function bearerToken(headers: Headers): string | null {
  const authorization = headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

export async function verifyAuthUser(jwtService: JwtVerifier, headers: Headers): Promise<AuthUser | null> {
  const token = bearerToken(headers)
  if (!token) return null

  const payload = await jwtService.verify(token)
  if (!payload || typeof payload.sub !== 'string') return null

  const scope = typeof payload.scope === 'string' ? payload.scope : undefined
  return { sub: payload.sub, scope }
}

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: config.jwtSecret
    })
  )
  .onBeforeHandle(async ({ jwt: jwtService, request, set }) => {
    const pathname = new URL(request.url).pathname

    if (isPublicPath(pathname)) return undefined

    const user = await verifyAuthUser(jwtService, request.headers)
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return undefined
  })

export function hasScope(user: AuthUser | null, scope: string): boolean {
  return user?.scope?.split(/\s+/).includes(scope) ?? false
}
