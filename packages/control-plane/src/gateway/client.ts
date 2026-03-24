interface GatewayClientOptions {
  host: string
  port: number
  token: string
}
/** biome-ignore-all lint/style/noProcessEnv: env config */
type GatewayStatus = 'connected' | 'connecting' | 'disconnected'
const createGatewayClient = ({ host, port, token }: GatewayClientOptions) => {
  let ws: null | WebSocket = null,
    status: GatewayStatus = 'disconnected'
  const listeners = new Set<(event: unknown) => void>(),
    connect = async () =>
      new Promise<void>((resolve, reject) => {
        status = 'connecting'
        ws = new WebSocket(`ws://${host}:${String(port)}`)
        ws.addEventListener('open', () => {
          status = 'connected'
          resolve()
        })
        ws.addEventListener('error', () => {
          status = 'disconnected'
          reject(new Error('Gateway connection failed'))
        })
        ws.addEventListener('close', () => {
          status = 'disconnected'
        })
        ws.addEventListener('message', e => {
          const data: unknown = JSON.parse(String(e.data))
          for (const listener of listeners) listener(data)
        })
      }),
    disconnect = () => {
      ws?.close()
      ws = null
      status = 'disconnected'
    },
    send = (data: unknown) => {
      ws?.send(JSON.stringify(data))
    },
    onEvent = (listener: (event: unknown) => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    healthCheck = async () => {
      const res = await fetch(`http://${host}:${String(port)}/health`)
      return (await res.json()) as { ok: boolean; status: string }
    },
    getToken = () => token,
    getStatus = () => status
  return { connect, disconnect, getStatus, getToken, healthCheck, onEvent, send }
}
type GatewayClient = ReturnType<typeof createGatewayClient>
export type { GatewayClient, GatewayClientOptions }
export { createGatewayClient }
