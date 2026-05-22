import { describe, expect, test } from 'bun:test'
import { jwt } from '@elysiajs/jwt'
import { Elysia } from 'elysia'
import { createApp } from '../app'
import { config } from '../config/env'

async function token(scope: string): Promise<string> {
  const signer = new Elysia()
    .use(jwt({ name: 'jwt', secret: config.jwtSecret }))
    .get('/token', ({ jwt: jwtService }) => jwtService.sign({ sub: 'admin-test-user', scope }))

  return signer.handle(new Request('http://localhost/token')).then((response) => response.text())
}

describe('admin route authorization', () => {
  test('rejects missing token', async () => {
    const app = createApp()
    const response = await app.handle(
      new Request('http://localhost/_gateway/routes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prefix: '/admin-missing', target: 'http://localhost:4000' })
      })
    )

    expect(response.status).toBe(401)
  })

  test('rejects non-admin token', async () => {
    const app = createApp()
    const response = await app.handle(
      new Request('http://localhost/_gateway/routes', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${await token('benchmark')}` },
        body: JSON.stringify({ prefix: '/admin-forbidden', target: 'http://localhost:4000' })
      })
    )

    expect(response.status).toBe(403)
  })

  test('allows admin token', async () => {
    config.upstreamAllowedHosts.add('localhost')

    const app = createApp()
    const response = await app.handle(
      new Request('http://localhost/_gateway/routes', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${await token(config.jwtAdminScope)}` },
        body: JSON.stringify({ prefix: '/admin-created', target: 'http://localhost:4000' })
      })
    )

    expect(response.status).toBe(201)
  })
})
