/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/** biome-ignore-all lint/style/noProcessEnv: env config */
import { afterAll, describe, expect, it } from 'bun:test'
import { connectToGateway } from './connect'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD ?? 'uniclaw-dev',
  GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? '18789')
describe('gateway chat', () => {
  let conn: Awaited<ReturnType<typeof connectToGateway>>
  afterAll(() => {
    conn?.close()
  })
  it('sends chat.send and receives agent response events', async () => {
    conn = await connectToGateway({ password: GATEWAY_PASSWORD, port: GATEWAY_PORT })
    const events: Record<string, unknown>[] = [],
      done = new Promise<void>(resolve => {
        const unsub = conn.onEvent(event => {
          events.push(event)
          if (event.type === 'res' || (event.type === 'event' && event.event === 'chat')) {
            const chatPayload = event.payload as Record<string, unknown> | undefined
            if (chatPayload?.state === 'final' || chatPayload?.state === 'error') {
              unsub()
              resolve()
            }
          }
        })
        setTimeout(() => {
          unsub()
          resolve()
        }, 60_000)
      })
    conn.send('chat.send', {
      message: 'Say hello in one word',
      sessionKey: 'agent:main:main'
    })
    await done
    expect(events.length).toBeGreaterThan(0)
    const hasAgentEvent = events.some(e => e.type === 'event' && e.event === 'agent'),
      hasChatEvent = events.some(e => e.type === 'event' && e.event === 'chat'),
      hasResponse = events.some(e => e.type === 'res')
    expect(hasAgentEvent || hasChatEvent || hasResponse).toBe(true)
  }, 90_000)
})
