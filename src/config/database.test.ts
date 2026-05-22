import { describe, expect, test } from 'bun:test'
import { normalizePrefix, resolveRoute, saveRoute } from './database'

describe('gateway route config', () => {
  test('normalizes route prefixes', () => {
    expect(normalizePrefix('api/')).toBe('/api')
    expect(normalizePrefix('/')).toBe('/')
  })

  test('resolves longest matching route prefix', () => {
    saveRoute('/api', 'http://localhost:4000')
    saveRoute('/api/users', 'http://localhost:4001')

    expect(resolveRoute('/api/users/42')?.target).toBe('http://localhost:4001')
  })
})
