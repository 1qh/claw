/** biome-ignore-all lint/performance/noAwaitInLoops: sequential by design */
/* oxlint-disable no-await-in-loop */
import { env } from '@a/env'
import { spawn } from 'bun'
import { describe, expect, test } from 'bun:test'
const GATEWAY_URL = `http://localhost:${env.GATEWAY_PORT}`,
  chat = async (messages: { content: string; role: string }[], sessionKey: string) => {
    const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      body: JSON.stringify({
        messages,
        model: `ollama/${env.OPENCLAW_MODEL}`,
        stream: false
      }),
      headers: {
        authorization: `Bearer ${env.GATEWAY_PASSWORD}`,
        'content-type': 'application/json',
        'x-openclaw-session-key': sessionKey
      },
      method: 'POST'
    })
    return res.json() as Promise<{
      choices?: { message?: { content?: string } }[]
      error?: { message: string }
    }>
  },
  sql = async (query: string) => {
    const proc = spawn(['docker', 'exec', env.TIMESCALEDB_CONTAINER, 'psql', '-U', 'uniclaw', '-t', '-c', query], {
        stderr: 'pipe',
        stdout: 'pipe'
      }),
      out = await new Response(proc.stdout).text()
    await proc.exited
    return out.trim()
  }
describe('session persistence', () => {
  const sessionKey = `agent:main:e2e-session-${Date.now()}`
  test('first message creates session in TigerFS', async () => {
    const res = await chat([{ content: 'My secret number is 42. Just acknowledge.', role: 'user' }], sessionKey)
    expect(res.error).toBeUndefined()
    expect(res.choices?.[0]?.message?.content).toBeDefined()
  }, 60_000)
  test('sessions.json contains our session key', async () => {
    const exists = await sql(
      `SELECT COUNT(*) FROM _state WHERE filename = 'agents/main/sessions/sessions.json' AND body LIKE '%${sessionKey}%';`
    )
    expect(Number(exists)).toBe(1)
  })
  test('multi-turn with full history preserves context', async () => {
    const res = await chat(
      [
        { content: 'My secret number is 42. Just acknowledge.', role: 'user' },
        { content: 'Got it, your secret number is 42.', role: 'assistant' },
        { content: 'What is my secret number?', role: 'user' }
      ],
      sessionKey
    )
    expect(res.error).toBeUndefined()
    const content = res.choices?.[0]?.message?.content ?? ''
    expect(content).toContain('42')
  }, 60_000)
  test('different session has no context from first', async () => {
    const otherKey = `agent:main:e2e-other-${Date.now()}`,
      res = await chat([{ content: 'What is my secret number?', role: 'user' }], otherKey)
    expect(res.error).toBeUndefined()
    const content = res.choices?.[0]?.message?.content ?? ''
    expect(content).not.toContain('42')
  }, 60_000)
  test('JSONL transcripts exist in TimescaleDB', async () => {
    const count = await sql("SELECT COUNT(*) FROM _state WHERE filename LIKE 'agents/main/sessions/%.jsonl';")
    expect(Number(count)).toBeGreaterThan(0)
  })
})
