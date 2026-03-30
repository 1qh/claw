import { AuthStorage, createAgentSession } from "@mariozechner/pi-coding-agent"
import { registerApiProvider } from "@mariozechner/pi-ai"
import { streamAnthropic, streamSimpleAnthropic } from "@mariozechner/pi-ai/anthropic"
import { Type } from "@sinclair/typebox"

let registered = false
if (!registered) {
  registerApiProvider({ api: 'anthropic', stream: streamAnthropic, streamSimple: streamSimpleAnthropic })
  registered = true
}

const model = {
  id: "claude-haiku-4-5",
  api: "anthropic" as const,
  provider: "anthropic",
  baseUrl: "https://api.anthropic.com",
  reasoning: false,
  input: ["text", "image"],
  cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  contextWindow: 200000,
  maxTokens: 64000
}

const authStorage = AuthStorage.create()
const cwd = '/tmp/claw-workspace'

const webSearchTool = {
  name: "web_search",
  label: "Web Search",
  description: "Search the web for current information",
  parameters: Type.Object({ query: Type.String({ description: "Search query" }) }),
  async execute(toolCallId: string, args: { query: string }) {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`)
    const html = await res.text()
    const results: string[] = []
    const blocks = html.match(/<div class="result results_links[^"]*"[\s\S]*?<\/div>\s*<\/div>/g) ?? []
    for (const block of blocks.slice(0, 5)) {
      const title = block.match(/<a rel="nofollow" class="result__a"[^>]*>([^<]*)<\/a>/)?.[1] ?? ''
      const snippet = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)?.[1]?.replace(/<[^>]*>/g, '').trim() ?? ''
      const href = block.match(/href="([^"]*)"/)?.[1] ?? ''
      if (title) results.push(`${title}\n${snippet}\n${href}\n`)
    }
    const content = results.join('\n') || 'No results found'
    return { content, details: `Searched: ${args.query}` }
  }
}

export async function POST(req: Request) {
  const { message } = await req.json() as { message: string }
  if (!message) return new Response('Missing message', { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const { session } = await createAgentSession({
          model,
          authStorage,
          cwd,
          customTools: [webSearchTool],
          systemPrompt: `You are a helpful assistant. Today is ${new Date().toISOString().slice(0, 10)}. You have coding tools (bash, read, write, edit, grep, find, ls) and web_search. After using tools, ALWAYS provide a text summary of what you found or did. Never end with just a tool result.`,
        })

        session.subscribe((event) => {
          console.log('[event]', event.type)
          switch (event.type) {
            case 'agent_start': send({ type: 'start' }); break
            case 'agent_end': send({ type: 'end' }); break
            case 'turn_start': send({ type: 'turn' }); break
            case 'tool_execution_start':
              send({ type: 'tool_start', name: event.toolName, args: event.args })
              break
            case 'tool_execution_end':
              send({ type: 'tool_end', name: event.toolName, result: String(event.result?.content).slice(0, 2000), details: event.result?.details })
              break
            case 'message_start':
            case 'message_update':
            case 'message_end': {
              const content = event.message?.content
              if (typeof content === 'string' && content) break
              if (Array.isArray(content))
                for (const p of content) {
                  if (p.type === 'text' && p.text) send({ type: 'text', text: p.text })
                  if (p.type === 'thinking' && p.thinking && event.type === 'message_end') send({ type: 'thinking', text: p.thinking })
                }
              break
            }
          }
        })

        await session.prompt(message)
        send({ type: 'done' })
      } catch (e: any) {
        send({ type: 'error', error: e.message ?? String(e) })
      }
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
    }
  })
}
