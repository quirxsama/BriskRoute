import { createHmac } from 'node:crypto'

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

const secret = Bun.env.JWT_SECRET ?? 'briskroute-local-development-secret'
const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
const payload = base64Url(
  JSON.stringify({
    sub: 'benchmark-user',
    scope: 'benchmark',
    iat: Math.floor(Date.now() / 1000)
  })
)
const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')

console.log(`${header}.${payload}.${signature}`)
