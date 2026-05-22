import { describe, expect, test } from 'bun:test'
import { ipInCidr, parseCidr, parseIp } from './ip'

describe('IP and CIDR parsing', () => {
  test('matches IPv4 CIDR ranges', () => {
    const cidr = parseCidr('127.0.0.0/8')

    expect(ipInCidr(parseIp('127.0.0.2')!, cidr)).toBe(true)
    expect(ipInCidr(parseIp('128.0.0.1')!, cidr)).toBe(false)
  })

  test('matches IPv6 CIDR ranges', () => {
    const cidr = parseCidr('::1/128')

    expect(ipInCidr(parseIp('[::1]')!, cidr)).toBe(true)
    expect(ipInCidr(parseIp('::2')!, cidr)).toBe(false)
  })

  test('parses IPv4-mapped IPv6 addresses', () => {
    const cidr = parseCidr('::ffff:127.0.0.0/104')

    expect(ipInCidr(parseIp('::ffff:127.0.0.1')!, cidr)).toBe(true)
    expect(ipInCidr(parseIp('::ffff:128.0.0.1')!, cidr)).toBe(false)
  })
})
