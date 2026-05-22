import { describe, expect, test } from 'bun:test'
import { assertAllowedUpstream, type UpstreamPolicy } from './upstreamPolicy'

const localhostPolicy: UpstreamPolicy = {
  allowedHosts: new Set(['localhost']),
  allowedCidrs: ['127.0.0.0/8', '::1/128']
}

describe('upstream policy', () => {
  test('rejects disallowed protocols', async () => {
    await expect(assertAllowedUpstream('ftp://localhost:4000', localhostPolicy)).rejects.toThrow(
      'Upstream target must use http or https'
    )
  })

  test('rejects hostnames outside allowlist', async () => {
    await expect(assertAllowedUpstream('http://example.com', localhostPolicy)).rejects.toThrow(
      'Upstream target is not allowlisted'
    )
  })

  test('rejects direct IPs outside allowed CIDRs', async () => {
    await expect(assertAllowedUpstream('http://0.0.0.0:4000', localhostPolicy)).rejects.toThrow(
      'Upstream target is not allowlisted'
    )
  })

  test('rejects 127.0.0.2 unless CIDR allows it', async () => {
    await expect(
      assertAllowedUpstream('http://127.0.0.2:4000', { allowedHosts: new Set(['localhost']), allowedCidrs: ['127.0.0.1/32'] })
    ).rejects.toThrow('Upstream target is not allowlisted')
  })

  test('allows direct IPs inside allowed CIDRs', async () => {
    await expect(assertAllowedUpstream('http://127.0.0.2:4000', localhostPolicy)).resolves.toBeInstanceOf(URL)
  })

  test('rejects loopback IPv6 unless CIDR allows it', async () => {
    await expect(
      assertAllowedUpstream('http://[::1]:4000', { allowedHosts: new Set(['localhost']), allowedCidrs: ['127.0.0.0/8'] })
    ).rejects.toThrow('Upstream target is not allowlisted')
  })
})
