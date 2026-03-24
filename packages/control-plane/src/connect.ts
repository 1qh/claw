/** biome-ignore-all lint/style/noProcessEnv: env config */
import { buildAuthPayloadV3, loadOrCreateDeviceIdentity, publicKeyRawBase64Url, signPayload } from './device-identity'
interface GatewayConnection {
  close: () => void
  onEvent: (handler: (event: Record<string, unknown>) => void) => () => void
  send: (method: string, params: Record<string, unknown>) => string
  ws: WebSocket
}
const DEVICE_IDENTITY_PATH = process.env.DEVICE_IDENTITY_PATH ?? '.dev/uniclaw-cp-device.json',
  identity = loadOrCreateDeviceIdentity(DEVICE_IDENTITY_PATH),
  connectToGateway = async ({
    host = 'localhost',
    password,
    port = 18_789
  }: {
    host?: string
    password: string
    port?: number
  }): Promise<GatewayConnection> => {
    const ws = new WebSocket(`ws://${host}:${String(port)}`),
      challenge = await new Promise<Record<string, unknown>>(resolve => {
        ws.addEventListener(
          'message',
          e => {
            resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
          },
          { once: true }
        )
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
        platform: process.platform,
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
          auth: { password },
          caps: ['tool-events'],
          client: { id: 'gateway-client', mode: 'backend', platform: process.platform, version: '0.0.1' },
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
    const connectResponse = await new Promise<Record<string, unknown>>(resolve => {
      ws.addEventListener(
        'message',
        e => {
          resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
        },
        { once: true }
      )
    })
    if (!connectResponse.ok) throw new Error(`Gateway connect failed: ${JSON.stringify(connectResponse.error)}`)
    const listeners = new Set<(event: Record<string, unknown>) => void>()
    ws.addEventListener('message', e => {
      const data = JSON.parse(String(e.data)) as Record<string, unknown>
      for (const listener of listeners) listener(data)
    })
    let reqCounter = 0
    return {
      close: () => {
        ws.close()
      },
      onEvent: handler => {
        listeners.add(handler)
        return () => {
          listeners.delete(handler)
        }
      },
      send: (method, params) => {
        reqCounter += 1
        const id = `req-${String(reqCounter)}-${Date.now()}`
        ws.send(JSON.stringify({ id, method, params, type: 'req' }))
        return id
      },
      ws
    }
  }
export type { GatewayConnection }
export { connectToGateway }
