/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { auth } from './auth'
import {
  canConnect,
  closeSession,
  getOrCreateSession,
  replayEvents,
  trackConnection,
  untrackConnection
} from './gateway/proxy'
const SECURITY_HEADERS = {
    'content-security-policy': "default-src 'self'",
    'strict-transport-security': 'max-age=63072000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-xss-protection': '1; mode=block'
  },
  betterAuthView = async (ctx: { request: Request }) => auth.handler(ctx.request),
  resolveUserId = async (request: Request): Promise<null | string> => {
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user?.id ?? null
  },
  createApp = () =>
    new Elysia()
      .use(cors())
      .onAfterHandle(({ set }) => {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) set.headers[k] = v
      })
      .get('/health', () => ({ ok: true, status: 'live' }))
      .all('/api/auth/*', betterAuthView)
      .ws('/ws', {
        close: ws => {
          const { userId } = ws.data as { userId?: string }
          if (userId) untrackConnection(userId)
        },
        message: async (ws, msg) => {
          const { userId } = ws.data as { userId?: string }
          if (!userId) {
            ws.send({ error: 'not authenticated', type: 'error' })
            return
          }
          const data = msg as Record<string, unknown>
          if (data.type === 'replay') {
            const session = await getOrCreateSession(userId),
              lastSeq = typeof data.lastSeq === 'number' ? data.lastSeq : 0,
              missed = replayEvents(session.buffer, lastSeq)
            ws.send({ events: missed, type: 'replay' })
            return
          }
          const session = await getOrCreateSession(userId),
            method = typeof data.method === 'string' ? data.method : 'chat.send',
            params = (typeof data.params === 'object' && data.params !== null ? data.params : {}) as Record<
              string,
              unknown
            >
          session.gatewayConn.send(method, params)
        },
        open: async ws => {
          const userId = await resolveUserId(ws.data.request)
          if (!userId) {
            ws.send({ error: 'authentication required', type: 'error' })
            ws.close()
            return
          }
          ;(ws.data as Record<string, unknown>).userId = userId
          if (!canConnect(userId)) {
            ws.send({ error: 'max connections exceeded', type: 'error' })
            ws.close()
            return
          }
          trackConnection(userId)
          ws.send({ type: 'connected', userId })
          try {
            const session = await getOrCreateSession(userId)
            session.gatewayConn.onEvent(event => {
              ws.send({ ...event, seq: session.buffer.seq })
            })
          } catch {
            ws.send({ error: 'gateway connection failed', type: 'error' })
          }
        }
      })
export { closeSession, createApp }
