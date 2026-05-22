export type IpVersion = 4 | 6

export interface ParsedIp {
  version: IpVersion
  value: bigint
}

export interface ParsedCidr extends ParsedIp {
  prefix: number
}

export function parseIpv4(input: string): bigint | null {
  const parts = input.split('.')
  if (parts.length !== 4) return null

  let value = 0n
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const parsed = Number(part)
    if (parsed < 0 || parsed > 255) return null
    value = (value << 8n) + BigInt(parsed)
  }

  return value
}

function expandIpv6(input: string): string[] | null {
  if (input.includes(':::')) return null

  const [headRaw, tailRaw] = input.toLowerCase().split('::')
  const head = headRaw ? headRaw.split(':') : []
  const tail = tailRaw ? tailRaw.split(':') : []
  if (input.includes('::') && input.split('::').length !== 2) return null

  const ipv4Tail = tail.at(-1) ?? head.at(-1)
  if (ipv4Tail?.includes('.')) {
    const ipv4 = parseIpv4(ipv4Tail)
    if (ipv4 === null) return null
    const high = Number((ipv4 >> 16n) & 0xffffn).toString(16)
    const low = Number(ipv4 & 0xffffn).toString(16)
    if (tail.at(-1) === ipv4Tail) tail.splice(tail.length - 1, 1, high, low)
    else head.splice(head.length - 1, 1, high, low)
  }

  const missing = 8 - head.length - tail.length
  if (missing < 0 || (!input.includes('::') && missing !== 0)) return null
  return [...head, ...Array<string>(missing).fill('0'), ...tail]
}

export function parseIpv6(input: string): bigint | null {
  const parts = expandIpv6(input)
  if (!parts || parts.length !== 8) return null

  let value = 0n
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null
    value = (value << 16n) + BigInt(Number.parseInt(part, 16))
  }

  return value
}

export function parseIp(input: string): ParsedIp | null {
  const normalized = input.startsWith('[') && input.endsWith(']') ? input.slice(1, -1) : input
  const ipv4 = parseIpv4(normalized)
  if (ipv4 !== null) return { version: 4, value: ipv4 }

  const ipv6 = parseIpv6(normalized)
  if (ipv6 !== null) return { version: 6, value: ipv6 }

  return null
}

export function parseCidr(input: string): ParsedCidr {
  const [ipRaw, prefixRaw] = input.split('/')
  if (!ipRaw || prefixRaw === undefined) throw new Error(`Invalid CIDR: ${input}`)

  const ip = parseIp(ipRaw)
  if (!ip) throw new Error(`Invalid CIDR IP: ${input}`)

  const prefix = Number(prefixRaw)
  const max = ip.version === 4 ? 32 : 128
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) throw new Error(`Invalid CIDR prefix: ${input}`)

  return { ...ip, prefix }
}

export function ipInCidr(ip: ParsedIp, cidr: ParsedCidr): boolean {
  if (ip.version !== cidr.version) return false

  const bits = ip.version === 4 ? 32 : 128
  const shift = BigInt(bits - cidr.prefix)
  const mask = cidr.prefix === 0 ? 0n : ((1n << BigInt(cidr.prefix)) - 1n) << shift
  return (ip.value & mask) === (cidr.value & mask)
}
