/** biome-ignore-all lint/style/noProcessEnv: env config */
import type { GatewayConnection } from './connect'
import { connectToGateway } from './connect'
interface EventBuffer {
  events: { data: Record<string, unknown>; seq: number }[]
  maxSize: number
  seq: number
}
interface ProxySession {
  buffer: EventBuffer
  gatewayConn: GatewayConnection
  userId: string
}
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD ?? 'uniclaw-dev',
  GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? '18789'),
  MAX_CONNECTIONS_PER_USER = 2,
  EVENT_BUFFER_SIZE = 100,
  sessions = new Map<string, ProxySession>(),
  connectionCounts = new Map<string, number>(),
  createEventBuffer = (): EventBuffer => ({
    events: [],
    maxSize: EVENT_BUFFER_SIZE,
    seq: 0
  }),
  addToBuffer = (buffer: EventBuffer, data: Record<string, unknown>) => {
    buffer.seq += 1
    buffer.events.push({ data, seq: buffer.seq })
    if (buffer.events.length > buffer.maxSize) buffer.events.shift()
  },
  getOrCreateSession = async (userId: string): Promise<ProxySession> => {
    const existing = sessions.get(userId)
    if (existing) return existing
    const gatewayConn = await connectToGateway({
        password: GATEWAY_PASSWORD,
        port: GATEWAY_PORT
      }),
      buffer = createEventBuffer(),
      session: ProxySession = { buffer, gatewayConn, userId }
    gatewayConn.onEvent(event => {
      addToBuffer(buffer, event)
    })
    sessions.set(userId, session)
    return session
  },
  canConnect = (userId: string): boolean => {
    const count = connectionCounts.get(userId) ?? 0
    return count < MAX_CONNECTIONS_PER_USER
  },
  trackConnection = (userId: string) => {
    connectionCounts.set(userId, (connectionCounts.get(userId) ?? 0) + 1)
  },
  untrackConnection = (userId: string) => {
    const count = connectionCounts.get(userId) ?? 1
    if (count <= 1) connectionCounts.delete(userId)
    else connectionCounts.set(userId, count - 1)
  },
  replayEvents = (buffer: EventBuffer, lastSeq: number) => {
    const missed = buffer.events.filter(e => e.seq > lastSeq)
    return missed
  },
  closeSession = (userId: string) => {
    const session = sessions.get(userId)
    if (session) {
      session.gatewayConn.close()
      sessions.delete(userId)
    }
  }
export type { ProxySession }
export {
  addToBuffer,
  canConnect,
  closeSession,
  createEventBuffer,
  getOrCreateSession,
  replayEvents,
  sessions,
  trackConnection,
  untrackConnection
}
