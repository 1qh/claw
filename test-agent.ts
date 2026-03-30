import { AuthStorage, createAgentSession } from "@mariozechner/pi-coding-agent"
import { registerApiProvider } from "@mariozechner/pi-ai"
import { streamAnthropic, streamSimpleAnthropic } from "@mariozechner/pi-ai/anthropic"
import { Type } from "@sinclair/typebox"

registerApiProvider({ api: 'anthropic', stream: streamAnthropic, streamSimple: streamSimpleAnthropic })

const authStorage = AuthStorage.create()

const model = {
  id: "claude-haiku-4-5",
  name: "Claude Haiku 4.5",
  api: "anthropic" as const,
  provider: "anthropic",
  baseUrl: "https://api.anthropic.com",
  reasoning: true,
  input: ["text", "image"],
  cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  contextWindow: 200000,
  maxTokens: 64000
}

const { session } = await createAgentSession({
  model,
  authStorage,
  cwd: '/tmp/claw-test-workspace',
  customTools: [
    {
      name: "web_search",
      label: "Web Search",
      description: "Search the web for current information",
      parameters: Type.Object({ query: Type.String({ description: "Search query" }) }),
      async execute(toolCallId, args) {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`)
        const html = await res.text()
        const results = html.match(/<a rel="nofollow" class="result__a" href="[^"]*">[^<]*<\/a>/g)
          ?.slice(0, 5)
          .map(r => `${r.replace(/<[^>]*>/g, '')}: ${r.match(/href="([^"]*)"/)?.[1] ?? ''}`)
          .join('\n') ?? 'No results'
        return { content: results, details: `Searched: ${args.query}` }
      }
    }
  ],
  systemPrompt: "You are a helpful assistant. Today is 2026-03-30. You have coding tools (bash, read, write, edit) and web_search.",
})

session.subscribe((event) => {
  switch (event.type) {
    case 'agent_start': console.log('\n=== START ==='); break
    case 'agent_end': console.log('\n=== END ==='); break
    case 'turn_start': console.log('--- turn ---'); break
    case 'tool_execution_start': console.log(`\n🔧 ${event.toolName}(${JSON.stringify(event.args)})`); break
    case 'tool_execution_end': console.log(`✅ ${event.toolName}:\n${String(event.result?.content).slice(0, 500)}\n`); break
    case 'message_update': {
      const parts = event.message?.content
      if (Array.isArray(parts))
        for (const p of parts)
          if (p.type === 'text' && p.text) process.stdout.write(p.text.slice(-1))
      break
    }
    case 'message_end': console.log(); break
  }
})

console.log("Testing pi-coding-agent with Claude Haiku...")
await session.prompt("Create a file called hello.txt with 'Hello World', then search the web for latest AI news")
console.log("\n--- DONE ---")
process.exit(0)
