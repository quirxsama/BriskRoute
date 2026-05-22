import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { rateLimitPlugin } from './plugins/rateLimit'
import { authPlugin } from './plugins/auth'
import { proxyRoutes } from './routes/proxy'

const port = Number(Bun.env.PORT ?? 3000)

const app = new Elysia()
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

    console.error(error)
    set.status = 500
    return { error: 'Internal Server Error' }
  })
  .listen(port)

console.log(`BriskRoute listening on http://localhost:${app.server?.port ?? port}`)

export type App = typeof app
