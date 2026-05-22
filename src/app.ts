import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { authPlugin } from './plugins/auth'
import { rateLimitPlugin } from './plugins/rateLimit'
import { proxyRoutes } from './routes/proxy'

export function createApp() {
  return new Elysia()
    .use(cors())
    .use(rateLimitPlugin)
    .use(authPlugin)
    .get('/_gateway/health', () => ({ status: 'ok', service: 'BriskRoute' }))
    .use(proxyRoutes)
    .onError(({ code, error, set }) => {
      if (code === 'VALIDATION') {
        set.status = 400
        return { error: 'Validation Error', message: error.message }
      }

      if (error instanceof Error && error.message === 'Upstream target is not allowlisted') {
        set.status = 400
        return { error: 'Invalid Upstream Target', message: error.message }
      }

      if (error instanceof Error && error.message === 'Upstream target must use http or https') {
        set.status = 400
        return { error: 'Invalid Upstream Target', message: error.message }
      }

      if (error instanceof DOMException && error.name === 'TimeoutError') {
        set.status = 504
        return { error: 'Gateway Timeout' }
      }

      console.error(error)
      set.status = 500
      return { error: 'Internal Server Error' }
    })
}

export type App = ReturnType<typeof createApp>
