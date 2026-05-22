import { lookup } from 'node:dns/promises'
import { config } from './env'
import { ipInCidr, parseCidr, parseIp } from './ip'

export interface UpstreamPolicy {
  allowedHosts: Set<string>
  allowedCidrs: string[]
}

const configuredPolicy: UpstreamPolicy = {
  allowedHosts: config.upstreamAllowedHosts,
  allowedCidrs: config.upstreamAllowedCidrs
}

function hostAllowed(hostname: string, policy: UpstreamPolicy): boolean {
  return policy.allowedHosts.has(hostname.toLowerCase())
}

async function cidrAllowed(hostname: string, allowedCidrs: ReturnType<typeof parseCidr>[]): Promise<boolean> {
  const directIp = parseIp(hostname)
  if (directIp) return allowedCidrs.some((cidr) => ipInCidr(directIp, cidr))

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (addresses.length === 0) return false

  return addresses.every((address) => {
    const ip = parseIp(address.address)
    return ip ? allowedCidrs.some((cidr) => ipInCidr(ip, cidr)) : false
  })
}

export async function assertAllowedUpstream(rawTarget: string, policy = configuredPolicy): Promise<URL> {
  const target = new URL(rawTarget)
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new Error('Upstream target must use http or https')
  }

  const allowedCidrs = policy.allowedCidrs.map(parseCidr)
  const directIp = parseIp(target.hostname)
  const allowed = directIp
    ? allowedCidrs.some((cidr) => ipInCidr(directIp, cidr))
    : hostAllowed(target.hostname, policy) && (allowedCidrs.length === 0 || (await cidrAllowed(target.hostname, allowedCidrs)))

  if (!allowed) {
    throw new Error('Upstream target is not allowlisted')
  }

  return target
}
