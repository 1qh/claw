import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { auth } from './auth'
const SECURITY_HEADERS = {
    'content-security-policy': "default-src 'self'",
    'strict-transport-security': 'max-age=63072000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-xss-protection': '1; mode=block'
  },
  betterAuthView = async (ctx: { request: Request }) => auth.handler(ctx.request),
  createApp = () =>
    new Elysia()
      .use(cors())
      .onAfterHandle(({ set }) => {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) set.headers[k] = v
      })
      .get('/health', () => ({ ok: true, status: 'live' }))
      .all('/api/auth/*', betterAuthView)
      .ws('/ws', {
        message: (ws, msg) => {
          ws.send(msg)
        },
        open: ws => {
          ws.send({ type: 'connected' })
        }
      })
export { createApp }
