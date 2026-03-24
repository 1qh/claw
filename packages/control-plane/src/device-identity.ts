import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
interface DeviceIdentity {
  deviceId: string
  privateKeyPem: string
  publicKeyPem: string
}
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex'),
  base64UrlEncode = (buf: Buffer) =>
    buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll(/[=]+$/gu, ''),
  derivePublicKeyRaw = (publicKeyPem: string) => {
    const key = crypto.createPublicKey(publicKeyPem),
      spki = key.export({ format: 'der', type: 'spki' }) as Buffer
    if (
      spki.length === ED25519_SPKI_PREFIX.length + 32 &&
      spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
    )
      return spki.subarray(ED25519_SPKI_PREFIX.length)
    return spki
  },
  fingerprintPublicKey = (publicKeyPem: string) => {
    const raw = derivePublicKeyRaw(publicKeyPem)
    return crypto.createHash('sha256').update(raw).digest('hex')
  },
  generateDeviceIdentity = (): DeviceIdentity => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519'),
      publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }),
      privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }),
      deviceId = fingerprintPublicKey(publicKeyPem)
    return { deviceId, privateKeyPem, publicKeyPem }
  },
  loadOrCreateDeviceIdentity = (filePath: string): DeviceIdentity => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8'),
          parsed = JSON.parse(raw) as DeviceIdentity
        if (parsed.deviceId && parsed.publicKeyPem && parsed.privateKeyPem) return parsed
      }
    } catch {
      // Fall through to generate
    }
    const identity = generateDeviceIdentity()
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(identity, null, 2), { mode: 0o600 })
    return identity
  },
  publicKeyRawBase64Url = (publicKeyPem: string) => base64UrlEncode(derivePublicKeyRaw(publicKeyPem)),
  signPayload = (privateKeyPem: string, payload: string) => {
    const key = crypto.createPrivateKey(privateKeyPem),
      sig = crypto.sign(null, Buffer.from(payload, 'utf8'), key)
    return base64UrlEncode(sig)
  },
  buildAuthPayloadV3 = ({
    clientId,
    clientMode,
    deviceFamily,
    deviceId,
    nonce,
    platform,
    role,
    scopes,
    signedAtMs,
    token
  }: {
    clientId: string
    clientMode: string
    deviceFamily?: string
    deviceId: string
    nonce: string
    platform?: string
    role: string
    scopes: string[]
    signedAtMs: number
    token?: null | string
  }) =>
    [
      'v3',
      deviceId,
      clientId,
      clientMode,
      role,
      scopes.join(','),
      String(signedAtMs),
      token ?? '',
      nonce,
      (platform ?? '').toLowerCase().trim(),
      (deviceFamily ?? '').toLowerCase().trim()
    ].join('|')
export type { DeviceIdentity }
export { buildAuthPayloadV3, generateDeviceIdentity, loadOrCreateDeviceIdentity, publicKeyRawBase64Url, signPayload }
