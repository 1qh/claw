/** biome-ignore-all lint/style/noProcessEnv: env config */
import { describe, expect, it } from 'bun:test'
import { buildAuthPayloadV3, loadOrCreateDeviceIdentity, publicKeyRawBase64Url, signPayload } from './device-identity'
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? '18789'),
  GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD ?? 'uniclaw-dev',
  identity = loadOrCreateDeviceIdentity('.dev/uniclaw-cp-device.json'),
  connectToGateway = async () => {
    const ws = new WebSocket(`ws://localhost:${String(GATEWAY_PORT)}`),
      challenge = await new Promise<Record<string, unknown>>(resolve => {
        ws.addEventListener('message', e => {
          resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
        })
      }),
      payload = challenge.payload as Record<string, unknown>,
      nonce = payload.nonce as string,
      signedAtMs = Date.now(),
      scopes = ['operator.read', 'operator.write'],
      authPayload = buildAuthPayloadV3({
        clientId: 'gateway-client',
        clientMode: 'backend',
        deviceId: identity.deviceId,
        nonce,
        platform: 'linux',
        role: 'operator',
        scopes,
        signedAtMs,
        token: null
      }),
      signature = signPayload(identity.privateKeyPem, authPayload)
    ws.send(
      JSON.stringify({
        id: `connect-${Date.now()}`,
        method: 'connect',
        params: {
          auth: { password: GATEWAY_PASSWORD },
          caps: [],
          client: { id: 'gateway-client', mode: 'backend', platform: 'linux', version: '0.0.1' },
          commands: [],
          device: {
            id: identity.deviceId,
            nonce,
            publicKey: publicKeyRawBase64Url(identity.publicKeyPem),
            signature,
            signedAt: signedAtMs
          },
          locale: 'en-US',
          maxProtocol: 3,
          minProtocol: 3,
          permissions: {},
          role: 'operator',
          scopes,
          userAgent: 'uniclaw-cp/0.0.1'
        },
        type: 'req'
      })
    )
    const response = await new Promise<Record<string, unknown>>(resolve => {
      ws.addEventListener('message', e => {
        resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
      })
    })
    return { response, ws }
  }
describe('gateway protocol', () => {
  it('receives connect.challenge', async () => {
    const ws = new WebSocket(`ws://localhost:${String(GATEWAY_PORT)}`),
      challenge = await new Promise<Record<string, unknown>>(resolve => {
        ws.addEventListener('message', e => {
          resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
        })
      })
    expect(challenge).toHaveProperty('type', 'event')
    expect(challenge).toHaveProperty('event', 'connect.challenge')
    ws.close()
  })
  it('connects with password + device identity', async () => {
    const { response, ws } = await connectToGateway()
    expect(response).toHaveProperty('type', 'res')
    expect(response.ok).toBe(true)
    ws.close()
  })
})
