import { WebSocket } from 'ws'
interface GatewayConnection {
  close: () => void
  onEvent: (handler: (event: Record<string, unknown>) => void) => () => void
  send: (method: string, params: Record<string, unknown>) => string
}
const connectToGateway = async ({
  host = 'localhost',
  password,
  port = 18_789
}: {
  host?: string
  password: string
  port?: number
}): Promise<GatewayConnection> => {
  const url = `ws://${host}:${String(port)}`,
    ws = new WebSocket(url, { headers: { origin: `http://${host}:${String(port)}` } })
  await new Promise<void>((resolve, reject) => {
    ws.once('message', () => resolve())
    ws.once('error', reject)
  })
  ws.send(
    JSON.stringify({
      id: `connect-${Date.now()}`,
      method: 'connect',
      params: {
        auth: { password },
        caps: ['tool-events'],
        client: { id: 'openclaw-control-ui', mode: 'backend', platform: process.platform, version: '0.0.1' },
        commands: [],
        locale: 'en-US',
        maxProtocol: 3,
        minProtocol: 3,
        permissions: {},
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        userAgent: 'uniclaw-cp/0.0.1'
      },
      type: 'req'
    })
  )
  const connectResponse = await new Promise<Record<string, unknown>>((resolve, reject) => {
    ws.once('message', (data: Buffer) => {
      resolve(JSON.parse(data.toString('utf8')) as Record<string, unknown>)
    })
    ws.once('error', reject)
  })
  if (!connectResponse.ok) throw new Error(`Gateway connect failed: ${JSON.stringify(connectResponse.error)}`)
  const listeners = new Set<(event: Record<string, unknown>) => void>()
  ws.on('message', (data: Buffer) => {
    const parsed = JSON.parse(data.toString('utf8')) as Record<string, unknown>
    for (const listener of listeners) listener(parsed)
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
    }
  }
}
export type { GatewayConnection }
export { connectToGateway }
