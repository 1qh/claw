import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import Sandbox from 'e2b'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'

const E2B_KEY = process.env.E2B_API_KEY ?? ''
const AUTH_TOKEN = (() => {
  try {
    const auth = JSON.parse(readFileSync(`${homedir()}/claw/auth.json`, 'utf8')) as {
      anthropic?: { access?: string }
    }
    return auth.anthropic?.access ?? ''
  } catch {
    return ''
  }
})()

describe('E2B PTY with pi-coding-agent', () => {
  let sandbox: Sandbox
  let home: string

  beforeAll(async () => {
    expect(E2B_KEY).not.toBe('')
    expect(AUTH_TOKEN).not.toBe('')

    sandbox = await Sandbox.create({ timeoutMs: 600_000, apiKey: E2B_KEY })
    home = (await sandbox.commands.run('echo $HOME')).stdout.trim()
    await sandbox.commands.run('npm install -g @mariozechner/pi-coding-agent', { timeoutMs: 120_000 })
  }, 180_000)

  afterAll(async () => {
    if (sandbox) await sandbox.kill()
  })

  test('sandbox is alive', () => {
    expect(sandbox.sandboxId).toBeTruthy()
    expect(home).toBe('/home/user')
  })

  test('pi CLI is installed', async () => {
    const result = await sandbox.commands.run('pi --version 2>&1 || echo not-found')
    expect(result.stdout).not.toContain('not-found')
  })

  test('PTY streams terminal output', async () => {
    const chunks: Uint8Array[] = []
    const decoder = new TextDecoder()

    const handle = await sandbox.pty.create({
      cols: 80,
      rows: 24,
      onData: (data) => chunks.push(new Uint8Array(data)),
      timeoutMs: 30_000,
      cwd: home,
      envs: { TERM: 'xterm-256color' },
    })

    await sandbox.pty.sendInput(handle.pid, new TextEncoder().encode('echo HELLO_PTY\n'))
    await new Promise(r => setTimeout(r, 2000))

    const output = chunks.map(c => decoder.decode(c)).join('')
    expect(output).toContain('HELLO_PTY')
  }, 30_000)

  test('pi creates file via PTY with Claude Haiku', async () => {
    const chunks: Uint8Array[] = []
    const decoder = new TextDecoder()

    const handle = await sandbox.pty.create({
      cols: 120,
      rows: 40,
      onData: (data) => chunks.push(new Uint8Array(data)),
      timeoutMs: 120_000,
      cwd: home,
      envs: { TERM: 'xterm-256color', ANTHROPIC_API_KEY: AUTH_TOKEN },
    })

    await sandbox.pty.sendInput(
      handle.pid,
      new TextEncoder().encode('pi --print --model claude-haiku-4-5 "create a file called e2b-test.txt with the text: hello from e2b test"\n')
    )

    await new Promise(r => setTimeout(r, 30_000))

    const fileResult = await sandbox.commands.run(`cat ${home}/e2b-test.txt 2>/dev/null || echo FILE_NOT_FOUND`)
    expect(fileResult.stdout).not.toContain('FILE_NOT_FOUND')
    expect(fileResult.stdout.toLowerCase()).toContain('hello')

    const output = chunks.map(c => decoder.decode(c)).join('')
    expect(output.length).toBeGreaterThan(0)
  }, 120_000)
})
