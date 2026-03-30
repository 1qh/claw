import Sandbox from 'e2b'
import { Elysia, t } from 'elysia'
import { env } from '../lib/env'

const PORT = Number(env.WS_PORT)
const E2B_KEY = env.E2B_API_KEY

const AGENTS: Record<string, { cmd: string; install: string; setup: (home: string) => string }> = {
  codex: {
    cmd: 'codex --full-auto',
    install: 'npm install -g @openai/codex',
    setup: (home) => `cd ${home} && git init && git config user.email user@claw.dev && git config user.name claw`,
  },
  pi: {
    cmd: 'pi --model claude-haiku-4-5',
    install: 'npm install -g @mariozechner/pi-coding-agent',
    setup: () => '',
  },
}

const sessions = new Map<string, { pid: number; sandbox: Sandbox }>()
let sessionCounter = 0

const app = new Elysia()
  .get('/health', () => ({ ok: true }))
  .ws('/terminal', {
    query: t.Object({
      agent: t.Union([t.Literal('pi'), t.Literal('codex')]),
      token: t.String(),
    }),
    async open(ws) {
      sessionCounter += 1
      const sessionId = String(sessionCounter)
      const { agent: agentName, token } = ws.data.query
      const agentConfig = AGENTS[agentName]
      if (!agentConfig) {
        ws.send(JSON.stringify({ type: 'error', message: `Unknown agent: ${agentName}` }))
        ws.close()
        return
      }

      ws.send(JSON.stringify({ type: 'status', message: `Creating sandbox for ${agentName}...` }))

      const sandbox = await Sandbox.create({ apiKey: E2B_KEY, timeoutMs: 600_000 })
      const home = (await sandbox.commands.run('echo $HOME')).stdout.trim()

      ws.send(JSON.stringify({ type: 'status', message: 'Installing agent...' }))
      await sandbox.commands.run(agentConfig.install, { timeoutMs: 120_000 })

      const setupCmd = agentConfig.setup(home)
      if (setupCmd) await sandbox.commands.run(setupCmd)

      const envs: Record<string, string> = { TERM: 'xterm-256color' }
      if (agentName === 'pi') envs.ANTHROPIC_API_KEY = token
      if (agentName === 'codex') {
        await sandbox.commands.run(`mkdir -p ${home}/.codex`)
        await sandbox.files.write(`${home}/.codex/auth.json`, token)
      }

      ws.send(JSON.stringify({ type: 'status', message: 'Starting agent...' }))

      const handle = await sandbox.pty.create({
        cols: 120,
        cwd: home,
        envs,
        onData: (data) => ws.send(Buffer.from(data)),
        rows: 40,
        timeoutMs: 600_000,
      })

      await sandbox.pty.sendInput(handle.pid, new TextEncoder().encode(`${agentConfig.cmd}\n`))

      sessions.set(sessionId, { pid: handle.pid, sandbox })
      ws.data.sessionId = sessionId
      console.log(`[${sessionId}] ${agentName} session started (sandbox: ${sandbox.sandboxId})`)
    },
    async message(ws, msg) {
      const sessionId = (ws.data as { sessionId?: string }).sessionId
      if (!sessionId) return
      const session = sessions.get(sessionId)
      if (!session) return

      if (typeof msg === 'string') {
        try {
          const parsed = JSON.parse(msg) as { cols?: number; rows?: number; type: string }
          if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
            await session.sandbox.pty.resize(session.pid, { cols: parsed.cols, rows: parsed.rows })
            return
          }
        } catch {
          // Raw terminal input
        }
        await session.sandbox.pty.sendInput(session.pid, new TextEncoder().encode(msg))
      }
    },
    async close(ws) {
      const sessionId = (ws.data as { sessionId?: string }).sessionId
      if (!sessionId) return
      const session = sessions.get(sessionId)
      if (session) {
        console.log(`[${sessionId}] Disconnected, killing sandbox`)
        await session.sandbox.kill()
        sessions.delete(sessionId)
      }
    },
  })
  .listen(PORT)

console.log(`WS server on ws://localhost:${String(PORT)}`)
