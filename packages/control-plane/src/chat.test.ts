/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { env } from '@a/env'
import { afterAll, describe, expect, it } from 'bun:test'
import { connectToGateway } from './connect'
describe('gateway chat via WS', () => {
  let conn: Awaited<ReturnType<typeof connectToGateway>>
  afterAll(() => {
    conn?.close()
  })
  it('sends chat.send and receives chat + agent events', async () => {
    conn = await connectToGateway({ password: env.GATEWAY_PASSWORD, port: Number(env.GATEWAY_PORT) })
    const events: Record<string, unknown>[] = [],
      done = new Promise<void>(resolve => {
        const unsub = conn.onEvent(event => {
          events.push(event)
          if (event.type === 'event' && event.event === 'chat') {
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
      idempotencyKey: `test-${Date.now()}`,
      message: 'Say hello in one word',
      sessionKey: `agent:main:ws-test-${Date.now()}`
    })
    await done
    expect(events.length).toBeGreaterThan(0)
    const chatEvents = events.filter(e => e.type === 'event' && e.event === 'chat'),
      agentEvents = events.filter(e => e.type === 'event' && e.event === 'agent'),
      finalEvent = chatEvents.find(e => {
        const p = e.payload as Record<string, unknown> | undefined
        return p?.state === 'final'
      }),
      finalPayload = finalEvent?.payload as Record<string, unknown> | undefined
    expect(chatEvents.length).toBeGreaterThan(0)
    expect(agentEvents.length).toBeGreaterThan(0)
    expect(finalPayload?.state).toBe('final')
  }, 90_000)
})
